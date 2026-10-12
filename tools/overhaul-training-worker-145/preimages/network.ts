import { Peer, type DataConnection } from 'peerjs';
import { MAX_PLAYERS } from '../../shared/config';
import { parseInput, parseJoin } from '../../shared/protocol';
import {INPUT_PROTOCOL_VERSION} from '../../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../../shared/layout';
import type { GameSnapshot, JoinRequest, ServerMessage } from '../../shared/types';
import { runtime, acceptSnapshot, resetRuntime } from './runtime';
import { useGameStore } from '../state/store';
import {beginNetworkReceipt,networkCloseMessage,noteNetworkClose,noteNetworkDecodeFailure,noteNetworkFailure,noteNetworkPacket} from './networkReceipt';
const receiptEncoder=new TextEncoder();

const fail=(message:string)=>{noteNetworkFailure(message);runtime.resetInput?.();runtime.sendInput=null;const state=useGameStore.getState();if(state.connection==='Disconnected'&&state.error)return;useGameStore.setState({error:message,connection:'Disconnected'});};
const inputError='This arena uses a different input build. Reload the game and ask the host for a fresh invite.';
const layoutError='This arena uses a different world build. Reload the game and ask the host for a fresh invite.';
function incompatibleLayout(message=layoutError){resetRuntime();useGameStore.setState({phase:'hangar',error:message,connection:'Disconnected',invite:'',hud:null});}
function cleanupPeer(peer:Peer,connections:Iterable<DataConnection>):void {
  const errors:unknown[]=[],owned=new Set<{close():void}>(connections);
  // Include pending data/media channels which have not joined the arena yet.
  // Peer.destroy stops at the first throwing connection in PeerJS 1.5.5.
  try{for(const group of Object.values(peer.connections) as (DataConnection[]|DataConnection)[])for(const connection of Array.isArray(group)?group:[group])owned.add(connection);}catch(error){errors.push(error);}
  for(const connection of owned)try{connection.close();}catch(error){errors.push(error);}
  try{peer.destroy();}catch(error){errors.push(error);}
  if(errors.length)throw new AggregateError(errors,'Invite channel cleanup failed');
}
function snapshotMessage(data:unknown):boolean {
  if(!data||typeof data!=='object')return false;
  const msg=data as ServerMessage;
  if(msg.type==='welcome'){if(msg.layoutVersion!==WORLD_LAYOUT_VERSION){incompatibleLayout();return false;}if(msg.inputVersion!==INPUT_PROTOCOL_VERSION){incompatibleLayout(inputError);return false;}runtime.localId=msg.id;useGameStore.setState({playerId:msg.id,connection:'Connected',mode:msg.mode==='training'?'coop':msg.mode});}
  else if(msg.type==='snapshot') {
    if(msg.state?.worldLayoutVersion!==WORLD_LAYOUT_VERSION){incompatibleLayout();return false;}
    if(msg.state?.inputVersion!==INPUT_PROTOCOL_VERSION){incompatibleLayout(inputError);return false;}
    if(!acceptSnapshot(msg.state))return false;runtime.seed=msg.state.seed;useGameStore.setState({seed:msg.state.seed});
    if(useGameStore.getState().phase==='loading')useGameStore.setState({phase:'playing'});
    return true;
  } else if(msg.type==='error')fail(msg.message);
  else if(msg.type==='pong')useGameStore.setState({latency:Math.round(performance.now()-msg.time)});
  return false;
}
export function deployTraining() {
  resetRuntime();runtime.transport='training';runtime.seed=useGameStore.getState().seed;
  useGameStore.setState({phase:'playing',playerId:'local',connection:'Solo training',invite:'',error:null,hud:null});
}
export async function hostPeer() {
  resetRuntime();const generation=runtime.generation,current=()=>runtime.generation===generation;const state=useGameStore.getState();
  runtime.transport='peer-host';runtime.authority=true;runtime.seed=state.seed;
  useGameStore.setState({phase:'loading',connection:'Opening invite channel…',error:null,hud:null,invite:''});
  const peer=new Peer();const guests=new Map<string,DataConnection>(),incoming=new Map<DataConnection,ReturnType<typeof setTimeout>>();
  runtime.close=()=>{clearTimeout(deadline);const connections=[...incoming.keys(),...guests.values()];for(const timer of incoming.values())clearTimeout(timer);incoming.clear();guests.clear();cleanupPeer(peer,connections);};
  const deadline=setTimeout(()=>{if(current()&&!peer.open)fail('The invite service could not connect. Solo play and the dedicated LAN server are available.');},20000);
  peer.on('open',id=>{
    if(!current())return;
    clearTimeout(deadline);runtime.localId=id;
    const url=new URL(window.location.href);url.search='';url.searchParams.set('peer',id);
    useGameStore.setState({playerId:id,phase:'playing',connection:'Squad host',invite:url.toString()});
  });
  runtime.broadcast=state=>{for(const conn of guests.values()){if(!current())return;if(conn.open)conn.send({type:'snapshot',state});}};
  peer.on('connection',conn=>{
    if(!current()){conn.close();return;}
    let joined=false,closed=false;let ownerSim:typeof runtime.sim=null;
    const closeIncoming=()=>{if(!current())return;try{conn.close();}catch(error){console.error('Invite channel close failed',error);}};
    let timeout=setTimeout(()=>{if(!joined)closeIncoming();},10000);incoming.set(conn,timeout);
    const reject=(message:string)=>{conn.send({type:'error',message});closed=true;clearTimeout(timeout);timeout=setTimeout(closeIncoming,150);incoming.set(conn,timeout);};
    conn.on('data',data=>{
      if(!current()||closed||!data||typeof data!=='object')return;
      const msg=data as Record<string,unknown>;
      if(msg.type==='join'&&!joined){
        if(msg.layoutVersion!==WORLD_LAYOUT_VERSION){reject(layoutError);return;}
        if(msg.inputVersion!==INPUT_PROTOCOL_VERSION){reject(inputError);return;}
        const join=parseJoin(msg),sim=runtime.sim;
        if(!join||!sim){conn.send({type:'error',message:'The host is still loading. Try the invite again.'});return;}
        if(guests.has(conn.peer)||guests.size>=MAX_PLAYERS-1||sim.phase!=='active'){conn.send({type:'error',message:'This arena is full or the match has finished.'});conn.close();return;}
        let snapshot:GameSnapshot;
        try{sim.addActor(conn.peer,join.name,join.chassis);snapshot=sim.snapshot();}catch(error){retireFailedArena(sim,error);clearTimeout(timeout);closed=true;conn.close();return;}
        joined=true;ownerSim=sim;clearTimeout(timeout);guests.set(conn.peer,conn);
        conn.send({type:'welcome',id:conn.peer,room:sim.room,mode:sim.mode,layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION});if(current()&&runtime.sim===sim&&!closed&&conn.open)conn.send({type:'snapshot',state:snapshot});
      }else if(msg.type==='input'&&joined){const input=parseInput(msg.input);if(input&&guests.get(conn.peer)===conn&&ownerSim)try{ownerSim.setInput(conn.peer,input);}catch(error){retireFailedArena(ownerSim,error);}}
      else if(msg.type==='ping'&&typeof msg.time==='number')conn.send({type:'pong',time:msg.time});
    });
    const retire=()=>{closed=true;clearTimeout(timeout);incoming.delete(conn);if(!current()||guests.get(conn.peer)!==conn)return;guests.delete(conn.peer);if(ownerSim)try{ownerSim.removeActor(conn.peer);}catch(error){retireFailedArena(ownerSim,error);}};
    conn.on('close',retire);conn.on('error',()=>{if(closed)return;retire();closeIncoming();});
  });
  peer.on('error',error=>{if(!current())return;clearTimeout(deadline);fail(`Invite connection: ${error.message}`);});
  peer.on('disconnected',()=>{if(current()&&!peer.destroyed)useGameStore.setState({connection:'Squad host · signaling reconnecting'});});
}
export async function joinPeer(host:string) {
  resetRuntime();const generation=runtime.generation,current=()=>runtime.generation===generation;runtime.authority=false;runtime.transport='peer-guest';
  const state=useGameStore.getState();useGameStore.setState({phase:'loading',connection:'Joining squad…',error:null,hud:null});
  const peer=new Peer();let connection:DataConnection|undefined,intentionalClose=false;
  const deadline=setTimeout(()=>endJoin('The squad could not finish joining. Keep the host tab open and try a fresh invite. Some networks require an arena server.'),25000);
  const endJoin=(message:string)=>{
    if(!current()||intentionalClose)return;
    intentionalClose=true;clearTimeout(deadline);fail(message);
    try{cleanupPeer(peer,connection?[connection]:[]);}catch(error){console.error('Invite channel cleanup failed',error);}
  };
  runtime.close=()=>{intentionalClose=true;clearTimeout(deadline);cleanupPeer(peer,connection?[connection]:[]);};
  peer.on('open',()=>{
    // The city snapshot exceeds PeerJS JSON's 16,300-byte limit. BinaryPack
    // preserves the message envelope and chunks larger reliable messages.
    if(!current()||intentionalClose)return;connection=peer.connect(host,{reliable:true,serialization:'binary'});
    connection.on('open',()=>{if(!current()||intentionalClose)return;connection?.send({type:'join',name:state.name,chassis:state.chassis,mode:state.mode,room:'PEER',create:false,layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION} satisfies JoinRequest);});
    connection.on('data',data=>{
      if(!current()||intentionalClose)return;
      // A welcome or pong cannot prove that battlefield state was admitted.
      if(snapshotMessage(data))clearTimeout(deadline);
      else if(current()&&!intentionalClose&&useGameStore.getState().error)endJoin(useGameStore.getState().error!);
    });
    connection.on('close',()=>endJoin('The host closed the arena. Return to the hangar to deploy again.'));
    connection.on('error',error=>endJoin(error.message));
    runtime.sendInput=input=>{if(!current()||intentionalClose||!connection?.open)return false;connection.send({type:'input',input});return true;};
  });
  peer.on('error',error=>endJoin(error.message));
}
export function connectServer(create:boolean,room='') {
  resetRuntime();const generation=runtime.generation,current=()=>runtime.generation===generation;runtime.authority=false;runtime.transport='websocket';
  const diagnosing=import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1';beginNetworkReceipt(diagnosing);
  const state=useGameStore.getState();useGameStore.setState({phase:'loading',connection:'Joining arena server…',error:null,hud:null});
  const endpoint=import.meta.env.VITE_ARENA_URL as string|undefined;
  const ws=new WebSocket(endpoint??`${location.protocol==='https:'?'wss':'ws'}://${location.host}/arena`);
  const deadline=setTimeout(()=>{if(current())fail('Arena server did not answer. Use Host squad for a browser-hosted invite, or run npm run dev for LAN play.');},15000);
  let intentionalClose=false;
  runtime.close=()=>{intentionalClose=true;clearTimeout(deadline);ws.close();};
  ws.onopen=()=>{if(!current()||intentionalClose)return;ws.send(JSON.stringify({type:'join',room,name:state.name,chassis:state.chassis,mode:state.mode,create,seed:state.seed,layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION} satisfies JoinRequest));};
  ws.onmessage=event=>{if(!current()||intentionalClose)return;clearTimeout(deadline);try{const data=JSON.parse(event.data) as ServerMessage;noteNetworkPacket(data,typeof event.data==='string'&&diagnosing?receiptEncoder.encode(event.data).byteLength:0,performance.now());snapshotMessage(data);if(current()&&data.type==='welcome'&&data.inputVersion===INPUT_PROTOCOL_VERSION&&data.layoutVersion===WORLD_LAYOUT_VERSION){const url=new URL(location.href);url.search='';url.searchParams.set('room',data.room);useGameStore.setState({invite:url.toString()});}}catch{noteNetworkDecodeFailure();fail('Invalid arena data.');}};
  ws.onerror=()=>{if(current()&&!intentionalClose)fail('Arena server is unavailable. Use browser-hosted invites or solo training.');};
  ws.onclose=event=>{if(current()&&!intentionalClose){noteNetworkClose(event,performance.now());fail(networkCloseMessage(event));}};
  runtime.sendInput=input=>{if(!current()||intentionalClose||ws.readyState!==WebSocket.OPEN)return false;ws.send(JSON.stringify({type:'input',input}));return true;};
}
export function leaveGame(){resetRuntime();document.exitPointerLock?.();useGameStore.setState({phase:'hangar',hud:null,error:null,invite:'',connection:'Offline'});history.replaceState(null,'',location.pathname);}
export function retireFailedArena(sim:import('../../shared/simulation').Simulation|null,error:unknown):void {
  sim?.latchPhysicsFailure(error);
  if(sim&&runtime.sim!==sim)return;
  resetRuntime();document.exitPointerLock?.();
  useGameStore.setState({phase:'hangar',hud:null,invite:'',connection:'Disconnected',error:'The arena stopped unexpectedly. Deploy again to start a fresh match.'});
}
export function getInvite():{peer?:string;room?:string} {
  const params=new URLSearchParams(location.search);return {peer:params.get('peer')??undefined,room:params.get('room')??undefined};
}
export function hostSnapshot(state:GameSnapshot){acceptSnapshot(state);runtime.broadcast?.(state);}

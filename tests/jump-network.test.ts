import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {emptyInput,type GameSnapshot} from '../shared/types';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import type {Simulation} from '../shared/simulation';
const mocks=vi.hoisted(()=>{
  class Events {
    listeners=new Map<string,((...args:unknown[])=>void)[]>();
    on(name:string,fn:(...args:unknown[])=>void){const list=this.listeners.get(name)??[];list.push(fn);this.listeners.set(name,list);}
    emit(name:string,...args:unknown[]){for(const fn of this.listeners.get(name)??[])fn(...args);}
  }
  class Connection extends Events {peer='guest';open=true;sent:unknown[]=[];send(value:unknown){this.sent.push(structuredClone(value));}close(){this.open=false;this.emit('close');}}
  class Peer extends Events {static all:Peer[]=[];open=true;destroyed=false;connections:Connection[]=[];connectCalls:{host:string;options:unknown}[]=[];constructor(){super();Peer.all.push(this);}connect(host:string,options:unknown){this.connectCalls.push({host,options:structuredClone(options)});const c=new Connection();this.connections.push(c);return c;}destroy(){this.destroyed=true;}}
  class Socket {static OPEN=1;static all:Socket[]=[];readyState=1;sent:string[]=[];onopen:(()=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;onmessage:((e:{data:string})=>void)|null=null;constructor(){Socket.all.push(this);}send(value:string){this.sent.push(value);}close(){this.readyState=3;this.onclose?.();}data(value:unknown){this.onmessage?.({data:JSON.stringify(value)});}}
  return {Peer,Connection,Socket};
});
vi.mock('peerjs',()=>({Peer:mocks.Peer}));vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
vi.stubGlobal('window',{innerWidth:1200,location:{href:'http://localhost/'}});vi.stubGlobal('location',{protocol:'http:',host:'localhost',href:'http://localhost/'});vi.stubGlobal('WebSocket',mocks.Socket);
vi.stubGlobal('document',{exitPointerLock:vi.fn()});
const {runtime,resetRuntime}=await import('../src/game/runtime');
const {connectServer,hostPeer,joinPeer}=await import('../src/game/network');
const {useGameStore}=await import('../src/state/store');
const welcome=(id='new')=>({type:'welcome',id,room:'R',mode:'pvp',layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION});
const snapshot=():GameSnapshot=>({worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick:1,time:0,room:'R',seed:1926,mode:'pvp',actors:[],projectiles:[],events:[],fields:[],cover:[],supplies:[],objectives:[],structures:[],rubble:[],checkpoint:null,phase:'active',winner:null});
afterEach(()=>{resetRuntime();useGameStore.setState({error:null,phase:'hangar'});vi.restoreAllMocks();vi.useRealTimers();});
describe('actual client transport callback ownership and mixed-build rejection',()=>{
  it('WSS declares current input protocol and ignores every late callback from an older deployment',()=>{
    connectServer(true);const old=mocks.Socket.all.at(-1)!;old.onopen?.();expect(JSON.parse(old.sent[0]).inputVersion).toBe(INPUT_PROTOCOL_VERSION);
    connectServer(true);const next=mocks.Socket.all.at(-1)!;next.onopen?.();next.data(welcome());next.data({type:'snapshot',state:snapshot()});
    const state=runtime.snapshot;old.data(welcome('old'));old.data({type:'snapshot',state:{...snapshot(),tick:99}});old.onerror?.();old.onclose?.();
    expect(runtime.localId).toBe('new');expect(runtime.snapshot).toBe(state);expect(useGameStore.getState().error).toBeNull();expect(useGameStore.getState().phase).toBe('playing');
    expect(runtime.sendInput?.(emptyInput())).toBe(true);expect(JSON.parse(next.sent.at(-1)!).type).toBe('input');
  });
  it('WSS rejects same-layout old welcome/snapshot versions clearly and does not admit unsafe life ACKs',()=>{
    connectServer(true);let ws=mocks.Socket.all.at(-1)!;ws.data({...welcome(),inputVersion:1});expect(useGameStore.getState()).toMatchObject({phase:'hangar',error:expect.stringContaining('input build')});
    connectServer(true);ws=mocks.Socket.all.at(-1)!;ws.data(welcome());ws.data({type:'snapshot',state:{...snapshot(),inputVersion:1}});expect(runtime.snapshot).toBeNull();expect(useGameStore.getState().phase).toBe('hangar');
    connectServer(true);ws=mocks.Socket.all.at(-1)!;ws.data(welcome());const bad=snapshot();bad.actors=[{id:'new',jumpEpoch:1,jumpProcessed:Infinity} as GameSnapshot['actors'][number]];ws.data({type:'snapshot',state:bad});expect(runtime.snapshot).toBeNull();
  });
  it('PeerJS guest declares current input protocol, rejects old same-layout host, and ignores retired connection data/close/error',async()=>{
    await joinPeer('host');const oldPeer=mocks.Peer.all.at(-1)!;oldPeer.emit('open');const old=oldPeer.connections[0];old.emit('open');expect(old.sent[0]).toMatchObject({inputVersion:INPUT_PROTOCOL_VERSION});
    await joinPeer('host');const peer=mocks.Peer.all.at(-1)!;peer.emit('open');const c=peer.connections[0];c.emit('open');c.emit('data',welcome());c.emit('data',{type:'snapshot',state:snapshot()});
    const state=runtime.snapshot;old.emit('data',welcome('old'));old.emit('data',{type:'snapshot',state:{...snapshot(),tick:99}});old.emit('close');old.emit('error',{message:'late'});oldPeer.emit('error',{message:'late'});
    expect(runtime.localId).toBe('new');expect(runtime.snapshot).toBe(state);expect(useGameStore.getState().error).toBeNull();
    c.emit('data',{...welcome(),inputVersion:1});expect(useGameStore.getState().error).toContain('input build');expect(useGameStore.getState().phase).toBe('hangar');
  });
  it('PeerJS host rejects legacy join and old close/data callbacks cannot remove or submit input to a redeployment',async()=>{
    await hostPeer();const oldPeer=mocks.Peer.all.at(-1)!;const oldSim={phase:'active',room:'R',mode:'pvp',addActor:vi.fn(),removeActor:vi.fn(),setInput:vi.fn(),snapshot,dispose:vi.fn()} as unknown as Simulation;runtime.sim=oldSim;
    const old=new mocks.Connection();oldPeer.emit('connection',old);old.emit('data',{type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,name:'G',chassis:'pounce',mode:'pvp',room:'R'});expect(oldSim.addActor).toHaveBeenCalledTimes(1);
    const strike={...emptyInput(),seq:1,strikeEpoch:1,strikeId:1,strike:true};old.emit('data',{type:'input',input:strike});old.emit('data',{type:'input',input:{...emptyInput(),seq:2,strikeEpoch:1}});expect(oldSim.setInput).toHaveBeenNthCalledWith(1,old.peer,{...strike,aimYaw:0});expect(oldSim.setInput).toHaveBeenCalledTimes(2);
    const legacy=new mocks.Connection();legacy.peer='legacy';oldPeer.emit('connection',legacy);legacy.emit('data',{type:'join',layoutVersion:WORLD_LAYOUT_VERSION,name:'G',chassis:'pounce',mode:'pvp',room:'R'});expect(legacy.sent[0]).toMatchObject({type:'error',message:expect.stringContaining('input build')});
    await hostPeer();const nextSim={...oldSim,addActor:vi.fn(),removeActor:vi.fn(),setInput:vi.fn(),dispose:vi.fn()} as unknown as Simulation;runtime.sim=nextSim;
    old.emit('data',{type:'input',input:emptyInput()});old.emit('close');old.emit('error');expect(nextSim.removeActor).not.toHaveBeenCalled();expect(nextSim.setInput).not.toHaveBeenCalled();
  });
});

function authority(){
  const sim={phase:'active',room:'R',mode:'pvp',physicsFailed:false,addActor:vi.fn(),removeActor:vi.fn(),setInput:vi.fn(),snapshot:vi.fn(snapshot),dispose:vi.fn(),latchPhysicsFailure:vi.fn(()=>{sim.physicsFailed=true;})};
  return sim;
}
const join={type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,name:'G',chassis:'pounce',mode:'pvp',room:'R'};
// These tests exercise the real joinPeer callbacks/admission with simulated
// transport events. They do not claim PeerJS's serializer/chunker was executed.
async function pendingGuest(){
  await joinPeer('snapshot-host');
  const peer=mocks.Peer.all.at(-1)!;peer.emit('open');
  const connection=peer.connections[0];connection.emit('open');
  return {peer,connection};
}
const unavailable=expect.stringContaining('could not finish joining');
describe('Peer guest first-compatible-snapshot deadline and binary transport',()=>{
  it('requests reliable binary transport and sends the ordinary versioned join envelope',async()=>{
    vi.useFakeTimers();const {peer,connection}=await pendingGuest();
    expect(peer.connectCalls).toEqual([{host:'snapshot-host',options:{reliable:true,serialization:'binary'}}]);
    expect(connection.sent).toHaveLength(1);
    expect(connection.sent[0]).toMatchObject({type:'join',layoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,create:false});
    expect(runtime.snapshot).toBeNull();expect(useGameStore.getState().phase).toBe('loading');
  });
  for(const packet of ['welcome','pong','malformed snapshot','invalid life ACK'] as const)it(`keeps the original 25 s deadline after ${packet}`,async()=>{
    vi.useFakeTimers();const {connection}=await pendingGuest();
    vi.advanceTimersByTime(12000);
    if(packet==='welcome')connection.emit('data',welcome());
    else if(packet==='pong')connection.emit('data',{type:'pong',time:performance.now()});
    else if(packet==='malformed snapshot')connection.emit('data',{type:'snapshot',state:{...snapshot(),actors:null}});
    else {const bad=snapshot();bad.actors=[{id:'new',jumpEpoch:1,jumpProcessed:Infinity,strikeProcessed:0,strikeEndedAt:-100,climb:null,strike:null} as GameSnapshot['actors'][number]];connection.emit('data',{type:'snapshot',state:bad});}
    expect(runtime.snapshot).toBeNull();expect(useGameStore.getState().phase).toBe('loading');expect(useGameStore.getState().error).toBeNull();
    vi.advanceTimersByTime(12999);expect(useGameStore.getState().error).toBeNull();
    vi.advanceTimersByTime(1);expect(useGameStore.getState()).toMatchObject({connection:'Disconnected',error:unavailable});
  });
  it('does not cancel the deadline when the real structural parser accepts but the local input admission rejects',async()=>{
    vi.useFakeTimers();const {connection}=await pendingGuest(),prior=runtime.admitInputSnapshot;
    // Isolate this distinct rejection stage without pretending to install the
    // browser input outbox or issuing fabricated authority acknowledgements.
    const reject=vi.fn(()=>false);runtime.admitInputSnapshot=reject;
    try{
      connection.emit('data',welcome());vi.advanceTimersByTime(24000);
      connection.emit('data',{type:'snapshot',state:snapshot()});
      expect(reject).toHaveBeenCalledTimes(1);expect(runtime.snapshot).toBeNull();expect(useGameStore.getState().phase).toBe('loading');
      vi.advanceTimersByTime(1000);expect(useGameStore.getState().error).toEqual(unavailable);
    }finally{runtime.admitInputSnapshot=prior;}
  });
  it('cancels only after the first accepted compatible snapshot and remains connected beyond the old deadline',async()=>{
    vi.useFakeTimers();const {connection}=await pendingGuest();
    connection.emit('data',welcome());vi.advanceTimersByTime(24999);
    const state=snapshot();connection.emit('data',{type:'snapshot',state});
    expect(runtime.snapshot).toMatchObject({tick:1,room:'R',worldLayoutVersion:WORLD_LAYOUT_VERSION});expect(useGameStore.getState().phase).toBe('playing');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(30000);expect(useGameStore.getState()).toMatchObject({connection:'Connected',error:null});
    expect(runtime.sendInput?.(emptyInput())).toBe(true);expect(connection.sent.at(-1)).toMatchObject({type:'input'});
  });
  for(const terminal of ['channel close','channel error','peer error','host error packet'] as const)it(`cancels and fences the pending join after ${terminal}`,async()=>{
    vi.useFakeTimers();const {peer,connection}=await pendingGuest();vi.advanceTimersByTime(10000);
    if(terminal==='channel close')connection.emit('close');
    else if(terminal==='channel error')connection.emit('error',{message:'Channel failed before snapshot'});
    else if(terminal==='peer error')peer.emit('error',{message:'Peer failed before snapshot'});
    else connection.emit('data',{type:'error',message:'Host refused admission'});
    const error=useGameStore.getState().error;expect(error).toBeTruthy();expect(useGameStore.getState().connection).toBe('Disconnected');
    expect(vi.getTimerCount()).toBe(0);
    connection.emit('data',welcome('late'));connection.emit('data',{type:'snapshot',state:snapshot()});
    vi.advanceTimersByTime(30000);
    expect(runtime.snapshot).toBeNull();expect(runtime.localId).not.toBe('late');expect(runtime.sendInput?.(emptyInput())??false).toBe(false);
    expect(useGameStore.getState()).toMatchObject({connection:'Disconnected',error});
  });
  it('intentional retirement cancels the pending timer and fences every old callback',async()=>{
    vi.useFakeTimers();const {peer,connection}=await pendingGuest();vi.advanceTimersByTime(10000);
    resetRuntime();useGameStore.setState({phase:'hangar',error:null,connection:'Offline'});
    expect(peer.destroyed).toBe(true);expect(connection.open).toBe(false);expect(vi.getTimerCount()).toBe(0);
    connection.emit('data',welcome('retired'));connection.emit('data',{type:'snapshot',state:snapshot()});connection.emit('error',{message:'Late channel'});peer.emit('error',{message:'Late peer'});
    vi.advanceTimersByTime(30000);expect(runtime.snapshot).toBeNull();expect(runtime.localId).toBe('local');expect(useGameStore.getState()).toMatchObject({phase:'hangar',connection:'Offline',error:null});
  });
  it('redeployment cancels the old timer without cancelling or shortening the replacement join deadline',async()=>{
    vi.useFakeTimers();const old=await pendingGuest();vi.advanceTimersByTime(10000);
    await pendingGuest();expect(old.peer.destroyed).toBe(true);expect(old.connection.open).toBe(false);expect(vi.getTimerCount()).toBe(1);
    old.connection.emit('data',welcome('old'));old.connection.emit('data',{type:'snapshot',state:snapshot()});old.connection.emit('close');old.connection.emit('error',{message:'Late channel'});old.peer.emit('error',{message:'Late peer'});
    vi.advanceTimersByTime(15000);expect(runtime.snapshot).toBeNull();expect(useGameStore.getState()).toMatchObject({phase:'loading',error:null});
    vi.advanceTimersByTime(9999);expect(useGameStore.getState().error).toBeNull();
    vi.advanceTimersByTime(1);expect(useGameStore.getState().error).toEqual(unavailable);
  });
});
describe('actual runtime and Peer callbacks retire failed authority generations',()=>{
  it('closes and removes an errored owned guest once without retiring the healthy host',async()=>{
    await hostPeer();const peer=mocks.Peer.all.at(-1)!,sim=authority(),connection=new mocks.Connection();
    runtime.sim=sim as unknown as Simulation;peer.connections.push(connection);peer.emit('connection',connection);connection.emit('data',join);
    const generation=runtime.generation,close=vi.spyOn(connection,'close');
    connection.emit('error',{type:'message-too-big',message:'Message too big for JSON channel'});
    expect(close).toHaveBeenCalledTimes(1);expect(sim.removeActor).toHaveBeenCalledExactlyOnceWith('guest');
    expect(connection.open).toBe(false);expect(runtime.generation).toBe(generation);expect(runtime.sim).toBe(sim);expect(peer.destroyed).toBe(false);
    connection.emit('data',{type:'input',input:emptyInput()});connection.emit('close');connection.emit('error',{message:'Duplicate failure'});
    expect(sim.setInput).not.toHaveBeenCalled();expect(sim.removeActor).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledTimes(1);
  });
  it('fences publication and input before attempting every independent cleanup',()=>{
    const sim=authority(),generation=runtime.generation,attempts:string[]=[],logged=vi.spyOn(console,'error').mockImplementation(()=>{});
    runtime.sim=sim as unknown as Simulation;runtime.snapshot=snapshot();runtime.sendInput=()=>true;runtime.broadcast=()=>{};runtime.reconcileInput=()=>{};
    const fenced=()=>{expect(runtime.generation).toBe(generation+1);expect(runtime.sim).toBeNull();expect(runtime.snapshot).toBeNull();expect(runtime.sendInput).toBeNull();expect(runtime.broadcast).toBeNull();expect(runtime.close).toBeNull();expect(runtime.resetInput).toBeNull();expect(runtime.reconcileInput).toBeNull();};
    runtime.resetInput=()=>{fenced();attempts.push('input');throw Error('Input cleanup');};runtime.close=()=>{fenced();attempts.push('transport');throw Error('Transport cleanup');};
    sim.dispose.mockImplementation(()=>{fenced();attempts.push('native');throw Error('Native cleanup');});
    const errors=resetRuntime();expect(errors).toHaveLength(3);expect(attempts).toEqual(['input','transport','native']);expect(sim.latchPhysicsFailure).toHaveBeenCalledTimes(1);expect(logged).toHaveBeenCalled();
  });
  for(const operation of ['input','close'] as const)it(`fences real host ${operation} callback failures and ignores every later callback`,async()=>{
    await hostPeer();const peer=mocks.Peer.all.at(-1)!,sim=authority(),connection=new mocks.Connection();runtime.sim=sim as unknown as Simulation;peer.connections.push(connection);peer.emit('connection',connection);connection.emit('data',join);
    expect(connection.sent.map(v=>(v as {type:string}).type)).toEqual(['welcome','snapshot']);const generation=runtime.generation;
    if(operation==='input'){sim.setInput.mockImplementation(()=>{throw Error('Input fault');});connection.emit('data',{type:'input',input:{...emptyInput(),seq:1}});}
    else {sim.removeActor.mockImplementation(()=>{throw Error('Removal fault');});connection.emit('close');}
    expect(sim.physicsFailed).toBe(true);expect(runtime.generation).toBe(generation+1);expect(runtime.sim).toBeNull();expect(runtime.snapshot).toBeNull();expect(peer.destroyed).toBe(true);expect(useGameStore.getState()).toMatchObject({phase:'hangar',connection:'Disconnected'});
    const next=authority();runtime.sim=next as unknown as Simulation;connection.emit('data',{type:'input',input:emptyInput()});connection.emit('close');connection.emit('error');peer.emit('error',{message:'Late callback'});
    expect(next.setInput).not.toHaveBeenCalled();expect(next.removeActor).not.toHaveBeenCalled();expect(next.physicsFailed).toBe(false);expect(runtime.sim).toBe(next);
  });
  it('sends no welcome from a failed host join snapshot and closes the pending channel',async()=>{
    await hostPeer();const peer=mocks.Peer.all.at(-1)!,sim=authority(),connection=new mocks.Connection();runtime.sim=sim as unknown as Simulation;peer.connections.push(connection);peer.emit('connection',connection);
    sim.snapshot.mockImplementation(()=>{throw Error('Join snapshot fault');});const generation=runtime.generation;connection.emit('data',join);
    expect(connection.sent).toEqual([]);expect(connection.open).toBe(false);expect(peer.destroyed).toBe(true);expect(runtime.generation).toBe(generation+1);expect(runtime.sim).toBeNull();expect(sim.physicsFailed).toBe(true);
  });
  it('attempts joined and pending Peer channels and destroy after an independent close fault',async()=>{
    await hostPeer();const peer=mocks.Peer.all.at(-1)!,sim=authority(),first=new mocks.Connection(),second=new mocks.Connection(),pending=new mocks.Connection();second.peer='second';pending.peer='pending';runtime.sim=sim as unknown as Simulation;
    for(const connection of [first,second,pending]){peer.connections.push(connection);peer.emit('connection',connection);}first.emit('data',join);second.emit('data',join);
    first.close=()=>{throw Error('First channel cleanup fault');};const logged=vi.spyOn(console,'error').mockImplementation(()=>{}),generation=runtime.generation;
    const errors=resetRuntime();expect(errors).toHaveLength(1);expect(second.open).toBe(false);expect(pending.open).toBe(false);expect(peer.destroyed).toBe(true);expect(runtime.generation).toBe(generation+1);expect(sim.dispose).toHaveBeenCalled();expect(logged).toHaveBeenCalled();
  });
  it('still destroys a guest Peer if its channel close throws',async()=>{
    await joinPeer('host');const peer=mocks.Peer.all.at(-1)!;peer.emit('open');const connection=peer.connections[0];connection.close=()=>{throw Error('Guest channel cleanup fault');};
    const logged=vi.spyOn(console,'error').mockImplementation(()=>{});expect(resetRuntime()).toHaveLength(1);expect(peer.destroyed).toBe(true);expect(runtime.sendInput).toBeNull();expect(logged).toHaveBeenCalled();
  });
  it('cancels every pending join timer even when closing that channel throws',async()=>{
    vi.useFakeTimers();const logged=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{await hostPeer();const peer=mocks.Peer.all.at(-1)!,pending=new mocks.Connection();peer.connections.push(pending);peer.emit('connection',pending);const close=vi.fn(()=>{throw Error('Pending close fault');});pending.close=close;
      expect(resetRuntime()).toHaveLength(1);const attempts=close.mock.calls.length;vi.advanceTimersByTime(30000);expect(close).toHaveBeenCalledTimes(attempts);expect(peer.destroyed).toBe(true);expect(logged).toHaveBeenCalled();
    }finally{vi.useRealTimers();}
  });
  it('owns and cancels deferred version-rejection closes before retiring a generation',async()=>{
    vi.useFakeTimers();const logged=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{await hostPeer();const peer=mocks.Peer.all.at(-1)!,pending=new mocks.Connection();peer.connections.push(pending);peer.emit('connection',pending);pending.emit('data',{...join,inputVersion:1});expect(pending.sent[0]).toMatchObject({type:'error'});
      const close=vi.fn(()=>{throw Error('Rejected channel cleanup fault');});pending.close=close;expect(resetRuntime()).toHaveLength(1);const attempts=close.mock.calls.length;vi.advanceTimersByTime(30000);expect(close).toHaveBeenCalledTimes(attempts);expect(logged).toHaveBeenCalled();
    }finally{vi.useRealTimers();}
  });
  it('does not send a join snapshot after synchronous welcome-close retirement',async()=>{
    await hostPeer();const peer=mocks.Peer.all.at(-1)!,sim=authority(),connection=new mocks.Connection();runtime.sim=sim as unknown as Simulation;peer.connections.push(connection);peer.emit('connection',connection);sim.removeActor.mockImplementation(()=>{throw Error('Welcome-close removal fault');});
    const send=connection.send.bind(connection);connection.send=value=>{send(value);if((value as {type:string}).type==='welcome')connection.close();};connection.emit('data',join);
    expect(connection.sent.map(v=>(v as {type:string}).type)).toEqual(['welcome']);expect(runtime.sim).toBeNull();expect(sim.physicsFailed).toBe(true);expect(peer.destroyed).toBe(true);
  });
  it('does not publish to a later guest after a synchronous send-close retires the host',async()=>{
    await hostPeer();const peer=mocks.Peer.all.at(-1)!,sim=authority(),first=new mocks.Connection(),second=new mocks.Connection();second.peer='second';runtime.sim=sim as unknown as Simulation;
    for(const c of [first,second]){peer.connections.push(c);peer.emit('connection',c);c.emit('data',join);}sim.removeActor.mockImplementation(()=>{throw Error('Broadcast-close removal fault');});
    first.send=()=>{first.close();};second.close=()=>{throw Error('Later close fault');};const before=second.sent.length,logged=vi.spyOn(console,'error').mockImplementation(()=>{});
    runtime.broadcast?.(snapshot());expect(runtime.sim).toBeNull();expect(second.sent).toHaveLength(before);expect(second.open).toBe(true);expect(runtime.broadcast).toBeNull();expect(logged).toHaveBeenCalled();
  });
});

import type {WebSocket} from 'ws';
import {randomUUID} from 'node:crypto';
import type {Simulation} from '../shared/simulation';
import type {GameSnapshot,JoinRequest} from '../shared/types';
import {arenaClock,arenaRoomClock,beginArenaClock,endArenaClock,recordArenaClock} from './arenaDiagnostics';

export interface ArenaRoom {sim:Simulation;members:Set<WebSocket>;emptyAt:number}
export interface ArenaClient {id:string;room:string;rateAt:number;messages:number}
type Rooms=Map<string,ArenaRoom>;
type Clients=Map<WebSocket,ArenaClient>;
const failureMessage=JSON.stringify({type:'error',message:'The arena stopped unexpectedly. Create a fresh deployment to play again.'});
const publications=new WeakMap<ArenaRoom,{roomEpoch:string;sequence:number}>();
/** Stamp one committed publication, not a simulation step. The same broadcast
 * snapshot/identity is encoded once for all members; bootstrap is a distinct
 * publication even when admission has not advanced tick or time. */
function publishSnapshot(rooms:Rooms,code:string,room:ArenaRoom,kind:'bootstrap'|'broadcast'):GameSnapshot {
  if(rooms.get(code)!==room)throw Error('Cannot publish a retired arena');
  const state=room.sim.snapshot(),previous=publications.get(room)??{roomEpoch:randomUUID(),sequence:0};
  if(!Number.isSafeInteger(previous.sequence+1))throw Error('Arena publication identity exhausted');
  const publication={roomEpoch:previous.roomEpoch,sequence:previous.sequence+1,kind};
  publications.set(room,{roomEpoch:publication.roomEpoch,sequence:publication.sequence});
  return {...state,publication};
}
function stopSocket(ws:WebSocket,errors:unknown[]):void {
  try{if(ws.readyState===1&&ws.bufferedAmount<256000)ws.send(failureMessage);}catch(error){errors.push(error);}
  try{ws.close(1011,'Arena stopped');}catch(error){errors.push(error);try{ws.terminate();}catch(terminationError){errors.push(terminationError);}}
}

/** Remove callback/publication registrations before any fallible socket/native
 * cleanup. A retired world is freed and is never returned to the room registry. */
export function retireArenaRoom(rooms:Rooms,clients:Clients,code:string,room:ArenaRoom,error:unknown):unknown[]{
  if(rooms.get(code)!==room)return [];
  // Preserve the original cause before fallible native/socket cleanup replaces
  // context. Tick/time are scalar authority receipts, not a new snapshot call.
  console.error('Arena retired',{room:code,tick:room.sim.tick,time:room.sim.time,members:room.members.size},error);
  recordArenaClock(arenaClock,code,'retired',{at:performance.now(),wall:Date.now(),...arenaRoomClock(room.sim),members:room.members.size,cause:error instanceof Error?error.message:String(error)});
  rooms.delete(code);publications.delete(room);const sockets=new Set(room.members);room.members.clear();
  for(const [ws,client] of clients)if(client.room===code){sockets.add(ws);clients.delete(ws);}
  room.sim.latchPhysicsFailure(error);
  const errors:unknown[]=[],cleanup=(operation:()=>void)=>{try{operation();}catch(cleanupError){errors.push(cleanupError);}};
  for(const ws of sockets)stopSocket(ws,errors);
  cleanup(()=>room.sim.dispose());cleanup(()=>room.sim.world.free());
  if(errors.length)console.error('Arena retirement cleanup failed',...errors);
  return errors;
}

export function admitArenaActor(rooms:Rooms,clients:Clients,code:string,room:ArenaRoom,ws:WebSocket,id:string,join:Pick<JoinRequest,'name'|'chassis'>):GameSnapshot|null {
  let state:GameSnapshot;
  try{if(rooms.get(code)!==room)throw Error('Cannot admit to a retired arena');room.sim.addActor(id,join.name,join.chassis);state=publishSnapshot(rooms,code,room,'bootstrap');}catch(error){const errors=retireArenaRoom(rooms,clients,code,room,error);stopSocket(ws,errors);if(errors.length)console.error('Arena join retirement failed',...errors);return null;}
  room.members.add(ws);room.emptyAt=0;clients.set(ws,{id,room:code,rateAt:performance.now(),messages:0});return state;
}

export function removeArenaClient(rooms:Rooms,clients:Clients,ws:WebSocket):void {
  const client=clients.get(ws);if(!client)return;const room=rooms.get(client.room);
  clients.delete(ws);room?.members.delete(ws);if(room?.members.size===0)room.emptyAt=performance.now();
  if(room)try{room.sim.removeActor(client.id);}catch(error){retireArenaRoom(rooms,clients,client.room,room,error);}
}

export function advanceArenaRooms(rooms:Rooms,clients:Clients,dt:number):void {
  for(const [code,room] of [...rooms])if(room.members.size){const start=beginArenaClock(),before=arenaClock.enabled?arenaRoomClock(room.sim):null,previousObserver=room.sim.onStepTiming,previousBotObserver=room.sim.onBotTiming,previousPathObserver=room.sim.onNavigationTiming,stages:Record<string,number>|null=start?{}:null;
    if(stages){room.sim.onStepTiming=(kind,ms)=>{stages[kind]=(stages[kind]??0)+ms;};
      room.sim.onBotTiming=row=>{if(row.durationMs>=5)recordArenaClock(arenaClock,code,'bot',{...row,at:performance.now(),wall:Date.now()});};
      room.sim.onNavigationTiming=row=>recordArenaClock(arenaClock,code,'navigation',{actor:row.actor,role:row.role,aiState:row.aiState,tick:row.tick,time:row.time,at:performance.now(),wall:Date.now(),durationMs:row.durationMs,fromX:row.from.x,fromY:row.from.y,fromZ:row.from.z,toX:row.to.x,toY:row.to.y,toZ:row.to.z,result:row.result,freeHits:row.freeHits,freeMisses:row.freeMisses,pointCalls:row.pointCalls,gridMs:row.grids.reduce((n,g)=>n+g.durationMs,0),gridCacheHits:row.grids.filter(g=>g.cacheHit).length,gridExplored:row.grids.reduce((n,g)=>n+g.explored,0),gridOpenMax:Math.max(0,...row.grids.map(g=>g.openMax)),gridComparisons:row.grids.reduce((n,g)=>n+g.comparisons,0),gridPushes:row.grids.reduce((n,g)=>n+g.pushes,0),gridDuplicates:row.grids.reduce((n,g)=>n+g.duplicates,0),streetMs:row.street.durationMs,streetNodes:row.street.nodes,streetSamples:row.street.samples});
    }
    try{room.sim.step(dt);}catch(error){retireArenaRoom(rooms,clients,code,room,error);}
    finally{if(start){room.sim.onStepTiming=previousObserver;room.sim.onBotTiming=previousBotObserver;room.sim.onNavigationTiming=previousPathObserver;recordArenaClock(arenaClock,code,'step',{...endArenaClock(start),tickBefore:before!.tick,timeBefore:before!.time,...arenaRoomClock(room.sim),members:room.members.size,worldStepMs:stages!['world-step']??0,botInputMs:stages!['bot-input']??0,pairMs:stages!['pair']??0,climbMs:stages!['climb']??0,locomotionMs:stages!['locomotion']??0});}}
  }
}

export function broadcastArenaRooms(rooms:Rooms,clients:Clients):void {
  for(const [code,room] of [...rooms])if(room.members.size){
    let data:string;try{
      const snapshotAt=beginArenaClock(),state=publishSnapshot(rooms,code,room,'broadcast');if(snapshotAt)recordArenaClock(arenaClock,code,'snapshot',{...endArenaClock(snapshotAt),...arenaRoomClock(room.sim)});
      const encodeAt=beginArenaClock();data=JSON.stringify({type:'snapshot',state});if(encodeAt)recordArenaClock(arenaClock,code,'encode',{...endArenaClock(encodeAt),...arenaRoomClock(room.sim),bytes:Buffer.byteLength(data)});
    }catch(error){retireArenaRoom(rooms,clients,code,room,error);continue;}
    for(const ws of room.members){
      const start=beginArenaClock(),row=start?{...arenaRoomClock(room.sim),client:clients.get(ws)?.id??'unknown',bufferedBefore:ws.bufferedAmount,readyState:ws.readyState,bytes:Buffer.byteLength(data)}:null;
      if(ws.readyState===1&&ws.bufferedAmount<256000)try{
        if(start)ws.send(data,error=>recordArenaClock(arenaClock,code,'send-callback',{...row!,...endArenaClock(start),bufferedAfter:ws.bufferedAmount,error:error?.message??null}));else ws.send(data);
        if(start)recordArenaClock(arenaClock,code,'send',{...row!,...endArenaClock(start),bufferedAfter:ws.bufferedAmount});
      }catch{try{ws.close();}catch{/* Native room state remains valid; normal close retires this member. */}}
      else if(start)recordArenaClock(arenaClock,code,'send-skipped',{...row!,...endArenaClock(start),reason:ws.readyState===1?'buffer-cap':'not-open'});
    }
  }
}

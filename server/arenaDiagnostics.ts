/** Opt-in bounded observations. None of these receipts changes admission or
 * advances a clock. Wall timestamps correlate with browser evidence; monotonic
 * timestamps and process CPU distinguish elapsed cost from scheduling delay. */
export type ArenaClockRow=Record<string,string|number|boolean|null>;
export interface ArenaClockStore {enabled:boolean;rooms:Map<string,{counts:Record<string,number>;totalMs:Record<string,number>;maxMs:Record<string,number>;latest:Record<string,ArenaClockRow>;inputs:Map<string,ArenaClockRow>;history:ArenaClockRow[]}>;pump:ArenaClockRow[];pumpCount:number;clippedMs:number;}
export function createArenaClockStore(enabled=false):ArenaClockStore{return {enabled,rooms:new Map(),pump:[],pumpCount:0,clippedMs:0};}
export const arenaClock=createArenaClockStore(process.env.KITTYMECH_ARENA_DIAGNOSTICS==='1');
const boundedPush=(rows:ArenaClockRow[],row:ArenaClockRow)=>{if(rows.length===64)rows.shift();rows.push({...row});};
const stepStages=['worldStepMs','botInputMs','pairMs','climbMs','locomotionMs'] as const;
export function recordArenaClock(store:ArenaClockStore,room:string,kind:string,row:ArenaClockRow){
  if(!store.enabled)return;
  let data=store.rooms.get(room);if(!data){if(store.rooms.size===32)store.rooms.delete(store.rooms.keys().next().value!);data={counts:{},totalMs:{},maxMs:{},latest:{},inputs:new Map(),history:[]};store.rooms.set(room,data);}
  data.counts[kind]=(data.counts[kind]??0)+1;
  if(typeof row.durationMs==='number'){data.totalMs[kind]=(data.totalMs[kind]??0)+row.durationMs;if((kind==='step'||kind==='bot'||kind==='navigation')&&row.durationMs>(data.maxMs[kind]??-1))data.latest['slowest-'+kind]={...row};data.maxMs[kind]=Math.max(data.maxMs[kind]??0,row.durationMs);}
  if(kind==='step')for(const stage of stepStages){const value=row[stage];if(typeof value==='number'){data.totalMs[stage]=(data.totalMs[stage]??0)+value;data.maxMs[stage]=Math.max(data.maxMs[stage]??0,value);}}
  data.latest[kind]={...row};boundedPush(data.history,{kind,...row});
  if(kind==='input'&&typeof row.client==='string'){if(!data.inputs.has(row.client)&&data.inputs.size===8)data.inputs.delete(data.inputs.keys().next().value!);data.inputs.set(row.client,{...row});}
}
export function recordArenaPump(store:ArenaClockStore,row:ArenaClockRow){if(!store.enabled)return;store.pumpCount++;store.clippedMs+=typeof row.clippedMs==='number'?row.clippedMs:0;boundedPush(store.pump,row);}
export function readArenaClock(store=arenaClock){
  if(!store.enabled)return null;
  return {wall:Date.now(),at:performance.now(),pumpCount:store.pumpCount,clippedMs:store.clippedMs,pump:store.pump.map(row=>({...row})),rooms:[...store.rooms].map(([room,data])=>({room,counts:{...data.counts},totalMs:{...data.totalMs},maxMs:{...data.maxMs},latest:Object.fromEntries(Object.entries(data.latest).map(([kind,row])=>[kind,{...row}])),inputs:[...data.inputs.values()].map(row=>({...row})),history:data.history.map(row=>({...row}))}))};
}
export function beginArenaClock(){return arenaClock.enabled?{at:performance.now(),wall:Date.now(),cpu:process.cpuUsage()}:null;}
export function endArenaClock(start:ReturnType<typeof beginArenaClock>):ArenaClockRow {if(!start)return {};const cpu=process.cpuUsage(start.cpu);return {at:performance.now(),wall:Date.now(),startedAt:start.at,startedWall:start.wall,durationMs:performance.now()-start.at,cpuMs:(cpu.user+cpu.system)/1000};}
export function arenaRoomClock(sim:{tick:number;time:number;phase:string}){return {tick:sim.tick,time:sim.time,phase:sim.phase};}

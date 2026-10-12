import type {AreaEffectKind,AreaFieldState,CombatEvent,GameSnapshot,Vec3} from '../../../shared/types';
import {AREA_STYLES} from './areaPresentation';

const point=(p:Vec3)=>!!p&&[p.x,p.y,p.z].every(n=>Number.isFinite(n)&&Math.abs(n)<10000);
const radius=(r:number|undefined):r is number=>typeof r==='number'&&Number.isFinite(r)&&r>0&&r<=32;
/** Decorative ages use native authority time where available. Guests may smooth
 * at most75ms past the last admitted snapshot, then freeze on a stalled stream.
 * This clock does not decide expiry, damage, protection or healing. */
export function effectDisplayTime(snapshotTime:number,nativeTime:number|undefined,receivedAge:number,paused=false):number {
  if(!Number.isFinite(snapshotTime))return 0;
  if(nativeTime!==undefined&&Number.isFinite(nativeTime)&&nativeTime>=snapshotTime&&nativeTime<=snapshotTime+.25)return nativeTime;
  return snapshotTime+(paused||!Number.isFinite(receivedAge)?0:Math.max(0,Math.min(.075,receivedAge)));
}
export interface EffectClock {key:string;snapshotTime:number;time:number;}
export const createEffectClock=():EffectClock=>({key:'',snapshotTime:-Infinity,time:0});
export function advanceEffectClock(clock:EffectClock,key:string,snapshotTime:number,nativeTime:number|undefined,receivedAge:number,paused=false):number {
  const candidate=effectDisplayTime(snapshotTime,nativeTime,receivedAge,paused);
  if(key!==clock.key||snapshotTime<clock.snapshotTime){clock.key=key;clock.time=candidate;}else clock.time=Math.max(clock.time,candidate);
  clock.snapshotTime=snapshotTime;return clock.time;
}
export function burstKind(e:CombatEvent):AreaEffectKind|null {
  if(!e||!Number.isSafeInteger(e.id)||e.id<0||!Number.isFinite(e.at)||!point(e.position)||!radius(e.radius))return null;
  if(e.direction!==undefined&&!Number.isFinite(e.direction))return null;
  if(e.type==='area'&&e.effect==='rake')return 'rake';
  if((e.type==='area'||e.type==='pounce'||e.type==='explosion')&&e.effect==='shockwave')return 'shockwave';
  if((e.type==='repair'||e.type==='area')&&e.effect==='repair')return 'repair';
  // A Pounce takeoff/air strike or Lynx dash is not a landing AoE.
  return null;
}
export function visibleAreaEvents(snapshot:GameSnapshot,time:number):CombatEvent[] {
  return snapshot.events.filter(e=>{const k=burstKind(e);return k!==null&&time>=e.at&&time-e.at<AREA_STYLES[k].lifetime;}).slice(-16);
}
export function visibleAreaFields(snapshot:GameSnapshot,time:number):AreaFieldState[] {
  return (snapshot.fields??[]).filter(f=>f&&(f.kind==='shield'||f.kind==='repair'||f.kind==='snare')&&Number.isSafeInteger(f.id)&&f.id>=0&&point(f.position)&&radius(f.radius)&&Number.isFinite(f.born)&&Number.isFinite(f.expires)&&f.expires>f.born&&time>=f.born&&time<f.expires&&snapshot.actors.some(a=>a.id===f.owner&&a.hp>0)).slice(0,12);
}
export function areaArenaKey(generation:number,snapshot:Pick<GameSnapshot,'room'|'seed'>):string {return `${generation}:${snapshot.room}:${snapshot.seed}`;}

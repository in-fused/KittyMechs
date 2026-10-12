import type {Vec3} from './types';
export type NativeRotation003={x:number;y:number;z:number;w:number};
export interface NativeOwner003 {id:string;revision:string;handle:number;position:Vec3;rotation:NativeRotation003;shapeType:number;}
export interface NativeContact003 {support:NativeOwner003|null;supportQuery:NativeOwner003|null;reportedHandle:number|null;toi:number;witnessWorld:Vec3;witnessCharacterLocal:Vec3;normalWorld:Vec3;normalCharacterLocal:Vec3;applied:Vec3;remaining:Vec3;}
/** Server-native metres/Y-up. Query contacts precede the native world step;
 * current hull/support poses are readbacks at nativeStepTick; an external unobserved world step is not invented. */
export interface FelineNativePose003 {
  version:1;nativeStepTick:number;localPosition:Vec3;localRotation:NativeRotation003;worldId:string;actorId:string;life:number;tick:number;time:number;
  phase:'current-native-readback';enabled:boolean;hull:NativeOwner003;
  shape:{kind:'RoundCylinder';halfHeight:number;radius:number;borderRadius:number};
  movement:{life:number;tick:number;time:number;phase:'locomotion-query-before-world-step';computed:boolean;grounded:boolean;requested:Vec3;hullAtQuery:NativeOwner003|null;delta:Vec3;contacts:NativeContact003[]};
}
const vector=(v:unknown):v is Vec3=>!!v&&typeof v==='object'&&['x','y','z'].every(k=>typeof(v as Record<string,unknown>)[k]==='number'&&Number.isFinite((v as Record<string,unknown>)[k]));
const quat=(v:unknown):v is NativeRotation003=>vector(v)&&typeof(v as NativeRotation003).w==='number'&&Number.isFinite((v as NativeRotation003).w)&&Math.abs(Math.hypot(v.x,v.y,v.z,(v as NativeRotation003).w)-1)<1e-4;
function owner(v:unknown):v is NativeOwner003 {if(!v||typeof v!=='object')return false;const o=v as NativeOwner003;return typeof o.id==='string'&&o.id.length>0&&o.id.length<=192&&typeof o.revision==='string'&&o.revision.length<=512&&Number.isFinite(o.handle)&&Number.isInteger(o.shapeType)&&vector(o.position)&&quat(o.rotation);}
/** Missing is backwards-compatible; malformed present data rejects atomically.
 * A detached result protects render history from mutable sender objects. */
export function parseFelineNativePose003(value:unknown,actorId:string,life:number,tick:number,time:number,previous?:FelineNativePose003):FelineNativePose003|undefined|null {
  if(value===undefined)return undefined;if(!value||typeof value!=='object')return null;
  const p=value as FelineNativePose003,m=p.movement,s=p.shape;
  if(p.version!==1||!Number.isSafeInteger(p.nativeStepTick)||p.nativeStepTick< -1||p.nativeStepTick>tick||!vector(p.localPosition)||!quat(p.localRotation)||typeof p.worldId!=='string'||!p.worldId.length||p.worldId.length>96||p.actorId!==actorId||p.life!==life||p.tick!==tick||p.time!==time||p.phase!=='current-native-readback'||typeof p.enabled!=='boolean'||!owner(p.hull)||p.hull.shapeType!==14||!s||s.kind!=='RoundCylinder'||p.hull.revision!==JSON.stringify(s)||![s.halfHeight,s.radius,s.borderRadius].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)||!m||!Number.isSafeInteger(m.life)||m.life< -1||m.life>life||!Number.isSafeInteger(m.tick)||m.tick< -1||m.tick>tick||!Number.isFinite(m.time)||m.time< -1||m.time>time||m.phase!=='locomotion-query-before-world-step'||typeof m.computed!=='boolean'||typeof m.grounded!=='boolean'||!vector(m.delta)||!vector(m.requested)||m.hullAtQuery!==null&&!owner(m.hullAtQuery)||!Array.isArray(m.contacts)||m.contacts.length>64||m.computed!==(m.tick>=0)||m.computed!==(m.life>=0)||m.computed!==(m.time>=0)||m.computed!==(m.hullAtQuery!==null)||!m.computed&&m.contacts.length)return null;
  if(previous&&(previous.worldId!==p.worldId||previous.nativeStepTick>p.nativeStepTick||previous.tick>p.tick||previous.life>p.life||previous.life===p.life&&previous.movement.tick>m.tick))return null;
  for(const c of m.contacts)if(!c||c.support!==null&&!owner(c.support)||c.supportQuery!==null&&!owner(c.supportQuery)||c.reportedHandle!==null&&!Number.isFinite(c.reportedHandle)||!Number.isFinite(c.toi)||c.toi<0||c.toi>1||![c.witnessWorld,c.witnessCharacterLocal,c.normalWorld,c.normalCharacterLocal,c.applied,c.remaining].every(vector)||Math.abs(Math.hypot(c.normalWorld.x,c.normalWorld.y,c.normalWorld.z)-1)>1e-4||Math.abs(Math.hypot(c.normalCharacterLocal.x,c.normalCharacterLocal.y,c.normalCharacterLocal.z)-1)>1e-4)return null;
  return structuredClone(p);
}

import type {Vec3} from './types';
import {finiteContactEvidence004,type RawContact004,type ContactFrame004} from './felineContactFrame004';
export type NativeRotation004={x:number;y:number;z:number;w:number};
export interface NativeOwner004 {id:string;revision:string;handle:number;position:Vec3;rotation:NativeRotation004;shapeType:number;}
export interface NativeContact004 {support:NativeOwner004|null;supportQuery:NativeOwner004|null;reportedHandle:number|null;toi:number;raw:RawContact004;frame:ContactFrame004;applied:Vec3;remaining:Vec3;}
/** Server-native metres/Y-up. Query contacts precede the native world step;
 * current hull/support poses are readbacks at nativeStepTick; an external unobserved world step is not invented. */
export interface FelineNativePose004 {
  version:2;nativeStepTick:number;localPosition:Vec3;localRotation:NativeRotation004;worldId:string;actorId:string;life:number;tick:number;time:number;
  phase:'current-native-readback';enabled:boolean;hull:NativeOwner004;
  shape:{kind:'RoundCylinder';halfHeight:number;radius:number;borderRadius:number};
  movement:{life:number;tick:number;time:number;phase:'locomotion-query-before-world-step';computed:boolean;grounded:boolean;requested:Vec3;hullAtQuery:NativeOwner004|null;delta:Vec3;contacts:NativeContact004[]};
}
const vector=(v:unknown):v is Vec3=>!!v&&typeof v==='object'&&['x','y','z'].every(k=>typeof(v as Record<string,unknown>)[k]==='number'&&Number.isFinite((v as Record<string,unknown>)[k]));
const quat=(v:unknown):v is NativeRotation004=>vector(v)&&typeof(v as NativeRotation004).w==='number'&&Number.isFinite((v as NativeRotation004).w)&&Math.abs(Math.hypot(v.x,v.y,v.z,(v as NativeRotation004).w)-1)<1e-4;
function owner(v:unknown):v is NativeOwner004 {if(!v||typeof v!=='object')return false;const o=v as NativeOwner004;return typeof o.id==='string'&&o.id.length>0&&o.id.length<=192&&typeof o.revision==='string'&&o.revision.length<=512&&Number.isFinite(o.handle)&&Number.isInteger(o.shapeType)&&vector(o.position)&&quat(o.rotation);}
/** Missing is backwards-compatible; malformed present data rejects atomically.
 * A detached result protects render history from mutable sender objects. */
export function parseFelineNativePose004(value:unknown,actorId:string,life:number,tick:number,time:number,previous?:FelineNativePose004):FelineNativePose004|undefined|null {
  if(value===undefined)return undefined;if(!value||typeof value!=='object')return null;
  const p=value as FelineNativePose004,m=p.movement,s=p.shape;
  if(p.version!==2||!Number.isSafeInteger(p.nativeStepTick)||p.nativeStepTick< -1||p.nativeStepTick>tick||!vector(p.localPosition)||!quat(p.localRotation)||typeof p.worldId!=='string'||!p.worldId.length||p.worldId.length>96||p.actorId!==actorId||p.life!==life||p.tick!==tick||p.time!==time||p.phase!=='current-native-readback'||typeof p.enabled!=='boolean'||!owner(p.hull)||p.hull.shapeType!==14||!s||s.kind!=='RoundCylinder'||p.hull.revision!==JSON.stringify(s)||![s.halfHeight,s.radius,s.borderRadius].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)||!m||!Number.isSafeInteger(m.life)||m.life< -1||m.life>life||!Number.isSafeInteger(m.tick)||m.tick< -1||m.tick>tick||!Number.isFinite(m.time)||m.time< -1||m.time>time||m.phase!=='locomotion-query-before-world-step'||typeof m.computed!=='boolean'||typeof m.grounded!=='boolean'||!vector(m.delta)||!vector(m.requested)||m.hullAtQuery!==null&&!owner(m.hullAtQuery)||!Array.isArray(m.contacts)||m.contacts.length>64||m.computed!==(m.tick>=0)||m.computed!==(m.life>=0)||m.computed!==(m.time>=0)||m.computed!==(m.hullAtQuery!==null)||!m.computed&&m.contacts.length)return null;
  if(previous&&(previous.worldId!==p.worldId||previous.nativeStepTick>p.nativeStepTick||previous.tick>p.tick||previous.life>p.life||previous.life===p.life&&previous.movement.tick>m.tick))return null;
  for(const c of m.contacts)if(!c||c.support!==null&&!owner(c.support)||c.supportQuery!==null&&!owner(c.supportQuery)||c.reportedHandle!==null&&!Number.isFinite(c.reportedHandle)||!c.frame||!['UNKNOWN','WORLD_SURFACE_CORRESPONDENT'].includes(c.frame.status)||c.frame.binding!=='worldWitness1/worldWitness2/worldNormal1/worldNormal2'||!Array.isArray(c.frame.checks)||c.frame.checks.length>9||typeof c.frame.reason!=='string'||!Number.isFinite(c.toi)||c.toi<0||c.toi>1||![c.raw?.witness1,c.raw?.witness2,c.raw?.normal1,c.raw?.normal2,c.applied,c.remaining].every(vector)||Math.abs(Math.hypot(c.raw.normal1.x,c.raw.normal1.y,c.raw.normal1.z)-1)>1e-4||Math.abs(Math.hypot(c.raw.normal2.x,c.raw.normal2.y,c.raw.normal2.z)-1)>1e-4)return null;
  try{finiteContactEvidence004(p);}catch{return null;}return structuredClone(p);
}


export function currentNativePoseQualification004(p:FelineNativePose004):string|null {if(!p.enabled||p.nativeStepTick!==p.tick||!p.movement.computed||p.movement.tick!==p.tick||p.movement.life!==p.life)return 'STALE_OR_UNOBSERVED_NATIVE_STEP004';if(p.movement.contacts.some(c=>c.frame.status!=='WORLD_SURFACE_CORRESPONDENT'))return 'CONTACT_FRAME_UNKNOWN004';return null;}



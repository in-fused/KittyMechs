import {Bone,Euler,Quaternion,type Object3D} from 'three';
import type {Chassis,FelineStrikeState} from '../../../shared/types';

/** Adapter input, copied from a confirmed authoritative action at presented time.
 * No input button, packet arrival time or local ability timer arms this pose. */
export type FelineStrikeClock=FelineStrikeState;
export interface FelineStrikePresentation {
  life:number;interrupted?:boolean;
}
export const FELINE_STRIKE_BONES=['pelvis','spine','chest','head','FL_upper','FL_lower','FL_paw','FR_upper','FR_lower','FR_paw','HL_upper','HL_lower','HL_paw','HR_upper','HR_lower','HR_paw','tail_0','tail_1','tail_2','tail_3','tail_4'] as const;
export type FelineStrikeBone=typeof FELINE_STRIKE_BONES[number];
export interface FelineStrikeRotation {x:number;y:number;z:number;}
export interface FelineStrikePose {
  actionId:number|null;life:number|null;weight:number;phase:number;bodyPitch:number;bodyRoll:number;
  rotations:Record<FelineStrikeBone,FelineStrikeRotation>;
}
export const FELINE_STRIKE_ENTRY:Readonly<Record<Chassis,number>>={pounce:.1,bastion:.16,lynx:.07,caracal:.12};
export function createFelineStrikePose():FelineStrikePose {
  const rotations=Object.fromEntries(FELINE_STRIKE_BONES.map(name=>[name,{x:0,y:0,z:0}])) as FelineStrikePose['rotations'];
  return {actionId:null,life:null,weight:0,phase:0,bodyPitch:0,bodyRoll:0,rotations};
}
const ease=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
function clear(out:FelineStrikePose):void {
  out.actionId=out.life=null;out.weight=out.phase=out.bodyPitch=out.bodyRoll=0;
  for(const name of FELINE_STRIKE_BONES){const r=out.rotations[name];r.x=r.y=r.z=0;}
}
/** Stateless clock sampling supports midflight late join and frozen presentation
 * clocks. Recovery begins at its confirmed stage clock with continuous weight.
 * Local rotations compose over shipping FelineAir, never replace its bind or gait.
 * These are original procedural compositions, not imported animation clips. */
export function sampleFelineStrikeMotion(chassis:Chassis,clock:FelineStrikeClock|null|undefined,time:number,presentation:FelineStrikePresentation,out:FelineStrikePose):FelineStrikePose {
  clear(out);
  if(!clock||presentation.interrupted||presentation.life!==clock.life||
    ![time,clock.id,clock.life,clock.acceptedAt,clock.stageAt,clock.endsAt].every(Number.isFinite)||clock.id<1||!Number.isInteger(clock.id)||clock.stageAt<clock.acceptedAt||clock.endsAt<=clock.stageAt||time<clock.acceptedAt||time<clock.stageAt||time>=clock.endsAt||
    (clock.stage!=='flight'&&clock.stage!=='recovery')||!['pounce','tackle','dive'].includes(clock.kind))return out;
  const entry=FELINE_STRIKE_ENTRY[chassis],age=time-clock.acceptedAt,recover=clock.stage==='recovery';
  const recoveryDuration=clock.endsAt-clock.stageAt;
  const weight=recover?ease((clock.stageAt-clock.acceptedAt)/entry)*(1-ease((time-clock.stageAt)/recoveryDuration)):ease(age/entry);
  if(weight<=0)return out;
  out.actionId=clock.id;out.life=clock.life;out.weight=weight;out.phase=recover?Math.min(1,(time-clock.stageAt)/recoveryDuration):Math.min(1,age/entry);
  const side=clock.side,r=out.rotations;
  const rotate=(name:FelineStrikeBone,x:number,y=0,z=0)=>{r[name].x=x*weight;r[name].y=y*weight;r[name].z=z*weight;};
  if(chassis==='pounce'){
    out.bodyPitch=0;rotate('chest',0);rotate('spine',0);rotate('pelvis',.06);rotate('head',.07);
    for(const prefix of ['FL','FR'] as const){rotate(`${prefix}_upper`,.04,0);rotate(`${prefix}_lower`,-.08);rotate(`${prefix}_paw`,.03);}
    for(const prefix of ['HL','HR'] as const){rotate(`${prefix}_upper`,.2);rotate(`${prefix}_lower`,-.15);}
  }else if(chassis==='bastion'){
    out.bodyPitch=0;out.bodyRoll=.03*side*weight;rotate('chest',0,0,.04*side);rotate('spine',.05);rotate('pelvis',.025);rotate('head',.11);
    for(const prefix of ['FL','FR'] as const){const lead=(prefix==='FL'?1:-1)===side;rotate(`${prefix}_upper`,lead?.22:.16,prefix==='FL'?-.045:.045);rotate(`${prefix}_lower`,-.3);rotate(`${prefix}_paw`,.16);}
    for(const prefix of ['HL','HR'] as const){rotate(`${prefix}_upper`,.24);rotate(`${prefix}_lower`,-.22);}
  }else if(chassis==='lynx'){
    out.bodyPitch=0;out.bodyRoll=.035*side*weight;rotate('chest',0,.055*side);rotate('spine',.02,0,.035*side);rotate('pelvis',.025,0,-.035*side);rotate('head',.025,-.04*side);
    for(const prefix of ['FL','FR'] as const){const lead=(prefix==='FL'?1:-1)===side;rotate(`${prefix}_upper`,lead?.04:.11,prefix==='FL'?-.035:.035);rotate(`${prefix}_lower`,lead?-.08:-.18);rotate(`${prefix}_paw`,.02);}
    for(const prefix of ['HL','HR'] as const){rotate(`${prefix}_upper`,.12);rotate(`${prefix}_lower`,-.11);}
  }else{
    out.bodyPitch=-.02*weight;rotate('chest',-.025);rotate('spine',.035);rotate('pelvis',.055);rotate('head',.085);
    for(const prefix of ['FL','FR'] as const){rotate(`${prefix}_upper`,-.13,prefix==='FL'?-.025:.025);rotate(`${prefix}_lower`,.09);rotate(`${prefix}_paw`,.08);}
    for(const prefix of ['HL','HR'] as const){rotate(`${prefix}_upper`,.16);rotate(`${prefix}_lower`,-.13);}
  }
  // Kind is accepted authority intent. Aim direction moves the authoritative
  // carrier; these bounded local modifiers never steer or translate that body.
  if(clock.kind==='dive'){
    if(chassis==='caracal'){out.bodyPitch-=.015*weight;r.chest.x-=.01*weight;};r.pelvis.x+=.025*weight;
    for(const prefix of ['HL','HR'] as const){r[`${prefix}_upper`].x+=.035*weight;r[`${prefix}_lower`].x-=.025*weight;}
  }else if(clock.kind==='tackle'){
    out.bodyPitch*=.5;out.bodyRoll*=.7;r.head.x+=.045*weight;
    for(const prefix of ['FL','FR'] as const){r[`${prefix}_upper`].x+=.12*weight;r[`${prefix}_lower`].x-=.1*weight;}
  }
  // Preserve shipping Air/UprightAir core ancestors on these chassis. Limb and
  // tail gestures remain procedural; no geometry or physical bounds are excluded.
  if(chassis!=='caracal'){
    out.bodyPitch=out.bodyRoll=0;
    for(const name of ['pelvis','spine','chest','head'] as const){r[name].x=r[name].y=r[name].z=0;}
  }
  for(let i=0;i<5;i++)rotate(`tail_${i}` as FelineStrikeBone,chassis==='lynx'?0:-.015*(5-i),0);
  return out;
}
export interface FelineStrikeRig {
  bones:{name:FelineStrikeBone;bone:Bone;base:Quaternion}[];applied:boolean;rotation:Quaternion;euler:Euler;
}
/** Resolve and validate all actual shipping bones once, never invent a joint. */
export function bindFelineStrikeRig(model:Object3D):FelineStrikeRig {
  const bones=FELINE_STRIKE_BONES.map(name=>{const bone=model.getObjectByName(name);if(!(bone instanceof Bone))throw Error(`Feline strike rig missing ${name}`);return{name,bone,base:new Quaternion()};});
  return {bones,applied:false,rotation:new Quaternion(),euler:new Euler(0,0,0,'XYZ')};
}
/** Root calls this BEFORE restoring authored contact pose and advancing mixer.
 * This removes last frame's composition, including torso bones outside paw IK. */
export function restoreFelineStrikeRig(rig:FelineStrikeRig):void {
  if(!rig.applied)return;for(const entry of rig.bones)entry.bone.quaternion.copy(entry.base);rig.applied=false;
}
/** Root calls AFTER mixer, BEFORE ground/roof contact solver. Rotation only;
 * authoritative root translation, carrier pitch/roll and collision stay outside.
 * Apply once per frame, with restore before the next mixer update. */
export function applyFelineStrikeMotion(rig:FelineStrikeRig,pose:FelineStrikePose):void {
  if(rig.applied)throw Error('Restore feline strike rig before composing again');
  if(pose.weight<=0)return;
  for(const entry of rig.bones){entry.base.copy(entry.bone.quaternion);const r=pose.rotations[entry.name];rig.rotation.setFromEuler(rig.euler.set(r.x,r.y,r.z));entry.bone.quaternion.multiply(rig.rotation);}
  rig.applied=true;
}

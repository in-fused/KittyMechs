import { clamp } from '../../../shared/math';
import { Vector3 } from 'three';
import type { Chassis, ClimbState, MechStance, Vec3 } from '../../../shared/types';

export interface GaitWeights { idle:number; walk:number; trot:number; gallop:number; air:number; }
export interface QuadrupedTravel {x:number;z:number;initialized:boolean;speed:number;strafe:number;active:boolean;}
export function createQuadrupedTravel():QuadrupedTravel {return {x:0,z:0,initialized:false,speed:0,strafe:0,active:false};}
/** Measure a displayed segment over its complete frame interval. Cosmetic
 * integration may use a capped interval, but that cap is not elapsed travel. */
export function displayedTravelSpeed(distance:number,elapsed:number):number {
  if(!Number.isFinite(distance)||!Number.isFinite(elapsed)||distance<0||elapsed<=0)return 0;
  return Math.min(25,distance/Math.max(.001,elapsed));
}
/** Signed shortest-angle reaction rate over the full displayed interval.
 * Cosmetic filtering keeps its own capped dt; it must not inflate this rate. */
export function displayedYawRate(angle:number,elapsed:number):number {
  if(!Number.isFinite(angle)||!Number.isFinite(elapsed)||elapsed<=0)return 0;
  return clamp(signedAngle(angle)/Math.max(.001,elapsed),-3,3);
}
function displayedTurnRate(angle:number,elapsed:number):number {
  return Number.isFinite(angle)&&Number.isFinite(elapsed)&&elapsed>0?Math.abs(angle)/Math.max(.001,elapsed):0;
}
/** Sample the actual buffered position, not requested velocity. A blocked hull
 * settles toward idle, while sub-threshold start/stop noise cannot rearm walk.
 * dt is the full elapsed display interval; only cosmetic filtering is capped.
 * This owns no phase: existing distance/angular footfalls remain authoritative. */
export function quadrupedTravel(x:number,z:number,yaw:number,dt:number,allowed:boolean,reset:boolean,out:QuadrupedTravel):QuadrupedTravel {
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(yaw)||!Number.isFinite(dt)){
    out.initialized=false;out.speed=out.strafe=0;out.active=false;return out;
  }
  const dx=out.initialized?x-out.x:0,dz=out.initialized?z-out.z:0;
  const initialized=out.initialized;out.x=x;out.z=z;out.initialized=true;
  if(reset||!allowed||!initialized){out.speed=out.strafe=0;out.active=false;return out;}
  if(dt<=0)return out;
  const distance=Math.hypot(dx,dz),speed=Math.min(25,distance/dt),blend=1-Math.exp(-Math.min(dt,.05)*14);
  // Limit the signed component by the same displacement bound as total speed.
  const strafe=distance>0?(dx*Math.cos(yaw)-dz*Math.sin(yaw))/distance*speed:0;
  out.speed+=(speed-out.speed)*blend;out.strafe+=(strafe-out.strafe)*blend;
  if(out.speed>.085)out.active=true;else if(out.speed<.045)out.active=false;
  return out;
}
export const QUAD_STRIDES:Record<Chassis,readonly [number,number,number]>={pounce:[.72,1.1,1.66],bastion:[.64,.94,1.32],lynx:[.86,1.24,1.85],caracal:[.7,1.04,1.5]};
export const QUAD_DUTIES:Record<Chassis,readonly [number,number,number]>={pounce:[.7,.55,.44],bastion:[.78,.65,.54],lynx:[.67,.52,.4],caracal:[.75,.6,.5]};
export function gaitCadence(speed:number,stride:number,duty:number,duration:number,scale:number):number {return Math.max(0,speed)*duty*duration/Math.max(.001,stride*scale);}
/** One distance phase keeps adjacent blended clips on matching footfalls and
 * freezes support when presentation stops, including a stalled connection. */
export function distancePhase(phase:number,distance:number,stride:number,direction=1):number {
  const next=phase+Math.max(0,distance)*direction/Math.max(.001,stride);return next-Math.floor(next);
}
const FOOT_OFFSETS:readonly Record<string,number>[]=[{FL:0,HR:.25,FR:.5,HL:.75},{FL:0,HR:0,FR:.5,HL:.5},{FL:0,FR:.08,HL:.46,HR:.54}];
/** Arc is the paw's stance sweep, not root rotation. Keep these profiles in
 * sync with the original baked turn actions in build_feline_mech.py. */
export const TURN_GAITS:Record<Chassis,{arc:number;duty:number;offsets:Readonly<Record<string,number>>}>={
  pounce:{arc:.62,duty:.72,offsets:{FL:0,HR:.25,FR:.5,HL:.75}},
  bastion:{arc:.44,duty:.82,offsets:{FL:0,HL:.25,FR:.5,HR:.75}},
  lynx:{arc:.72,duty:.68,offsets:{FL:0,HR:.08,FR:.5,HL:.58}},
  caracal:{arc:.52,duty:.78,offsets:{FL:0,HR:.3,FR:.55,HL:.8}},
};
export interface TurnPose {phase:number;weight:number;left:number;}
const MIRRORED_LIMBS:Readonly<Record<string,string>>={FL:'FR',FR:'FL',HL:'HR',HR:'HL'};
export function createTurnPose():TurnPose {return {phase:0,weight:0,left:1};}
/** Angular travel alone advances the baked cycle. A packet stall fades the
 * pose without finishing a fictitious footstep; reversal crossfades mirrored
 * clips at the retained phase instead of reseeding a planted paw. */
export function turnPose(chassis:Chassis,angularDistance:number,speed:number,topSpeed:number,dt:number,allowed:boolean,reset:boolean,out:TurnPose,elapsed=dt):TurnPose {
  if(reset||!allowed){out.phase=0;out.weight=0;out.left=1;return out;}
  const gait=TURN_GAITS[chassis],travel=Number.isFinite(angularDistance)?angularDistance:0;
  out.phase=distancePhase(out.phase,Math.abs(travel),gait.arc/gait.duty);
  const slow=1-clamp((speed/topSpeed-.08)/.16,0,1),rate=displayedTurnRate(travel,elapsed);
  const target=slow*clamp(rate/.55,0,1),blend=1-Math.exp(-Math.max(0,dt)*18);
  if(Math.abs(travel)>.000001)out.left=out.weight<=.001?(travel>0?1:0):out.left+((travel>0?1:0)-out.left)*blend;
  out.weight+=(target-out.weight)*blend;
  if(out.weight<.00001)out.weight=0;return out;
}
export function turnPawSupport(chassis:Chassis,limb:string,phase:number,left:boolean):number {
  const mirrored=left?limb:MIRRORED_LIMBS[limb],gait=TURN_GAITS[chassis];
  return supportWindow(phase-gait.offsets[mirrored],gait.duty);
}
function supportWindow(phase:number,duty:number):number {const p=phase-Math.floor(phase),fade=clamp(Math.min(p,duty-p)/.04,0,1);return fade*fade*(3-2*fade);}
/** Keep these physical sweeps/duties synchronized with UPRIGHT_STYLE. */
export const UPRIGHT_GAITS:Record<Chassis,{strides:readonly [number,number];duties:readonly [number,number];arc:number;turnDuty:number}>={
  pounce:{strides:[1.15,1.48],duties:[.70,.57],arc:.38,turnDuty:.72},
  bastion:{strides:[1,1.18],duties:[.78,.70],arc:.28,turnDuty:.82},
  lynx:{strides:[1.4,1.6],duties:[.68,.46],arc:.44,turnDuty:.68},
  caracal:{strides:[1.15,1.38],duties:[.74,.66],arc:.34,turnDuty:.76},
};
export interface UprightMotion {phase:number;idle:number;walk:number;stride:number;active:boolean;turn:TurnPose;}
export function createUprightMotion():UprightMotion {return {phase:0,idle:1,walk:0,stride:0,active:false,turn:createTurnPose()};}
/** Realized travel selects both stride and blend. A blocked hull/stalled stream
 * does not walk in place. No frame-time phase integration or playback cap. */
export function uprightMotion(chassis:Chassis,distance:number,angularDistance:number,speed:number,topSpeed:number,scale:number,direction:number,dt:number,allowed:boolean,reset:boolean,out:UprightMotion,elapsed=dt):UprightMotion {
  if(reset||!allowed){out.phase=0;out.idle=1;out.walk=out.stride=0;out.active=false;out.turn.phase=out.turn.weight=0;out.turn.left=1;return out;}
  const profile=UPRIGHT_GAITS[chassis],blend=1-Math.exp(-Math.max(0,dt)*14);
  if(speed>.085)out.active=true;else if(speed<.045)out.active=false;
  const ratio=clamp(speed/Math.max(.01,topSpeed),0,1),move=out.active?clamp((speed-.045)/Math.max(.05,topSpeed*.12),0,1):0;
  const fast=clamp((ratio-.30)/.45,0,1),stride=fast*fast*(3-2*fast);
  out.walk+=(move*(1-stride)-out.walk)*blend;out.stride+=(move*stride-out.stride)*blend;out.idle=Math.max(0,1-out.walk-out.stride);
  const moving=out.walk+out.stride;
  const cycle=scale*(profile.strides[0]/profile.duties[0]*out.walk+profile.strides[1]/profile.duties[1]*out.stride)/Math.max(.001,moving);
  if(distance>0)out.phase=distancePhase(out.phase,distance,Math.max(.01,cycle),direction);
  const travel=Number.isFinite(angularDistance)?angularDistance:0,turn=out.turn;
  turn.phase=distancePhase(turn.phase,Math.abs(travel),profile.arc/profile.turnDuty);
  const target=(1-clamp((ratio-.08)/.22,0,1))*clamp(displayedTurnRate(travel,elapsed)/.55,0,1),turnBlend=1-Math.exp(-Math.max(0,dt)*18);
  if(Math.abs(travel)>.000001)turn.left=turn.weight<=.001?(travel>0?1:0):turn.left+((travel>0?1:0)-turn.left)*turnBlend;
  turn.weight+=(target-turn.weight)*turnBlend;if(turn.weight<.00001)turn.weight=0;
  return out;
}
/** Any materially contributing lifted hind paw relinquishes its anchor,
 * including idle/stride and mirrored-turn crossfades. Forepaws are guards. */
export function uprightPawSupport(chassis:Chassis,limb:string,out:UprightMotion):number {
  if(limb[0]!=='H')return 0;
  const profile=UPRIGHT_GAITS[chassis],offset=limb==='HL'?0:.5,turn=out.turn;
  let support=1;
  if((1-turn.weight)*out.walk>.01)support=Math.min(support,supportWindow(out.phase-offset,profile.duties[0]));
  if((1-turn.weight)*out.stride>.01)support=Math.min(support,supportWindow(out.phase-offset,profile.duties[1]));
  if(turn.weight*turn.left>.01)support=Math.min(support,supportWindow(turn.phase-offset,profile.turnDuty));
  if(turn.weight*(1-turn.left)>.01)support=Math.min(support,supportWindow(turn.phase-(limb==='HR'?0:.5),profile.turnDuty));
  return support;
}
/** Contact follows authored support timing, rather than a height threshold
 * that incorrectly pins a swinging paw when idle and walk are blended. */
export function pawSupport(chassis:Chassis,limb:string,phase:number,weights:GaitWeights,upright=false,turn?:TurnPose,stationary=false,uprightPose?:UprightMotion):number {
  if(upright&&uprightPose)return uprightPawSupport(chassis,limb,uprightPose);
  if(upright)return stationary?1:supportWindow(phase-(limb==='HL'?0:.5),.64);
  const moving=weights.walk+weights.trot+weights.gallop;
  const base=stationary||moving<.001?1:(supportWindow(phase-FOOT_OFFSETS[0][limb],QUAD_DUTIES[chassis][0])*weights.walk+supportWindow(phase-FOOT_OFFSETS[1][limb],QUAD_DUTIES[chassis][1])*weights.trot+supportWindow(phase-FOOT_OFFSETS[2][limb],QUAD_DUTIES[chassis][2])*weights.gallop)/moving;
  if(!turn||turn.weight<=.001)return base;
  // During a direction crossfade, either lifted paw releases its anchor. A
  // weighted average would keep half a lock on an actually raised sole.
  const support=Math.min(turn.left>.01?turnPawSupport(chassis,limb,turn.phase,true):1,turn.left<.99?turnPawSupport(chassis,limb,turn.phase,false):1);
  return Math.min(1-clamp((1-turn.weight)*4,0,1)*(1-base),1-clamp(turn.weight*4,0,1)*(1-support));
}
/** Adjacent gaits overlap continuously; no hard speed threshold can pop a limb pose. */
export function gaitWeights(speed:number,topSpeed:number,grounded:boolean,out:GaitWeights={idle:0,walk:0,trot:0,gallop:0,air:0}):GaitWeights {
  out.idle=out.walk=out.trot=out.gallop=out.air=0;
  if(!grounded){out.air=1;return out;}
  const ratio=Math.max(0,speed)/Math.max(1,topSpeed);
  if(ratio<.16){const t=clamp(ratio/.045,0,1);out.walk=t*t*(3-2*t);out.idle=1-out.walk;}
  else if(ratio<.52){const t=clamp((ratio-.16)/.36,0,1);out.trot=t*t*(3-2*t);out.walk=1-out.trot;}
  else {const t=clamp((ratio-.52)/.36,0,1);out.gallop=t*t*(3-2*t);out.trot=1-out.gallop;}
  return out;
}

export function signedAngle(angle:number):number { return Math.atan2(Math.sin(angle),Math.cos(angle)); }

/** Local pitch/roll from a terrain sample in the actor's forward/right basis. */
export function terrainAttitude(front:number,back:number,left:number,right:number,halfLength:number,halfWidth:number,out={pitch:0,roll:0}):{pitch:number;roll:number} {
  out.pitch=clamp(Math.atan2(front-back,halfLength*2),-.2,.2);out.roll=clamp(Math.atan2(left-right,halfWidth*2),-.18,.18);return out;
}

export function landingCompression(verticalSpeed:number):number { return clamp(-verticalSpeed/15,0,1); }

export interface StancePose {amount:number;transitionWeight:number;clipTime:number;up:boolean;}
/** Snapshot time selects a replicated .7s pose, including clients joining mid-transition. */
export function stancePose(stance:MechStance,changedAt:number,time:number,duration:number,out:StancePose={amount:0,transitionWeight:0,clipTime:0,up:false}):StancePose {
  const elapsed=clamp(time-changedAt,0,duration),phase=elapsed/duration,smooth=phase*phase*(3-2*phase);
  out.up=stance==='upright';out.amount=out.up?smooth:1-smooth;out.clipTime=elapsed;
  const fade=(value:number)=>{const t=clamp(value/.08,0,1);return t*t*(3-2*t);};
  out.transitionWeight=elapsed>0&&elapsed<duration?Math.min(fade(elapsed),fade(duration-elapsed)):0;
  return out;
}

/** Authored stance duration and stride give the same wall-relative support speed
 * as the authoritative ascent. A stalled snapshot therefore cannot walk in place. */
export const WALL_GAITS:Record<Chassis,{stride:number;duty:number;depth:number}>={pounce:{stride:.9,duty:.72,depth:1},bastion:{stride:.84,duty:.82,depth:.95},lynx:{stride:1.08,duty:.64,depth:1.16},caracal:{stride:.9,duty:.78,depth:1.05}};
/** A held wall pose uses its planted source frame. Sampling idle breathing
 * moved armored paw bounds across narrow physical ribs without an ascent. */
export const WALL_CLING_PHASE=0;
export function wallCycle(chassis:Chassis,scale:number,progress:number,height:number,depth=WALL_GAITS[chassis].depth):number {
  const gait=WALL_GAITS[chassis],cycles=clamp(progress,0,1)*Math.max(0,height)*gait.duty/(gait.stride*scale*depth);return cycles-Math.floor(cycles);
}
/** Classify clip retraction relative to its carrier. Physical collision may
 * keep that carrier farther from trim; reach and footprint checks still decide
 * whether the authored support paw can actually grip the surface. */
export function wallPoseGap(gap:number,bodyDistance:number,standoff:number):number {
  return gap-(bodyDistance-standoff);
}
/** Preserve animated vertical/tangent placement while pinning a claw pad to its
 * known world plane. Normal is the authored facade's outward unit vector. */
export function wallContact(paw:Vector3,point:Vec3,normal:Vec3,pad:number,weight:number,out:Vector3):Vector3 {
  const distance=(paw.x-point.x)*normal.x+(paw.z-point.z)*normal.z;
  const correction=(pad-distance)*clamp(weight,0,1);out.copy(paw);out.x+=normal.x*correction;out.z+=normal.z*correction;return out;
}
export function traversalClip(climb:ClimbState,time:number,cycle:number,out={index:10,phase:0,wall:0,roof:0},sampleProgress=climb.progress):{index:number;phase:number;wall:number;roof:number} {
  const progress=clamp(sampleProgress,0,1),smooth=progress*progress*(3-2*progress);
  out.index=climb.phase==='grab'?10:climb.phase==='cling'?11:climb.phase==='climb'?12:13;
  out.phase=climb.phase==='cling'?WALL_CLING_PHASE:climb.phase==='climb'?cycle:progress;
  out.wall=climb.phase==='grab'?smooth:climb.phase==='mantle'?1-smooth:1;
  out.roof=climb.phase==='mantle'?smooth:0;void time;return out;
}

export const COMBAT_ACTIONS=['Pulse','Missile','Ability','Hit','Death'] as const;
export const COMBAT_DURATIONS=[13/60,26/60,.7,20/60,63/60] as const;
export interface CombatPose {index:number;elapsed:number;weight:number;death:boolean;}
/** An accepted authority event is the only trigger. Recoil/abilities take
 * priority over flinch, so continuous damage cannot erase accepted attacks.
 * Death overrides everything and keeps its final pose. */
export function combatPose(timestamps:readonly number[],alive:boolean,time:number,out:CombatPose={index:-1,elapsed:0,weight:0,death:false}):CombatPose {
  out.index=-1;out.elapsed=0;out.weight=0;out.death=false;
  for(const i of [4,2,1,0,3]){
    const elapsed=time-timestamps[i],duration=COMBAT_DURATIONS[i];
    if(!Number.isFinite(elapsed)||timestamps[i]<0||elapsed<0||i===4&&alive||i!==4&&!alive||i!==4&&elapsed>=duration)continue;
    out.index=i;out.elapsed=Math.min(duration,elapsed);out.death=i===4;
    if(out.death)out.weight=1;else{const fade=Math.min(1,elapsed/.025,(duration-elapsed)/.07);out.weight=fade*fade*(3-2*fade);}
    break;
  }return out;
}

/** Law-of-cosines joint placement, preserving the animated knee's bend side. */
export function solveKnee(hip:Vector3,knee:Vector3,target:Vector3,upper:number,lower:number,out:Vector3,axis:Vector3,pole:Vector3):void {
  axis.subVectors(target,hip);const distance=clamp(axis.length(),Math.abs(upper-lower)+.0001,upper+lower-.0001);axis.normalize();
  target.copy(hip).addScaledVector(axis,distance);
  pole.subVectors(knee,hip).addScaledVector(axis,-pole.dot(axis));
  if(pole.lengthSq()<.000001){pole.set(0,0,1).addScaledVector(axis,-axis.z);if(pole.lengthSq()<.000001)pole.set(1,0,0).addScaledVector(axis,-axis.x);}
  pole.normalize();const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  out.copy(hip).addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)));
}

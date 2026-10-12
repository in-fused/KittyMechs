import {clamp} from './math';
import type {Vec3} from './types';
/** Probe-only contact candidate; these records are not yet wire/gameplay state. */
export interface MantleBridgePlant {
  paw:number;surface:'wall'|'roof';faceId:string;target:Vec3;
  rotation:[number,number,number,number];offsets:Vec3[];
}
export interface MantleBridgeTorso {source:number;mantle:number;phase:number;}
/** One local continuous Cling/Mantle constraint solve. The previous blend limits
 * pose travel; a failed constraint is returned unchanged for a real witness. */
export function solveMantleBridgeTorso(previous:number,maxChange:number,cost:(blend:number)=>number):{blend:number;cost:number} {
  let low=clamp(previous-maxChange,0,1),high=clamp(previous+maxChange,0,1);
  const ends=[low,previous,high];
  for(let i=0;i<20;i++){const a=low+(high-low)/3,b=high-(high-low)/3;if(cost(a)<cost(b))high=b;else low=a;}
  let blend=previous,best=cost(previous);
  for(const candidate of [...ends,(low+high)/2]){const next=cost(candidate);if(next<best){best=next;blend=candidate;}}
  return{blend,cost:best};
}
export type MantleStage='out'|'lift'|'transfer'|'settle';
export interface PoweredVaultState {phase:string;progress:number;mantleStage:MantleStage|null;mantleStageAt:number;}
/** Both authority sampling and renderer use this original clip blend. During
 * the powered unsupported segments no paw is presented as a wall anchor. */
export function poweredVaultPose(state:PoweredVaultState,time:number,out={air:0,mantle:1,phase:0,wall:0,roof:0}) {
  const elapsed=Math.max(0,time-state.mantleStageAt),ease=(v:number)=>v*v*(3-2*v);
  out.phase=clamp(state.progress,0,1);out.wall=0;out.roof=0;out.air=0;out.mantle=1;
  if(state.phase!=='mantle'||!state.mantleStage)return out;
  if(state.mantleStage==='out'){out.air=ease(clamp(elapsed/.16,0,1));out.mantle=1-out.air;}
  else if(state.mantleStage==='lift'){out.air=1;out.mantle=0;}
  else if(state.mantleStage==='transfer'){out.mantle=ease(clamp(elapsed/.2,0,1));out.air=1-out.mantle;out.roof=out.mantle;}
  else out.roof=1;
  return out;
}
/** A bounded acceleration and braking target; actual KCC displacement remains
 * authoritative. No root teleport or clipping bypass is introduced. */
export function vaultAxisVelocity(current:number,distance:number,speed:number,dt:number,acceleration=12):number {
  const target=Math.sign(distance)*Math.min(speed,Math.sqrt(2*acceleration*Math.abs(distance)));
  return current+clamp(target-current,-acceleration*dt,acceleration*dt);
}
export function vaultAxisStep(velocity:number,distance:number,dt:number):number {
  const step=velocity*dt;return Math.sign(step)===Math.sign(distance)?Math.sign(step)*Math.min(Math.abs(step),Math.abs(distance)):step;
}

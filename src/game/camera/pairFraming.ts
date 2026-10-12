import {clamp} from '../../../shared/math';
import {validPair} from '../../../shared/pairedCombat';
import type {ActorState,Vec3} from '../../../shared/types';

export const PAIR_CAMERA_LIMITS={focus:2.5,focusRate:3,yaw:.7,yawRate:1.2,extra:4,extraRate:3,lookHold:.3} as const;
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export function createPairCamera(){return {id:'',side:1,offset:{x:0,y:0,z:0},yaw:0,extra:0,previousYaw:NaN,lookHold:0,active:false};}
export type PairCameraState=ReturnType<typeof createPairCamera>;
export function resetPairCamera(s:PairCameraState){s.id='';s.side=1;s.offset.x=s.offset.y=s.offset.z=s.yaw=s.extra=s.lookHold=0;s.previousYaw=NaN;s.active=false;}
/** Reciprocal admitted life ownership and real close roots only. */
export function cameraPairOther(actor:ActorState,roster:readonly ActorState[]):ActorState|null {
  const other=roster.find(a=>a.id===actor.pair?.other);
  return validPair(actor,other)&&other&&Math.hypot(other.position.x-actor.position.x,other.position.z-actor.position.z)<=8&&Math.abs(other.position.y-actor.position.y)<=2?other:null;
}
function scalar(current:number,target:number,rate:number,dt:number){return current+clamp((target-current)*(1-Math.exp(-dt*5)),-rate*dt,rate*dt);}
/** Additive framing bias. User yaw is never edited or clamped; looking actively,
 * aiming or steep pitch fades the bias. Release retains the same finite path. */
export function advancePairCamera(s:PairCameraState,local:Vec3,other:Vec3|null,id:string,userYaw:number,pitch:number,aiming:boolean,delta:number){
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.05);
  if(Number.isFinite(s.previousYaw)&&Math.abs(wrap(userYaw-s.previousYaw))>.25*dt)s.lookHold=PAIR_CAMERA_LIMITS.lookHold;
  else s.lookHold=Math.max(0,s.lookHold-dt);
  s.previousYaw=userYaw;
  let x=0,y=0,z=0,bias=0;
  const weight=aiming||s.lookHold>0?0:1-clamp((Math.abs(pitch)-.12)/.18,0,1);
  s.active=!!other&&!!id&&weight>0;
  if(other&&id){
    const dx=other.x-local.x,dz=other.z-local.z,axis=Math.atan2(dx,dz);
    if(s.id!==id){s.id=id;s.side=Math.abs(wrap(axis+Math.PI/2-userYaw))<=Math.abs(wrap(axis-Math.PI/2-userYaw))?1:-1;}
    x=(other.x-local.x)*.5*weight;y=(other.y-local.y)*.5*weight;z=(other.z-local.z)*.5*weight;
    const length=Math.hypot(x,y,z),scale=length>PAIR_CAMERA_LIMITS.focus?PAIR_CAMERA_LIMITS.focus/length:1;x*=scale;y*=scale;z*=scale;
    bias=clamp(wrap(axis+s.side*Math.PI/2-userYaw),-PAIR_CAMERA_LIMITS.yaw,PAIR_CAMERA_LIMITS.yaw)*weight;
  }
  const a=1-Math.exp(-dt*5),dx=(x-s.offset.x)*a,dy=(y-s.offset.y)*a,dz=(z-s.offset.z)*a,length=Math.hypot(dx,dy,dz),scale=length>PAIR_CAMERA_LIMITS.focusRate*dt?PAIR_CAMERA_LIMITS.focusRate*dt/length:1;
  s.offset.x+=dx*scale;s.offset.y+=dy*scale;s.offset.z+=dz*scale;
  s.yaw=scalar(s.yaw,bias,PAIR_CAMERA_LIMITS.yawRate,dt);
  if(!id&&Math.hypot(s.offset.x,s.offset.y,s.offset.z)<1e-5&&Math.abs(s.yaw)<1e-5)s.id='';
  return s;
}
export function advancePairCameraDistance(s:PairCameraState,requiredExtra:number,dt:number){
  s.extra=scalar(s.extra,s.active&&s.lookHold===0?clamp(requiredExtra,0,PAIR_CAMERA_LIMITS.extra):0,PAIR_CAMERA_LIMITS.extraRate,clamp(dt,0,.05));return s.extra;
}

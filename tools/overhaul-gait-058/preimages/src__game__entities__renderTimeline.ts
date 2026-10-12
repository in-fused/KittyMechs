import { angleLerp, clamp } from '../../../shared/math';
import type { ActorState, ClimbState,FelineStrikeState, Vec3 } from '../../../shared/types';
import { runtime } from '../runtime';

export const REMOTE_RENDER_DELAY=.1;
const CAPACITY=8;
interface Sample {time:number;state:ActorState|null;climb:ClimbState|null;strike:FelineStrikeState|null;}
export interface RenderActorFrame {state:ActorState;grounded:boolean;position:Vec3;velocity:Vec3;yaw:number;time:number;climb:ClimbState|null;strike:FelineStrikeState|null;climbProgress:number;distance:number;angularDistance:number;reset:boolean;}
export interface RenderTimeline {samples:Sample[];count:number;clock:number;initialized:boolean;reset:boolean;frame:number;receivedAt:number;output:RenderActorFrame;}
export function createRenderTimeline():RenderTimeline {
  return {samples:Array.from({length:CAPACITY},()=>({time:0,state:null,climb:null,strike:null})),count:0,clock:0,initialized:false,reset:true,frame:-1,receivedAt:0,output:{state:null as unknown as ActorState,grounded:false,position:{x:0,y:0,z:0},velocity:{x:0,y:0,z:0},yaw:0,time:0,climb:null,strike:null,climbProgress:0,distance:0,angularDistance:0,reset:true}};
}
/** Eight pooled copies also make live 60Hz authority actors safe to retain. */
export function pushRenderSample(track:RenderTimeline,state:ActorState,time:number):void {
  let latest=track.count?track.samples[track.count-1]:undefined;
  if(latest&&time===latest.time)return;
  if(latest){const previous=latest.state!,gap=time-latest.time;
    const distance=Math.hypot(state.position.x-previous.position.x,state.position.y-previous.position.y,state.position.z-previous.position.z);
    const discontinuity=gap<0||gap>.35||state.jumpEpoch!==previous.jumpEpoch||(state.hp>0)!==(previous.hp>0)||distance>2+Math.hypot(previous.velocity.x,previous.velocity.y,previous.velocity.z)*Math.max(0,gap)*1.5;
    if(discontinuity){track.count=0;track.clock=time;track.initialized=true;track.reset=true;latest=undefined;}
  }
  if(track.count===CAPACITY){const recycled=track.samples[0];for(let i=1;i<CAPACITY;i++)track.samples[i-1]=track.samples[i];track.samples[CAPACITY-1]=recycled;track.count--;}
  const sample=track.samples[track.count++];sample.time=time;
  if(!sample.state)sample.state={...state,position:{...state.position},velocity:{...state.velocity}};
  const position=sample.state.position,velocity=sample.state.velocity;
  Object.assign(sample.state,state);sample.state.position=position;sample.state.velocity=velocity;Object.assign(position,state.position);Object.assign(velocity,state.velocity);
  if(state.climb){if(!sample.climb)sample.climb={...state.climb,normal:{...state.climb.normal},contact:{...state.climb.contact}};
    const normal=sample.climb.normal,contact=sample.climb.contact;Object.assign(sample.climb,state.climb);sample.climb.normal=normal;sample.climb.contact=contact;Object.assign(normal,state.climb.normal);Object.assign(contact,state.climb.contact);
  }
  sample.state.climb=state.climb?sample.climb:null;
  if(state.strike){if(!sample.strike)sample.strike={...state.strike,direction:{...state.strike.direction}};const direction=sample.strike.direction;Object.assign(sample.strike,state.strike);sample.strike.direction=direction;Object.assign(direction,state.strike.direction);}
  sample.state.strike=state.strike?sample.strike:null;
  sample.state.downed=state.downed?{...state.downed}:null;
  sample.state.pair=state.pair?{...state.pair,anchor:{...state.pair.anchor}}:null;
}
/** A monotonic presentation clock absorbs arrival jitter. Position stays on
 * known segments: there is no extrapolation into an unconfirmed wall or roof. */
export function sampleRenderTimeline(track:RenderTimeline,frame:number,dt:number,age:number,delay:number):RenderActorFrame|null {
  if(!track.count)return null;if(track.frame===frame)return track.output;track.frame=frame;
  const latest=track.samples[track.count-1],oldest=track.samples[0],out=track.output;
  if(!track.initialized){track.clock=latest.time-delay;track.initialized=true;}
  else {const step=Math.max(0,dt),desired=latest.time+clamp(age,0,.2)-delay,rate=clamp(1+(desired-track.clock-step)*4,.8,1.2);track.clock=Math.min(latest.time,Math.max(track.count===CAPACITY?oldest.time:latest.time-delay-.05,track.clock+step*rate));}
  let a=oldest,b=oldest;
  for(let i=1;i<track.count;i++){b=track.samples[i];if(track.clock<b.time)break;a=b;}
  const t=a===b?0:clamp((track.clock-a.time)/(b.time-a.time),0,1),from=a.state!,to=b.state!;
  const oldX=out.position.x,oldZ=out.position.z,oldYaw=out.yaw,previousTime=out.time;
  out.state=from;out.time=track.clock;out.reset=track.reset;
  // A confirmed takeoff/edge segment already moves the displayed body away
  // from support. Retire ground anchors with that movement, rather than
  // carrying the earlier packet's grounded bit into an airborne position.
  // Landing regains support only at the confirmed grounded endpoint.
  out.grounded=from.grounded&&(t===0||to.grounded);
  for(const axis of ['x','y','z'] as const){out.position[axis]=from.position[axis]+(to.position[axis]-from.position[axis])*t;out.velocity[axis]=track.clock>previousTime?from.velocity[axis]+(to.velocity[axis]-from.velocity[axis])*t:0;}
  out.yaw=angleLerp(from.yaw,to.yaw,t);out.distance=track.reset?0:Math.hypot(out.position.x-oldX,out.position.z-oldZ);
  // Turn steps follow displayed heading travel, just as gait follows displayed
  // position. Reset yaw and stopped packet streams must not advance a footfall.
  const headingDelta=out.yaw-oldYaw;
  out.angularDistance=track.reset||track.clock<=previousTime?0:Math.atan2(Math.sin(headingDelta),Math.cos(headingDelta));
  const climb=from.climb,next=to.climb;
  out.climbProgress=climb?(next?.anchor===climb.anchor&&next.phase===climb.phase?climb.progress+(next.progress-climb.progress)*t:climb.progress):0;
  let presentedClimb=climb,changedStage=false;
  if(climb&&next?.anchor===climb.anchor&&next.phase==='mantle'&&next.mantleStage){
    const changedPhase=climb.phase!=='mantle';
    const at=changedPhase?next.startedAt:climb.mantleStage!==next.mantleStage?next.mantleStageAt:Infinity;
    // The next packet already confirms this powered transition's precise clock.
    // Release wall anchors at that clock instead of another whole packet later.
    // Positive roof support still requires both known samples and a live probe.
    if(at>=a.time&&at<=b.time&&track.clock>=at){presentedClimb=next;changedStage=true;
      if(changedPhase)out.climbProgress=next.progress*clamp((track.clock-at)/Math.max(1e-9,b.time-at),0,1);
    }
  }
  if(presentedClimb){if(!out.climb)out.climb={...presentedClimb,normal:{...presentedClimb.normal},contact:{...presentedClimb.contact}};
    const normal=out.climb.normal,contact=out.climb.contact;Object.assign(out.climb,presentedClimb);out.climb.normal=normal;out.climb.contact=contact;Object.assign(normal,presentedClimb.normal);Object.assign(contact,presentedClimb.contact);out.climb.progress=out.climbProgress;
    if(climb&&next?.anchor===climb.anchor&&(next.phase===climb.phase||changedStage))for(const axis of ['x','y','z'] as const)contact[axis]=climb.contact[axis]+(next.contact[axis]-climb.contact[axis])*t;
    if(changedStage){out.climb.gripMask=0;out.climb.roofMask=climb!.roofMask&next!.roofMask;}
  }else out.climb=null;
  let strike=from.strike;
  if(!to.strike&&to.strikeEndedAt>=a.time&&to.strikeEndedAt<=b.time&&track.clock>=to.strikeEndedAt)strike=null;
  if(to.strike&&to.strike.life===from.jumpEpoch){const at=strike?.id===to.strike.id?(strike.stage!==to.strike.stage?to.strike.stageAt:Infinity):to.strike.acceptedAt;
    if(at>=a.time&&at<=b.time&&track.clock>=at)strike=to.strike;
  }
  if(strike&&track.clock<strike.endsAt){if(!out.strike)out.strike={...strike,direction:{...strike.direction}};const direction=out.strike.direction;Object.assign(out.strike,strike);out.strike.direction=direction;Object.assign(direction,strike.direction);}else out.strike=null;
  track.reset=false;return out;
}

const timelines=new Map<string,RenderTimeline>();let observed=runtime.snapshot;
export function forgetRenderActor(id:string):void {timelines.delete(id);}
/** Camera and body pass the same R3F clock.elapsedTime, receiving one cached,
 * coherent body-center position and authority action time for that frame. */
export function sampleRenderActor(id:string,frame:number,dt:number):RenderActorFrame|null {
  if(observed!==runtime.snapshot){observed=runtime.snapshot;for(const key of timelines.keys())if(runtime.authority&&runtime.sim?!runtime.sim.actors.has(key):!observed?.actors.some(a=>a.id===key))timelines.delete(key);}
  const live=runtime.authority?runtime.sim?.actors.get(id):undefined,state=live??runtime.snapshot?.actors.find(a=>a.id===id);if(!state)return null;
  let track=timelines.get(id);if(!track){track=createRenderTimeline();timelines.set(id,track);}
  if(!live){const previous=runtime.previous?.actors.find(a=>a.id===id);if(previous&&(!track.count||runtime.previous!.time>track.samples[track.count-1].time))pushRenderSample(track,previous,runtime.previous!.time);}
  const time=live?runtime.sim!.time:runtime.snapshot!.time,now=performance.now();if(!track.count||time!==track.samples[track.count-1].time)track.receivedAt=now;pushRenderSample(track,state,time);
  return sampleRenderTimeline(track,frame,Math.min(dt,.05),(now-(live?track.receivedAt:runtime.receivedAt))/1000,live?1/60:REMOTE_RENDER_DELAY);
}

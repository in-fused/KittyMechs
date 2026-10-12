import {ACTOR_HEIGHT,actorCollisionHeight,actorHullRadius} from '../shared/config.ts';
import type {ActorState,Vec3} from '../shared/types.ts';

export interface PilotCamera {lookYaw:number;lookPitch:number;focus:Vec3;fitDistance:number;preferredDistance:number;}
const wrap=(r:number)=>Math.atan2(Math.sin(r),Math.cos(r));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

/** Ordinary IJKL controls change camera look angles (input.ts), not the delayed
 * authority aimYaw. Invert cameraPose in camera/framing.ts: boom height 4,
 * look-ahead 2, pitch reach 16. No input or world state is written here. */
export function pilotAim(actor:ActorState,enemy:ActorState,camera:PilotCamera,latency:number){
  const range=Math.hypot(actor.position.x-enemy.position.x,actor.position.z-enemy.position.z);
  const lead=range/105+clamp(latency,0,.25); // config.ts normal pulse speed
  const target={x:enemy.position.x+enemy.velocity.x*lead,y:enemy.position.y+.65+enemy.velocity.y*lead,z:enemy.position.z+enemy.velocity.z*lead};
  const yaw=Math.atan2(camera.focus.x-target.x,camera.focus.z-target.z);
  const distance=camera.fitDistance||camera.preferredDistance;
  const r=(Math.hypot(camera.focus.x-target.x,camera.focus.z-target.z)+distance)/(distance+2);
  const sine=(target.y-camera.focus.y-4+4*r)/(-distance+r*(16+distance));
  const pitch=Math.asin(clamp(sine,-.7,.7));
  return {target,lead,yaw,pitch,dyaw:wrap(yaw-camera.lookYaw),dpitch:pitch-camera.lookPitch};
}

/** Production shoot() muzzle and native bot hull dimensions. The gate tests the
 * accepted gun ray against a predicted cylinder envelope using native dimensions.
 * The envelope does not reproduce rounded corners or prove native contact.
 * Actual cover and damage remain exclusively the authority's responsibility. */
export function pilotGunAligned(actor:ActorState,enemy:ActorState,target:Vec3,time:number):boolean {
  const cp=Math.cos(actor.aimPitch),dx=-Math.sin(actor.aimYaw)*cp,dy=Math.sin(actor.aimPitch),dz=-Math.cos(actor.aimYaw)*cp;
  const muzzle={x:actor.position.x+dx*1.3,y:actor.position.y+(actor.stance==='upright'?1.65:.65),z:actor.position.z+dz*1.3};
  const ex=muzzle.x-target.x,ez=muzzle.z-target.z,radius=actorHullRadius(enemy),a=dx*dx+dz*dz;
  if(a<1e-8)return false;
  const b=2*(ex*dx+ez*dz),c=ex*ex+ez*ez-radius*radius,disc=b*b-4*a*c;
  if(disc<0)return false;
  const near=Math.max(0,(-b-Math.sqrt(disc))/(2*a)),far=(-b+Math.sqrt(disc))/(2*a);
  if(far<near)return false;
  const bottom=target.y-.65-ACTOR_HEIGHT,top=bottom+actorCollisionHeight(enemy,time);
  const y0=muzzle.y+dy*near,y1=muzzle.y+dy*far;
  return Math.max(y0,y1)>=bottom&&Math.min(y0,y1)<=top;
}

/** Snapshot-clock delay beyond the deliberate released look pulse; cap avoids
 * speculative large leads when recording slows or batches server snapshots. */
export function pilotLatency(previous:number,before:number,after:number,pulseMs:number){
  const observed=clamp(after-before-pulseMs/1000,0,.25);
  return clamp(previous*.5+observed*.5,0,.25);
}

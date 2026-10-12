import type RAPIER from '@dimforge/rapier3d-compat';
import {ACTOR_HEIGHT} from './config';
import type {Chassis,Vec3} from './types';

/** Actor reference positions, not collider centers. Use accepted same-tick KCC
 * endpoints for both actors and the actual hull dimensions during that tick. */
export interface ActorTravel {from:Vec3;to:Vec3;radius:number;height:number;}
export type FelineStrikeMode='pounce'|'tackle'|'dive';
export interface StrikeProfile {speed:number;energy:number;cooldown:number;duration:number;recovery:number;damage:number;impulse:number;}
export const STRIKE_PROFILES:Readonly<Record<Chassis,Readonly<StrikeProfile>>>=Object.freeze({
  pounce:Object.freeze({speed:18,energy:25,cooldown:4,duration:.32,recovery:.35,damage:50,impulse:6}),
  bastion:Object.freeze({speed:12,energy:30,cooldown:5,duration:.4,recovery:.5,damage:65,impulse:9}),
  lynx:Object.freeze({speed:21,energy:22,cooldown:3.5,duration:.28,recovery:.3,damage:38,impulse:4}),
  caracal:Object.freeze({speed:15,energy:24,cooldown:4.5,duration:.34,recovery:.4,damage:44,impulse:5}),
});
export interface FelineContactOptions {facingYaw:number;minFacingDot?:number;contactDistance?:number;}
export interface FelineContact {
  fraction:number;
  /** Actual target-hull witness; never the center of a proximity splash. */
  point:Vec3;
  witnessAttacker:Vec3;
  witnessTarget:Vec3;
  /** Unit surface normal from target toward attacker. */
  normal:Vec3;
  /** Signed physical hull separation at fraction. Negative means penetration;
   * initialOverlap separately identifies penetration at the tick's start. */
  separation:number;
  initialOverlap:boolean;
  /** Independent targetDistance=0 cast, null when only controller skin reaches. */
  exactFraction:number|null;
}
const identity={x:0,y:0,z:0,w:1};
const EPS=1e-7;
/** Maximum numerical physical-separation admission tolerance (0.1 mm). This is not
 * added to the cast skin, collider radius or accepted movement endpoints. */
export const FELINE_CONTACT_TOLERANCE=1e-4;
const finite=(v:Vec3)=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
const bounded=(v:Vec3)=>finite(v)&&Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))<=1e6;
const subtract=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const at=(p:Vec3,d:Vec3,t:number):Vec3=>({x:p.x+d.x*t,y:p.y+d.y*t,z:p.z+d.z*t});
const center=(travel:ActorTravel):Vec3=>({...travel.from,y:travel.from.y+travel.height/2-ACTOR_HEIGHT});
const valid=(t:ActorTravel)=>bounded(t.from)&&bounded(t.to)&&Number.isFinite(t.radius)&&Number.isFinite(t.height)&&t.radius>.12&&t.radius<=64&&t.height>.24&&t.height<=64;
const fraction=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1;
interface HullGeometry {point1:Vec3;point2:Vec3;normal2:Vec3;distance:number;}
/** Exact closest/support witnesses for parallel cylinders rounded by .12 m.
 * Their Minkowski difference is the summed core cylinder rounded by .24 m.
 * Shared side height/cap disk point removes tangential witness ambiguity. */
function closestHullGeometry(ca:Vec3,cb:Vec3,attacker:ActorTravel,target:ActorTravel):HullGeometry {
  const ra=attacker.radius-.12,rb=target.radius-.12,ha=attacker.height/2-.12,hb=target.height/2-.12;
  const dx=ca.x-cb.x,dz=ca.z-cb.z,dy=ca.y-cb.y,rho=Math.hypot(dx,dz);
  const ex=rho>0?dx/rho:1,ez=rho>0?dz/rho:0,sy=dy<0?-1:1;
  const qr=rho-ra-rb,qy=Math.abs(dy)-ha-hb,pr=Math.max(qr,0),py=Math.max(qy,0),outside=Math.hypot(pr,py);
  const distance=outside+Math.min(Math.max(qr,qy),0)-.24;
  if(pr>0&&py>0){
    const normal2={x:ex*pr/outside,y:sy*py/outside,z:ez*pr/outside};
    return {distance,normal2,
      point1:{x:ca.x-ex*ra-.12*normal2.x,y:ca.y-sy*ha-.12*normal2.y,z:ca.z-ez*ra-.12*normal2.z},
      point2:{x:cb.x+ex*rb+.12*normal2.x,y:cb.y+sy*hb+.12*normal2.y,z:cb.z+ez*rb+.12*normal2.z}};
  }
  // Exact side/cap ties choose side; coincident radial centers use +X. Both
  // give deterministic finite penetration diagnostics, never damage permission.
  if(qr>=qy){
    const y=(Math.max(ca.y-ha,cb.y-hb)+Math.min(ca.y+ha,cb.y+hb))/2;
    return {distance,normal2:{x:ex,y:0,z:ez},point1:{x:ca.x-ex*attacker.radius,y,z:ca.z-ez*attacker.radius},point2:{x:cb.x+ex*target.radius,y,z:cb.z+ez*target.radius}};
  }
  const along=(Math.max(0,rho-ra)+Math.min(rho,rb))/2,x=cb.x+ex*along,z=cb.z+ez*along;
  return {distance,normal2:{x:0,y:sy,z:0},point1:{x,y:ca.y-sy*attacker.height/2,z},point2:{x,y:cb.y+sy*target.height/2,z}};
}

/** Continuous relative translation against the same yaw-invariant RoundCylinder
 * as Simulation. Rapier must already be initialized. No world access, mutation,
 * radius inflation, endpoint splash, team rule or cover decision occurs here.
 * contactDistance is bounded to the existing .02 m KCC cast skin; physical
 * separation admission permits an explicit additional .0001 m numerical
 * tolerance. Witnesses still belong to the physical hulls. Initial penetration
 * is diagnostic only and MUST
 * be rejected by damage integration. A segment does not model KCC slide corners,
 * a changing stance envelope, turning claws or animated limb geometry. */
export function sweepFelineContact(rapier:typeof RAPIER,attacker:ActorTravel,target:ActorTravel,options:FelineContactOptions):FelineContact|null {
  const skin=options.contactDistance??.02,minFacing=options.minFacingDot??.35;
  if(!valid(attacker)||!valid(target)||!Number.isFinite(options.facingYaw)||!Number.isFinite(minFacing)||minFacing< -1||minFacing>1||!Number.isFinite(skin)||skin<0||skin>.02)return null;
  const moveA=subtract(attacker.to,attacker.from),moveB=subtract(target.to,target.from);
  if(Math.hypot(moveA.x,moveA.y,moveA.z)<=EPS)return null;
  const a=new rapier.RoundCylinder(attacker.height/2-.12,attacker.radius-.12,.12);
  const b=new rapier.RoundCylinder(target.height/2-.12,target.radius-.12,.12);
  const ca=center(attacker),cb=center(target);
  const overlapping=closestHullGeometry(ca,cb,attacker,target).distance< -EPS;
  const hit=a.castShape(ca,identity,moveA,b,cb,identity,moveB,skin,1,true);
  if(!hit||!fraction(hit.time_of_impact))return null;
  const t=overlapping?0:hit.time_of_impact;
  // Native cast/contact-query GJK witnesses can be inaccurate on cap/side
  // transitions. Refine exact parallel-hull geometry at the SAME native fraction;
  // this does not add a cast, enlarge skin or extend accepted travel.
  const geometry=closestHullGeometry(at(ca,moveA,t),at(cb,moveB,t),attacker,target);
  const witnessA=geometry.point1,witnessB=geometry.point2,rawNormal=geometry.normal2;
  if(!finite(witnessA)||!finite(witnessB)||!finite(rawNormal))return null;
  const length=Math.hypot(rawNormal.x,rawNormal.y,rawNormal.z);
  if(length<=EPS)return null;
  const normal={x:rawNormal.x/length,y:rawNormal.y/length,z:rawNormal.z/length};
  // A moving target alone must not turn an idle or retreating attacker into a strike.
  if(dot(moveA,normal)>=-EPS||dot(subtract(moveA,moveB),normal)>=-EPS)return null;
  const bearing=subtract(witnessB,at(ca,moveA,t)),horizontal=Math.hypot(bearing.x,bearing.z);
  if(horizontal>EPS&&(-Math.sin(options.facingYaw)*bearing.x-Math.cos(options.facingYaw)*bearing.z)/horizontal<minFacing)return null;
  const separation=geometry.distance;
  if(!Number.isFinite(separation)||(!overlapping&&separation>skin+FELINE_CONTACT_TOLERANCE))return null;
  const exact=a.castShape(ca,identity,moveA,b,cb,identity,moveB,0,1,true);
  const exactFraction=exact&&fraction(exact.time_of_impact)?exact.time_of_impact:null;
  return {fraction:t,point:{...witnessB},witnessAttacker:{...witnessA},witnessTarget:{...witnessB},normal,separation,initialOverlap:overlapping,exactFraction};
}

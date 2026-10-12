import RAPIER from '@dimforge/rapier3d-compat';
import { Bone, Matrix4, Quaternion, Vector3 } from 'three';
import { solveKnee } from './felineMotion';
import { clamp } from '../../../shared/math';
import type { ActorState, Chassis, ClimbState } from '../../../shared/types';

export const PAW_PROBE_INTERVAL=1/30;
export const PAW_PROFILES:Record<Chassis,{settle:number;release:number;anchorLimit:number;vertical:number;minNormal:number}>={
  pounce:{settle:22,release:10,anchorLimit:.42,vertical:.3,minNormal:.65},
  bastion:{settle:16,release:8,anchorLimit:.34,vertical:.25,minNormal:.72},
  lynx:{settle:25,release:12,anchorLimit:.46,vertical:.32,minNormal:.67},
  caracal:{settle:19,release:9,anchorLimit:.39,vertical:.28,minNormal:.7},
};
export interface PawSurface {valid:boolean;envelope:boolean;x:number;z:number;queryFloor:number;footprintXZ:Float64Array;height:number;centerHeight:number;normal:Vector3;colliders:(RAPIER.Collider|null)[];casts:number;ceiling:number;ceilingCollider:RAPIER.Collider|null;}
export interface PawAnchor {position:Vector3;normal:Vector3;planted:boolean;releasing:boolean;weight:number;nextProbe:number;surface:PawSurface;pose:Vector3;poseHip:Vector3;poseValid:boolean;releaseOffset:Vector3;releaseStartWeight:number;plan: {ready:boolean;point:Vector3;alternate:Vector3;hip:Vector3};}
export interface PawProbe {ray:RAPIER.Ray;offset:Vector3;normal:Vector3;rotation:Quaternion;up:Vector3;footprint:Vector3[];heights:Float64Array;hitNormals:Vector3[];}
export function createPawAnchor():PawAnchor {return {position:new Vector3(),normal:new Vector3(0,1,0),planted:false,releasing:false,weight:0,nextProbe:0,pose:new Vector3(),poseHip:new Vector3(),poseValid:false,releaseOffset:new Vector3(),releaseStartWeight:0,plan:{ready:false,point:new Vector3(),alternate:new Vector3(),hip:new Vector3()},surface:{valid:false,envelope:false,x:0,z:0,queryFloor:0,footprintXZ:new Float64Array(8),height:0,centerHeight:0,normal:new Vector3(0,1,0),colliders:[null,null,null,null,null],casts:0,ceiling:-Infinity,ceilingCollider:null}};}
export function createPawProbe():PawProbe {return {ray:new RAPIER.Ray({x:0,y:0,z:0},{x:0,y:-1,z:0}),offset:new Vector3(),normal:new Vector3(),rotation:new Quaternion(),up:new Vector3(),footprint:Array.from({length:4},()=>new Vector3()),heights:new Float64Array(5),hitNormals:Array.from({length:5},()=>new Vector3())};}
export function pawFootprint(corners:readonly Vector3[],matrix:Matrix4,origin:Vector3,probe:PawProbe):boolean {
  if(corners.length!==8)return false;
  // Conservative oriented rectangle of all rotated corners, rather than
  // assuming a particular bind-bone axis is the sole's vertical axis.
  const e=matrix.elements,length=Math.hypot(e[0],e[2]);let ux=1,uz=0;if(length>.001){ux=e[0]/length;uz=e[2]/length;}
  let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(let i=0;i<8;i++){probe.offset.copy(corners[i]).applyMatrix4(matrix).sub(origin);const u=probe.offset.x*ux+probe.offset.z*uz,v=-probe.offset.x*uz+probe.offset.z*ux;minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);}
  if(![minU,maxU,minV,maxV].every(Number.isFinite)||maxU-minU<1e-6||maxV-minV<1e-6)return false;
  for(let i=0;i<4;i++){const u=i<2?minU:maxU,v=i%2===0?minV:maxV;probe.footprint[i].set(u*ux-v*uz,0,u*uz+v*ux);}return true;
}
export function groundContactAllowed(alive:boolean,grounded:boolean,climbing:boolean,climbWeight:number,time:number,stanceChangedAt:number,stanceDuration:number,detachedAt:number,retraction:number):boolean {return alive&&grounded&&!climbing&&climbWeight<.001&&time-stanceChangedAt>=stanceDuration&&time-detachedAt>=retraction;}
export function clearPawAnchor(anchor:PawAnchor):void {anchor.planted=false;anchor.releasing=false;anchor.weight=0;anchor.nextProbe=0;anchor.poseValid=false;anchor.releaseStartWeight=0;anchor.plan.ready=false;anchor.surface.valid=false;anchor.surface.envelope=false;anchor.surface.normal.set(0,1,0);anchor.surface.ceiling=-Infinity;anchor.surface.ceilingCollider=null;for(let i=0;i<5;i++)anchor.surface.colliders[i]=null;}

/** Expired world positions are animation references, never planted support. */
function expirePawLease(anchor:PawAnchor):void {
  if(anchor.releasing)return;
  anchor.planted=false;anchor.releasing=true;anchor.releaseStartWeight=anchor.weight;
}
export function retirePawLease(anchor:PawAnchor):void {anchor.planted=false;anchor.releasing=false;anchor.weight=0;anchor.poseValid=false;anchor.releaseStartWeight=0;anchor.nextProbe=0;}
function unsafePawLease(anchor:PawAnchor,paw:Vector3,hip:Vector3,sole:number,reach:number,support:number,scale:number,profile:typeof PAW_PROFILES.pounce):boolean {
  return !anchor.surface.valid||support<.02||Math.hypot(paw.x-anchor.position.x,paw.z-anchor.position.z)>profile.anchorLimit*scale||hip.distanceTo(anchor.position)>=reach*.98||paw.y-sole-anchor.surface.height>.12*scale||anchor.surface.height-paw.y+sole>profile.vertical*scale;
}
function leaseTarget(anchor:PawAnchor,paw:Vector3,weight:number,scale:number,profile:typeof PAW_PROFILES.pounce,out:Vector3):void {
  out.copy(paw);
  if(weight>0){
    // Preserve the existing bounded world-reference fade. Final admission
    // still qualifies every residual contribution before applying rigid IK.
    const dx=anchor.position.x-paw.x,dz=anchor.position.z-paw.z,planar=Math.hypot(dx,dz),bound=Math.min(1,profile.anchorLimit*scale/Math.max(.001,planar))*weight;
    out.x+=dx*bound;out.z+=dz*bound;
    if(anchor.surface.valid)out.y+=clamp(anchor.position.y-paw.y,-profile.vertical*scale,profile.vertical*scale)*weight;
  }
}
/** Decide the outgoing owner before querying its selected footprint. */
export function preparePawLease(anchor:PawAnchor,paw:Vector3,hip:Vector3,sole:number,reach:number,support:number,dt:number,scale:number,profile:typeof PAW_PROFILES.pounce):void {
  if(anchor.planted&&!anchor.releasing&&unsafePawLease(anchor,paw,hip,sole,reach,support,scale,profile))expirePawLease(anchor);
  const desired=anchor.planted&&!anchor.releasing?clamp(support,0,1):0,rate=desired>anchor.weight?profile.settle:profile.release,next=anchor.weight+clamp(desired-anchor.weight,-rate*dt,rate*dt);
  leaseTarget(anchor,paw,next,scale,profile,anchor.plan.point);
  anchor.plan.alternate.copy(paw);
  anchor.plan.hip.copy(hip);anchor.plan.ready=true;
}
/** Save a qualified request only while it owns a plant, never a release result. */
export function capturePawLeasePose(anchor:PawAnchor,hip:Vector3,target:Vector3,upper:number,lower:number):void {if(anchor.planted&&!anchor.releasing&&pawRequestAdmitted(hip,target,upper,lower)){anchor.pose.copy(target);anchor.poseHip.copy(hip);anchor.poseValid=true;}}
/** The existing rigid solver has a small margin at both joint limits. */
export function pawRequestWithinJointLimits(hip:Vector3,target:Vector3,upper:number,lower:number):boolean {const distance=hip.distanceTo(target),length=upper+lower;return Number.isFinite(distance)&&Number.isFinite(length)&&upper>0&&lower>0&&distance>Math.abs(upper-lower)+.0001&&distance<=length-.0001;}
export function pawRequestAdmitted(hip:Vector3,target:Vector3,upper:number,lower:number):boolean {return pawRequestWithinJointLimits(hip,target,upper,lower)&&hip.distanceTo(target)<(upper+lower)*.98;}
export function staticPawCollider(collider:RAPIER.Collider):boolean {if(!collider.isValid()||!collider.isEnabled()||collider.isSensor())return false;const body=collider.parent();return !body||body.isFixed()&&body.isEnabled();}
export function envelopePresent(surface:PawSurface):boolean {if(!surface.envelope)return false;for(let i=0;i<5;i++){const c=surface.colliders[i];if(!c||!staticPawCollider(c)){surface.valid=false;surface.envelope=false;surface.normal.set(0,1,0);surface.ceiling=-Infinity;surface.ceilingCollider=null;return false;}}return true;}
export function surfacePresent(surface:PawSurface):boolean {return envelopePresent(surface)&&surface.valid;}
export function pawReadyForCrouch(anchor:PawAnchor,support:number):boolean {return anchor.planted&&!anchor.releasing&&anchor.weight>=.999&&support>=.999&&surfacePresent(anchor.surface);}
export interface GroundSettle {clearance:number;count:number;supports:number;valid:boolean;}
export function createGroundSettle():GroundSettle {return {clearance:Infinity,count:0,supports:0,valid:true};}
export function resetGroundSettle(out:GroundSettle):void {out.clearance=Infinity;out.count=0;out.supports=0;out.valid=true;}
/** Include every applicable sole, including swings, as a downward safety bound.
 * The support count keeps a single foot or a lifted attack from lowering a rig. */
export function includeGroundSettle(out:GroundSettle,anchor:PawAnchor,paw:Vector3,verticalSole:number,support:number):void {
  out.count++;if(!envelopePresent(anchor.surface)){out.valid=false;return;}const s=anchor.surface;
  // All footprint corners constrain lowering, including an unplantable seam.
  // The highest real hit and whole vertical sole are conservative together;
  // only genuinely coplanar stance supports count toward carrier acquisition.
  out.clearance=Math.min(out.clearance,paw.y-verticalSole-s.ceiling);if(s.valid&&support>.55)out.supports++;
}
/** Collision floor is often above individual paws on slopes. Lower the visual
 * carrier only into measured empty clearance; never extend a limb or alter KCC. */
export function settleCarrier(out:GroundSettle,current:number,scale:number,enabled:boolean,required:number,dt:number,rate:number):number {
  if(!enabled)return 0;
  const eligible=out.valid&&out.count===required&&out.supports>=2&&Number.isFinite(out.clearance);
  const target=eligible?clamp(current-out.clearance+.004,-.18*scale,0):0;
  // Eligibility loss is not a collision. Release continuously; individual
  // sole clearance handles a newly raised obstacle without popping the torso.
  const step=Math.max(0,dt)*rate*scale;return current+clamp(target-current,-step,step);
}
export function clearPawObstruction(surface:PawSurface,paw:Vector3,sole:number,verticalSole:number,out:Vector3):void {
  if(surface.valid&&surfacePresent(surface)){
    const floor=surface.height-(surface.normal.x*(out.x-surface.x)+surface.normal.z*(out.z-surface.z))/surface.normal.y;
    out.y=Math.max(out.y,floor+sole);
  }else {out.y=Math.max(paw.y,out.y);if(surface.ceilingCollider&&staticPawCollider(surface.ceilingCollider))out.y=Math.max(out.y,surface.ceiling+verticalSole);}
  // The target only retracts upward; it never stands on an incomplete plane.
}
/** Center + four conservative footprint corners, using one reusable ray.
 * Rays stay within the real body-floor neighborhood; missing, steep, overhead
 * or discontinuous support never falls back to an analytic terrain plane. */
export function sampleStaticPaw(world:RAPIER.World,probe:PawProbe,surface:PawSurface,x:number,z:number,floor:number,scale:number,profile=PAW_PROFILES.pounce):void {
  surface.valid=false;surface.envelope=false;surface.normal.set(0,1,0);surface.casts=0;surface.x=x;surface.z=z;surface.queryFloor=floor;surface.ceiling=-Infinity;surface.ceilingCollider=null;let complete=true;
  for(let i=0;i<4;i++){surface.footprintXZ[i*2]=x+probe.footprint[i].x;surface.footprintXZ[i*2+1]=z+probe.footprint[i].z;}
  // A floor-preserving authority body already rises onto a supported step.
  // Search farther below for slope variation, but never reach up to a shelf.
  // Searching the combined carrier/IK capacity discovers downhill terrain
  // below a wide KCC hull's uphill rim. The actual correction limits stay fixed.
  const depth=(profile.vertical+.18)*scale,rise=.12*scale+.015,range=rise+depth+.035;
  for(let i=0;i<5;i++){
    const dx=i===0?0:probe.footprint[i-1].x,dz=i===0?0:probe.footprint[i-1].z;
    probe.ray.origin.x=x+dx;probe.ray.origin.y=floor+rise;probe.ray.origin.z=z+dz;
    const hit=world.castRayAndGetNormal(probe.ray,range,false,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,undefined,staticPawCollider);surface.casts++;
    surface.colliders[i]=hit?.collider??null;
    if(!hit||hit.normal.y<profile.minNormal){complete=false;continue;}
    const height=probe.ray.origin.y-hit.timeOfImpact;
    if(!Number.isFinite(height)||!Number.isFinite(hit.normal.x)||!Number.isFinite(hit.normal.y)||!Number.isFinite(hit.normal.z)||height-floor>.12*scale||floor-height>depth){complete=false;continue;}
    probe.heights[i]=height;probe.hitNormals[i].set(hit.normal.x,hit.normal.y,hit.normal.z);
    if(height>surface.ceiling){surface.ceiling=height;surface.ceilingCollider=hit.collider;}
    if(i===0){surface.height=height;surface.centerHeight=height;surface.normal.set(hit.normal.x,hit.normal.y,hit.normal.z);}
    surface.colliders[i]=hit.collider;
  }
  surface.envelope=complete;
  if(complete){
    // Fit one support plane to the complete real footprint, rather than
    // privileging whichever triangle contains the center. Every hit must
    // still lie within the same strict 2mm bound; a step is not a plane.
    let sx=0,sz=0,sy=0,xx=0,zz=0,xz=0,xy=0,zy=0;
    for(let i=0;i<5;i++){const dx=i?probe.footprint[i-1].x:0,dz=i?probe.footprint[i-1].z:0,h=probe.heights[i]-probe.heights[0];sx+=dx;sz+=dz;sy+=h;xx+=dx*dx;zz+=dz*dz;xz+=dx*dz;xy+=dx*h;zy+=dz*h;}
    xx-=sx*sx/5;zz-=sz*sz/5;xz-=sx*sz/5;xy-=sx*sy/5;zy-=sz*sy/5;
    const determinant=xx*zz-xz*xz;
    let gx=-surface.normal.x/surface.normal.y,gz=-surface.normal.z/surface.normal.y;
    if(!Number.isFinite(determinant)||determinant<=1e-12)return;
    gx=(xy*zz-zy*xz)/determinant;gz=(zy*xx-xy*xz)/determinant;
    const intercept=probe.heights[0]+(sy-gx*sx-gz*sz)/5;if(!Number.isFinite(gx)||!Number.isFinite(gz)||!Number.isFinite(intercept))return;
    probe.normal.set(-gx,1,-gz).normalize();let valid=probe.normal.y>=profile.minNormal;
    for(let i=0;i<5;i++){const dx=i?probe.footprint[i-1].x:0,dz=i?probe.footprint[i-1].z:0;if(!Number.isFinite(probe.heights[i])||Math.abs(probe.heights[i]-intercept-gx*dx-gz*dz)>.002*scale||probe.normal.dot(probe.hitNormals[i])<.85)valid=false;}
    if(valid){surface.height=intercept;surface.normal.copy(probe.normal);surface.valid=true;}
  }
  if(!complete)surface.normal.set(0,1,0);
}
/** Refresh the rotated footprint at the predicted final XZ throughout a fade,
 * including its first support/drift-triggered release frame. Forced cadence
 * replaces the scheduled probe; never a second five-ray query in a frame. */
export function probeGroundPaw(world:RAPIER.World,probe:PawProbe,anchor:PawAnchor,corners:readonly Vector3[],matrix:Matrix4,paw:Vector3,floor:number,scale:number,profile:typeof PAW_PROFILES.pounce,time:number,dt:number,support:number):number {
  const drift=Math.hypot(paw.x-anchor.position.x,paw.z-anchor.position.z);
  const releasing=anchor.releasing||anchor.planted&&(support<.02||!anchor.surface.valid||drift>profile.anchorLimit*scale);
  const finishing=releasing&&anchor.weight<=profile.release*Math.max(0,dt)+.001;
  const footprintValid=pawFootprint(corners,matrix,paw,probe);
  // An unplanted swing/dash has no fixed world anchor. Its actual center and
  // every rotated footprint corner must remain near the cached query, even
  // when the scheduled 30Hz probe has not elapsed. This still replaces one
  // probe, and the scratch/cached corner arrays are allocated only at setup.
  let moved=false;
  if(!anchor.planted&&footprintValid){const s=anchor.surface,tolerance=.004*scale;moved=Math.hypot(paw.x-s.x,paw.z-s.z)>tolerance||Math.abs(floor-s.queryFloor)>tolerance;
    for(let i=0;i<4&&!moved;i++)moved=Math.hypot(paw.x+probe.footprint[i].x-s.footprintXZ[i*2],paw.z+probe.footprint[i].z-s.footprintXZ[i*2+1])>tolerance;
  }
  const held=anchor.planted&&!finishing;
  let x=held?anchor.position.x:paw.x,z=held?anchor.position.z:paw.z;
  if(releasing&&!finishing){const weight=Math.max(0,anchor.weight-profile.release*Math.max(0,dt)),bound=Math.min(1,profile.anchorLimit*scale/Math.max(.001,drift))*weight;x=paw.x+(anchor.position.x-paw.x)*bound;z=paw.z+(anchor.position.z-paw.z)*bound;}
  if(anchor.plan.ready&&footprintValid){
    x=anchor.plan.point.x;z=anchor.plan.point.z;
    // Query the selected pose itself. The rigid sole can rotate by at most
    // .26rad before the final request; reserve that rotation geometrically.
    // A different authored fallback gets its own fresh query below.
    const ux=(probe.footprint[2].x-probe.footprint[0].x),uz=(probe.footprint[2].z-probe.footprint[0].z),length=Math.hypot(ux,uz),u=ux/length,v=uz/length;
    let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity,radius=0;
    for(const p of probe.footprint){const pu=p.x*u+p.z*v,pv=-p.x*v+p.z*u;minU=Math.min(minU,pu);maxU=Math.max(maxU,pu);minV=Math.min(minV,pv);maxV=Math.max(maxV,pv);}
    for(const corner of corners){probe.offset.copy(corner).applyMatrix4(matrix).sub(paw);radius=Math.max(radius,probe.offset.length());}
    const padding=2*Math.sin(.13)*radius+.00001*scale;
    const loU=minU-padding,hiU=maxU+padding,loV=minV-padding,hiV=maxV+padding;
    for(let i=0;i<4;i++){const pu=i<2?loU:hiU,pv=i%2===0?loV:hiV;probe.footprint[i].set(pu*u-pv*v,0,pu*v+pv*u);}
    const s=anchor.surface;moved=Math.abs(s.x-x)>.00001||Math.abs(s.z-z)>.00001||Math.abs(s.queryFloor-floor)>.00001;
    for(let i=0;i<4&&!moved;i++)moved=Math.hypot(x+probe.footprint[i].x-s.footprintXZ[i*2],z+probe.footprint[i].z-s.footprintXZ[i*2+1])>.00001;
  }
  if(time<anchor.nextProbe&&!releasing&&!moved&&footprintValid)return 0;
  if(footprintValid)sampleStaticPaw(world,probe,anchor.surface,x,z,floor,scale,profile);
  else {anchor.surface.valid=false;anchor.surface.envelope=false;anchor.surface.casts=0;anchor.surface.normal.set(0,1,0);anchor.surface.ceiling=-Infinity;anchor.surface.ceilingCollider=null;}
  anchor.nextProbe=time+PAW_PROBE_INTERVAL;return anchor.surface.casts;
}
/** A retired lease cannot lend its floor receipt to an independent fallback.
 * Query the actual authored XZ and current rotated sole after carrier/orientation
 * changes. This exceptional second five-ray query is explicitly counted. */
export function probeAuthoredPawFallback(world:RAPIER.World,probe:PawProbe,anchor:PawAnchor,corners:readonly Vector3[],matrix:Matrix4,paw:Vector3,floor:number,scale:number,profile:typeof PAW_PROFILES.pounce,time:number):number {
  if(pawFootprint(corners,matrix,paw,probe))sampleStaticPaw(world,probe,anchor.surface,paw.x,paw.z,floor,scale,profile);
  else {anchor.surface.valid=false;anchor.surface.envelope=false;anchor.surface.casts=0;anchor.surface.normal.set(0,1,0);anchor.surface.ceiling=-Infinity;anchor.surface.ceilingCollider=null;}
  anchor.nextProbe=time+PAW_PROBE_INTERVAL;return anchor.surface.casts;
}
/** Hold a single world-space anchor through support; turn/reach failure fades
 * the old anchor completely before the next plant is allowed. */
export function plantedPawTarget(anchor:PawAnchor,paw:Vector3,hip:Vector3,sole:number,reach:number,support:number,dt:number,scale:number,profile:typeof PAW_PROFILES.pounce,out:Vector3):void {
  const surface=anchor.surface;
  if(anchor.planted&&!anchor.releasing&&unsafePawLease(anchor,paw,hip,sole,reach,support,scale,profile))expirePawLease(anchor);
  if(!anchor.planted&&!anchor.releasing&&surface.valid&&support>.55&&Math.hypot(surface.x-paw.x,surface.z-paw.z)<.08*scale&&Math.hypot(hip.x-paw.x,hip.y-surface.height-sole,hip.z-paw.z)<reach*.98&&paw.y-sole-surface.height<=.12*scale&&surface.height-paw.y+sole<profile.vertical*scale){
    anchor.position.set(paw.x,surface.height+sole,paw.z);anchor.normal.copy(surface.normal);anchor.planted=true;
  }
  const desired=anchor.planted&&!anchor.releasing?clamp(support,0,1):0;
  const rate=desired>anchor.weight?profile.settle:profile.release;
  anchor.weight+=clamp(desired-anchor.weight,-rate*dt,rate*dt);
  if(anchor.releasing&&anchor.weight<=.001){retirePawLease(anchor);surface.valid=false;}
  leaseTarget(anchor,paw,anchor.weight,scale,profile,out);
}
/** Geometric containment in the actual queried rectangle, including alignment.
 * This is a sparse local-plane receipt, not an arbitrary-terrain proof. */
export function pawQueryContains(surface:PawSurface,corners:readonly Vector3[],matrix:Matrix4,paw:Vector3,target:Vector3,probe:PawProbe):boolean {
  return surface.envelope&&pawQueryGeometryContains(surface,corners,matrix,paw,target,probe);
}
function pawQueryGeometryContains(surface:PawSurface,corners:readonly Vector3[],matrix:Matrix4,paw:Vector3,target:Vector3,probe:PawProbe):boolean {
  if(corners.length!==8)return false;
  const f=surface.footprintXZ,ux=f[4]-f[0],uz=f[5]-f[1],vx=f[2]-f[0],vz=f[3]-f[1],uu=ux*ux+uz*uz,vv=vx*vx+vz*vz;if(uu<1e-12||vv<1e-12)return false;
  for(const corner of corners){probe.offset.copy(corner).applyMatrix4(matrix).sub(paw);const dx=target.x+probe.offset.x-f[0],dz=target.z+probe.offset.z-f[1],u=(dx*ux+dz*uz)/uu,v=(dx*vx+dz*vz)/vv;if(!Number.isFinite(u)||!Number.isFinite(v)||u<-.000001||u>1.000001||v<-.000001||v>1.000001)return false;}
  return true;
}
/** Missing floor is not support. A fresh real obstruction can still retract an
 * unowned authored paw upward, as long as its whole rotated sole clears the
 * admitted hit. The Actor separately enforces both rigid joint limits. */
export function partialPawClearanceAllowed(surface:PawSurface,corners:readonly Vector3[],matrix:Matrix4,paw:Vector3,target:Vector3,probe:PawProbe,freshCasts:number,verticalSole:number):boolean {
  return !surface.envelope&&!surface.valid&&freshCasts===5&&surface.casts===5&&Number.isFinite(verticalSole)&&verticalSole>=0&&Number.isFinite(surface.ceiling)&&!!surface.ceilingCollider&&staticPawCollider(surface.ceilingCollider)&&target.x===paw.x&&target.z===paw.z&&target.y>=paw.y&&target.y>=surface.ceiling+verticalSole&&pawQueryGeometryContains(surface,corners,matrix,paw,target,probe);
}
export interface PawIK {hip:Vector3;knee:Vector3;paw:Vector3;target:Vector3;joint:Vector3;axis:Vector3;pole:Vector3;from:Vector3;to:Vector3;rotation:Quaternion;parent:Quaternion;world:Quaternion;pawRotation:Quaternion;}
/** Mixer bindings skip unchanged writes. Restore the last authored pose before
 * evaluating them so last frame's IK cannot become this frame's input pose. */
export interface AuthoredBonePose {bone:Bone;rotation:Quaternion;}
export function createAuthoredPose(bones:readonly Bone[]):AuthoredBonePose[] {return Array.from(new Set(bones),bone=>({bone,rotation:bone.quaternion.clone()}));}
export function restoreAuthoredPose(pose:readonly AuthoredBonePose[]):void {for(const p of pose)p.bone.quaternion.copy(p.rotation);}
export function captureAuthoredPose(pose:readonly AuthoredBonePose[]):void {for(const p of pose)p.rotation.copy(p.bone.quaternion);}
/** Keep the requested pose before solveKnee mutates its target. A nearly full
 * final reach can otherwise conceal a request outside either joint limit. */
export function recordPawIKRequest(hip:Vector3,target:Vector3,upper:number,lower:number,out:PawDiagnostic):void {
  const distance=hip.distanceTo(target),length=upper+lower;
  out.requestedReach=distance/length;
  out.ikClamped=distance<Math.abs(upper-lower)+.0001||distance>length-.0001;
}
/** Rotate fixed-length joints only; reusable by production and CPU contact audit. */
export function applyPawIK(upper:Bone,lower:Bone,paw:Bone,c:PawIK):void {
  const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw);
  solveKnee(c.hip,c.knee,c.target,a,b,c.joint,c.axis,c.pole);
  c.from.subVectors(c.knee,c.hip).normalize();c.to.subVectors(c.joint,c.hip).normalize();
  c.rotation.setFromUnitVectors(c.from,c.to);upper.getWorldQuaternion(c.world);upper.parent!.getWorldQuaternion(c.parent).invert();
  upper.quaternion.copy(c.parent.multiply(c.rotation).multiply(c.world));upper.updateWorldMatrix(false,true);
  lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);
  c.from.subVectors(c.paw,c.knee).normalize();c.to.subVectors(c.target,c.knee).normalize();
  c.rotation.setFromUnitVectors(c.from,c.to);lower.getWorldQuaternion(c.world);lower.parent!.getWorldQuaternion(c.parent).invert();
  lower.quaternion.copy(c.parent.multiply(c.rotation).multiply(c.world));lower.updateWorldMatrix(false,true);
  paw.parent!.getWorldQuaternion(c.parent).invert();paw.quaternion.copy(c.parent.multiply(c.pawRotation));paw.updateWorldMatrix(false,false);
}
/** Clearance of all eight rotated bound corners above a sampled tangent plane. */
export function pawSole(corners:readonly Vector3[],matrix:Matrix4,origin:Vector3,normal:Vector3,probe:PawProbe):number {
  let minimum=0;for(let i=0;i<corners.length;i++){probe.offset.copy(corners[i]).applyMatrix4(matrix).sub(origin);minimum=Math.min(minimum,probe.offset.dot(normal));}
  return -minimum/Math.max(.1,normal.y)+.004;
}
export interface PawDiagnostic {support:number;weight:number;planted:boolean;valid:boolean;slip:number;soleError:number;reach:number;requestedReach:number;ikClamped:boolean;plannedReach:number;authoredReach:number;ikApplied:boolean;ikRejected:boolean;leaseRetired:boolean;releasePose:boolean;authoredFallback:boolean;legacyRawFallback:boolean;partialClearance:boolean;fallbackCasts:number;casts:number;surface:'wall'|'roof'|null;clearance:number;}
export interface ContactDiagnostic {pair?:{id:string;phase:string;role:string;clip:string|null;time:number;weight:number;yaw:number}|null;probes:number;carrierSettle:number;clearance:number;frameClock:number;renderTime:number;renderElapsed:number;cosmeticDt:number;yawDelta:number;yawRate:number;reactionSpeed:number;reactionStrafe:number;bodyLeanBefore:number;bodyLeanTarget:number;bodyLean:number;terrainRoll:number;bodyRoll:number;tailYaw:number;grounded:boolean;alive:boolean;stance:ActorState['stance'];stanceAmount:number;transitionWeight:number;climbing:boolean;climb:ClimbState|null;climbWeight:number;contactAllowed:boolean;resetting:boolean;strikeId:number|null;strikeLife:number|null;strikeKind:NonNullable<ActorState['strike']>['kind']|null;strikeStage:NonNullable<ActorState['strike']>['stage']|null;strikeWeight:number;strikeBodyPitch:number;strikeBodyRoll:number;position:ActorState['position'];paws:PawDiagnostic[];}
const diagnostics=new Map<string,ContactDiagnostic>();
export type ReadonlyContactDiagnostic=Readonly<Omit<ContactDiagnostic,'position'|'paws'|'climb'>>&{readonly position:Readonly<ActorState['position']>;readonly paws:readonly Readonly<PawDiagnostic>[];readonly climb:(Readonly<Omit<ClimbState,'normal'|'contact'>>&{readonly normal:Readonly<ClimbState['normal']>;readonly contact:Readonly<ClimbState['contact']>})|null};
export const pawContactDiagnostics:ReadonlyMap<string,ReadonlyContactDiagnostic>=diagnostics;
export function createContactDiagnostic():ContactDiagnostic {return {probes:0,carrierSettle:0,clearance:0,frameClock:0,renderTime:0,renderElapsed:0,cosmeticDt:0,yawDelta:0,yawRate:0,reactionSpeed:0,reactionStrafe:0,bodyLeanBefore:0,bodyLeanTarget:0,bodyLean:0,terrainRoll:0,bodyRoll:0,tailYaw:0,grounded:false,alive:false,stance:'quadruped',stanceAmount:0,transitionWeight:0,climbing:false,climb:null,climbWeight:0,contactAllowed:false,resetting:false,strikeId:null,strikeLife:null,strikeKind:null,strikeStage:null,strikeWeight:0,strikeBodyPitch:0,strikeBodyRoll:0,position:{x:0,y:0,z:0},paws:Array.from({length:4},()=>({support:0,weight:0,planted:false,valid:false,slip:0,soleError:0,reach:0,requestedReach:0,ikClamped:false,plannedReach:0,authoredReach:0,ikApplied:false,ikRejected:false,leaseRetired:false,releasePose:false,authoredFallback:false,legacyRawFallback:false,partialClearance:false,fallbackCasts:0,casts:0,surface:null,clearance:0}))};}
export function registerContactDiagnostic(id:string,value:ContactDiagnostic):void {diagnostics.set(id,value);}
export function forgetContactDiagnostic(id:string):void {diagnostics.delete(id);}

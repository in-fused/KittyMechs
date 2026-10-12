import {PerspectiveCamera,Quaternion,Vector3} from 'three';
import type {Vec3} from '../../../shared/types';
import {cameraContainsVisual} from './framing';
import {createVisualSight058,visualSightBlocked058} from './visualOccluders058';

// Obstruction-only presentation orbit. Public input yaw/pitch remain unchanged.
const angles=[.6,-.6,1.1,-1.1,1.6,-1.6,2.1,-2.1] as const;
export function createObstructionOrbit073(){return{active:false,generation:-1,life:-1,angle:0,clearTime:0,last:new Vector3(),lastRotation:new Quaternion(),goal:new Vector3(),candidate:new Vector3(),look:new Vector3(),delta:new Vector3(),point:new Vector3(),test:new PerspectiveCamera(),visual:createVisualSight058(),result:{active:false,returning:false,contained:false,anchorsClear:0,candidates:0,nativeQueries:0,visualQueries:0,constrained:true,orbitBias:0}};}
interface Context073 {
 camera:PerspectiveCamera;focus:Vector3;desired:Vector3;corners:readonly Vector3[];anchors:readonly Vector3[];
 normalAdmitted:boolean;dt:number;reset:boolean;generation:number;life:number;height:number;
 clearance:(from:Vector3,to:Vector3)=>Vec3;nativeEmpty:(at:Vector3)=>boolean;nativeSight:(from:Vector3,to:Vector3)=>boolean;
}
/** Max ten orbit candidates (retained side, eight offsets, elevated retained
 * side) plus one actual view check. Witnesses do not certify skin visibility.
 * A moving eye is swept both from its previous position and body-side focus.
 * No feasible candidate leaves the view explicitly constrained. */
export function resolveObstructionOrbit073(s:ReturnType<typeof createObstructionOrbit073>,c:Context073){
 const out=s.result;Object.assign(out,{active:false,returning:false,contained:false,anchorsClear:0,candidates:0,nativeQueries:0,visualQueries:0,constrained:true,orbitBias:s.angle});
 const dt=Math.min(.05,Math.max(0,c.dt));
 if(c.reset||s.generation!==c.generation||s.life!==c.life){s.active=false;s.clearTime=0;s.angle=0;s.generation=c.generation;s.life=c.life;out.orbitBias=0;}
 if(!s.active&&c.normalAdmitted){Object.assign(out,{contained:true,constrained:false});return out;}
 const empty=(at:Vector3)=>{out.nativeQueries++;return c.nativeEmpty(at);};
 const clear=(from:Vector3,to:Vector3)=>{out.nativeQueries++;return c.clearance(from,to);};
 s.test.copy(c.camera,false);s.test.updateProjectionMatrix();
 // Body-centered optical reorientation is confined to this obstruction branch.
 s.look.copy(c.focus).y+=Math.min(.5,Math.max(0,c.height*.12));
 const check=(camera:PerspectiveCamera)=>{
  const contained=cameraContainsVisual(camera,c.corners,s.point);let anchorsClear=0;
  if(contained&&empty(camera.position))for(let i=0;i<Math.min(3,c.anchors.length);i++){
   out.nativeQueries++;if(!c.nativeSight(camera.position,c.anchors[i]))continue;
   out.visualQueries++;if(!visualSightBlocked058(s.visual,camera.position,c.anchors[i],c.generation))anchorsClear++;
  }
  return{contained,anchorsClear,admitted:contained&&c.anchors.length>0&&anchorsClear>=Math.min(2,c.anchors.length)};
 };
 if(!s.active){s.last.copy(c.camera.position);s.lastRotation.copy(c.camera.quaternion);s.active=true;}
 // Choose a goal only after its complete eye path is known to be reachable.
 // A body-side clear .6-radian view can still lie across the cover from the
 // compressed current eye; repeatedly selecting it otherwise stalls forever.
 if(!empty(s.last)&&empty(c.camera.position)){s.last.copy(c.camera.position);s.lastRotation.copy(c.camera.quaternion);}
 const lastEmpty=empty(s.last);
 const reachable=(goal:Vector3)=>{if(!lastEmpty)return false;const safe=clear(s.last,goal);return s.point.set(safe.x,safe.y,safe.z).distanceToSquared(goal)<1e-8;};
 s.clearTime=c.normalAdmitted?s.clearTime+dt:0;
 const wantReturn=s.clearTime>=.45;let returning=false;
 let found=false;
 if(wantReturn&&reachable(c.camera.position)){s.goal.copy(c.camera.position);s.test.quaternion.copy(c.camera.quaternion);found=true;returning=true;}
 if(!found){
  s.delta.subVectors(c.desired,c.focus);const radius=Math.min(18,Math.max(4,Math.hypot(s.delta.x,s.delta.z))),yaw=Math.atan2(s.delta.x,s.delta.z),height=Math.max(s.delta.y,c.height*.55);
  for(let i=0;i<10;i++){
   const angle=i===0?s.angle:i===9?s.angle:angles[i-1],lift=i===9?Math.min(2,c.height*.6):0;
   s.candidate.set(c.focus.x+Math.sin(yaw+angle)*radius,c.focus.y+height+lift,c.focus.z+Math.cos(yaw+angle)*radius);
   const safe=clear(c.focus,s.candidate);s.test.position.set(safe.x,safe.y,safe.z);s.test.lookAt(s.look);out.candidates++;
   const result=check(s.test);if(!result.admitted||!reachable(s.test.position))continue;
   s.goal.copy(s.test.position);s.angle=angle;found=true;break;
  }
 }
 if(found){
  // Never sweep out of a compromised previous origin. The normal resolver's
  // safe current eye is the emergency seed, without claiming continuity there.
  if(lastEmpty){
   s.delta.subVectors(s.goal,s.last);const length=s.delta.length(),alpha=Math.min(1-Math.exp(-dt*7),length>0?14*dt/length:1);
   s.candidate.copy(s.last).addScaledVector(s.delta,alpha);
   const travel=clear(s.last,s.candidate);s.candidate.set(travel.x,travel.y,travel.z);
   const focusSafe=clear(c.focus,s.candidate);
   // A second focus-side correction must not move the eye off its swept path.
   // Hold the safe previous eye instead of pulling it through an intervening wall.
   if(s.candidate.distanceToSquared(s.point.set(focusSafe.x,focusSafe.y,focusSafe.z))<1e-8&&empty(s.candidate)){
    c.camera.position.copy(s.candidate);c.camera.quaternion.copy(s.lastRotation).rotateTowards(s.test.quaternion,dt*2.8);
   }else{c.camera.position.copy(s.last);c.camera.quaternion.copy(s.lastRotation);}
  }
 }else if(empty(s.last)){
  const safe=clear(c.focus,s.last);s.candidate.set(safe.x,safe.y,safe.z);
  if(s.candidate.distanceToSquared(s.last)<1e-8){c.camera.position.copy(s.last);c.camera.quaternion.copy(s.lastRotation);}
 }
 const actual=check(c.camera);s.last.copy(c.camera.position);s.lastRotation.copy(c.camera.quaternion);
 if(returning&&c.camera.position.distanceToSquared(s.goal)<.0004&&c.camera.quaternion.angleTo(s.test.quaternion)<.01){s.active=false;s.angle=0;s.clearTime=0;}
 Object.assign(out,{active:s.active,returning,contained:actual.contained,anchorsClear:actual.anchorsClear,constrained:!actual.admitted,orbitBias:s.angle});return out;
}

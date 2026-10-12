import RAPIER from '@dimforge/rapier3d-compat';
import {PerspectiveCamera,Quaternion,Vector3} from 'three';
import {projection280,compose280,type Layout280} from './usablePlayfield280';

export function createPlayerOrbit280(){return{probe:new RAPIER.Ball(.26),scratch:new PerspectiveCamera(),point:new Vector3(),eye:new Vector3(),goal:new Vector3(),previous:new Vector3(),step:new Vector3(),look:new Vector3(),aimFocus:new Vector3(),direction:new Vector3(),right:new Vector3(),up:new Vector3(),body:new Quaternion(),wanted:new Quaternion(),admitted:new Quaternion(),test:new Quaternion(),generation:-1,life:-1,bias:0,hold:0,initialized:false,result:{design:'HUD_USABLE_SAFE_BOOM280',constrained:true,projectedBody:false,nativeEmpty:false,chosenBias:0,boomElevation:0,radius:0,opticalLimited:false,candidates:0,nativeQueries:0,scope:'HUD-aware completed-envelope optical composition and unchanged native sphere/path clearance; not skin/contact/quality certification',usableProjection:null as ReturnType<typeof projection280>|null,occlusionLimits:{layoutUnavailable:true,bodyTooSmall:false}}};}
type Orbit280=ReturnType<typeof createPlayerOrbit280>;
const rotation={x:0,y:0,z:0,w:1},flags=RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC;
interface Context280 {camera:PerspectiveCamera;world:RAPIER.World;focus:Vector3;corners:readonly Vector3[];yaw:number;pitch:number;preferred:number;dt:number;reset:boolean;generation:number;life:number;usable:Layout280;}
/** A common third-person orbit: placement stays above the body's horizontal
 * horizon while optical intent is admitted only as far as the body remains
 * framed. Shortened obstructed booms are never called successful body views. */
export function resolvePlayerOrbit280(s:Orbit280,c:Context280){
 const out=s.result;const actualProjection=()=>{out.usableProjection=projection280(c.camera,c.corners,c.usable,s.point);out.occlusionLimits={layoutUnavailable:c.usable.rect===null,bodyTooSmall:!out.usableProjection.useful};return out.usableProjection.pass;};out.usableProjection=projection280(c.camera,c.corners,c.usable,s.point);out.occlusionLimits={layoutUnavailable:c.usable.rect===null,bodyTooSmall:!out.usableProjection.useful};Object.assign(out,{constrained:true,projectedBody:false,nativeEmpty:false,opticalLimited:false,candidates:0,nativeQueries:0});
 const reset=c.reset||s.generation!==c.generation||s.life!==c.life;s.generation=c.generation;s.life=c.life;if(reset){s.initialized=false;s.bias=0;s.hold=0;}
 if(!c.corners.length||![c.yaw,c.pitch,c.preferred,c.dt,c.camera.fov,c.camera.aspect].every(Number.isFinite))return out;
 s.scratch.copy(c.camera,false);let bodyRadius=0,minY=Infinity,maxY=-Infinity;for(const p of c.corners){bodyRadius=Math.max(bodyRadius,p.distanceTo(c.focus));minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 // A measured upward focus and short forward lookahead put the body below
 // the reticle. The reticle continues to target the actual resulting ray.
 const ahead=Math.max(.5,Math.min(1.5,bodyRadius*.35));s.aimFocus.copy(c.focus).add(s.direction.set(-Math.sin(c.yaw)*ahead,(maxY-minY)*.25,-Math.cos(c.yaw)*ahead));
 const distance=c.preferred,elevation=Math.max(.15,Math.min(1.15,.2-c.pitch));
 Object.assign(out,{radius:distance,boomElevation:elevation});if(!(distance>0&&distance<=24&&Number.isFinite(distance)))return out;
 const empty=(at:Vector3)=>{out.nativeQueries++;return !c.world.intersectionWithShape(at,rotation,s.probe,flags);};
 const path=(from:Vector3,to:Vector3)=>{s.direction.copy(to).sub(from);const length=s.direction.length();if(length<1e-6)return true;out.nativeQueries++;return !c.world.castShape(from,rotation,s.direction,s.probe,.015,1,true,flags);};
 s.previous.copy(c.camera.position);const previousSafe=s.initialized&&empty(s.previous);
 // Keep a successful obstruction azimuth briefly; normal return must itself
 // have a reachable full-sphere path. This is not a route planner.
 s.hold=Math.max(0,s.hold-Math.max(0,c.dt));const first=s.hold>0?s.bias:0;
 let selected=false;
 for(let i=0;i<5;i++){
  const bias=i===0?first:i===1?(first===0?s.bias:0):i===2?Math.PI/2:i===3?-Math.PI/2:0;
  if(i===1&&bias===first)continue;out.candidates++;
  const yaw=c.yaw+bias,lift=i===4?Math.max(elevation,.95):elevation;let composed=false;
  // Fit actual corners by composition first; bounded extra radius is not the sole fix.
  for(const radius of [distance,Math.min(24,distance+1.5),Math.min(24,distance+3)]){const flat=Math.cos(lift)*radius;s.eye.set(c.focus.x+Math.sin(yaw)*flat,c.focus.y+Math.sin(lift)*radius,c.focus.z+Math.cos(yaw)*flat);s.scratch.position.copy(s.eye);compose280(s.scratch,c.corners,c.focus,c.usable,s.point,s.aimFocus,s.right,s.up);if(projection280(s.scratch,c.corners,c.usable,s.point).pass){out.radius=radius;composed=true;break;}}
  if(!composed||!empty(s.eye)||!path(c.focus,s.eye)||(previousSafe&&!path(s.previous,s.eye)))continue;
  s.goal.copy(s.eye);if(bias!==s.bias)s.hold=.6;s.bias=bias;selected=true;break;
 }
 if(!selected){out.nativeEmpty=empty(c.camera.position);out.projectedBody=actualProjection();return out;}
 if(previousSafe){s.step.copy(s.goal).sub(s.previous);const length=s.step.length(),limit=14*Math.min(.08,Math.max(0,c.dt));if(length>limit)s.step.multiplyScalar(limit/length);s.step.add(s.previous);if(!empty(s.step)||!path(s.previous,s.step)||!path(c.focus,s.step))return out;c.camera.position.copy(s.step);}
 else if(reset||!s.initialized){c.camera.position.copy(s.goal);}else{return out;}
 // Find the closest admitted optical intent to the public look direction.
 // The always-tested body-centered end remains the successful bracket.
 s.scratch.position.copy(c.camera.position);compose280(s.scratch,c.corners,c.focus,c.usable,s.point,s.aimFocus,s.right,s.up);s.body.copy(s.scratch.quaternion);
 if(!projection280(s.scratch,c.corners,c.usable,s.point).pass){c.camera.quaternion.copy(s.body);out.projectedBody=actualProjection();out.nativeEmpty=empty(c.camera.position);s.initialized=true;return out;}
 s.look.copy(c.camera.position).add(s.direction.set(-Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),-Math.cos(c.yaw)*Math.cos(c.pitch)));s.scratch.lookAt(s.look);s.wanted.copy(s.scratch.quaternion);
 if(projection280(s.scratch,c.corners,c.usable,s.point).pass)s.admitted.copy(s.wanted);
 else{let low=0,high=1;s.admitted.copy(s.body);for(let i=0;i<8;i++){const mid=(low+high)/2;s.scratch.quaternion.copy(s.wanted).slerp(s.body,mid);if(projection280(s.scratch,c.corners,c.usable,s.point).pass){high=mid;s.admitted.copy(s.scratch.quaternion);}else low=mid;}out.opticalLimited=true;}
 // Damp only when the resulting orientation still contains the actual body.
 s.test.copy(c.camera.quaternion).rotateTowards(s.admitted,2.8*Math.max(0,c.dt));s.scratch.quaternion.copy(s.test);
 c.camera.quaternion.copy(!reset&&projection280(s.scratch,c.corners,c.usable,s.point).pass?s.test:s.admitted);
 out.projectedBody=actualProjection();out.nativeEmpty=empty(c.camera.position);out.constrained=!out.projectedBody||!out.nativeEmpty;out.chosenBias=s.bias;out.usableProjection=projection280(c.camera,c.corners,c.usable,s.point);out.occlusionLimits={layoutUnavailable:c.usable.rect===null,bodyTooSmall:!out.usableProjection.useful};s.initialized=true;return out;
}
// Preserve the original named API for a canonical module alias.
export {createPlayerOrbit280 as createPlayerOrbit087,resolvePlayerOrbit280 as resolvePlayerOrbit087};

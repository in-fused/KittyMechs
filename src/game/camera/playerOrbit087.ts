import RAPIER from '@dimforge/rapier3d-compat';
import {PerspectiveCamera,Quaternion,Vector3} from 'three';
import {cameraContainsVisual} from './framing';

export function createPlayerOrbit087(){return{probe:new RAPIER.Ball(.26),scratch:new PerspectiveCamera(),point:new Vector3(),eye:new Vector3(),goal:new Vector3(),previous:new Vector3(),step:new Vector3(),look:new Vector3(),aimFocus:new Vector3(),direction:new Vector3(),body:new Quaternion(),wanted:new Quaternion(),admitted:new Quaternion(),test:new Quaternion(),generation:-1,life:-1,bias:0,hold:0,initialized:false,result:{design:'BODY_CENTERED_SAFE_BOOM087',constrained:true,projectedBody:false,nativeEmpty:false,chosenBias:0,boomElevation:0,radius:0,opticalLimited:false,candidates:0,nativeQueries:0,scope:'Completed rendered-envelope projection and native sphere/path clearance; not visible skin pixels'}};}
type Orbit087=ReturnType<typeof createPlayerOrbit087>;
const rotation={x:0,y:0,z:0,w:1},flags=RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC;
interface Context087 {camera:PerspectiveCamera;world:RAPIER.World;focus:Vector3;corners:readonly Vector3[];yaw:number;pitch:number;preferred:number;dt:number;reset:boolean;generation:number;life:number;}
/** A common third-person orbit: placement stays above the body's horizontal
 * horizon while optical intent is admitted only as far as the body remains
 * framed. Shortened obstructed booms are never called successful body views. */
export function resolvePlayerOrbit087(s:Orbit087,c:Context087){
 const out=s.result;Object.assign(out,{constrained:true,projectedBody:false,nativeEmpty:false,opticalLimited:false,candidates:0,nativeQueries:0});
 const reset=c.reset||s.generation!==c.generation||s.life!==c.life;s.generation=c.generation;s.life=c.life;if(reset){s.initialized=false;s.bias=0;s.hold=0;}
 if(!c.corners.length||![c.yaw,c.pitch,c.preferred,c.dt,c.camera.fov,c.camera.aspect].every(Number.isFinite))return out;
 s.scratch.copy(c.camera,false);let bodyRadius=0,minY=Infinity,maxY=-Infinity;for(const p of c.corners){bodyRadius=Math.max(bodyRadius,p.distanceTo(c.focus));minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 // A measured upward focus and short forward lookahead put the body below
 // the reticle. The reticle continues to target the actual resulting ray.
 const ahead=Math.max(.5,Math.min(1.5,bodyRadius*.35));s.aimFocus.copy(c.focus).add(s.direction.set(-Math.sin(c.yaw)*ahead,(maxY-minY)*.25,-Math.cos(c.yaw)*ahead));
 const halfY=c.camera.fov*Math.PI/360,halfX=Math.atan(Math.tan(halfY)*c.camera.aspect),angle=Math.min(halfX,halfY)*.88;
 const distance=Math.max(c.preferred,(bodyRadius+s.aimFocus.distanceTo(c.focus)+c.camera.near+.08)/Math.sin(angle)),elevation=Math.max(.15,Math.min(1.15,.2-c.pitch));
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
  const yaw=c.yaw+bias,lift=i===4?Math.max(elevation,.95):elevation,flat=Math.cos(lift)*distance;
  s.eye.set(c.focus.x+Math.sin(yaw)*flat,c.focus.y+Math.sin(lift)*distance,c.focus.z+Math.cos(yaw)*flat);
  if(!empty(s.eye)||!path(c.focus,s.eye)||(previousSafe&&!path(s.previous,s.eye)))continue;
  s.scratch.position.copy(s.eye);s.scratch.lookAt(s.aimFocus);if(!cameraContainsVisual(s.scratch,c.corners,s.point))continue;
  s.goal.copy(s.eye);if(bias!==s.bias)s.hold=.6;s.bias=bias;selected=true;break;
 }
 if(!selected){out.nativeEmpty=empty(c.camera.position);out.projectedBody=cameraContainsVisual(c.camera,c.corners,s.point);return out;}
 if(previousSafe){s.step.copy(s.goal).sub(s.previous);const length=s.step.length(),limit=14*Math.min(.08,Math.max(0,c.dt));if(length>limit)s.step.multiplyScalar(limit/length);s.step.add(s.previous);if(!empty(s.step)||!path(s.previous,s.step)||!path(c.focus,s.step))return out;c.camera.position.copy(s.step);}
 else if(reset||!s.initialized){c.camera.position.copy(s.goal);}else{return out;}
 // Find the closest admitted optical intent to the public look direction.
 // The always-tested body-centered end remains the successful bracket.
 s.scratch.position.copy(c.camera.position);s.scratch.lookAt(s.aimFocus);s.body.copy(s.scratch.quaternion);
 if(!cameraContainsVisual(s.scratch,c.corners,s.point)){c.camera.quaternion.copy(s.body);out.projectedBody=false;out.nativeEmpty=empty(c.camera.position);s.initialized=true;return out;}
 s.look.copy(c.camera.position).add(s.direction.set(-Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),-Math.cos(c.yaw)*Math.cos(c.pitch)));s.scratch.lookAt(s.look);s.wanted.copy(s.scratch.quaternion);
 if(cameraContainsVisual(s.scratch,c.corners,s.point))s.admitted.copy(s.wanted);
 else{let low=0,high=1;s.admitted.copy(s.body);for(let i=0;i<8;i++){const mid=(low+high)/2;s.scratch.quaternion.copy(s.wanted).slerp(s.body,mid);if(cameraContainsVisual(s.scratch,c.corners,s.point)){high=mid;s.admitted.copy(s.scratch.quaternion);}else low=mid;}out.opticalLimited=true;}
 // Damp only when the resulting orientation still contains the actual body.
 s.test.copy(c.camera.quaternion).rotateTowards(s.admitted,2.8*Math.max(0,c.dt));s.scratch.quaternion.copy(s.test);
 c.camera.quaternion.copy(!reset&&cameraContainsVisual(s.scratch,c.corners,s.point)?s.test:s.admitted);
 out.projectedBody=cameraContainsVisual(c.camera,c.corners,s.point);out.nativeEmpty=empty(c.camera.position);out.constrained=!out.projectedBody||!out.nativeEmpty;out.chosenBias=s.bias;s.initialized=true;return out;
}

import {PerspectiveCamera,Vector3} from 'three';
import type {Vec3} from '../../../shared/types';
import {cameraContainsVisual} from './framing';
import {createVisualSight058,visualSightBlocked058} from './visualOccluders058';
export function createThirdPersonSight058(){return{saved:new Vector3(),candidate:new Vector3(),look:new Vector3(),point:new Vector3(),visual:createVisualSight058(),result:{contained:false,anchorsClear:0,anchorsTested:0,candidates:0,corrected:false,constrained:true}};}
const alternatives=[[0,0],[1,0],[-1,0],[0,1],[1,1],[-1,1]] as const;
interface SightContext058 {
 camera:PerspectiveCamera;desired:Vector3;forward:Vector3;right:Vector3;up:Vector3;
 corners:readonly Vector3[];anchors:readonly Vector3[];width:number;height:number;generation:number;
 clearance:(to:Vector3)=>Vec3;nativeEmpty:(at:Vector3)=>boolean;nativeSight:(from:Vector3,to:Vector3)=>boolean;
}
/** At most seven eye candidates and three actual rig anchors each. Explicit
 * optical controls are fixed; native safety and rendering witnesses stay distinct. */
export function resolveThirdPersonSight058(s:ReturnType<typeof createThirdPersonSight058>,c:SightContext058){
 const out=s.result;Object.assign(out,{contained:false,anchorsClear:0,anchorsTested:Math.min(3,c.anchors.length),candidates:0,corrected:false,constrained:true});s.saved.copy(c.camera.position);
 const orient=()=>{s.look.copy(c.camera.position).add(c.forward);c.camera.lookAt(s.look);};
 const check=()=>{
  out.candidates++;orient();const contained=cameraContainsVisual(c.camera,c.corners,s.point);let clear=0;
  if(contained&&c.nativeEmpty(c.camera.position))for(let i=0;i<out.anchorsTested;i++)if(c.nativeSight(c.camera.position,c.anchors[i])&&!visualSightBlocked058(s.visual,c.camera.position,c.anchors[i],c.generation))clear++;
  return{contained,clear,admitted:contained&&out.anchorsTested>0&&clear>=Math.min(2,out.anchorsTested)};
 };
 const original=check();if(original.admitted){Object.assign(out,{contained:true,anchorsClear:original.clear,constrained:false});return out;}
 for(const [side,lift] of alternatives){
  s.candidate.copy(c.desired).addScaledVector(c.right,side*c.width).addScaledVector(c.up,lift*c.height);
  const safe=c.clearance(s.candidate);c.camera.position.set(safe.x,safe.y,safe.z);const result=check();
  if(result.admitted){Object.assign(out,{contained:true,anchorsClear:result.clear,corrected:c.camera.position.distanceToSquared(s.saved)>1e-8,constrained:false});return out;}
 }
 c.camera.position.copy(s.saved);orient();Object.assign(out,{contained:original.contained,anchorsClear:original.clear});return out;
}

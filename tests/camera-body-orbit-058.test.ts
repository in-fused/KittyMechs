import {beforeAll,describe,expect,it} from 'vitest';
import {Bone,BoxGeometry,Group,Mesh,MeshBasicMaterial,PerspectiveCamera,Vector3} from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {cameraContainsVisual,cameraPose,createCameraFraming,fitCameraDistance} from '../src/game/camera/framing';
import {cameraClearance} from '../src/game/camera/clearance';
import {cameraVisual,completeCameraVisual,registerCameraVisual} from '../src/game/camera/visualRegistry';
import {prepareVisualEnvelope} from '../src/game/camera/visualEnvelope';
import {createVisualSight058,registerVisualOccluder058,visualSightBlocked058} from '../src/game/camera/visualOccluders058';
import {createThirdPersonSight058,resolveThirdPersonSight058} from '../src/game/camera/thirdPersonSight058';
const composition={boomHeight:2,lookAhead:1.4,pitchReach:16,bodyOrbit:true};
function corners(min:Vector3,max:Vector3){const out:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])out.push(new Vector3(x,y,z));return out;}
function box(){const root=new Group(),mesh=new Mesh(new BoxGeometry(2,4,1),new MeshBasicMaterial());mesh.position.set(0,2,5);root.add(mesh);return{root,mesh,dispose(){mesh.geometry.dispose();mesh.material.dispose();}};}
beforeAll(async()=>{await RAPIER.init();});
describe('body orbit and explicit render sightlines 058',()=>{
 it('preserves optical look yaw/pitch and body-center composition through moving, steep-pitch views',()=>{
  const camera=new PerspectiveCamera(59,1.6,.1,850),look=new Vector3(),focus=new Vector3(12,2,-20),state=createCameraFraming();
  const points=corners(new Vector3(-1.8,0,-2),new Vector3(1.8,4,3.5));const original=points.map(p=>p.toArray());
  let centerY:number|undefined;
  for(const pitch of [-.9,-.3,.06,.3,.75])for(const yaw of [0,1,-2]){
   focus.set(12+yaw*10,2,-20+pitch*10);
   cameraPose(focus,yaw,pitch,12,camera.position,look,composition);camera.lookAt(look);camera.updateMatrixWorld();
   const actual=camera.getWorldDirection(new Vector3()),expected=new Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
   expect(actual.distanceTo(expected)).toBeLessThan(1e-12);
   const projected=focus.clone().project(camera);centerY??=projected.y;expect(projected.y).toBeCloseTo(centerY,12);
   const moving=points.map(p=>p.clone().applyAxisAngle(new Vector3(0,1,0),yaw).add(new Vector3(focus.x,0,focus.z)));
   const fit=fitCameraDistance(state,focus,moving,yaw,pitch,6,59,1.6,18,composition);
   expect(fit.fitted).toBe(true);expect(fit.distance).toBeLessThanOrEqual(18);
   cameraPose(focus,yaw,pitch,fit.distance,camera.position,look,composition);camera.lookAt(look);
   expect(cameraContainsVisual(camera,moving,new Vector3())).toBe(true);
  }
  expect(points.map(p=>p.toArray())).toEqual(original);
 });
 it('keeps the standard legacy pose and reports impossible orbit fits honestly',()=>{
  const eye=new Vector3(),look=new Vector3();cameraPose(new Vector3(2,3,4),0,.4,6,eye,look);
  expect(eye.toArray()).toEqual([2,7-Math.sin(.4)*6,10]);expect(look.toArray()).toEqual([2,3+Math.sin(.4)*16,2]);
  const fit=fitCameraDistance(createCameraFraming(),new Vector3(),corners(new Vector3(-100,-100,-100),new Vector3(100,100,100)),0,.8,6,59,1.6,18,composition);
  expect(fit.fitted).toBe(false);expect(fit.distance).toBe(6);expect(fit.probes).toBeGreaterThan(0);
 });
 it('uses current opaque triangles, world transforms, ancestor visibility, generation and replacement cleanup',()=>{
  const a=box(),b=box(),s=createVisualSight058(),from=new Vector3(0,2,10),to=new Vector3(0,2,0),parent=new Group();parent.add(a.root);
  const old=registerVisualOccluder058('test058-marker',a.root,8);let next=()=>{};
  try{
   expect(visualSightBlocked058(s,from,to,8)).toBe(true);expect(visualSightBlocked058(s,from,to,9)).toBe(false);
   parent.visible=false;expect(visualSightBlocked058(s,from,to,8)).toBe(false);parent.visible=true;
   a.root.position.x=5;expect(visualSightBlocked058(s,from,to,8)).toBe(false);a.root.position.x=0;
   a.mesh.material.transparent=true;a.mesh.material.opacity=.5;expect(visualSightBlocked058(s,from,to,8)).toBe(false);
   next=registerVisualOccluder058('test058-marker',b.root,8);old();expect(visualSightBlocked058(s,from,to,8)).toBe(true);
   expect(visualSightBlocked058(s,new Vector3(0,2,5),to,8)).toBe(true);next();expect(visualSightBlocked058(s,from,to,8)).toBe(false);
  }finally{old();next();a.dispose();b.dispose();}
 });
 it('samples completed actual head/shoulder bones without adopting hidden siblings or stale generations',()=>{
  const root=new Group(),mesh=new Mesh(new BoxGeometry(2,2,2),new MeshBasicMaterial()),head=new Bone(),left=new Bone(),right=new Bone();root.add(mesh,head,left,right);
  head.name='head';left.name='FL_upper';right.name='FR_upper';head.position.y=2;left.position.x=-1;right.position.x=1;
  const remove=registerCameraVisual('test058-body',root,prepareVisualEnvelope(root),8);
  try{
   expect(cameraVisual('test058-body',1,8)).toBeNull();completeCameraVisual('test058-body',root,1,8);root.position.set(10,3,4);
   const sample=cameraVisual('test058-body',1,8)!;expect(sample.anchors.map(a=>a.toArray())).toEqual([[10,5,4],[9,3,4],[11,3,4]]);
   left.visible=false;expect(cameraVisual('test058-body',1,8)!.anchors.length).toBe(2);expect(cameraVisual('test058-body',1,9)).toBeNull();
   root.visible=false;expect(cameraVisual('test058-body',1,8)).toBeNull();
  }finally{remove();mesh.geometry.dispose();mesh.material.dispose();}
 });
 it('finds a framed lateral sightline around a render-only marker while preserving the optical direction',()=>{
  const beacon=box(),remove=registerVisualOccluder058('test058-camera-marker',beacon.root,8),camera=new PerspectiveCamera(59,1.6,.1,850);
  camera.position.set(0,2,10);const forward=new Vector3(0,0,-1),anchors=[new Vector3(-.5,2,0),new Vector3(.5,2,0),new Vector3(0,2.7,0)];
  try{
   const result=resolveThirdPersonSight058(createThirdPersonSight058(),{camera,desired:camera.position.clone(),forward,right:new Vector3(1,0,0),up:new Vector3(0,1,0),corners:corners(new Vector3(-1,1,-1),new Vector3(1,3,1)),anchors,width:4,height:2,generation:8,clearance:p=>p,nativeEmpty:()=>true,nativeSight:()=>true});
   expect(result.constrained).toBe(false);expect(result.corrected).toBe(true);expect(result.anchorsClear).toBeGreaterThanOrEqual(2);expect(camera.position.x).toBe(4);expect(result.candidates).toBeLessThanOrEqual(7);expect(camera.getWorldDirection(new Vector3()).distanceTo(forward)).toBeLessThan(1e-12);
  }finally{remove();beacon.dispose();}
 });
 it('retains native sweep clearance and reports a wall-constrained view rather than admitting a penetrating alternative',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0}),camera=new PerspectiveCamera(59,1.6,.1,850),focus=new Vector3(0,2,0),desired=new Vector3(0,2,10),probe=new RAPIER.Ball(.245);
  try{
   world.createCollider(RAPIER.ColliderDesc.cuboid(10,10,.2).setTranslation(0,2,2));world.step();camera.position.copy(cameraClearance(world,focus,desired));
   const safeBefore=camera.position.toArray();
   const result=resolveThirdPersonSight058(createThirdPersonSight058(),{camera,desired,forward:new Vector3(0,0,-1),right:new Vector3(1,0,0),up:new Vector3(0,1,0),corners:corners(new Vector3(-1,1,-1),new Vector3(1,3,1)),anchors:[new Vector3(0,2,0)],width:4,height:2,generation:8,clearance:p=>cameraClearance(world,focus,p),nativeEmpty:p=>!world.intersectionWithShape(p,{x:0,y:0,z:0,w:1},probe),nativeSight:(from,to)=>{const delta=to.clone().sub(from),length=delta.length();return !world.castRay(new RAPIER.Ray(from,delta.multiplyScalar(1/length)),length-.01,true);}});
   expect(result.constrained).toBe(true);expect(result.contained).toBe(false);expect(camera.position.toArray()).toEqual(safeBefore);expect(world.intersectionWithShape(camera.position,{x:0,y:0,z:0,w:1},probe)).toBeNull();
  }finally{world.free();}
 });
});

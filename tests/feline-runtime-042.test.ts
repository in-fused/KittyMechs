import {describe,expect,it,vi} from 'vitest';
import {AnimationClip,Bone,BufferGeometry,Float32BufferAttribute,Group,Matrix4,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3,VectorKeyframeTrack} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {shareSkinPalettes042} from '../src/game/entities/shareSkinPalettes042';
import {Identity57Runtime005,type Identity57AssetContract005} from '../src/game/entities/identity57Runtime005';
import manifest from '../src/game/entities/identity57Runtime005Manifest.json';
import {prepareWeightedVisualEnvelope007,createWeightedVisualEnvelopeSample007,sampleWeightedVisualEnvelope007} from '../src/game/camera/weightedVisualEnvelope007';
import {createCameraFraming,fitCameraDistance} from '../src/game/camera/framing';
import type {RenderActorFrame} from '../src/game/entities/renderTimeline';
import type {ActorState} from '../shared/types';

function actor():ActorState {return {id:'test',name:'test',chassis:'pounce',bot:false,position:{x:0,y:1,z:0},velocity:{x:0,y:0,z:0},yaw:0,aimYaw:0,aimPitch:0,hp:220,maxHp:220,energy:100,heat:0,kills:0,salvage:0,grounded:true,boostUntil:0,shieldUntil:0,windupUntil:0,abilityReadyAt:0,rocketReadyAt:0,stance:'quadruped',stanceChangedAt:-100,climb:null,climbDetachedAt:-100,pulseAt:-1,rocketAt:-1,abilityAt:-1,hurtAt:-1,diedAt:-1,disruptedUntil:0,respawnAt:0,hitAt:-1,fireAt:-1,aiState:'patrol',lastInput:0,jumpEpoch:1,jumpProcessed:0,strikeProcessed:0,strike:null,strikeEndedAt:-1};}
function frame(state:ActorState,time:number,distance:number):RenderActorFrame {return {state,grounded:state.grounded,position:{...state.position},velocity:{...state.velocity},yaw:0,time,climb:null,strike:null,climbProgress:0,distance,angularDistance:0,reset:false};}
function animationFixture(){
 const model=new Group();model.name='testRig';const foot=new Bone();foot.name='testFoot';model.add(foot);
 // Exercise the real Three mixer with distinguishable gait and full-rig
 // reaction poses. All action bindings are valid; no mocked mixer is used.
 const clips=Object.keys(manifest.clips).map(name=>new AnimationClip(name,1,[new VectorKeyframeTrack('testFoot.position',[0,.5,1],/Pulse|Missile|Hit/.test(name)?[10,0,0,10,0,0,10,0,0]:[0,0,0,1,0,0,0,0,0])]));
 const asset:Identity57AssetContract005={publicURL:'fixture',sha256:'fixture',scale:1,jointNames:['testFoot'],jointParents:{testFoot:'testRig'},clips:Object.fromEntries(clips.map(c=>[c.name,{duration:c.duration,channels:1,targets:['testFoot.translation'],measuredGait:{nativeDistancePerCycle:1}}]))};
 return {model,foot,owner:new Identity57Runtime005(model,clips,'test',asset),root:new Group(),body:new Group()};
}
function geo(){return new BufferGeometry().setAttribute('position',new Float32BufferAttribute([-1,0,0,1,0,0,0,1,0],3)).setAttribute('skinIndex',new Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4)).setAttribute('skinWeight',new Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));}
function skinRig(){const root=new Group(),bone=new Bone();root.add(bone);const meshes=Array.from({length:3},()=>new SkinnedMesh(geo(),new MeshBasicMaterial()));for(const mesh of meshes)root.add(mesh);root.updateMatrixWorld(true);for(const mesh of meshes)mesh.bind(new Skeleton([bone],[new Matrix4()]),mesh.matrixWorld.clone());root.updateMatrixWorld(true);return {root,bone,meshes};}

describe('042 moving feline reactions and exact render palette sharing',()=>{
 it.each(['pulseAt','rocketAt','hurtAt'] as const)('moves actual foot joint with %s active, retaining its stationary full-body reaction',reaction=>{
  const f=animationFixture(),state=actor();state[reaction]=1.95;
  try{f.owner.step(frame(state,2,.1),1,1/60,f.root,f.body,false);const first=f.foot.position.x;
   f.owner.step(frame(state,2.02,.1),2,1/60,f.root,f.body,false);
   expect(f.owner.diagnostic.firstFailure).toBeNull();expect(f.owner.diagnostic.mode).toBe('quad');expect(f.foot.position.x).not.toBe(first);expect(f.foot.position.x).toBeLessThan(2);
   f.owner.step(frame(state,2.04,0),3,1/60,f.root,f.body,false);expect(f.owner.diagnostic.mode).toBe('reaction');expect(f.foot.position.x).toBe(10);
  }finally{f.owner.dispose();}
 });
 it('retains transformation and airborne selection while a moving pulse is active',()=>{
  const f=animationFixture(),state=actor();state.pulseAt=1.95;state.stance='upright';state.stanceChangedAt=1.9;
  try{f.owner.step(frame(state,2,.1),1,1/60,f.root,f.body,false);expect(f.owner.diagnostic.mode).toBe('transform');
   state.stanceChangedAt=-100;state.grounded=false;f.owner.step(frame(state,2.02,.1),2,1/60,f.root,f.body,false);expect(f.owner.diagnostic.mode).toBe('air');
   state.grounded=true;state.pulseAt=-1;f.owner.step(frame(state,2.04,.1),3,1/60,f.root,f.body,false);expect(f.owner.diagnostic.mode).toBe('landing');
  }finally{f.owner.dispose();}
 });
 it('shares palettes only for exact ordered owners/inverses without changing mesh skin data or posed vertices',()=>{
  const source=skinRig(),root=clone(source.root),meshes:SkinnedMesh[]=[];root.traverse(n=>{if(n instanceof SkinnedMesh)meshes.push(n);});
  expect(new Set(meshes.map(m=>m.skeleton)).size).toBe(3);
  const before=meshes.map(m=>({geometry:m.geometry,bind:m.bindMatrix.clone(),inverse:m.bindMatrixInverse.clone(),position:m.position.clone(),rotation:m.quaternion.clone(),scale:m.scale.clone(),weights:Array.from(m.geometry.getAttribute('skinWeight').array)}));
  const bone=meshes[0].skeleton.bones[0];bone.rotation.z=.4;root.updateMatrixWorld(true);
  const vertex=meshes.map(m=>m.getVertexPosition(1,new Vector3()).applyMatrix4(m.matrixWorld));
  const retired=vi.spyOn(meshes[1].skeleton,'dispose');expect(shareSkinPalettes042(root).size).toBe(1);expect(retired).toHaveBeenCalledOnce();
  meshes.forEach((m,i)=>{expect(m.skeleton).toBe(meshes[0].skeleton);expect(m.geometry).toBe(before[i].geometry);expect(m.bindMatrix).toEqual(before[i].bind);expect(m.bindMatrixInverse).toEqual(before[i].inverse);expect(m.position).toEqual(before[i].position);expect(m.quaternion.toArray()).toEqual(before[i].rotation.toArray());expect(m.scale).toEqual(before[i].scale);expect(Array.from(m.geometry.getAttribute('skinWeight').array)).toEqual(before[i].weights);expect(m.getVertexPosition(1,new Vector3()).applyMatrix4(m.matrixWorld).distanceTo(vertex[i])).toBeLessThan(1e-12);});
 });
 it('keeps a different inverse or bone owner separate, even when names and palette sizes match',()=>{
  const {root,bone,meshes}=skinRig();meshes[1].skeleton.boneInverses[0].elements[12]=.125;
  const other=new Bone();other.name=bone.name;root.add(other);meshes[2].skeleton=new Skeleton([other],[new Matrix4()]);
 expect(shareSkinPalettes042(root).size).toBe(3);expect(meshes[0].skeleton).not.toBe(meshes[1].skeleton);expect(meshes[0].skeleton).not.toBe(meshes[2].skeleton);
 });
 it('does not merge a reordered palette with the same set of bone owners',()=>{
  const root=new Group(),a=new Bone(),b=new Bone();root.add(a,b);
  const one=new SkinnedMesh(geo(),new MeshBasicMaterial()),two=new SkinnedMesh(geo(),new MeshBasicMaterial());root.add(one,two);root.updateMatrixWorld(true);
  one.bind(new Skeleton([a,b],[new Matrix4(),new Matrix4()]));two.bind(new Skeleton([b,a],[new Matrix4(),new Matrix4()]));
  expect(shareSkinPalettes042(root).size).toBe(2);expect(one.skeleton).not.toBe(two.skeleton);
 });
 it('retains all weighted posed vertices in eight aggregate corners and gives the same fit as repeated legacy corners',()=>{
  const {root,bone,meshes}=skinRig(),envelope=prepareWeightedVisualEnvelope007(root),out=createWeightedVisualEnvelopeSample007(envelope);expect(envelope.cornerCount).toBe(8);
  for(const angle of [0,.45,-.7]){bone.rotation.z=angle;root.position.set(2,1,-3);root.updateMatrixWorld(true);sampleWeightedVisualEnvelope007(envelope,out);
   for(const mesh of meshes)for(let i=0;i<3;i++)expect(out.bounds.containsPoint(mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld))).toBe(true);
   expect(new Set(out.corners.map(p=>p.toArray().join(','))).size).toBe(8);
   const duplicate=Array.from({length:meshes.length*8},(_,i)=>out.corners[i%8]);
   const focus=out.bounds.getCenter(new Vector3()),compact={...fitCameraDistance(createCameraFraming(),focus,out.corners,.2,0,6,60,1.6)},legacy={...fitCameraDistance(createCameraFraming(),focus,duplicate,.2,0,6,60,1.6)};
   expect(compact).toEqual(legacy);
  }
 });
});

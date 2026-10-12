import {describe,it,expect} from 'vitest';
import {AttachedBindMode,Bone,BufferGeometry,Float32BufferAttribute,Group,Matrix4,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3} from 'three';
// Intended admitted destination: tests/contact-skin098.test.ts. The active047
// owner intentionally lacks this export until the independent source gate.
import {refreshSkinPose098} from '../src/game/entities/movingRFfeet067';

// UNRUN. A real attached SkinnedMesh, two weighted bones, separate mesh/root
// transforms and a source toe articulation. No contact tolerances are tested.
function fixture(){
 const root=new Group(),model=new Group(),hip=new Bone(),toe=new Bone();root.add(model);model.add(hip);hip.add(toe);
 hip.position.set(.1,.7,-.2);toe.position.set(.03,-.4,.25);
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute([-.08,0,-.1,.08,0,-.1,.08,0,.1,-.08,0,.1],3));
 geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0],4));
 geometry.setAttribute('skinWeight',new Float32BufferAttribute([.35,.65,0,0,.35,.65,0,0,.35,.65,0,0,.35,.65,0,0],4));
 const mesh=new SkinnedMesh(geometry,new MeshBasicMaterial());mesh.position.set(.3,.1,-.2);mesh.rotation.y=.17;mesh.scale.setScalar(.8);model.add(mesh);
 root.updateMatrixWorld(true);const skeleton=new Skeleton([hip,toe]);skeleton.calculateInverses();mesh.bind(skeleton,mesh.matrixWorld.clone());mesh.bindMode=AttachedBindMode;
 const immutable={bind:mesh.bindMatrix.toArray(),inverses:skeleton.boneInverses.map(m=>m.toArray()),translations:[hip.position.toArray(),toe.position.toArray()]};
 return {root,model,mesh,hip,toe,skeleton,immutable};
}
function sample(mesh:SkinnedMesh,index:number){
 const p=new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),index);mesh.applyBoneTransform(index,p);return mesh.localToWorld(p);
}
function attachedWorldOracle(mesh:SkinnedMesh,index:number){
 // Renderer-equation world result for attached binding: current mesh world
 // cancels its CURRENT inverse, leaving the weighted bone/bind world result.
 // This oracle does not read the potentially stale bindMatrixInverse or call
 // applyBoneTransform/updateMatrixWorld, nor recompute inverse binds.
 const p=new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'),index).applyMatrix4(mesh.bindMatrix),out=new Vector3();
 const ids=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
 for(let j=0;j<4;j++){
  const id=j===0?ids.getX(index):j===1?ids.getY(index):j===2?ids.getZ(index):ids.getW(index),weight=j===0?weights.getX(index):j===1?weights.getY(index):j===2?weights.getZ(index):weights.getW(index);
  if(weight)out.addScaledVector(p.clone().applyMatrix4(new Matrix4().multiplyMatrices(mesh.skeleton.bones[id].matrixWorld,mesh.skeleton.boneInverses[id])),weight);
 }
 return out;
}

describe('098 same-frame attached skin lifecycle (UNRUN until independent admission)',()=>{
 it('exposes the stale inverse with current transforms, then matches independent world skinning',()=>{
  const f=fixture();f.root.position.set(4,1,-3);f.root.rotation.y=.71;f.root.scale.setScalar(1.2);f.toe.rotation.x=.45;
  f.model.updateWorldMatrix(true,true);
  expect(sample(f.mesh,0).distanceTo(attachedWorldOracle(f.mesh,0))).toBeGreaterThan(.5);
  refreshSkinPose098(f.model);
  for(let i=0;i<4;i++)expect(sample(f.mesh,i).distanceTo(attachedWorldOracle(f.mesh,i))).toBeLessThan(1e-10);
  expect(f.mesh.bindMatrix.toArray()).toEqual(f.immutable.bind);
  expect(f.skeleton.boneInverses.map(m=>m.toArray())).toEqual(f.immutable.inverses);
  expect([f.hip.position.toArray(),f.toe.position.toArray()]).toEqual(f.immutable.translations);
 });
 it('refreshes again after final bone and carrier changes without a render or rebind',()=>{
  const f=fixture();refreshSkinPose098(f.model);
  for(const [x,z,yaw,hinge] of [[2,-4,.4,-.3],[-3,1,-.6,.7],[5,2,1.1,-.5]]){
   f.root.position.set(x,.6,z);f.root.rotation.y=yaw;f.toe.rotation.x=hinge;
   f.model.updateWorldMatrix(true,true);refreshSkinPose098(f.model);
   for(let i=0;i<4;i++)expect(sample(f.mesh,i).distanceTo(attachedWorldOracle(f.mesh,i))).toBeLessThan(1e-10);
  }
  expect(f.mesh.bindMatrix.toArray()).toEqual(f.immutable.bind);
  expect(f.skeleton.boneInverses.map(m=>m.toArray())).toEqual(f.immutable.inverses);
  expect([f.hip.position.toArray(),f.toe.position.toArray()]).toEqual(f.immutable.translations);
 });
});

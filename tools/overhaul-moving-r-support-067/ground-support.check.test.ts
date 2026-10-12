import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';
import {createGroundSupport067} from '../../../src/game/entities/groundSupport067';
beforeAll(async()=>{await RAPIER.init();});
describe('actual fixed support provider 067',()=>{
 it('queries the actual triangle floor through sensor/actor/active wreck exclusions and shares one frame inventory',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});let generation=2;
  try{
   // Terrain is a real upward-wound triangle mesh, not a procedural height.
   const floor=world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array([-5,0,-5,5,0,-5,5,0,5,-5,0,5]),new Uint32Array([0,2,1,0,3,2])));
   world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,2).setTranslation(0,.4,0).setSensor(true));
   const actor=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.3,0));world.createCollider(RAPIER.ColliderDesc.cuboid(1,.1,1),actor);
   const wreck=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,.6,0));world.createCollider(RAPIER.ColliderDesc.cuboid(1,.1,1),wreck);world.step();
   const a=createGroundSupport067(world,RAPIER,()=>generation),b=createGroundSupport067(world,RAPIER,()=>generation);a.begin(1,0,3);b.begin(1,0,7);
   expect(a.diagnostic.inventoryBuilds).toBe(1);expect(b.diagnostic.inventoryBuilds).toBe(1);
   const hit=a.probe(new Vector3(0,.1,0),1,2)!;expect(hit).not.toBeNull();expect(hit.colliderHandle).toBe(floor.handle);expect(hit.point.y).toBeCloseTo(0,6);expect(hit.normal.y).toBeCloseTo(1,6);expect(a.validate(hit.lease)).toBe(true);expect(b.validate(hit.lease)).toBe(false);
   a.probe(new Vector3(1,.1,1),1,2);expect(a.diagnostic.queries).toBe(2);expect(a.diagnostic.inventoryBuilds).toBe(1);
   generation++;expect(a.validate(hit.lease)).toBe(false);a.begin(2,.016,3);expect(a.validate(hit.lease)).toBe(false);
  }finally{world.free();}
 });
 it('invalidates changed native dimensions/pose, sensors, disabled parents, life and removal, without pinning a stale lease',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});
  try{
   const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed()),collider=world.createCollider(RAPIER.ColliderDesc.cuboid(2,.2,2),body),p=createGroundSupport067(world,RAPIER,()=>0);world.step();p.begin(1,0,2);
   const point=new Vector3(0,.3,0),hit=p.probe(point,.5,1)!;expect(p.validate(hit.lease)).toBe(true);
   collider.setHalfExtents({x:2,y:.3,z:2});expect(p.validate(hit.lease)).toBe(false);
   const next=p.probe(point,.5,1)!;expect(next).not.toBeNull();body.setTranslation({x:0,y:.05,z:0},false);world.propagateModifiedBodyPositionsToColliders();expect(p.validate(next.lease)).toBe(false);
   collider.setSensor(true);expect(p.validate(next.lease)).toBe(false);collider.setSensor(false);body.setEnabled(false);expect(p.validate(next.lease)).toBe(false);body.setEnabled(true);
   p.begin(2,.016,3);expect(p.validate(next.lease)).toBe(false);const current=p.probe(point,.5,1)!;expect(current).not.toBeNull();world.removeCollider(collider,true);expect(p.validate(current.lease)).toBe(false);expect(p.probe(point,.5,1)).toBeNull();
  }finally{world.free();}
 });
 it('refuses origin-inside ambiguity, absent/steep support and a lease from another native world',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0}),other=new RAPIER.World({x:0,y:0,z:0});
  try{
   const floor=world.createCollider(RAPIER.ColliderDesc.cuboid(2,.2,2));world.createCollider(RAPIER.ColliderDesc.cuboid(2,.05,2).setTranslation(6,0,0).setRotation({x:0,y:0,z:Math.sin(.55),w:Math.cos(.55)}));other.createCollider(RAPIER.ColliderDesc.cuboid(2,.2,2));world.step();other.step();
   const p=createGroundSupport067(world,RAPIER,()=>0),q=createGroundSupport067(other,RAPIER,()=>0);p.begin(1,0,1);q.begin(1,0,1);
   const hit=p.probe(new Vector3(0,.3,0),.5,1)!;expect(hit.colliderHandle).toBe(floor.handle);expect(q.validate(hit.lease)).toBe(false);
   expect(p.probe(new Vector3(0,-.1,0),.1,1)).toBeNull();expect(p.probe(new Vector3(20,1,0),.1,2)).toBeNull();expect(p.probe(new Vector3(6,.2,0),2,4)).toBeNull();
   expect(p.probe(new Vector3(NaN,0,0),.1,1)).toBeNull();
  }finally{world.free();other.free();}
 });
});

import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {OwnedCharacterQuery} from '../shared/ownedCharacterQuery';
beforeAll(async()=>{await RAPIER.init();});
function fixture(test:(f:{world:RAPIER.World;owned:RAPIER.RigidBody[];foreign:RAPIER.RigidBody;collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController;query:OwnedCharacterQuery})=>void){
 const world=new RAPIER.World({x:0,y:-22,z:0});
 const owned=[0,5].map(x=>{const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,3,0));world.createCollider(RAPIER.ColliderDesc.roundCylinder(1.18,1.63,.12).setTranslation(0,.3,0),body);body.setNextKinematicTranslation({x:x+.1,y:3,z:0});return body;});
 const foreign=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,0,0));world.createCollider(RAPIER.ColliderDesc.cuboid(10,.5,10),foreign);foreign.setNextKinematicTranslation({x:.2,y:0,z:0});world.step();for(const body of owned){const at=body.translation();body.setNextKinematicTranslation({x:at.x+.3,y:at.y+.2,z:at.z-.1});body.setNextKinematicRotation({x:0,y:.1,z:0,w:Math.sqrt(.99)});}
 const collider=owned[0].collider(0),controller=world.createCharacterController(.02),query=new OwnedCharacterQuery(RAPIER,()=>owned);
 try{test({world,owned,foreign,collider,controller,query});}finally{world.free();}
}
const state=(body:RAPIER.RigidBody)=>({type:body.bodyType(),current:body.translation(),rotation:body.rotation(),pending:body.nextTranslation(),pendingRotation:body.nextRotation(),velocity:body.linvel(),angular:body.angvel(),enabled:body.isEnabled(),sleep:body.isSleeping(),handle:body.handle,colliders:Array.from({length:body.numColliders()},(_,i)=>{const c=body.collider(i);return{handle:c.handle,parent:c.parent()?.handle,shape:c.shape,offset:c.translationWrtParent()};})});
const flags=RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC;
describe('owned native character query boundary',()=>{
 it('preserves actual native state and leaves a foreign moving platform kinematic',()=>fixture(f=>{
  f.owned[1].setEnabled(false);const before=[...f.owned,f.foreign].map(state),native=f.controller.computeColliderMovement.bind(f.controller);let observed=false;
  f.controller.computeColliderMovement=(...args)=>{observed=true;expect(f.owned.every(b=>b.bodyType()===RAPIER.RigidBodyType.Fixed)).toBe(true);expect(f.foreign.bodyType()).toBe(RAPIER.RigidBodyType.KinematicPositionBased);native(...args);};
  f.query.computeColliderMovement(f.controller,f.collider,{x:.1,y:-.1,z:0},flags);expect(observed).toBe(true);expect([...f.owned,f.foreign].map(state)).toEqual(before);
 }));
 it('bypasses every other flag combination and nonzero angular state without rewriting arguments',()=>fixture(f=>{
  const native=f.controller.computeColliderMovement.bind(f.controller),calls:number[]=[];f.controller.computeColliderMovement=(...args)=>{calls.push(args[2]??0);expect(f.owned.every(b=>b.bodyType()===RAPIER.RigidBodyType.KinematicPositionBased)).toBe(true);native(...args);};
  for(const other of [0,flags|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,RAPIER.QueryFilterFlags.ONLY_FIXED])f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:-.1,z:0},other);
  f.owned[1].setBodyType(RAPIER.RigidBodyType.KinematicVelocityBased,false);f.owned[1].setAngvel({x:0,y:.25,z:0},false);f.owned[1].setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,false);expect(f.owned[1].angvel()).toEqual({x:0,y:.25,z:0});f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:-.1,z:0},flags);expect(calls).toEqual([0,flags|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,RAPIER.QueryFilterFlags.ONLY_FIXED,flags]);expect(f.owned[1].angvel()).toEqual({x:0,y:.25,z:0});
 }));
 it('restores every owned body after a fault injected after actual native compute',()=>fixture(f=>{
  const before=f.owned.map(state),native=f.controller.computeColliderMovement.bind(f.controller),error=Error('compute fault');f.controller.computeColliderMovement=(...args)=>{native(...args);throw error;};
  expect(()=>f.query.computeColliderMovement(f.controller,f.collider,{x:.1,y:0,z:0},flags)).toThrow(error);expect(f.owned.map(state)).toEqual(before);
  f.controller.computeColliderMovement=native;expect(()=>f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:0,z:0},flags)).not.toThrow();
 }));
 it('cleans up all bodies after a partial native flip and retains the primary error',()=>fixture(f=>{
  const before=f.owned.map(state),body=f.owned[1],setter=body.setBodyType.bind(body),error=Error('partial flip');let once=true;
  body.setBodyType=(type,wake)=>{setter(type,wake);if(type===RAPIER.RigidBodyType.Fixed&&once){once=false;throw error;}};
  expect(()=>f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:0,z:0},flags)).toThrow(error);expect(f.owned.map(state)).toEqual(before);
 }));
 it('blocks reentrant bypass queries and still restores native owned state',()=>fixture(f=>{
  const before=f.owned.map(state),native=f.controller.computeColliderMovement.bind(f.controller);f.controller.computeColliderMovement=(...args)=>{native(...args);f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:0,z:0},0 as RAPIER.QueryFilterFlags);};
  expect(()=>f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:0,z:0},flags)).toThrow('Reentrant');expect(f.owned.map(state)).toEqual(before);
 }));
 it('attempts later cleanup after a restore error and aggregates it after the primary query fault',()=>fixture(f=>{
  const before=f.owned.map(state),native=f.controller.computeColliderMovement.bind(f.controller),primary=Error('query primary'),cleanup=Error('cleanup fault');
  f.controller.computeColliderMovement=(...args)=>{native(...args);throw primary;};const body=f.owned[0],setter=body.setLinvel.bind(body);let once=true;body.setLinvel=(velocity,wake)=>{if(once){once=false;throw cleanup;}setter(velocity,wake);};
  let caught:unknown;try{f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:0,z:0},flags);}catch(error){caught=error;}
  expect(caught).toBeInstanceOf(AggregateError);expect((caught as AggregateError).errors).toEqual([primary,cleanup]);
  // An injected unrecoverable velocity-setter fault may leave the first body's
  // velocity unrestored. Its type and every later body's full state still recover.
  expect(f.owned.every(b=>b.bodyType()===RAPIER.RigidBodyType.KinematicPositionBased)).toBe(true);expect(state(f.owned[1])).toEqual(before[1]);
 }));
 it('bypasses the entire ownership set if any owned body is not position based',()=>fixture(f=>{
  f.owned[1].setBodyType(RAPIER.RigidBodyType.Fixed,false);const before=f.owned.map(state),native=f.controller.computeColliderMovement.bind(f.controller);let called=false;
  f.controller.computeColliderMovement=(...args)=>{called=true;expect(f.owned.map(state)).toEqual(before);native(...args);};
  f.query.computeColliderMovement(f.controller,f.collider,{x:0,y:0,z:0},flags);expect(called).toBe(true);expect(f.owned.map(state)).toEqual(before);
 }));

 it('forwards native arguments and honors actual target predicate and group admission',()=>fixture(f=>{
  const target=f.owned[1].collider(0),movement={x:10,y:0,z:0},groups=0xffffffff;
  const allow=(collider:RAPIER.Collider)=>collider.handle!==f.collider.handle;
  const native=f.controller.computeColliderMovement.bind(f.controller);let expectedPredicate=allow,expectedGroups=groups;
  const foreignBefore=state(f.foreign);
  f.controller.computeColliderMovement=(...args)=>{expect(args[0]).toBe(f.collider);expect(args[1]).toBe(movement);expect(args[2]).toBe(flags);expect(args[3]).toBe(expectedGroups);expect(args[4]).toBe(expectedPredicate);native(...args);};
  const hits=()=>Array.from({length:f.controller.numComputedCollisions()},(_,i)=>f.controller.computedCollision(i)!.collider?.handle);
  f.query.computeColliderMovement(f.controller,f.collider,movement,flags,groups,allow);
  expect(hits()).toContain(target.handle);expect(hits()).not.toContain(f.collider.handle);expect(f.controller.computedMovement().x).toBeLessThan(5);
  const deny=(collider:RAPIER.Collider)=>collider.handle!==target.handle&&collider.handle!==f.collider.handle;expectedPredicate=deny;
  f.query.computeColliderMovement(f.controller,f.collider,movement,flags,groups,deny);expect(hits()).not.toContain(target.handle);expect(f.controller.computedMovement().x).toBeGreaterThan(9.9);
  target.setCollisionGroups(0x00020002);expectedPredicate=allow;expectedGroups=0x00010001;
  f.query.computeColliderMovement(f.controller,f.collider,movement,flags,expectedGroups,allow);expect(hits()).not.toContain(target.handle);expect(f.controller.computedMovement().x).toBeGreaterThan(9.9);
  expect(state(f.foreign)).toEqual(foreignBefore);
 }));

});

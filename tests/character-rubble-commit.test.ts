import {beforeAll,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {OwnedCharacterMotion} from '../shared/ownedCharacterMotion';
import {CityRubbleOwner} from '../shared/cityRubble';
import {cityFractureCatalog} from '../shared/cityFractureCatalog';
import type {CityBlock} from '../shared/cityDistrict';
import type {Vec3} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
type Physics={body:RAPIER.RigidBody;collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController};
type Movement={owner:Physics;tick:number;desired:Vec3;contacts:unknown[];consumed:boolean};
type Scope={moveCharacter(p:Physics,desired:Vec3):Movement|null;commitCharacterRubble(p:Physics,m:Movement|null):void};
// Controlled native fixture of the actual Simulation query/commit methods, not
// a city-route success. No gameplay inputs, timelines or retained fixtures change.
function fixture(run:(f:{world:RAPIER.World;p:Physics;scope:Scope;owner:CityRubbleOwner;motion:OwnedCharacterMotion})=>void){
 const world=new RAPIER.World({x:0,y:0,z:0});world.timestep=1/60;
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.4,0)),collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(.35,.38,.02),body),controller=world.createCharacterController(.02);
 controller.disableAutostep();controller.disableSnapToGround();controller.setCharacterMass(1800);controller.setApplyImpulsesToDynamicBodies(true);
 const p={body,collider,controller},motion=new OwnedCharacterMotion(RAPIER,()=>[{id:'actor',body,collider}]),owner=new CityRubbleOwner(RAPIER,world,cityFractureCatalog);
 const source={id:'controlled-contact',buildingId:'controlled',part:'cell',position:[.92,.4,0],halfExtents:[.5,.4,.2],yaw:0,material:'brick'} as CityBlock;
 owner.spawn(source,0,{x:0,y:0,z:0});world.step();world.bodies.forEach(b=>{if(b.isDynamic()){b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);}});
 const scope=Object.assign(Object.create(Simulation.prototype),{rapier:RAPIER,characterMotion:motion,rubbleOwner:owner,rubbleHandles:owner.colliderHandles(),excludedDynamicColliders:new Set<number>(),disabledMovementColliders:new Set<number>(),movementFilter:()=>true,tick:7,rubbleStepDt:1/60,rubbleReaction:new Map()}) as Scope;
 motion.beginStep();try{run({world,p,scope,owner,motion});}finally{owner.dispose();world.free();}
}
function velocities(world:RAPIER.World){const result:unknown[]=[];world.bodies.forEach(b=>{if(b.isDynamic())result.push({handle:b.handle,v:b.linvel(),w:b.angvel()});});return result;}
function commit(p:Physics,m:Movement,scope:Scope){const at=p.body.translation(),move=p.controller.computedMovement();p.body.setNextKinematicTranslation({x:at.x+move.x,y:at.y+move.y,z:at.z+move.z});scope.commitCharacterRubble(p,m);}

it('stages actual native contacts without response for discarded attachment/ascent previews',()=>fixture(f=>{
 const before=velocities(f.world),movement=f.scope.moveCharacter(f.p,{x:.1,y:0,z:0});expect(movement?.contacts.length).toBeGreaterThan(0);expect(velocities(f.world)).toEqual(before);expect(f.p.controller.applyImpulsesToDynamicBodies()).toBe(true);
 // A rejected preview is discarded; a held carrier commit has no token.
 f.p.body.setNextKinematicTranslation(f.p.body.translation());f.scope.commitCharacterRubble(f.p,null);expect(velocities(f.world)).toEqual(before);f.motion.endStep();
}));
it('applies an owned response after the actual carrier commit and rejects reuse',()=>fixture(f=>{
 const before=velocities(f.world),movement=f.scope.moveCharacter(f.p,{x:.1,y:0,z:0})!;expect(velocities(f.world)).toEqual(before);commit(f.p,movement,f.scope);expect(velocities(f.world)).not.toEqual(before);expect(()=>f.scope.commitCharacterRubble(f.p,movement)).toThrow('Invalid committed');f.motion.endStep();
}));
it('honors an actually disabled automatic-impulse setting and restores it exactly',()=>fixture(f=>{
 f.p.controller.setApplyImpulsesToDynamicBodies(false);const before=velocities(f.world),movement=f.scope.moveCharacter(f.p,{x:.1,y:0,z:0});expect(movement).toBeNull();expect(f.p.controller.applyImpulsesToDynamicBodies()).toBe(false);expect(velocities(f.world)).toEqual(before);f.motion.endStep();
}));
it('restores the captured impulse flag after a native movement fault',()=>fixture(f=>{
 const spy=vi.spyOn(f.p.controller,'computeColliderMovement').mockImplementation(()=>{throw Error('native query fault');});try{expect(()=>f.scope.moveCharacter(f.p,{x:.1,y:0,z:0})).toThrow('native query fault');expect(f.p.controller.applyImpulsesToDynamicBodies()).toBe(true);}finally{spy.mockRestore();}
}));
it('retains primary and restoration faults without claiming rollback',()=>fixture(f=>{
 const query=vi.spyOn(f.p.controller,'computeColliderMovement').mockImplementation(()=>{throw Error('primary query fault');}),native=f.p.controller.setApplyImpulsesToDynamicBodies.bind(f.p.controller),restore=vi.spyOn(f.p.controller,'setApplyImpulsesToDynamicBodies').mockImplementation(value=>{if(value)throw Error('restoration fault');native(value);});
 try{let error:unknown;try{f.scope.moveCharacter(f.p,{x:.1,y:0,z:0});}catch(e){error=e;}expect(error).toBeInstanceOf(AggregateError);expect((error as AggregateError).errors.map(e=>e.message)).toEqual(['primary query fault','restoration fault']);expect(restore.mock.calls.map(c=>c[0])).toEqual([false,true]);}finally{query.mockRestore();restore.mockRestore();}
}));
it('does not mutate settings when the captured native getter fails',()=>fixture(f=>{
 const setter=vi.spyOn(f.p.controller,'setApplyImpulsesToDynamicBodies'),getter=vi.spyOn(f.p.controller,'applyImpulsesToDynamicBodies').mockImplementation(()=>{throw Error('native option getter fault');});try{expect(()=>f.scope.moveCharacter(f.p,{x:.1,y:0,z:0})).toThrow('native option getter fault');expect(setter).not.toHaveBeenCalled();}finally{getter.mockRestore();setter.mockRestore();}
}));

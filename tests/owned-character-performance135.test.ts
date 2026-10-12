import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {OwnedCharacterMotion,type OwnedCharacter} from '../shared/ownedCharacterMotion';
import {OwnedCharacterMotion as Baseline} from '../tools/overhaul-performance-135/preimages/ownedCharacterMotion';
beforeAll(async()=>{await RAPIER.init();});
const flags=RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC;
type Owner=OwnedCharacterMotion|Baseline;
function fixture(OwnerClass:typeof OwnedCharacterMotion|typeof Baseline,run:(f:{world:RAPIER.World;entries:OwnedCharacter[];owner:Owner;controller:RAPIER.KinematicCharacterController})=>unknown){
 const world=new RAPIER.World({x:0,y:0,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(20,.1,20).setTranslation(0,-.1,0));
 const entries=[1.01,3.01,1.01].map((y,i)=>{const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(i===2?5:0,y,0)),collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(.875,1.25,.125),body);return{id:`actor${i}`,body,collider};});
 const owner=new OwnerClass(RAPIER,()=>entries),controller=world.createCharacterController(.02);world.step();
 try{return run({world,entries,owner,controller});}finally{world.free();}
}
function state(entries:OwnedCharacter[]){return entries.map(e=>({id:e.id,type:e.body.bodyType(),position:e.body.translation(),pending:e.body.nextTranslation(),rotation:e.body.rotation(),pendingRotation:e.body.nextRotation(),velocity:e.body.linvel(),angular:e.body.angvel(),enabled:e.body.isEnabled(),collider:e.collider.handle,parent:e.collider.parent()?.handle,shape:e.collider.shapeType(),half:e.collider.shapeType()===RAPIER.ShapeType.RoundCylinder?e.collider.halfHeight():null,offset:e.collider.translationWrtParent()}));}
function replay(OwnerClass:typeof OwnedCharacterMotion|typeof Baseline){return fixture(OwnerClass,f=>{
 const observations:unknown[]=[],native=f.controller.computeColliderMovement.bind(f.controller);
 f.controller.computeColliderMovement=(...args)=>{const types=f.entries.map(e=>e.body.bodyType());native(...args);observations.push({types,flags:args[2],movement:f.controller.computedMovement(),grounded:f.controller.computedGrounded(),hits:Array.from({length:f.controller.numComputedCollisions()},(_,i)=>{const h=f.controller.computedCollision(i)!;return{collider:h.collider?.handle,normal:h.normal1,witness:h.witness1,remaining:h.translationDeltaRemaining};})});};
 expect(f.owner.beginStep()).toBe(true);
 for(const flag of [flags,0,flags|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC])f.owner.computeColliderMovement(f.controller,f.entries[0].collider,{x:.1,y:-.04,z:0},flag);
 // Allowed native hull/offset and relocation changes MUST affect the next
 // query under the same lease, rather than reusing a previous admission.
 f.entries[1].collider.setShape(new RAPIER.RoundCylinder(1.125,1.25,.125));
 f.entries[1].collider.setTranslationWrtParent({x:0,y:-.2,z:0});
 f.entries[2].body.setTranslation({x:4,y:4,z:0},false);f.entries[2].body.setNextKinematicTranslation({x:4,y:4,z:0});
 f.owner.computeColliderMovement(f.controller,f.entries[0].collider,{x:.1,y:-.04,z:0},flags);
 f.owner.endStep();return{observations,state:state(f.entries)};
});}
describe('135 within-query native records',()=>{
 it('matches the immutable baseline native movement, classification, bypass and mid-lease hull transition',()=>{expect(replay(OwnedCharacterMotion)).toEqual(replay(Baseline));});
 it('reads current native bounds/velocity once per owner per query and again on every new query',()=>fixture(OwnedCharacterMotion,f=>{
  expect(f.owner.beginStep()).toBe(true);const bounds=[0,0,0],velocity=[0,0,0];
  f.entries.forEach((e,i)=>{const h=e.collider.halfHeight.bind(e.collider),v=e.body.linvel.bind(e.body);e.collider.halfHeight=()=>{bounds[i]++;return h();};e.body.linvel=()=>{velocity[i]++;return v();};});
  for(let pass=1;pass<=2;pass++){f.owner.computeColliderMovement(f.controller,f.entries[0].collider,{x:.01,y:0,z:0},flags);expect(bounds).toEqual([pass,pass,pass]);expect(velocity).toEqual([pass,pass,pass]);}
  f.owner.endStep();expect(bounds).toEqual([3,3,3]);expect(velocity).toEqual([4,4,4]);
 }));
 for(const mutation of ['duplicate','angular','shape','velocity'] as const)it(`rejects fresh ${mutation} mutation before a second native query`,()=>{
  const execute=(OwnerClass:typeof OwnedCharacterMotion|typeof Baseline)=>fixture(OwnerClass,f=>{
   f.owner.beginStep();f.owner.computeColliderMovement(f.controller,f.entries[0].collider,{x:0,y:0,z:0},flags);
   const e=f.entries[1];if(mutation==='duplicate')e.id=f.entries[0].id;
   if(mutation==='shape')e.collider.setShape(new RAPIER.Ball(1));
   if(mutation==='angular'||mutation==='velocity'){e.body.setBodyType(RAPIER.RigidBodyType.KinematicVelocityBased,false);if(mutation==='angular')e.body.setAngvel({x:0,y:.1,z:0},false);else e.body.setLinvel({x:.1,y:0,z:0},false);e.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,false);}
   let called=false;f.controller.computeColliderMovement=()=>{called=true;};let message='';try{f.owner.computeColliderMovement(f.controller,f.entries[0].collider,{x:0,y:0,z:0},flags);}catch(error){message=(error as Error).message;}
   expect(called).toBe(false);expect(()=>f.owner.endStep()).toThrow(/failed/);return message;
  });expect(execute(OwnedCharacterMotion)).toBe(execute(Baseline));
 });
});

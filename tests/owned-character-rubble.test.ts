import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {OwnedCharacterMotion,type OwnedCharacter} from '../shared/ownedCharacterMotion';

beforeAll(async()=>{await RAPIER.init();});
const flags=RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC;
type Fixture={world:RAPIER.World;entries:OwnedCharacter[];motion:OwnedCharacterMotion;controller:RAPIER.KinematicCharacterController;};
// Controlled native unit geometry, not an accepted city fracture or game route.
function fixture(run:(f:Fixture)=>void){
  const world=new RAPIER.World({x:0,y:-22,z:0});world.timestep=1/60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(30,.5,30).setTranslation(0,-.5,0));
  const entries=[1.02,4].map((y,i)=>{const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,y,0)),collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(1.18,1.63,.12).setTranslation(0,.3,0),body);return {id:`actor-${i}`,body,collider};});
  const motion=new OwnedCharacterMotion(RAPIER,()=>entries),controller=world.createCharacterController(.02);
  controller.setApplyImpulsesToDynamicBodies(true);controller.setCharacterMass(1800);controller.enableAutostep(.55,.2,false);
  world.step();
  try{run({world,entries,motion,controller});}finally{world.free();}
}
function cube(world:RAPIER.World,x:number){const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,.4,0)),collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.4,.4,.4).setDensity(300),body);return {body,collider};}
function state(e:OwnedCharacter){return {type:e.body.bodyType(),position:e.body.translation(),rotation:e.body.rotation(),next:e.body.nextTranslation(),nextRotation:e.body.nextRotation(),velocity:e.body.linvel(),angular:e.body.angvel(),body:e.body.handle,collider:e.collider.handle,parent:e.collider.parent()?.handle,enabled:e.body.isEnabled(),sleep:e.body.isSleeping()};}
function hits(controller:RAPIER.KinematicCharacterController){return Array.from({length:controller.numComputedCollisions()},(_,i)=>controller.computedCollision(i)!.collider?.handle);}
function dynamic(f:Fixture,excluded:ReadonlySet<number>=new Set(),predicate?: (c:RAPIER.Collider)=>boolean,logical=flags){f.motion.computeColliderMovementWithDynamics(f.controller,f.entries[0].collider,{x:2,y:-22/3600,z:0},logical,undefined,predicate,excluded);}

describe('opt-in owned dynamic rubble character queries',()=>{
  it('blocks the actual rounded hull and applies a native mass-dependent push to admitted dynamic rubble',()=>fixture(f=>{
    const rubble=cube(f.world,2.8);f.world.step();expect(rubble.body.mass()).toBeGreaterThan(0);const before=rubble.body.translation();
    expect(f.motion.beginStep()).toBe(true);dynamic(f);
    expect(hits(f.controller)).toContain(rubble.collider.handle);const move=f.controller.computedMovement();expect(move.x).toBeGreaterThan(0);expect(move.x).toBeLessThan(1);
    expect(rubble.body.linvel().x).toBeGreaterThan(0);const at=f.entries[0].body.translation();f.entries[0].body.setNextKinematicTranslation({x:at.x+move.x,y:at.y+move.y,z:at.z+move.z});f.motion.endStep();f.world.step();
    expect(rubble.body.translation().x).toBeGreaterThan(before.x);expect(f.entries.every(e=>e.body.bodyType()===RAPIER.RigidBodyType.KinematicPositionBased)).toBe(true);
  }));
  it('excludes a nearer foreign dynamic collider while retaining the owned dynamic winner',()=>fixture(f=>{
    const foreign=cube(f.world,2.4),rubble=cube(f.world,3.6);f.world.step();const oldForeign={...foreign.body.linvel()};
    f.motion.beginStep();dynamic(f,new Set([foreign.collider.handle]));
    expect(hits(f.controller)).not.toContain(foreign.collider.handle);expect(hits(f.controller)).toContain(rubble.collider.handle);expect(f.controller.computedMovement().x).toBeGreaterThan(.8);expect(rubble.body.linvel().x).toBeGreaterThan(0);expect(foreign.body.linvel()).toEqual(oldForeign);f.motion.endStep();
    // This qualifies KCC filtering/impulses, not unrelated native world contact
    // groups: no world.step with an intentionally overlapped foreign body.
  }));
  it('combines caller JS membership with excluded handles without calling a native getter inside the filter',()=>fixture(f=>{
    const a=cube(f.world,2.4),b=cube(f.world,3.6);f.world.step();const allowed=new Set([b.collider.handle]),visited:number[]=[],native=f.controller.computeColliderMovement.bind(f.controller);
    f.controller.computeColliderMovement=(...args)=>{
      expect(args[2]).toBe(0);const pure=args[4]!;
      const candidate=(handle:number)=>new Proxy({handle},{get:(target,key)=>{if(key!=='handle')throw Error('Native getter forbidden in filter');return target.handle;}}) as RAPIER.Collider;
      expect(pure(candidate(a.collider.handle))).toBe(false);expect(pure(candidate(b.collider.handle))).toBe(true);native(...args);
    };
    f.motion.beginStep();dynamic(f,new Set([a.collider.handle]),c=>{visited.push(c.handle);return allowed.has(c.handle);});expect(visited).not.toContain(a.collider.handle);expect(hits(f.controller)).toContain(b.collider.handle);f.motion.endStep();
  }));
  it('keeps exact original logical flags for owned cap selection while forwarding only the dynamic exclusion change',()=>fixture(f=>{
    const rubble=cube(f.world,2.8);f.world.step();const native=f.controller.computeColliderMovement.bind(f.controller);let selected=false;
    f.controller.computeColliderMovement=(...args)=>{expect(args[2]).toBe(0);selected=f.entries[1].body.bodyType()===RAPIER.RigidBodyType.Fixed;native(...args);};
    f.motion.beginStep();const before=f.entries.map(state);dynamic(f);expect(selected).toBe(true);expect(f.entries.map(state)).toEqual(before);expect(hits(f.controller)).toContain(rubble.collider.handle);f.motion.endStep();
  }));
  it('retains combined corpse flags and bypasses owned Fixed classification while still including admitted rubble',()=>fixture(f=>{
    const rubble=cube(f.world,2.8);f.world.step();const native=f.controller.computeColliderMovement.bind(f.controller);let queried=false;
    f.controller.computeColliderMovement=(...args)=>{queried=true;expect(args[2]).toBe(RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);expect(f.entries[1].body.bodyType()).toBe(RAPIER.RigidBodyType.KinematicPositionBased);native(...args);};
    f.motion.beginStep();dynamic(f,new Set(),undefined,flags|RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);expect(queried).toBe(true);expect(hits(f.controller)).toContain(rubble.collider.handle);f.motion.endStep();
  }));
  it('preserves explicit interaction groups and desired-vector identity in the dynamic forwarding tuple',()=>fixture(f=>{
    cube(f.world,2.8);f.world.step();const groups=0xffffffff,desired={x:2,y:-22/3600,z:0},native=f.controller.computeColliderMovement.bind(f.controller);let observed=false;
    f.controller.computeColliderMovement=(...args)=>{observed=true;expect(args[0]).toBe(f.entries[0].collider);expect(args[1]).toBe(desired);expect(args[2]).toBe(0);expect(args[3]).toBe(groups);native(...args);};
    f.motion.beginStep();f.motion.computeColliderMovementWithDynamics(f.controller,f.entries[0].collider,desired,flags,groups,undefined,new Set());expect(observed).toBe(true);f.motion.endStep();
  }));
  it('applies foreign exclusions even in an unsupported baseline lease',()=>fixture(f=>{
    const foreign=cube(f.world,2.4),rubble=cube(f.world,3.6);f.entries[1].collider.setShape(new RAPIER.Cuboid(1,1,1));f.world.step();
    expect(f.motion.beginStep()).toBe(false);dynamic(f,new Set([foreign.collider.handle]));expect(hits(f.controller)).not.toContain(foreign.collider.handle);expect(hits(f.controller)).toContain(rubble.collider.handle);expect(f.entries[1].body.bodyType()).toBe(RAPIER.RigidBodyType.KinematicPositionBased);f.motion.endStep();
  }));
  it('keeps disabled foreign dynamics excluded by the precomputed JS handle set',()=>fixture(f=>{
    const foreign=cube(f.world,2.4),rubble=cube(f.world,3.6);foreign.body.setEnabled(false);f.world.step();const native=f.controller.computeColliderMovement.bind(f.controller);let checked=false;
    f.controller.computeColliderMovement=(...args)=>{checked=true;expect(args[4]!(foreign.collider)).toBe(false);native(...args);};
    f.motion.beginStep();dynamic(f,new Set([foreign.collider.handle]));expect(checked).toBe(true);expect(hits(f.controller)).not.toContain(foreign.collider.handle);expect(hits(f.controller)).toContain(rubble.collider.handle);f.motion.endStep();
  }));
  it('leaves the original no-active-rubble call flags, predicate identity and native movement unchanged',()=>fixture(f=>{
    const foreign=cube(f.world,2.8);f.world.step();const predicate=(c:RAPIER.Collider)=>c.handle!==-1,native=f.controller.computeColliderMovement.bind(f.controller);let observed=false,reference:ReturnType<RAPIER.KinematicCharacterController['computedMovement']>|undefined;
    f.controller.computeColliderMovement=(...args)=>{observed=true;expect(args[2]).toBe(flags);expect(args[3]).toBeUndefined();expect(args[4]).toBe(predicate);native(...args);reference={...f.controller.computedMovement()};native(...args);};
    f.motion.beginStep();f.motion.computeColliderMovement(f.controller,f.entries[0].collider,{x:2,y:-22/3600,z:0},flags,undefined,predicate);expect(observed).toBe(true);expect(f.controller.computedMovement()).toEqual(reference);expect(f.controller.computedMovement().x).toBeGreaterThan(1.99);expect(hits(f.controller)).not.toContain(foreign.collider.handle);f.motion.endStep();
  }));
  it('restores selected bodies after an actual opt-in native query fault and fails the lease before physics/publication',()=>fixture(f=>{
    cube(f.world,2.8);f.world.step();f.motion.beginStep();const before=f.entries.map(state),native=f.controller.computeColliderMovement.bind(f.controller);
    f.controller.computeColliderMovement=(...args)=>{native(...args);throw Error('native rubble query fault');};expect(()=>dynamic(f)).toThrow('native rubble query fault');expect(f.entries.map(state)).toEqual(before);expect(()=>f.motion.endStep()).toThrow('failed');expect(()=>dynamic(f)).toThrow('failed');
    // Dynamic impulses are not rolled back after a native failure. The failed
    // lease must abort its owner; this class never claims world rollback.
  }));
  it('rejects reentry from the opt-in predicate and restores every selected body',()=>fixture(f=>{
    cube(f.world,2.8);f.world.step();f.motion.beginStep();const before=f.entries.map(state);
    expect(()=>dynamic(f,new Set(),()=>{dynamic(f);return true;})).toThrow('Reentrant');expect(f.entries.map(state)).toEqual(before);expect(()=>f.motion.endStep()).toThrow('failed');
  }));
});

function stackedTrace(optIn:boolean){
  const world=new RAPIER.World({x:0,y:-22,z:0});world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.cuboid(30,.5,30).setTranslation(0,-.5,0));
  const entries=[1.02,3.66].map((y,i)=>{const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,y,0)),collider=world.createCollider(RAPIER.ColliderDesc.roundCylinder(1.18,1.63,.12).setTranslation(0,.3,0),body);return {id:`stack-${i}`,body,collider};});
  // A far active synthetic rubble body changes only opt-in query membership;
  // it never intersects these actors or their support path.
  cube(world,20);const motion=new OwnedCharacterMotion(RAPIER,()=>entries),controllers=entries.map(()=>world.createCharacterController(.02));for(const c of controllers){c.setApplyImpulsesToDynamicBodies(true);c.setCharacterMass(1800);c.enableSnapToGround(.35);}world.step();const trace:unknown[]=[];
  try{
    for(let tick=0;tick<90;tick++){
      motion.beginStep();for(let i=0;i<entries.length;i++){const e=entries[i],desired={x:i===0?.04:0,y:-22/3600,z:0};if(optIn)motion.computeColliderMovementWithDynamics(controllers[i],e.collider,desired,flags,undefined,undefined,new Set());else motion.computeColliderMovement(controllers[i],e.collider,desired,flags);const move=controllers[i].computedMovement(),at=e.body.translation();e.body.setNextKinematicTranslation({x:at.x+move.x,y:at.y+move.y,z:at.z+move.z});}motion.endStep();world.step();trace.push(entries.map((e,i)=>({position:e.body.translation(),velocity:e.body.linvel(),grounded:controllers[i].computedGrounded(),type:e.body.bodyType()})));
    }return trace;
  }finally{world.free();}
}
it('preserves the accepted two-owned-mech cap/support trace when only distant rubble is active',()=>{const baseline=stackedTrace(false),rubble=stackedTrace(true);expect(rubble).toEqual(baseline);});

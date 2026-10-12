import {beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput} from '../shared/types';
import {guardOwnedWorldStep} from '../src/game/physicsGuard';

beforeAll(async()=>{await RAPIER.init();});
type Physics={body:RAPIER.RigidBody;collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController};
function fixture(test:(sim:Simulation,physics:Map<string,Physics>)=>void){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,1926,'pvp');
  world.createCollider(RAPIER.ColliderDesc.cuboid(30,.5,30).setTranslation(100,99.5,208));
  sim.addActor('first','First','pounce',false,{x:100,y:101.06,z:208});sim.addActor('second','Second','pounce',false,{x:110,y:101.06,z:208});
  const physics=(sim as unknown as {physics:Map<string,Physics>}).physics;
  try{for(let i=0;i<10;i++)sim.step(1/60);test(sim,physics);}finally{sim.dispose();world.free();}
}

describe('failed authority physics cannot step or publish partial state',()=>{
  it('latches a real second-actor query failure after earlier accepted movement',()=>fixture((sim,physics)=>{
    const first=sim.actors.get('first')!,before={...first.position},failure=Error('Injected native query failure'),controller=physics.get('second')!.controller,native=controller.computeColliderMovement.bind(controller);
    controller.computeColliderMovement=(...args)=>{native(...args);throw failure;};
    sim.setInput(first.id,{...emptyInput(),seq:1,jumpEpoch:first.jumpEpoch,forward:1,yaw:-Math.PI/2});
    const nativeStep=vi.spyOn(sim.world,'step');expect(()=>sim.step(1/60)).toThrow(failure);
    expect(first.position.x).toBeGreaterThan(before.x);expect(nativeStep).not.toHaveBeenCalled();expect(sim.physicsFailed).toBe(true);
    expect([...physics.values()].every(p=>p.body.bodyType()===RAPIER.RigidBodyType.KinematicPositionBased)).toBe(true);
    const tick=sim.tick,time=sim.time,partial=structuredClone(first);
    expect(()=>sim.snapshot()).toThrow(failure);expect(()=>sim.step(1/60)).toThrow(failure);expect(()=>sim.setInput(first.id,emptyInput())).toThrow(failure);
    expect(sim.tick).toBe(tick);expect(sim.time).toBe(time);expect(first).toEqual(partial);expect(nativeStep).not.toHaveBeenCalled();nativeStep.mockRestore();
  }));

  it('forwards healthy native step arguments and restores only its own healthy guard',()=>fixture(sim=>{
    const world=sim.world,original=world.step,queue=new RAPIER.EventQueue(true),hooks:RAPIER.PhysicsHooks={filterContactPair:()=>null,filterIntersectionPair:()=>true};
    let received:Parameters<RAPIER.World['step']>|undefined,correctContext=false;
    const observed=function(this:RAPIER.World,...args:Parameters<RAPIER.World['step']>){correctContext=this===world;received=args;original.apply(this,args);};world.step=observed;
    const release=guardOwnedWorldStep(world,sim,()=>{throw Error('Unexpected native failure');});
    world.step(queue,hooks);expect(correctContext).toBe(true);expect(received?.[0]).toBe(queue);expect(received?.[1]).toBe(hooks);release();expect(world.step).toBe(observed);
    const releaseAgain=guardOwnedWorldStep(world,sim,()=>{}),later=world.step.bind(world);world.step=later;releaseAgain();expect(world.step).toBe(later);world.step=original;queue.free();
  }));

  it('latches an external native exception and keeps retirement inside a callback fail-closed',()=>fixture(sim=>{
    const world=sim.world,original=world.step,failure=Error('Injected external native step failure');let nativeCalls=0;
    world.step=function(...args){nativeCalls++;original.apply(this,args);throw failure;};
    const onFailure=vi.fn(),release=guardOwnedWorldStep(world,sim,onFailure),guarded=world.step;
    sim.step(1/60,false);expect(()=>world.step()).toThrow(failure);expect(onFailure).toHaveBeenCalledWith(failure);expect(nativeCalls).toBe(1);expect(sim.physicsFailed).toBe(true);
    // Session cleanup may run before an already executing provider frame reaches
    // world.step. Neither clearing runtime.sim nor releasing this guard reopens it.
    release();expect(world.step).toBe(guarded);world.step();expect(nativeCalls).toBe(1);expect(()=>sim.snapshot()).toThrow(failure);
  }));

  it('attempts every native owner cleanup after a controller cleanup failure',()=>fixture((sim,physics)=>{
    const bodyHandles=[...physics.values()].map(p=>p.body.handle),firstController=physics.get('first')!.controller,original=sim.world.removeCharacterController.bind(sim.world),failure=Error('Injected cleanup failure');
    sim.world.removeCharacterController=controller=>{if(controller===firstController)throw failure;original(controller);};
    expect(()=>sim.dispose()).toThrow('Arena physics cleanup failed');expect(sim.physicsFailed).toBe(true);expect(sim.actors.size).toBe(0);expect(physics.size).toBe(0);
    for(const handle of bodyHandles)expect(sim.world.getRigidBody(handle)).toBeNull();expect(()=>sim.snapshot()).toThrow();
    sim.world.removeCharacterController=original;
  }));
});

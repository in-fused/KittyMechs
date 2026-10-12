import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {emptyInput} from '../shared/types';
import {presentSessionCityAuthority,advanceSessionAuthority,createSessionAuthority,publishSessionAuthority,releaseSessionAuthority} from '../src/game/sessionAuthority';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
vi.stubGlobal('window',{innerWidth:1200,performance:globalThis.performance});vi.stubGlobal('document',{exitPointerLock:vi.fn()});
const {runtime,resetRuntime}=await import('../src/game/runtime');
const {hostSnapshot,retireFailedArena}=await import('../src/game/network');
const {useGameStore}=await import('../src/state/store');
beforeAll(async()=>{await RAPIER.init();});
afterEach(()=>{resetRuntime();useGameStore.setState({error:null,phase:'hangar'});vi.restoreAllMocks();});

describe('source Session authority adapter protects its provider-owned native world',()=>{
  it('guards partial native construction before the Simulation exists',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),native=world.createRigidBody.bind(world),failure=Error('Partial constructor fault'),step=vi.spyOn(world,'step'),logged=vi.spyOn(console,'error').mockImplementation(()=>{}),generation=runtime.generation;
    world.createRigidBody=descriptor=>{native(descriptor);throw failure;};
    try{expect(createSessionAuthority(world,RAPIER,{seed:1926,mode:'pvp',room:'R'},retireFailedArena)).toBeNull();expect(world.bodies.len()).toBeGreaterThan(0);expect(runtime.generation).toBe(generation+1);
      // The provider's pending native call cannot advance the partial world.
      world.step();expect(step).not.toHaveBeenCalled();expect(runtime.snapshot).toBeNull();expect(useGameStore.getState().phase).toBe('hangar');expect(logged).toHaveBeenCalled();
    }finally{world.free();}
  });
  it('retirement inside before-step cleanup keeps the pending provider step closed',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),nativeStep=vi.spyOn(world,'step'),authority=createSessionAuthority(world,RAPIER,{seed:1926,mode:'pvp',room:'R'},retireFailedArena)!;runtime.sim=authority.sim;
    try{const actor=authority.sim.addActor('local','Pilot','pounce'),physics=(authority.sim as unknown as {physics:Map<string,{controller:RAPIER.KinematicCharacterController}>}).physics,native=physics.get(actor.id)!.controller.computeColliderMovement.bind(physics.get(actor.id)!.controller),generation=runtime.generation;
      physics.get(actor.id)!.controller.computeColliderMovement=(...args)=>{native(...args);throw Error('Native before-step fault');};
      expect(advanceSessionAuthority(authority.sim,'local',emptyInput(),()=>{},retireFailedArena)).toBe(false);expect(runtime.generation).toBe(generation+1);expect(runtime.sim).toBeNull();expect(authority.sim.physicsFailed).toBe(true);
      authority.dispose();world.step();expect(nativeStep).not.toHaveBeenCalled();expect(publishSessionAuthority(authority.sim,hostSnapshot,retireFailedArena)).toBe(false);expect(runtime.snapshot).toBeNull();
    }finally{authority.dispose();world.free();}
  });
  it('a snapshot failure retires the source frame publication and its transport',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),nativeStep=vi.spyOn(world,'step'),authority=createSessionAuthority(world,RAPIER,{seed:1926,mode:'pvp',room:'R'},retireFailedArena)!,broadcast=vi.fn(),close=vi.fn(),generation=runtime.generation;runtime.sim=authority.sim;runtime.broadcast=broadcast;runtime.close=close;
    authority.sim.snapshot=()=>{throw Error('Frame snapshot fault');};
    try{expect(publishSessionAuthority(authority.sim,hostSnapshot,retireFailedArena)).toBe(false);expect(runtime.generation).toBe(generation+1);expect(runtime.sim).toBeNull();expect(runtime.snapshot).toBeNull();expect(broadcast).not.toHaveBeenCalled();expect(close).toHaveBeenCalledTimes(1);world.step();expect(nativeStep).not.toHaveBeenCalled();
    }finally{authority.dispose();world.free();}
  });
  it('restores a healthy provider step after owner disposal and preserves native arguments',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),original=world.step,authority=createSessionAuthority(world,RAPIER,{seed:1926,mode:'pvp',room:'R'},retireFailedArena)!,queue=new RAPIER.EventQueue(true),hooks:RAPIER.PhysicsHooks={filterContactPair:()=>null,filterIntersectionPair:()=>true};
    try{runtime.sim=authority.sim;authority.sim.addActor('local','Pilot','pounce');const marked=vi.fn();expect(advanceSessionAuthority(authority.sim,'local',emptyInput(),marked,retireFailedArena)).toBe(true);world.step(queue,hooks);expect(marked).toHaveBeenCalledTimes(1);expect(publishSessionAuthority(authority.sim,hostSnapshot,retireFailedArena)).toBe(true);expect(runtime.snapshot?.tick).toBe(1);authority.dispose();expect(world.step).toBe(original);
    }finally{runtime.sim=null;queue.free();authority.dispose();world.free();}
  });
  it('fences a direct scene unmount before failed owner disposal without freeing the provider world',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),nativeStep=vi.spyOn(world,'step'),authority=createSessionAuthority(world,RAPIER,{seed:1926,mode:'pvp',room:'R'},retireFailedArena)!,generation=runtime.generation,close=vi.fn(),logged=vi.spyOn(console,'error').mockImplementation(()=>{});runtime.sim=authority.sim;runtime.close=close;runtime.sendInput=()=>true;runtime.broadcast=()=>{};
    const nativeDispose=authority.sim.dispose.bind(authority.sim);authority.sim.dispose=()=>{expect(runtime.generation).toBe(generation+1);expect(runtime.sim).toBeNull();expect(runtime.broadcast).toBeNull();expect(runtime.sendInput).toBeNull();nativeDispose();throw Error('Scene cleanup fault');};
    try{releaseSessionAuthority(authority.sim,generation,authority.dispose);expect(close).toHaveBeenCalledTimes(1);expect(logged).toHaveBeenCalled();expect(authority.sim.physicsFailed).toBe(true);world.step();expect(nativeStep).not.toHaveBeenCalled();
    }finally{world.free();}
  });
  it('retiring an older Session cannot fence a later arena owner',()=>{
    const oldWorld=new RAPIER.World({x:0,y:-22,z:0}),old=createSessionAuthority(oldWorld,RAPIER,{seed:1926,mode:'pvp',room:'OLD'},retireFailedArena)!,oldGeneration=runtime.generation;runtime.sim=old.sim;resetRuntime();
    const world=new RAPIER.World({x:0,y:-22,z:0}),next=createSessionAuthority(world,RAPIER,{seed:1926,mode:'pvp',room:'NEW'},retireFailedArena)!,close=vi.fn(),generation=runtime.generation;runtime.sim=next.sim;runtime.close=close;
    try{releaseSessionAuthority(old.sim,oldGeneration,old.dispose);expect(runtime.generation).toBe(generation);expect(runtime.sim).toBe(next.sim);expect(close).not.toHaveBeenCalled();expect(next.sim.physicsFailed).toBe(false);
    }finally{resetRuntime();next.dispose();world.free();oldWorld.free();}
  });
});

import {CityPresentation} from '../src/game/world/cityPresentation';
import {CityRubbleOwner} from '../shared/cityRubble';
import {cityDistrict} from '../shared/cityDistrict';
function cityAdapterFixture(test:(world:RAPIER.World,authority:NonNullable<ReturnType<typeof createSessionAuthority>>,generation:number,presentation:CityPresentation,nativeStep:ReturnType<typeof vi.spyOn>)=>void){
 const world=new RAPIER.World({x:0,y:-22,z:0}),nativeStep=vi.spyOn(world,'step'),authority=createSessionAuthority(world,RAPIER,{seed:7734,mode:'pvp',room:'R',experimentalPhysicalRubble:true},retireFailedArena)!;runtime.sim=authority.sim;
 // Explicit manager fixture for native presentation failure, not a combat admission.
 const owner=(authority.sim as unknown as {rubbleOwner:CityRubbleOwner}).rubbleOwner;
 owner.spawn(cityDistrict(7734)!.blocks.find(b=>b.part==='wall'||b.part==='cell')!,0,{x:1,y:0,z:0});
 try{test(world,authority,runtime.generation,new CityPresentation(7734),nativeStep);}finally{authority.dispose();world.free();}
}
it('city presentation native getter failure retires transport and prevents presentation/native advancement',()=>cityAdapterFixture((world,a,g,p,nativeStep)=>{
 const close=vi.fn();runtime.close=close;const push=vi.spyOn(p,'push'),present=vi.spyOn(p,'present');const owner=(a.sim as unknown as {rubbleOwner:CityRubbleOwner}).rubbleOwner,body=world.getCollider([...owner.colliderHandles()][0]).parent()!;body.translation=()=>{throw Error('Actual native rubble read failure');};
 expect(presentSessionCityAuthority(a.sim,g,{world,seed:7734},p,retireFailedArena)).toBe(false);expect(a.sim.physicsFailed).toBe(true);expect(runtime.sim).toBeNull();expect(close).toHaveBeenCalledTimes(1);expect(push).not.toHaveBeenCalled();expect(present).not.toHaveBeenCalled();world.step();expect(nativeStep).not.toHaveBeenCalled();
}));
it('stale city scene cannot read or publish a later arena',()=>cityAdapterFixture((world,a,g,p)=>{
 const read=vi.spyOn(a.sim,'rubble','get'),push=vi.spyOn(p,'push'),failure=vi.fn();resetRuntime();
 expect(presentSessionCityAuthority(a.sim,g,{world,seed:7734},p,failure)).toBe(false);expect(read).not.toHaveBeenCalled();expect(push).not.toHaveBeenCalled();expect(failure).not.toHaveBeenCalled();
}));
it('replacement during actual native getter fault only poisons old owner',()=>cityAdapterFixture((world,a,g,p)=>{
 const nextWorld=new RAPIER.World({x:0,y:-22,z:0}),next=createSessionAuthority(nextWorld,RAPIER,{seed:7734,mode:'pvp',room:'NEW'},retireFailedArena)!,failure=vi.fn(),push=vi.spyOn(p,'push'),owner=(a.sim as unknown as {rubbleOwner:CityRubbleOwner}).rubbleOwner,body=world.getCollider([...owner.colliderHandles()][0]).parent()!;
 body.translation=()=>{resetRuntime();runtime.sim=next.sim;throw Error('Old native getter');};try{expect(presentSessionCityAuthority(a.sim,g,{world,seed:7734},p,failure)).toBe(false);expect(a.sim.physicsFailed).toBe(true);expect(next.sim.physicsFailed).toBe(false);expect(runtime.sim).toBe(next.sim);expect(failure).not.toHaveBeenCalled();expect(push).not.toHaveBeenCalled();}finally{resetRuntime();next.dispose();nextWorld.free();}
}));
it('replacement inside city push prevents its subsequent present call',()=>cityAdapterFixture((world,a,g,p)=>{
 const present=vi.spyOn(p,'present'),push=p.push.bind(p),failure=vi.fn();p.push=(...args)=>{push(...args);resetRuntime();};expect(presentSessionCityAuthority(a.sim,g,{world,seed:7734},p,failure)).toBe(false);expect(present).not.toHaveBeenCalled();expect(failure).not.toHaveBeenCalled();
}));
it('healthy native city presentation copies actual poses without waiting for HUD room',()=>cityAdapterFixture((world,a,g,p)=>{
 const actual=a.sim.rubble;expect(presentSessionCityAuthority(a.sim,g,{world,seed:7734},p,retireFailedArena)).toBe(true);expect(p.read()!.experimentalPhysicalRubble).toBe(true);expect(p.read()!.rubble).toEqual(actual);expect(p.read()!.rubble[0].position).not.toBe(actual[0].position);expect(runtime.sim).toBe(a.sim);expect(a.sim.physicsFailed).toBe(false);
}));

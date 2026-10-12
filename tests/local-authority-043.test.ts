import {beforeAll,expect,it,vi} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {guardOwnedWorldStep} from '../src/game/physicsGuard';
import {advanceLocalPhysics043,recordLocalTiming043,readLocalTiming043,resetLocalTiming043} from '../src/game/localAuthorityTiming043';
beforeAll(async()=>{await RAPIER.init();});
// This accumulator follows the installed Physics.step fixed-time branch. The
// shipping driver calls that public provider method, not this test adapter.
function fixedProvider(nativeStep:()=>void){let accumulated=0;return (delta:number)=>{accumulated+=delta;while(accumulated>=1/60){nativeStep();accumulated-=1/60;}};}
it.each([30,60,120])('keeps 60 native ticks per healthy second at %i render FPS',fps=>{
  let ticks=0;const step=fixedProvider(()=>ticks++);
  for(let i=0;i<fps;i++)advanceLocalPhysics043(1/fps,false,step);
  expect(ticks).toBe(60);
});
it('bounds long-frame catch-up to two native ticks and reports wall time lost',()=>{
  let ticks=0;const step=fixedProvider(()=>ticks++);
  const receipt=advanceLocalPhysics043(.583,false,step);
  expect(ticks).toBe(2);expect(receipt.admitted).toBe(2/60);expect(receipt.droppedWallTime).toBeCloseTo(.583-2/60,12);
  advanceLocalPhysics043(1/60,false,step);expect(ticks).toBe(3);
});
it('does not admit paused elapsed time or drain a pending fractional tick',()=>{
  const native=vi.fn(),step=fixedProvider(native);
  advanceLocalPhysics043(1/120,false,step);expect(native).not.toHaveBeenCalled();
  expect(advanceLocalPhysics043(3,true,step)).toMatchObject({admitted:0,droppedWallTime:0,paused:true});expect(native).not.toHaveBeenCalled();
  advanceLocalPhysics043(1/120,false,step);expect(native).toHaveBeenCalledTimes(1);
});
it('propagates provider failure without trying another tick or fabricating a receipt',()=>{
  const fault=Error('Native provider failure'),step=vi.fn(()=>{throw fault;});
  expect(()=>advanceLocalPhysics043(.5,false,step)).toThrow(fault);expect(step).toHaveBeenCalledTimes(1);
});
it('runs all live Solo NPC logic and real native world steps at unchanged 1/60',()=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'training','LOCAL043');
  const release=guardOwnedWorldStep(world,sim,()=>{}),native=vi.spyOn(world,'step'),bots=vi.fn();sim.onBotTiming=bots;
  const liveBots=[...sim.actors.values()].filter(a=>a.bot&&a.hp>0).length,ids=[...sim.actors.keys()];
  const step=fixedProvider(()=>{sim.step(1/60,false);world.timestep=1/60;world.step();});
  try{
    advanceLocalPhysics043(.583,false,step);
    expect(native).toHaveBeenCalledTimes(2);expect(sim.tick).toBe(2);expect(sim.time).toBeCloseTo(2/60,12);expect(world.timestep).toBeCloseTo(1/60,7);
    expect(bots).toHaveBeenCalledTimes(liveBots*2);expect([...sim.actors.keys()]).toEqual(ids);expect(sim.physicsFailed).toBe(false);
    const before=sim.snapshot();advanceLocalPhysics043(2,true,step);expect(sim.snapshot()).toEqual(before);expect(native).toHaveBeenCalledTimes(2);
  }finally{native.mockRestore();sim.dispose();release();world.free();}
});
it('bounds and detaches readonly timing history and fences prior arena generations',()=>{
  resetLocalTiming043(43);const frame={generation:43,tick:1,steps:2,physicsMs:40,simulationMs:37,providerOtherMs:3,stages:{locomotion:35},wallDelta:.6,admitted:2/60,droppedWallTime:.6-2/60,paused:false};
  for(let i=0;i<250;i++)recordLocalTiming043({...frame,tick:i});
  const read=readLocalTiming043();expect(read.totalFrames).toBe(250);expect(read.frames).toHaveLength(240);expect(read.frames[0].tick).toBe(10);
  read.frames[0].stages.locomotion=-1;expect(readLocalTiming043().frames[0].stages.locomotion).toBe(35);
  resetLocalTiming043(44);recordLocalTiming043(frame);expect(readLocalTiming043().frames).toHaveLength(0);
});

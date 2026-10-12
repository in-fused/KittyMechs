import {describe,expect,it,vi} from 'vitest';
import type {ActorState,GameSnapshot} from '../shared/types';
import {runtime} from '../src/game/runtime';
import {forgetRenderActor,sampleRenderActor} from '../src/game/entities/renderTimeline';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));
// Controlled confirmed packet positions, matching Simulation.snapshot's copied
// actor/time contract; not a public renderer or physics performance measurement.
function actor(t:number):ActorState{return {id:'timeline144',chassis:'pounce',hp:220,grounded:true,jumpEpoch:1,position:{x:6*t,y:.94,z:0},velocity:{x:6,y:0,z:0},yaw:0,climb:null,strike:null,pair:null,stance:'quadruped'} as ActorState;}
function packets(t:number,previousTime=t-.05,change?:(a:ActorState)=>void){const a=actor(t),b=actor(previousTime);change?.(a);change?.(b);runtime.previous={time:previousTime,actors:[b]} as GameSnapshot;runtime.snapshot={time:t,actors:[a]} as GameSnapshot;runtime.receivedAt=t*1000;}
function fixture(run:(clock:ReturnType<typeof vi.spyOn>)=>void){const saved={snapshot:runtime.snapshot,previous:runtime.previous,authority:runtime.authority,sim:runtime.sim,receivedAt:runtime.receivedAt},clock=vi.spyOn(performance,'now');runtime.authority=false;runtime.sim=null;try{run(clock);}finally{forgetRenderActor('timeline144');Object.assign(runtime,saved);clock.mockRestore();}}
describe('144 slow callbacks with fresh confirmed packet pairs',()=>{
 it('accounts realized presentation displacement without resetting phase every500ms callback',()=>fixture(clock=>{
  packets(.05,0);clock.mockReturnValue(50);const first=sampleRenderActor('timeline144',0,.05)!;expect(first.reset).toBe(true);const initialX=first.position.x;let previous=initialX,distance=0,resets=1;
  for(let i=1;i<=6;i++){const t=i*.5;packets(t);clock.mockReturnValue(t*1000);const p=sampleRenderActor('timeline144',i,.5)!;if(p.reset)resets++;expect(p.reset).toBe(false);expect(p.distance).toBeCloseTo(Math.abs(p.position.x-previous),12);expect(p.distance).toBeGreaterThan(2);expect(p.position.x).toBeGreaterThanOrEqual(runtime.previous!.actors[0].position.x);expect(p.position.x).toBeLessThanOrEqual(runtime.snapshot!.actors[0].position.x);distance+=p.distance;previous=p.position.x;expect(sampleRenderActor('timeline144',i,.5)).toBe(p);}
  expect(resets).toBe(1);expect(distance).toBeCloseTo(previous-initialX,12);
 }));
 it.each(['packet gap','epoch','death','teleport','pair'] as const)('retains discontinuity reset for %s rather than counting warp travel',kind=>fixture(clock=>{
  packets(.05,0);clock.mockReturnValue(50);sampleRenderActor('timeline144',0,.05);
  packets(.5,kind==='packet gap'?.05:.45,a=>{if(kind==='epoch')a.jumpEpoch=2;if(kind==='death')a.hp=0;if(kind==='teleport')a.position.x=40;if(kind==='pair')a.pair={id:'pair144',other:'other',life:1,otherLife:1,role:'attacker',phase:'pin',startedAt:.4,phaseAt:.4,endsAt:1.5,yaw:0,style:'quadruped',opponent:'pounce',anchor:{x:3,y:.94,z:0},offset:3.5,escape:0,combo:0,comboAt:-100};});clock.mockReturnValue(500);
  const p=sampleRenderActor('timeline144',1,.5)!;expect(p.reset).toBe(true);expect(p.distance).toBe(0);
 }));
 it('holds position and zero distance without fresh confirmations after catchup',()=>fixture(clock=>{
  packets(.05,0);clock.mockReturnValue(50);sampleRenderActor('timeline144',0,.05);packets(.5);clock.mockReturnValue(500);let previous=sampleRenderActor('timeline144',1,.5)!.position.x;
  let held=0;for(let i=2;i<=8;i++){clock.mockReturnValue(i*500);const p=sampleRenderActor('timeline144',i,.5)!;expect(p.position.x).toBeLessThanOrEqual(3);expect(p.distance).toBeCloseTo(p.position.x-previous,12);if(previous===3){held++;expect(p.distance).toBe(0);}previous=p.position.x;}
  expect(held).toBeGreaterThan(3);
 }));
});

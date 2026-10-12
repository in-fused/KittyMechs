import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {emptyInput,type ActorState,type InputState,type Mode} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,mode:Mode='pvp')=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  try{for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
const input=(sim:Simulation,a:ActorState,patch:Partial<InputState>)=>sim.setInput(a.id,{...emptyInput(),stance:a.stance,seq:sim.tick+1,...patch});

it('records separate accepted pulse and missile actions without refreshing rejected held inputs',()=>withSim(sim=>{
  const a=sim.addActor('a','Pilot','pounce',false,{x:0,y:1,z:22});advance(sim,1);
  expect([a.pulseAt,a.rocketAt,a.abilityAt,a.hurtAt,a.diedAt]).toEqual([-100,-100,-100,-100,-100]);
  input(sim,a,{fire:true,rocket:true});sim.step(1/60);const pulse=a.pulseAt,rocket=a.rocketAt;
  expect(pulse).toBe(sim.time);expect(rocket).toBe(sim.time);
  input(sim,a,{fire:true,rocket:true});sim.step(1/60);expect(a.pulseAt).toBe(pulse);expect(a.rocketAt).toBe(rocket);
  input(sim,a,{});advance(sim,.2);input(sim,a,{fire:true,rocket:true});sim.step(1/60);
  expect(a.pulseAt).toBeGreaterThan(pulse);expect(a.rocketAt).toBe(rocket);
  const accepted=a.pulseAt;a.heat=100;input(sim,a,{fire:true});sim.step(1/60);expect(a.pulseAt).toBe(accepted);
}));
it('timestamps abilities only after grounded energy/cooldown acceptance and permits movement during disruption',()=>withSim(sim=>{
  const a=sim.addActor('a','Pilot','lynx',false,{x:0,y:1,z:22});advance(sim,1);a.energy=0;
  input(sim,a,{boost:true});sim.step(1/60);expect(a.abilityAt).toBe(-100);
  a.energy=100;input(sim,a,{boost:true});sim.step(1/60);const ability=a.abilityAt;expect(ability).toBe(sim.time);
  input(sim,a,{boost:true});sim.step(1/60);expect(a.abilityAt).toBe(ability);
  a.boostUntil=0;a.disruptedUntil=sim.time+2;const z=a.position.z;
  for(let i=0;i<60;i++){input(sim,a,{fire:true,rocket:true,boost:true,forward:1});sim.step(1/60);}
  expect(a.pulseAt).toBe(-100);expect(a.rocketAt).toBe(-100);expect(a.abilityAt).toBe(ability);expect(a.position.z).toBeLessThan(z-3);
}));
it('accepted damage and death survive snapshots, then successful respawn clears action history',()=>withSim(sim=>{
  const a=sim.addActor('a','Shooter','pounce',false,{x:0,y:1,z:22}),b=sim.addActor('b','Target','pounce',false,{x:0,y:1,z:5});advance(sim,1);
  input(sim,a,{fire:true});sim.step(1/60);input(sim,a,{});advance(sim,.2);expect(b.hurtAt).toBe(-100);
  advance(sim,2);b.hp=20;input(sim,a,{fire:true});sim.step(1/60);input(sim,a,{});advance(sim,.2);
  expect(b.hp).toBe(0);expect(b.hurtAt).toBeGreaterThan(3);expect(b.diedAt).toBe(b.hurtAt);
  const deadAt=b.diedAt;advance(sim,.2);expect(b.diedAt).toBe(deadAt);
  const snapshot=sim.snapshot();snapshot.actors.find(actor=>actor.id===b.id)!.diedAt=99;expect(b.diedAt).toBe(deadAt);
  b.disruptedUntil=sim.time+20;advance(sim,5.2);expect(b.hp).toBe(b.maxHp);
  expect([b.pulseAt,b.rocketAt,b.abilityAt,b.hurtAt,b.diedAt]).toEqual([-100,-100,-100,-100,-100]);expect(b.disruptedUntil).toBe(0);
}));
it('cooperative friendly pulses do not invent damage or death animation timestamps',()=>withSim(sim=>{
  const a=sim.addActor('a','Shooter','pounce',false,{x:0,y:1,z:22}),b=sim.addActor('b','Ally','pounce',false,{x:0,y:1,z:5});advance(sim,3);
  for(let i=0;i<60;i++){input(sim,a,{fire:true});sim.step(1/60);}
  expect(a.pulseAt).toBeGreaterThan(3);expect(b.hurtAt).toBe(-100);expect(b.diedAt).toBe(-100);expect(b.hp).toBe(b.maxHp);
},'coop'));

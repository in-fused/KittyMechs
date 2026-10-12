import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import { beforeAll, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../shared/simulation';
import { emptyInput, type Chassis, type Mode } from '../shared/types';
import { parseJoin } from '../shared/protocol';
beforeAll(async()=>{await RAPIER.init();});
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<seconds*60;i++)sim.step(1/60);};
const withSim=(mode:Mode,run:(sim:Simulation)=>void)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  try{for(const a of [...sim.actors.values()])if(a.bot)sim.removeActor(a.id);run(sim);}finally{sim.dispose();world.free();}
};

it('admits both new chassis and rejects unknown chassis over the wire',()=>{
  for(const chassis of ['lynx','caracal'])expect(parseJoin({type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,name:'Pilot',room:'NEW',mode:'coop',chassis})?.chassis).toBe(chassis);
  expect(parseJoin({type:'join',inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION,name:'Pilot',room:'NEW',mode:'coop',chassis:'invalid'})).toBeNull();
});
it('Lynx dash crosses more ground than walking while respecting energy and cooldown',()=>withSim('pvp',sim=>{
  const a=sim.addActor('a','Dash','lynx',false,{x:0,y:1,z:22});advance(sim,1);
  const start=a.position.z;sim.setInput(a.id,{...emptyInput(),seq:1,boost:true});sim.step(1/60);
  const used=a.energy,ready=a.abilityReadyAt;expect(used).toBeLessThan(80);expect(ready).toBeGreaterThan(sim.time+4);
  for(let i=0;i<24;i++){sim.setInput(a.id,{...emptyInput(),seq:i+2,boost:true});sim.step(1/60);}
  expect(start-a.position.z).toBeGreaterThan(5);expect(a.abilityReadyAt).toBe(ready);expect(a.energy).toBeGreaterThan(used);
}));
it('Caracal repairs nearby allies in co-op but cannot heal rival pilots',()=>{
  for(const mode of ['coop','pvpve'] as Mode[])withSim(mode,sim=>{
    const a=sim.addActor('a','Medic','caracal',false,{x:0,y:1,z:22}),b=sim.addActor('b','Ally','pounce',false,{x:4,y:1,z:22}),far=sim.addActor('far','Far','pounce',false,{x:16,y:1,z:22});
    advance(sim,1);a.hp-=80;b.hp-=80;far.hp-=80;a.hitAt=b.hitAt=far.hitAt=sim.time;
    const own=a.hp,near=b.hp,distant=far.hp;
    sim.setInput(a.id,{...emptyInput(),seq:1,boost:true});sim.step(1/60);
    expect(a.hp).toBeGreaterThan(own);expect(b.hp).toBe(mode==='coop'?near+50:near);expect(far.hp).toBe(distant);
    expect(sim.snapshot().events.some(e=>e.type==='repair')).toBe(true);
  });
});
it('Bastion shield expires and reduces actual incoming pulse damage',()=>{
  const hit=(shield:boolean)=>{let damage=0;withSim('pvp',sim=>{
    const a=sim.addActor('a','Shooter','pounce',false,{x:0,y:1,z:22}),b=sim.addActor('b','Guardian','bastion',false,{x:0,y:1,z:5});
    advance(sim,3);if(shield){sim.setInput(b.id,{...emptyInput(),seq:1,boost:true});sim.step(1/60);expect(b.shieldUntil).toBeGreaterThan(sim.time+2);}
    const before=b.hp;sim.setInput(a.id,{...emptyInput(),seq:1,fire:true});sim.step(1/60);sim.setInput(a.id,{...emptyInput(),seq:2});advance(sim,.2);
    damage=before-b.hp;expect(damage).toBeGreaterThan(0);
    if(shield){advance(sim,3);expect(b.shieldUntil).toBeLessThan(sim.time);}
  });return damage;};
  expect(hit(true)).toBeCloseTo(hit(false)*.7,3);
});
it('all four playable chassis move and jump without losing authoritative state',()=>{
  for(const chassis of ['pounce','bastion','lynx','caracal'] as Chassis[])withSim('pvp',sim=>{
    const a=sim.addActor('p','Pilot',chassis,false,{x:0,y:1,z:22});advance(sim,1);expect(a.grounded).toBe(true);
    const start=a.position.z;for(let i=0;i<60;i++){sim.setInput(a.id,{...emptyInput(),seq:i,forward:1});sim.step(1/60);}
    expect(a.position.z).toBeLessThan(start-3);sim.setInput(a.id,{...emptyInput(),seq:61,jump:true,jumpId:1,jumpEpoch:a.jumpEpoch});sim.step(1/60);expect(a.velocity.y).toBeGreaterThan(5);
    expect(sim.snapshot().actors.find(p=>p.id==='p')?.chassis).toBe(chassis);
  });
});

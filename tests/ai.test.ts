import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../shared/simulation';
import { Navigation } from '../shared/navigation';
import { MAPS } from '../shared/maps';
import { terrainHeight } from '../shared/world';
import { horizontalDistance } from '../shared/math';
import type { ActorState, InputState } from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(test:(sim:Simulation)=>void,seed=7734)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp');
  try{test(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<seconds*60;i++)sim.step(1/60);};
const decide=(sim:Simulation,a:ActorState)=>(sim as unknown as {botInput(a:ActorState):InputState}).botInput(a);
const actor=(sim:Simulation,id:string,bot:boolean,x=0,z=0,role:ActorState['role']='scout')=>sim.addActor(id,id,'pounce',bot,{x,y:terrainHeight(x,z,sim.seed)+1,z},bot?role:undefined);

describe('enemy perception and tactics',()=>{
  it('does not acquire or fire through solid cover',()=>withSim(sim=>{
    const bot=actor(sim,'bot-0',true),pilot=actor(sim,'p',false,0,-28);
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(80,8,1).setTranslation(0,7,-12));
    advance(sim,8);
    expect(bot.fireAt).toBe(-100);expect(pilot.hp).toBe(pilot.maxHp);
  }));
  it('patrols reachable waypoints without pilots',()=>withSim(sim=>{
    const bot=actor(sim,'bot-0',true,-17,-53),start={...bot.position};advance(sim,4);
    expect(bot.aiState).toBe('patrol');expect(horizontalDistance(start,bot.position)).toBeGreaterThan(6);
  }));
  it('investigates a heard shot and forgets it after five seconds',()=>withSim(sim=>{
    const bot=actor(sim,'bot-0',true),pilot=actor(sim,'p',false,0,-24);
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(80,8,1).setTranslation(0,7,-12));sim.world.step();
    sim.time=6;pilot.fireAt=6;const heard=decide(sim,bot);
    expect(bot.aiState).toBe('investigate');expect(heard.fire).toBe(false);
    sim.removeActor(pilot.id);sim.time=12;decide(sim,bot);expect(bot.aiState).toBe('patrol');
  }));
  it('scouts flank a visible target and retreat when badly damaged',()=>withSim(sim=>{
    const bot=actor(sim,'bot-0',true);actor(sim,'p',false,0,-25);sim.world.step();sim.time=6;
    decide(sim,bot);expect(bot.aiState).toBe('flank');
    bot.hp=20;const retreat=decide(sim,bot);expect(bot.aiState).toBe('retreat');expect(retreat.fire).toBe(false);
  }));
  it('investigates the last visible location without tracking through walls',()=>withSim(sim=>{
    const bot=actor(sim,'bot-0',true),pilot=actor(sim,'p',false,0,-25);sim.world.step();sim.time=6;decide(sim,bot);
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(80,8,1).setTranslation(0,7,-12));sim.world.step();
    pilot.position.x=20;sim.time=6.3;const hidden=decide(sim,bot);
    expect(bot.aiState).toBe('investigate');expect(hidden.fire).toBe(false);
    sim.removeActor('p');sim.time=12;decide(sim,bot);expect(bot.aiState).toBe('patrol');
  }));
  it('mortars telegraph a fixed aim and cancel windup when sight is lost',()=>withSim(sim=>{
    const bot=actor(sim,'bot-0',true,0,0,'mortar');actor(sim,'p',false,0,-25);sim.world.step();
    sim.time=6;decide(sim,bot);sim.time=6.6;
    expect(decide(sim,bot).rocket).toBe(false);expect(bot.aiState).toBe('windup');expect(bot.windupUntil).toBeGreaterThan(sim.time);
    sim.time=7.6;expect(decide(sim,bot).rocket).toBe(true);
    sim.time=8;decide(sim,bot);sim.world.createCollider(RAPIER.ColliderDesc.cuboid(80,8,1).setTranslation(0,7,-12));sim.world.step();
    sim.time=8.2;expect(decide(sim,bot).rocket).toBe(false);expect(bot.windupUntil).toBe(0);
  }));
});

describe('bounded terrain navigation',()=>{
  it('routes around a workshop instead of crossing its footprint',()=>{
    const nav=new Navigation(7734),path=nav.path({x:15,y:1,z:42},{x:54,y:1,z:42});
    expect(path.length).toBeGreaterThan(12);expect(path.some(p=>Math.abs(p.z-42)>7.6)).toBe(true);
    for(const p of path){expect(nav.walkable(p)).toBe(true);expect(Math.abs(p.x-35)>9.3+1.2||Math.abs(p.z-42)>6.4+1.2).toBe(true);}
    expect(nav.path({x:15,y:1,z:42},{x:54,y:1,z:42})).toEqual(path);
  });
  it('creates map-specific spawn and objective elevations',()=>{
    for(const map of MAPS)withSim(sim=>{
      const pilot=sim.addActor('p','Pilot','pounce');expect(pilot.position.x).toBe(map.spawn.x);expect(pilot.position.z).toBe(map.spawn.z);
      expect(pilot.position.y).toBeCloseTo(terrainHeight(map.spawn.x,map.spawn.z,map.seed)+1);
      expect(sim.objectives.map(o=>[o.position.x,o.position.z])).toEqual(map.objectives.map(o=>[o.position.x,o.position.z]));
    },map.seed);
  });
});

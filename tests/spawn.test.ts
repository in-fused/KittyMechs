import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../shared/simulation';
import { actorHullRadius, actorQuadHeight, WORLD_LIMIT } from '../shared/config';
import { MAPS } from '../shared/maps';
import { terrainHeight } from '../shared/world';
import { horizontalDistance } from '../shared/math';
import { emptyInput, type ActorState } from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,seed=7734)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp');
  try{run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
const die=(sim:Simulation,a:ActorState)=>{a.hp=0;a.respawnAt=sim.time;};
const collider=(sim:Simulation,a:ActorState)=>(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(a.id)!.collider;

describe('bounded clear respawn placement',()=>{
  it('keeps an unobstructed nominal slot on every theater',()=>{
    for(const map of MAPS)withSim(sim=>{
      const a=sim.addActor('p','Pilot','bastion');advance(sim,1);const before={...a.position},count=sim.world.bodies.len();die(sim,a);sim.step(1/60);
      expect(a.hp).toBe(a.maxHp);expect(a.position.x).toBe(map.spawn.x);expect(a.position.z).toBe(map.spawn.z);
      // Floor contact can nudge the previously settled controller by millimeters;
      // respawn must restore its exact assigned slot, with no meaningful drift.
      expect(horizontalDistance(a.position,before)).toBeLessThan(.01);
      advance(sim,.3);expect(a.grounded).toBe(true);expect(sim.world.bodies.len()).toBe(count);
    },map.seed);
  });
  it('avoids quad and upright occupants in the nominal slot and an obstructed first fallback',()=>{
    for(const stance of ['quadruped','upright'] as const)withSim(sim=>{
      const a=sim.addActor('p','Pilot','pounce');advance(sim,1);const nominal={...a.position};die(sim,a);a.respawnAt=sim.time+10;
      const occupant=sim.addActor('occupant','Guardian','bastion',false,{...nominal});advance(sim,.1);
      if(stance==='upright'){sim.setInput(occupant.id,{...emptyInput(),seq:1,stance});sim.step(1/60);advance(sim,.8);expect(occupant.stance).toBe('upright');}
      const ground=terrainHeight(nominal.x,nominal.z,sim.seed);
      sim.world.createCollider(RAPIER.ColliderDesc.cuboid(2.3,3,2.3).setTranslation(nominal.x+5,ground+3,nominal.z));sim.world.step();
      const count=sim.world.bodies.len();a.respawnAt=sim.time;sim.step(1/60);
      expect(a.hp).toBe(a.maxHp);expect(horizontalDistance(a.position,occupant.position)).toBeGreaterThan(actorHullRadius(a)+actorHullRadius(occupant)+.1);
      expect(horizontalDistance(a.position,{...nominal,x:nominal.x+5})).toBeGreaterThan(3);
      expect(a.position.x).toBeCloseTo(nominal.x,3);expect(a.position.z).toBeCloseTo(nominal.z+5,3);
      expect(sim.world.bodies.len()).toBe(count);
    });
  });
  it('stays dead with its collider disabled when every candidate is blocked, then retries safely',()=>withSim(sim=>{
    const a=sim.addActor('p','Pilot','pounce');advance(sim,1);const nominal={...a.position};
    const blocker=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(25,4,25).setTranslation(nominal.x,3.92,nominal.z));sim.world.step();
    const count=sim.world.bodies.len();die(sim,a);advance(sim,2);
    expect(a.hp).toBe(0);expect(collider(sim,a).isEnabled()).toBe(false);expect(a.respawnAt).toBeGreaterThan(sim.time);expect(sim.world.bodies.len()).toBe(count);
    sim.world.removeCollider(blocker,true);sim.world.step();advance(sim,.6);
    expect(a.hp).toBe(a.maxHp);expect(collider(sim,a).isEnabled()).toBe(true);expect(a.position.x).toBeCloseTo(nominal.x,3);expect(a.position.z).toBeCloseTo(nominal.z,3);
    expect(sim.world.bodies.len()).toBe(count);
  }));
  it('rejects unsafe static and terrain clearance for the full hull',()=>withSim(sim=>{
    const a=sim.addActor('p','Pilot','bastion');advance(sim,1);const nominal={...a.position};
    // A narrow blocker intersects the hull's outer shoulder but misses its center ray.
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.15,2,1).setTranslation(nominal.x+1.7,1.92,nominal.z));sim.world.step();die(sim,a);sim.step(1/60);
    expect(a.hp).toBe(a.maxHp);expect(horizontalDistance(a.position,nominal)).toBeGreaterThan(4);
    const height=actorQuadHeight(a),shape=new RAPIER.RoundCylinder(height/2-.12,actorHullRadius(a)-.12,.12);
    const hit=sim.world.intersectionWithShape({...a.position,y:a.position.y+height/2-1},{x:0,y:0,z:0,w:1},shape,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    expect(hit).toBeNull();expect(Math.abs(a.position.x)+actorHullRadius(a)).toBeLessThanOrEqual(WORLD_LIMIT);expect(Math.abs(a.position.z)+actorHullRadius(a)).toBeLessThanOrEqual(WORLD_LIMIT);
  }));
  it('keeps bot fallback positions near their authored home and separates them from live human hulls',()=>withSim(sim=>{
    const [x,z,role]=MAPS[0].enemySpawns[2],home={x,y:terrainHeight(x,z)+1,z};
    const bot=sim.addActor('bot-2','Scout','pounce',true,home,role);die(sim,bot);bot.respawnAt=sim.time+10;
    const pilot=sim.addActor('p','Pilot','bastion',false,home);advance(sim,1);bot.respawnAt=sim.time;sim.step(1/60);
    expect(bot.hp).toBe(bot.maxHp);expect(horizontalDistance(bot.position,home)).toBeLessThanOrEqual(20.01);
    expect(horizontalDistance(bot.position,pilot.position)).toBeGreaterThan(actorHullRadius(bot)+actorHullRadius(pilot)+.1);
    advance(sim,1);expect(horizontalDistance(bot.position,pilot.position)).toBeGreaterThanOrEqual(actorHullRadius(bot)+actorHullRadius(pilot)-.04);
  }));
  it('keeps a patrolling scout from overlapping a stationary pilot during actual physics movement',()=>withSim(sim=>{
    const bot=sim.addActor('bot-0','Scout','pounce',true,{x:-17,y:.92,z:-53},'scout');
    const pilot=sim.addActor('p','Pilot','pounce',false,{x:-12,y:.92,z:-35});pilot.hp=pilot.maxHp=100000;
    const spacing=actorHullRadius(bot)+actorHullRadius(pilot);
    for(let i=0;i<1200;i++){sim.step(1/60);expect(horizontalDistance(bot.position,pilot.position)).toBeGreaterThanOrEqual(spacing-.04);}
    expect(bot.fireAt).toBeGreaterThan(4);expect(pilot.position.x).toBeCloseTo(-12,1);expect(pilot.position.z).toBeCloseTo(-35,1);
  }));
  it('places a late joining pilot clear of a roaming enemy occupying its default slot',()=>withSim(sim=>{
    const first=sim.addActor('first','First','bastion');advance(sim,1);
    const nominal={x:MAPS[0].spawn.x+4.6,y:.92,z:MAPS[0].spawn.z};
    const bot=sim.addActor('bot-2','Scout','pounce',true,nominal,'scout');sim.world.step();
    const count=sim.world.bodies.len(),joining=sim.addActor('joining','Guest','bastion');
    expect(joining.hp).toBe(joining.maxHp);expect(collider(sim,joining).isEnabled()).toBe(true);
    for(const other of [first,bot])expect(horizontalDistance(joining.position,other.position)).toBeGreaterThan(actorHullRadius(joining)+actorHullRadius(other)+.1);
    expect(horizontalDistance(joining.position,nominal)).toBeLessThanOrEqual(20.01);expect(sim.world.bodies.len()).toBe(count+1);
    advance(sim,.5);expect(horizontalDistance(joining.position,bot.position)).toBeGreaterThanOrEqual(actorHullRadius(joining)+actorHullRadius(bot)-.04);
  }));
  it('admits a blocked late join as pending and reuses its one body when clearance becomes available',()=>withSim(sim=>{
    const nominal=MAPS[0].spawn,blocker=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(25,4,25).setTranslation(nominal.x,3.92,nominal.z));sim.world.step();
    const count=sim.world.bodies.len(),joining=sim.addActor('joining','Guest','bastion');
    expect(joining.hp).toBe(0);expect(joining.aiState).toBe('destroyed');expect(collider(sim,joining).isEnabled()).toBe(false);advance(sim,1);
    expect(joining.hp).toBe(0);expect(sim.world.bodies.len()).toBe(count+1);
    sim.world.removeCollider(blocker,true);sim.world.step();advance(sim,.6);
    expect(joining.hp).toBe(joining.maxHp);expect(collider(sim,joining).isEnabled()).toBe(true);expect(sim.world.bodies.len()).toBe(count+1);
  }));
  it('rejects upright headroom fully contained inside a thick overhead slab',()=>withSim(sim=>{
    const a=sim.addActor('p','Pilot','pounce');advance(sim,1);
    const floor=a.position.y-1;
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(5,1.8,5).setTranslation(a.position.x,floor+3.82,a.position.z));sim.world.step();
    sim.setInput(a.id,{...emptyInput(),seq:1,stance:'upright'});sim.step(1/60);
    expect(a.stance).toBe('quadruped');expect(a.stanceChangedAt).toBe(-100);expect(sim.events.some(e=>e.type==='transform')).toBe(false);
  }));
});

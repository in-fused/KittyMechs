import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {actorHullRadius,actorQuadHeight} from '../shared/config';
import {getMap} from '../shared/maps';
import {parseInput} from '../shared/protocol';
import {terrainHeight} from '../shared/world';
import {horizontalDistance} from '../shared/math';
import {emptyInput,type ActorState,type Chassis,type Mode} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,mode:Mode='coop',seed=7734)=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,mode);
  try{for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
const hold=(sim:Simulation,a:ActorState)=>sim.setInput(a.id,{...emptyInput(),stance:a.stance,seq:sim.tick+1,interact:true});
const capture=(sim:Simulation,index:number,id='capturer')=>{
  const o=sim.objectives[index];sim.removeActor(id);const actor=sim.addActor(id,'Capturer','pounce',false,{...o.position,y:o.position.y+1});advance(sim,1);
  for(let i=0;i<Math.ceil((getMap(sim.seed).objectives[index].seconds+.2)*60);i++){hold(sim,actor);sim.step(1/60);}return actor;
};

describe('cooperative mission checkpoint authority',()=>{
  it('walks through the disabled dead Scout that blocked the recorded Ember expedition, while retaining solid cover collision',()=>withSim(sim=>{
    const corpse=sim.addActor('bot-2','Scout','pounce',true,{x:43.282075229643,y:1.836396199169065,z:-51.865459574029046},'scout');
    corpse.hp=0;corpse.respawnAt=100;advance(sim,.5);
    const a=sim.addActor('pilot','Bastion','bastion',false,{x:40.367397962583254,y:1.3142732748142407,z:-49.89355594770966}),before={...a.position};
    const yaw=Math.atan2(-(42-a.position.x),-(-51-a.position.z));
    for(let i=0;i<120;i++){sim.setInput(a.id,parseInput({...emptyInput(),seq:i+1,forward:1,yaw})!);sim.step(1/60);}
    expect(horizontalDistance(a.position,before)).toBeGreaterThan(9);expect(corpse.hp).toBe(0);expect(a.grounded).toBe(true);
    // A visible live obstacle must still stop the same character controller.
    const wallZ=a.position.z-5;sim.world.createCollider(RAPIER.ColliderDesc.cuboid(6,3,.4).setTranslation(a.position.x,a.position.y+2,wallZ));sim.world.step();
    for(let i=0;i<120;i++){sim.setInput(a.id,parseInput({...emptyInput(),seq:121+i,forward:1,yaw:0})!);sim.step(1/60);}
    expect(a.position.z).toBeGreaterThan(wallZ+actorHullRadius(a)+.3);expect(corpse.hp).toBe(0);
    const x=a.position.x+12,z=a.position.z,live=sim.addActor('live','Live Guardian','pounce',true,{x,y:terrainHeight(x,z,sim.seed)+1,z},'anchor');advance(sim,3);
    for(let i=0;i<60;i++){sim.setInput(a.id,parseInput({...emptyInput(),seq:241+i,fire:true,yaw:Math.atan2(-(live.position.x-a.position.x),-(live.position.z-a.position.z))})!);sim.step(1/60);}
    expect(a.pulseAt).toBeGreaterThan(5);expect(live.hp).toBeLessThan(live.maxHp);expect(corpse.hp).toBe(0);
  },'coop',1926));
  for(const chassis of ['pounce','bastion','lynx','caracal'] as Chassis[])it(`admits and respawns a default ${chassis} guest at Frostline's genuinely sloped West checkpoint`,()=>withSim(sim=>{
    capture(sim,0);sim.removeActor('capturer');
    // Occupy the first two human slots away from the checkpoint, as in the
    // real network expedition. The third joins at x=-38.8 on its sloped shoulder.
    sim.addActor('host','Host','bastion',false,{x:10,y:terrainHeight(10,-55,4107)+1,z:-55});
    sim.addActor('medic','Medic','caracal',false,{x:16,y:terrainHeight(16,-55,4107)+1,z:-55});advance(sim,.1);
    const a=sim.addActor('late','Guest',chassis),height=actorQuadHeight(a),radius=actorHullRadius(a);
    expect(a.hp).toBe(a.maxHp);expect(a.position.x).toBeCloseTo(-38.8);expect(a.position.z).toBe(-40);
    expect(a.position.y-1-terrainHeight(a.position.x,a.position.z,4107)).toBeGreaterThan(.06);
    const flags=RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC|RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC;
    const shape=new RAPIER.Cuboid(radius,height/2,radius);
    expect(sim.world.intersectionWithShape({...a.position,y:a.position.y+height/2-1+.06},{x:0,y:0,z:0,w:1},shape,flags)).toBeNull();
    advance(sim,.5);expect(a.grounded).toBe(true);const count=sim.world.bodies.len();
    a.hp=0;a.respawnAt=sim.time;sim.step(1/60);expect(a.hp).toBe(a.maxHp);expect(sim.world.bodies.len()).toBe(count);
    expect(horizontalDistance(a.position,sim.checkpoint!.position)).toBeLessThan(21);
    expect(sim.world.intersectionWithShape({...a.position,y:a.position.y+height/2-1},{x:0,y:0,z:0,w:1},shape,flags)).toBeNull();
    advance(sim,.5);expect(a.grounded).toBe(true);expect(sim.checkpoint?.objectiveId).toBe('relay-west');
  },'coop',4107));
  it('keeps raised slope placement outside shoulders, low ceilings and contained solids, with bounded pending retry',()=>withSim(sim=>{
    capture(sim,0);sim.removeActor('capturer');
    sim.addActor('host','Host','pounce',false,{x:10,y:terrainHeight(10,-55,4107)+1,z:-55});
    sim.addActor('medic','Medic','pounce',false,{x:16,y:terrainHeight(16,-55,4107)+1,z:-55});
    const x=-38.8,z=-40,floor=terrainHeight(x,z,4107);
    // A narrow shoulder misses a center ray but intersects the full hull.
    const shoulder=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.12,2,1.8).setTranslation(x+1.6,floor+2,z));sim.world.step();
    const a=sim.addActor('late','Late','pounce');expect(a.hp).toBe(a.maxHp);expect(horizontalDistance(a.position,{x,y:floor,z})).toBeGreaterThan(4);
    sim.removeActor(a.id);sim.world.removeCollider(shoulder,true);
    const ceiling=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(2.2,.3,2.2).setTranslation(x,floor+2.8,z));sim.world.step();
    const b=sim.addActor('late','Late','pounce');expect(b.hp).toBe(b.maxHp);expect(horizontalDistance(b.position,{x,y:floor,z})).toBeGreaterThan(4);
    sim.removeActor(b.id);sim.world.removeCollider(ceiling,true);
    const blocked=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(25,5,25).setTranslation(x,floor+4.9,z));sim.world.step();
    const pending=sim.addActor('late','Late','pounce');expect(pending.hp).toBe(0);advance(sim,1);expect(pending.hp).toBe(0);expect(pending.respawnAt).toBeGreaterThan(sim.time);
    sim.world.removeCollider(blocked,true);sim.world.step();advance(sim,.6);expect(pending.hp).toBe(pending.maxHp);expect(horizontalDistance(pending.position,sim.checkpoint!.position)).toBeLessThan(21);
  },'coop',4107));
  it('shares ordinary capture without doubling its duration, activates one checkpoint and never teleports living pilots',()=>withSim(sim=>{
    const o=sim.objectives[0],a=sim.addActor('a','A','pounce',false,{...o.position,x:o.position.x-2.1,y:o.position.y+1}),b=sim.addActor('b','B','pounce',false,{...o.position,x:o.position.x+2.1,y:o.position.y+1});advance(sim,1);
    const before=[{...a.position},{...b.position}];for(let i=0;i<90;i++){hold(sim,a);hold(sim,b);sim.step(1/60);}expect(o.progress).toBeCloseTo(.5);expect(sim.checkpoint).toBeNull();
    for(let i=0;i<100;i++){hold(sim,a);hold(sim,b);sim.step(1/60);}expect(o.complete).toBe(true);expect(sim.checkpoint?.objectiveId).toBe(o.id);expect(a.salvage+b.salvage).toBe(100);
    expect(sim.events.filter(e=>e.type==='checkpoint')).toHaveLength(1);for(const [i,p] of [a,b].entries())expect(horizontalDistance(p.position,before[i])).toBeLessThan(.05);
    const snapshot=sim.snapshot();snapshot.checkpoint!.position.x=900;snapshot.checkpoint!.name='FAKE';expect(sim.checkpoint?.position.x).toBe(o.position.x);expect(sim.checkpoint?.name).toBe(o.name);
  }));
  it('keeps a full squad wipe and late join near the checkpoint in clear distinct slots without resetting mission or cover',()=>withSim(sim=>{
    capture(sim,0);sim.removeActor('capturer');const checkpoint={...sim.checkpoint!,position:{...sim.checkpoint!.position}},cover=[...sim.cover.values()][0];cover.hp=50;
    const squad=Array.from({length:8},(_,i)=>sim.addActor(`pilot-${i}`,`Pilot ${i}`,'bastion'));advance(sim,1);
    for(const p of squad){p.hp=0;p.respawnAt=sim.time;}const count=sim.world.bodies.len();sim.step(1/60);advance(sim,.3);
    for(let i=0;i<squad.length;i++){
      const p=squad[i];expect(p.hp).toBe(p.maxHp);expect(p.grounded).toBe(true);expect(horizontalDistance(p.position,checkpoint.position)).toBeLessThan(25);
      for(let j=i+1;j<squad.length;j++)expect(horizontalDistance(p.position,squad[j].position)).toBeGreaterThan(actorHullRadius(p)+actorHullRadius(squad[j]));
    }
    expect(sim.objectives[0].complete).toBe(true);expect(cover.hp).toBe(50);expect(sim.checkpoint).toEqual(checkpoint);expect(sim.world.bodies.len()).toBe(count);
    sim.removeActor(squad[2].id);const late=sim.addActor('late','Guest','bastion');expect(late.hp).toBe(late.maxHp);expect(horizontalDistance(late.position,checkpoint.position)).toBeLessThan(25);
    expect(sim.snapshot().checkpoint).toEqual(checkpoint);for(const p of squad.filter(p=>p.id!==squad[2].id))expect(horizontalDistance(late.position,p.position)).toBeGreaterThan(actorHullRadius(late)+actorHullRadius(p));
  }));
  it('advances relay/core checkpoints in dependency order and leaves the latest one unchanged on extraction',()=>withSim(sim=>{
    const premature=capture(sim,2);expect(sim.objectives[2].complete).toBe(false);expect(sim.checkpoint).toBeNull();sim.removeActor(premature.id);
    capture(sim,0);const first=sim.checkpoint!.activatedAt;capture(sim,1);expect(sim.checkpoint?.objectiveId).toBe('relay-east');expect(sim.checkpoint!.activatedAt).toBeGreaterThan(first);
    capture(sim,2);expect(sim.checkpoint?.objectiveId).toBe('core');const checkpoint=sim.snapshot().checkpoint;capture(sim,3);
    expect(sim.phase).toBe('extracted');expect(sim.checkpoint).toEqual(checkpoint);
  }));
  it('uses bounded occupied fallback and pending retries while the latest checkpoint stays streamed',()=>withSim(sim=>{
    capture(sim,0);sim.removeActor('capturer');const a=sim.addActor('a','Pilot','pounce'),nominal={...a.position};advance(sim,.5);a.hp=0;a.respawnAt=sim.time+10;
    const occupant=sim.addActor('occupied','Guardian','bastion',false,nominal);advance(sim,.1);a.respawnAt=sim.time;sim.step(1/60);
    expect(a.hp).toBe(a.maxHp);expect(horizontalDistance(a.position,occupant.position)).toBeGreaterThan(actorHullRadius(a)+actorHullRadius(occupant));expect(horizontalDistance(a.position,sim.checkpoint!.position)).toBeLessThanOrEqual(20.01);
    sim.removeActor(occupant.id);const floor=terrainHeight(nominal.x,nominal.z,sim.seed),blocker=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(26,4,26).setTranslation(nominal.x,floor+3.9,nominal.z));sim.world.step();a.hp=0;a.respawnAt=sim.time;advance(sim,1);
    expect(a.hp).toBe(0);expect(a.respawnAt).toBeGreaterThan(sim.time);expect(sim.checkpoint?.objectiveId).toBe('relay-west');
    sim.world.removeCollider(blocker,true);sim.world.step();advance(sim,.6);expect(a.hp).toBe(a.maxHp);expect(horizontalDistance(a.position,sim.checkpoint!.position)).toBeLessThan(20.01);
  }));
  it('cannot accept checkpoint state from input or gain an unlocked core through proximity alone',()=>withSim(sim=>{
    const forged={...emptyInput(),seq:1,interact:true,checkpoint:{objectiveId:'core',position:{x:0,y:0,z:-76}},salvage:999};
    const parsed=parseInput(forged)!;expect(parsed).not.toHaveProperty('checkpoint');expect(parsed).not.toHaveProperty('salvage');
    const actor=sim.addActor('p','Pilot','pounce');sim.setInput(actor.id,parsed);advance(sim,1);expect(sim.checkpoint).toBeNull();expect(actor.salvage).toBe(0);
  }));
  for(const mode of ['training','pvp','pvpve'] as Mode[])it(`${mode} gains no cooperative checkpoint or spawn shortcut`,()=>withSim(sim=>{
    if(mode!=='pvp')capture(sim,0);expect(sim.checkpoint).toBeNull();const pilot=sim.addActor('late','Late','pounce');expect(horizontalDistance(pilot.position,getMap(sim.seed).spawn)).toBeLessThan(10);expect(sim.snapshot().checkpoint).toBeNull();
  },mode));
});

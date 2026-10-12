import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {horizontalDistance} from '../shared/math';
import {actorHullRadius} from '../shared/config';
import {parseInput} from '../shared/protocol';
import {terrainHeight} from '../shared/world';
import {emptyInput,type ActorState,type Mode,type SupplyKind} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,mode:Mode='pvp',seed=7734,room='SUPPLY TEST')=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,mode,room);
  try{for(const actor of [...sim.actors.values()])if(actor.bot)sim.removeActor(actor.id);run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
const grab=(sim:Simulation,a:ActorState)=>sim.setInput(a.id,{...emptyInput(),stance:a.stance,seq:sim.tick+1,interact:true});
const fixture=(sim:Simulation,kind:SupplyKind,offset=0)=>{
  const supply=sim.supplies[0];supply.kind=kind;const x=supply.position.x+offset,z=supply.position.z;
  const actor=sim.addActor('pilot','Pilot','pounce',false,{x,y:terrainHeight(x,z,sim.seed)+1,z});advance(sim,1);return {actor,supply};
};

describe('host-owned randomized supplies',()=>{
  it('admits six fair separated pickups per theater and repeats one room deterministically while varying another',()=>{
    const states:unknown[]=[];
    for(const seed of [7734,1926,4107])withSim(sim=>{
      expect(sim.supplies).toHaveLength(6);for(const kind of ['repair','energy','coolant'])expect(sim.supplies.filter(s=>s.kind===kind)).toHaveLength(2);
      for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)expect(horizontalDistance(sim.supplies[i].position,sim.supplies[j].position)).toBeGreaterThanOrEqual(9);
    },'pvp',seed);
    for(const room of ['A','A','B'])withSim(sim=>states.push(sim.snapshot().supplies),'pvp',7734,room);
    expect(states[0]).toEqual(states[1]);expect(states[0]).not.toEqual(states[2]);
  });
  it('grants clamped energy or coolant only when useful, without inventing a weapon action',()=>{
    for(const kind of ['energy','coolant'] as SupplyKind[])withSim(sim=>{
      const {actor,supply}=fixture(sim,kind);grab(sim,actor);sim.step(1/60);expect(supply.claimedBy).toBeNull();
      if(kind==='energy')actor.energy=80;else {actor.heat=80;actor.rocketReadyAt=sim.time+5;}
      grab(sim,actor);sim.step(1/60);expect(supply.claimedBy).toBe(actor.id);expect(actor.rocketAt).toBe(-100);expect(actor.pulseAt).toBe(-100);
      if(kind==='energy')expect(actor.energy).toBe(100);else {expect(actor.heat).toBeCloseTo(80-28/60-65);expect(actor.rocketReadyAt).toBe(sim.time);}
      expect(supply.availableAt-sim.time).toBeGreaterThanOrEqual(55);expect(supply.availableAt-sim.time).toBeLessThanOrEqual(75);
      const event=sim.events.find(e=>e.type==='supply');expect(event?.supplyId).toBe(supply.id);expect(event?.supplyKind).toBe(kind);
    });
  });
  for(const mode of ['coop','training','pvp','pvpve'] as Mode[])it(`${mode} repairs the claimant and shares only with eligible co-op allies`,()=>withSim(sim=>{
    const {actor,supply}=fixture(sim,'repair'),near=sim.addActor('near','Near','bastion',false,{...actor.position,x:actor.position.x+4.6}),covered=sim.addActor('covered','Covered','pounce',false,{...actor.position,z:actor.position.z-5});advance(sim,.5);
    actor.hp-=90;near.hp-=100;covered.hp-=90;actor.hitAt=near.hitAt=covered.hitAt=sim.time;
    const hp=[actor.hp,near.hp,covered.hp];sim.world.createCollider(RAPIER.ColliderDesc.cuboid(3,3,.15).setTranslation(actor.position.x,actor.position.y+2,actor.position.z-2.5));sim.world.step();
    grab(sim,actor);sim.step(1/60);expect(supply.claimedBy).toBe(actor.id);expect(actor.hp-hp[0]).toBeCloseTo(actor.maxHp*.25);
    expect(near.hp-hp[1]).toBeCloseTo(mode==='coop'?near.maxHp*.25:0);expect(covered.hp).toBe(hp[2]);
  },mode));
  it('allows a healthy co-op claimant to consume repair for a wounded visible ally',()=>withSim(sim=>{
    const {actor,supply}=fixture(sim,'repair'),ally=sim.addActor('ally','Ally','pounce',false,{...actor.position,x:actor.position.x+4.6});advance(sim,.5);ally.hp-=60;ally.hitAt=sim.time;
    grab(sim,actor);sim.step(1/60);expect(supply.claimedBy).toBe(actor.id);expect(actor.hp).toBe(actor.maxHp);expect(ally.hp).toBe(ally.maxHp-5);
  },'coop'));
  it('enforces actual 3D reach, grounded state and solid cover before claiming',()=>{
    for(const reason of ['range','air','wall'])withSim(sim=>{
      const {actor,supply}=fixture(sim,'energy',reason==='range'?3.3:reason==='wall'?2.6:0);actor.energy=10;
      if(reason==='air'){sim.setInput(actor.id,{...emptyInput(),seq:sim.tick+1,jump:true,jumpId:1,jumpEpoch:actor.jumpEpoch});sim.step(1/60);expect(actor.grounded).toBe(false);}
      if(reason==='wall'){sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,3,1).setTranslation(supply.position.x+.5,supply.position.y+3,supply.position.z));sim.world.step();}
      grab(sim,actor);sim.step(1/60);expect(supply.claimedBy).toBeNull();expect(actor.energy).toBeLessThan(12);
    });
  });
  it('atomically admits one simultaneous claim and copies availability state for late joins',()=>withSim(sim=>{
    const {actor,supply}=fixture(sim,'energy',-2.1),other=sim.addActor('other','Other','pounce',false,{...supply.position,x:supply.position.x+2.1,y:supply.position.y+1});advance(sim,.5);actor.energy=other.energy=10;
    grab(sim,actor);grab(sim,other);sim.step(1/60);expect(supply.claimedBy).toBe(actor.id);expect(actor.energy).toBeGreaterThan(55);expect(other.energy).toBeLessThan(11);expect(sim.events.filter(e=>e.type==='supply')).toHaveLength(1);
    const late=sim.addActor('late','Late','pounce'),snapshot=sim.snapshot();expect(snapshot.supplies[0].claimedBy).toBe(actor.id);snapshot.supplies[0].position.x=999;snapshot.supplies[0].claimedBy=null;
    expect(supply.position.x).not.toBe(999);expect(supply.claimedBy).toBe(actor.id);expect(late.hp).toBe(late.maxHp);
  }));
  it('regenerates a consumed slot after its deadline in a clear separated location with one stable id',()=>withSim(sim=>{
    const {actor,supply}=fixture(sim,'energy');actor.energy=5;grab(sim,actor);sim.step(1/60);const id=supply.id,old={...supply.position},deadline=supply.availableAt;
    sim.setInput(actor.id,{...emptyInput(),seq:sim.tick+1});advance(sim,deadline-sim.time+.2);expect(supply.claimedBy).toBeNull();expect(supply.id).toBe(id);expect(supply.born).toBeGreaterThanOrEqual(deadline);
    expect(horizontalDistance(supply.position,old)).toBeGreaterThanOrEqual(actorHullRadius(actor)+.8);expect(sim.supplies).toHaveLength(6);
    for(const other of sim.supplies.filter(s=>s.id!==id))expect(horizontalDistance(other.position,supply.position)).toBeGreaterThanOrEqual(9);
  }));
  it('does not accept item claims, kind, benefits or respawn deadlines from client input',()=>withSim(sim=>{
    const {actor,supply}=fixture(sim,'energy');actor.energy=10;const fake=parseInput({...emptyInput(),seq:sim.tick+1,supplyId:supply.id,supplyKind:'energy',claimedBy:actor.id,availableAt:0,energy:100})!;
    expect(fake).not.toHaveProperty('supplyId');expect(fake).not.toHaveProperty('energy');sim.setInput(actor.id,fake);sim.step(1/60);expect(supply.claimedBy).toBeNull();expect(actor.energy).toBeLessThan(11);
  }));
});

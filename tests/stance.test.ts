import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../shared/simulation';
import { emptyInput, type ActorState, type Chassis, type InputState, type Mode } from '../shared/types';
import { MECHS, QUADRUPED_HEIGHT, STANCE_TRANSITION, UPRIGHT, UPRIGHT_HEIGHT } from '../shared/config';

beforeAll(async()=>{await RAPIER.init();});
const withSim=(run:(sim:Simulation)=>void,mode:Mode='pvp')=>{
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,mode);
  try{for(const a of [...sim.actors.values()])if(a.bot)sim.removeActor(a.id);run(sim);}finally{sim.dispose();world.free();}
};
const advance=(sim:Simulation,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.step(1/60);};
// These positive cases use Rainline's open spawn road; explicit walls/ceilings
// move with the entire fixture. Initial real input retires loading protection
// through the same authoritative path used by players, without bypassing it.
const fixtureX=(x:number)=>x-8;
const add=(sim:Simulation,id='p',chassis:Chassis='pounce',x=0,z=22)=>{
  const a=sim.addActor(id,id,chassis,false,{x:fixtureX(x),y:1,z});
  input(sim,a,{});
  return a;
};
const sequences=new WeakMap<ActorState,number>();
const input=(sim:Simulation,a:ActorState,patch:Partial<InputState>)=>{const seq=Math.max(sim.tick+1,(sequences.get(a)??0)+1);sequences.set(a,seq);sim.setInput(a.id,{...emptyInput(),stance:a.stance,seq,jumpEpoch:a.jumpEpoch,jumpId:patch.jump?seq:0,...patch});};
const upright=(sim:Simulation,a:ActorState)=>{input(sim,a,{stance:'upright'});sim.step(1/60);advance(sim,.8);expect(a.stance).toBe('upright');};
const ability=(sim:Simulation,a:ActorState)=>{input(sim,a,{boost:true});sim.step(1/60);input(sim,a,{});};
const collider=(sim:Simulation,a:ActorState)=>(sim as unknown as {physics:Map<string,{collider:RAPIER.Collider}>}).physics.get(a.id)!.collider;
const hit=(sim:Simulation,target:ActorState,owner:string,amount=40)=>(sim as unknown as {damage(a:ActorState,n:number,id:string,p:ActorState['position']):void}).damage(target,amount,owner,target.position);

describe('authoritative stance transitions',()=>{
  it('requires grounded actors, gates combat, and treats repeated desired stance as idempotent',()=>withSim(sim=>{
    const a=add(sim);input(sim,a,{stance:'upright'});sim.step(1/60);expect(a.stance).toBe('quadruped');input(sim,a,{});advance(sim,1);
    input(sim,a,{stance:'upright',fire:true,rocket:true,boost:true});sim.step(1/60);
    const changed=a.stanceChangedAt;expect(a.stance).toBe('upright');expect(a.fireAt).toBe(-100);expect(a.abilityReadyAt).toBe(0);
    for(let i=0;i<30;i++){input(sim,a,{stance:'upright',fire:true,boost:true});sim.step(1/60);}
    expect(a.fireAt).toBe(-100);expect(a.energy).toBe(100);expect(a.stanceChangedAt).toBe(changed);
    advance(sim,.3);input(sim,a,{stance:'upright',fire:true});sim.step(1/60);expect(a.fireAt).toBeGreaterThanOrEqual(changed+STANCE_TRANSITION);expect(a.fireAt).toBeLessThanOrEqual(sim.time);expect(a.stanceChangedAt).toBe(changed);
    // Input timeout stops held actions without changing a completed stance.
    advance(sim,.5);expect(a.stance).toBe('upright');
  }));
  it('rejects overhead expansion and preserves the floor with an exact 3.8m hull',()=>withSim(sim=>{
    const a=add(sim);advance(sim,1);
    const ceiling=sim.world.createCollider(RAPIER.ColliderDesc.cuboid(5,.2,5).setTranslation(fixtureX(0),2.6,22));sim.world.step();
    input(sim,a,{stance:'upright'});sim.step(1/60);expect(a.stance).toBe('quadruped');expect(sim.events.some(e=>e.type==='transform')).toBe(false);
    sim.world.removeCollider(ceiling,true);sim.world.step();const floor=a.position.y-1;upright(sim,a);
    const col=collider(sim,a),shape=col.shape as RAPIER.RoundCylinder;
    expect(2*(shape.halfHeight+shape.borderRadius)).toBeCloseTo(UPRIGHT_HEIGHT);
    expect(col.translation().y-UPRIGHT_HEIGHT/2).toBeCloseTo(floor,2);expect(a.position.y-1).toBeCloseTo(floor,2);
  }));
  it('keeps the tall hull while lowering near a low opening, then shrinks safely',()=>withSim(sim=>{
    const a=add(sim);advance(sim,1);upright(sim,a);
    sim.world.createCollider(RAPIER.ColliderDesc.cuboid(6,.4,4).setTranslation(fixtureX(0),2.8,15));sim.world.step();
    input(sim,a,{stance:'quadruped',forward:1});sim.step(1/60);
    const shape=()=>collider(sim,a).shape as RAPIER.RoundCylinder;
    expect(2*(shape().halfHeight+shape().borderRadius)).toBeCloseTo(3.8);
    for(let i=0;i<30;i++){input(sim,a,{forward:1});sim.step(1/60);}
    expect(2*(shape().halfHeight+shape().borderRadius)).toBeCloseTo(3.8);
    expect(a.position.z).toBeGreaterThan(19);
    advance(sim,.3);expect(2*(shape().halfHeight+shape().borderRadius)).toBeCloseTo(QUADRUPED_HEIGHT);
  }));
  it('resets stance, hull and held commands on respawn',()=>withSim(sim=>{
    const a=add(sim);advance(sim,1);upright(sim,a);a.hp=0;a.respawnAt=sim.time+.1;advance(sim,.2);
    expect(a.stance).toBe('quadruped');expect(a.stanceChangedAt).toBe(-100);expect(a.hp).toBe(a.maxHp);
    const shape=collider(sim,a).shape as RAPIER.RoundCylinder;expect(2*(shape.halfHeight+shape.borderRadius)).toBeCloseTo(QUADRUPED_HEIGHT);
  }));
  it('uses taller muzzle and hit volume, freezes shot damage and applies upright cadence',()=>withSim(sim=>{
    const shooter=add(sim,'a'),target=add(sim,'b','pounce',0,6);advance(sim,3);upright(sim,shooter);upright(sim,target);
    const before=target.hp;input(sim,shooter,{fire:true});sim.step(1/60);input(sim,shooter,{});
    expect(sim.projectiles[0].position.y).toBeCloseTo(shooter.position.y+1.65);
    const shotAt=sim.time;expect(sim.events.find(e=>e.type==='shot')?.position.y).toBeCloseTo(shooter.position.y+1.65);
    // Changing stance after launch must not reduce the projectile's stored multiplier.
    input(sim,shooter,{stance:'quadruped'});sim.step(1/60);advance(sim,.2);
    expect(before-target.hp).toBeCloseTo(22*MECHS.pounce.weaponDamage*UPRIGHT.pounce.damage);
    const physics=(sim as unknown as {physics:Map<string,{fireReadyAt:number}>}).physics.get(shooter.id)!;
    expect(physics.fireReadyAt-shotAt).toBeCloseTo(.16*UPRIGHT.pounce.interval);
  }));
  it('makes upright travel and jumps slower than quadruped travel',()=>{
    const measure=(up:boolean)=>{let result={distance:0,jump:0};withSim(sim=>{
      const a=add(sim);advance(sim,1);if(up)upright(sim,a);const start=a.position.z;
      for(let i=0;i<60;i++){input(sim,a,{forward:1});sim.step(1/60);}
      input(sim,a,{jump:true});sim.step(1/60);result={distance:start-a.position.z,jump:a.velocity.y};
    });return result;};
    const low=measure(false),high=measure(true);expect(high.distance).toBeLessThan(low.distance*.75);expect(high.jump).toBeLessThan(low.jump);
  });
});

describe('upright abilities and replicated area fields',()=>{
  it('rakes only the forward cone, respects cover and disables co-op friendly damage',()=>{
    for(const mode of ['pvp','coop'] as Mode[])withSim(sim=>{
      const a=add(sim,'a'),front=add(sim,'front','pounce',0,17),rear=add(sim,'rear','pounce',0,27),blocked=add(sim,'blocked','pounce',5,19);
      advance(sim,3);upright(sim,a);
      sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.25,3,2).setTranslation(fixtureX(2.7),3,20));sim.world.step();
      ability(sim,a);expect(front.hp).toBe(mode==='pvp'?front.maxHp-45:front.maxHp);expect(rear.hp).toBe(rear.maxHp);expect(blocked.hp).toBe(blocked.maxHp);
      expect(sim.events.some(e=>e.effect==='rake'&&e.radius===7&&e.direction===0)).toBe(true);
    },mode);
  });
  it('shield domes protect allies in co-op, self only in rivals, and expire',()=>{
    for(const mode of ['coop','pvp','pvpve'] as Mode[])withSim(sim=>{
      const a=add(sim,'a','bastion'),ally=add(sim,'ally','pounce',5,22),enemy=add(sim,'enemy','pounce',12,22);
      advance(sim,3);upright(sim,a);ability(sim,a);expect(sim.fields[0].kind).toBe('shield');
      const own=a.hp,other=ally.hp;hit(sim,a,enemy.id);hit(sim,ally,enemy.id);
      expect(own-a.hp).toBe(20);expect(other-ally.hp).toBe(mode==='coop'?20:40);
      advance(sim,4.1);expect(sim.fields).toHaveLength(0);const after=a.hp;hit(sim,a,enemy.id);expect(after-a.hp).toBe(40);
    },mode);
  });
  it('sanctuaries heal at ten hp per second with mode and cover rules',()=>{
    for(const mode of ['coop','training','pvp','pvpve'] as Mode[])withSim(sim=>{
      const a=add(sim,'a','caracal'),ally=add(sim,'ally','pounce',4,22),covered=add(sim,'covered','pounce',0,16);
      advance(sim,3);upright(sim,a);a.hp-=100;ally.hp-=100;covered.hp-=100;a.hitAt=ally.hitAt=covered.hitAt=sim.time;
      sim.world.createCollider(RAPIER.ColliderDesc.cuboid(4,3,.4).setTranslation(fixtureX(0),3,19));sim.world.step();
      const own=a.hp,near=ally.hp,hidden=covered.hp;ability(sim,a);advance(sim,1);
      expect(a.hp-own).toBeCloseTo(10);expect(ally.hp-near).toBeCloseTo(mode==='coop'||mode==='training'?10:0);expect(covered.hp).toBe(hidden);
      const field={...sim.fields[0],position:{...sim.fields[0].position}};input(sim,a,{forward:1});sim.step(1/60);expect(sim.fields[0].position).toEqual(field.position);
    },mode);
  });
  it('ion snares slow hostile movement and deal bounded damage without hitting allies or crossing cover',()=>{
    const measure=(snared:boolean,mode:Mode='pvp',wall=false)=>{let result={distance:0,damage:0};withSim(sim=>{
      const a=add(sim,'a','lynx'),target=add(sim,'target','pounce',4,15);advance(sim,3);upright(sim,a);
      if(wall){sim.world.createCollider(RAPIER.ColliderDesc.cuboid(.3,4,6).setTranslation(fixtureX(2),4,15));sim.world.step();}
      if(snared)ability(sim,a);const start=target.position.z,hp=target.hp;
      for(let i=0;i<60;i++){input(sim,target,{forward:1});sim.step(1/60);}
      result={distance:start-target.position.z,damage:hp-target.hp};
    },mode);return result;};
    const plain=measure(false),snared=measure(true);expect(snared.distance).toBeLessThan(plain.distance*.75);expect(snared.damage).toBeGreaterThan(0);expect(snared.damage).toBeLessThanOrEqual(8.01);
    expect(measure(true,'coop').damage).toBe(0);expect(measure(true,'pvp',true).damage).toBe(0);
  });
  it('integrates expiry overlap, caps field count, collapses on death/leave and copies snapshots',()=>withSim(sim=>{
    const a=add(sim,'a','caracal');advance(sim,3);upright(sim,a);a.hp-=100;a.hitAt=sim.time;
    for(let i=0;i<14;i++){a.abilityReadyAt=0;a.energy=100;ability(sim,a);}expect(sim.fields.length).toBe(12);
    const snapshot=sim.snapshot();snapshot.fields[0].position.x=999;snapshot.fields[0].expires=999;snapshot.actors[0].stance='quadruped';
    expect(sim.fields[0].position.x).not.toBe(999);expect(sim.fields[0].expires).not.toBe(999);expect(a.stance).toBe('upright');
    sim.fields=sim.fields.slice(-1);const field=sim.fields[0];a.hp=100;a.hitAt=sim.time;field.expires=sim.time+.025;
    advance(sim,.05);expect(a.hp).toBeCloseTo(100.25);expect(sim.fields).toHaveLength(0);
    a.energy=100;a.abilityReadyAt=0;ability(sim,a);a.hp=0;a.respawnAt=sim.time+10;sim.step(1/60);expect(sim.fields).toHaveLength(0);
    a.hp=100;a.energy=100;a.abilityReadyAt=0;a.grounded=true;ability(sim,a);expect(sim.fields).toHaveLength(1);sim.removeActor(a.id);expect(sim.fields).toHaveLength(0);
  }));
  it('keeps cooldown and energy authoritative through repeated ability commands',()=>withSim(sim=>{
    const a=add(sim,'a','bastion');advance(sim,3);upright(sim,a);ability(sim,a);const ready=a.abilityReadyAt;
    expect(a.energy).toBeCloseTo(60);expect(ready-sim.time).toBeCloseTo(UPRIGHT.bastion.cooldown);
    for(let i=0;i<50;i++){input(sim,a,{boost:true});sim.step(1/60);}expect(sim.fields).toHaveLength(1);expect(a.abilityReadyAt).toBe(ready);
    expect(sim.time-a.stanceChangedAt).toBeGreaterThan(STANCE_TRANSITION);
  }));
});

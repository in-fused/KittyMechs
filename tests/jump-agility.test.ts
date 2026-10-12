import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {parseInput} from '../shared/protocol';
import {emptyInput,type ActorState,type Chassis,type InputState} from '../shared/types';
import {actorHullRadius,QUADRUPED_HEIGHT,UPRIGHT_HEIGHT} from '../shared/config';
import {climbAnchors} from '../shared/traversal';
import {terrainHeight} from '../shared/world';

beforeAll(async()=>{await RAPIER.init();});
const dt=1/60;
const quad=[['pounce',12.2,3.28,.9,1.2],['bastion',9.4,1.93,.68,.92],['lynx',12.4,3.39,.92,1.2],['caracal',10.5,2.42,.78,1.03]] as const;
const upright=[['pounce',5.76,.707],['bastion',5.2,.570],['lynx',6.56,.924],['caracal',5.6,.666]] as const;
function withSim(run:(sim:Simulation)=>void,seed=7734){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,seed,'pvp');
  try{run(sim);}finally{sim.dispose();world.free();}
}
function command(sim:Simulation,a:ActorState,patch:Partial<InputState>={}){
  const accepted=parseInput({...emptyInput(),stance:a.stance,seq:sim.tick+1,jumpEpoch:a.jumpEpoch,jumpId:patch.jump?sim.tick+1:0,...patch});
  expect(accepted).not.toBeNull();sim.setInput(a.id,accepted!);
}
function tick(sim:Simulation,a:ActorState,patch:Partial<InputState>={}){command(sim,a,patch);sim.step(dt);}
function settle(sim:Simulation,a:ActorState){
  for(let i=0;i<90;i++)tick(sim,a);
  expect(a.hp).toBe(a.maxHp);expect(a.grounded).toBe(true);expect(a.velocity.y).toBe(0);
  expect(a.position.y-1).toBeCloseTo(terrainHeight(a.position.x,a.position.z,sim.seed),1);
}
function floorActor(sim:Simulation,chassis:Chassis='pounce'){
  const actor=sim.addActor('pilot','Pilot',chassis);settle(sim,actor);return actor;
}
function measure(sim:Simulation,a:ActorState,repeated=false){
  const start={...a.position};tick(sim,a,{jump:true});
  const first={y:a.position.y,vy:a.velocity.y,grounded:a.grounded};
  const captured=sim.snapshot().actors.find(actor=>actor.id===a.id)!;
  expect(captured.position).toEqual(a.position);expect(captured.velocity).toEqual(a.velocity);expect(captured.grounded).toBe(false);
  let peak=a.position.y,flight=dt,landed=false;
  for(let i=0;i<120;i++){
    const previous=a.velocity.y;tick(sim,a,{jump:repeated});flight+=dt;peak=Math.max(peak,a.position.y);
    if(a.grounded){landed=true;break;}
    expect(a.velocity.y).toBeLessThanOrEqual(previous+.00001);
  }
  expect(landed).toBe(true);expect(a.position.y).toBeCloseTo(start.y,1);expect(a.velocity.y).toBe(0);
  expect(captured.position.y).toBe(first.y);expect(captured.velocity.y).toBe(first.vy);
  return {start,first,rise:peak-start.y,flight};
}

describe('clear-floor quadruped agility through actual authoritative Rapier movement',()=>{
  for(const seed of [7734,1926,4107])for(const [chassis,launch,apex,minFlight,maxFlight] of quad){
    it(`${seed} ${chassis} clears the floor, reaches its bounded apex and lands`,()=>withSim(sim=>{
      const a=floorActor(sim,chassis),trajectory=measure(sim,a);
      expect(trajectory.first.grounded).toBe(false);expect(trajectory.first.y-trajectory.start.y).toBeGreaterThan(.14);
      expect(trajectory.first.vy).toBeCloseTo(launch-22/60,7);expect(trajectory.rise).toBeCloseTo(apex,1);
      expect(trajectory.flight).toBeGreaterThan(minFlight);expect(trajectory.flight).toBeLessThan(maxFlight);
      // Rapier's single-precision floor contact can introduce micrometer drift.
      expect(a.position.x).toBeCloseTo(trajectory.start.x,3);expect(a.position.z).toBeCloseTo(trajectory.start.z,3);
    },seed));
  }
});

describe('preserved forms and movement contracts',()=>{
  for(const [chassis,launch,oldPeak] of upright)it(`${chassis} preserves the frozen upright trajectory`,()=>withSim(sim=>{
    const a=floorActor(sim,chassis);tick(sim,a,{stance:'upright'});
    for(let i=0;i<48;i++)tick(sim,a,{stance:'upright'});
    expect(a.stance).toBe('upright');const trajectory=measure(sim,a);
    expect(trajectory.first.vy).toBeCloseTo(launch-22/60,7);expect(trajectory.rise).toBeCloseTo(oldPeak,2);
  }));
  it('keeps Pounce ability launch at 5 m/s and does not change its cooldown',()=>withSim(sim=>{
    const a=floorActor(sim);tick(sim,a,{boost:true});
    expect(a.abilityAt).toBe(sim.time);expect(a.abilityReadyAt-sim.time).toBeCloseTo(4,10);
    expect(a.velocity.y).toBeCloseTo(5-22/60,7);expect(a.boostUntil-sim.time).toBeCloseTo(.6);
  }));
  it('retains the horizontal acceleration and yaw response on the launch frame',()=>withSim(sim=>{
    const a=floorActor(sim);tick(sim,a,{jump:true,forward:1,yaw:Math.PI/2});
    expect(a.velocity.x).toBeCloseTo(-7.6*(1-Math.exp(-11/60)),7);
    expect(a.velocity.z).toBeCloseTo(0,7);
    expect(a.yaw).toBeCloseTo(Math.PI/2*(1-Math.exp(-10/60)),7);
    expect(a.energy).toBe(100);expect(a.heat).toBe(0);expect(a.fireAt).toBe(-100);
  }));
});

describe('jump restriction and collision regressions',()=>{
  it('does not relaunch in air even with a fresh jump request every tick',()=>withSim(sim=>{
    const a=floorActor(sim,'lynx'),trajectory=measure(sim,a,true);
    expect(trajectory.rise).toBeCloseTo(3.39,1);expect(trajectory.flight).toBeLessThan(1.2);
  }));
  it('consumes a single held authority request and does not bounce after landing or timeout',()=>withSim(sim=>{
    const a=floorActor(sim),start=a.position.y;command(sim,a,{jump:true});sim.step(dt);
    for(let i=0;i<150;i++)sim.step(dt);
    expect(a.grounded).toBe(true);expect(a.position.y).toBeCloseTo(start,1);expect(a.velocity.y).toBe(0);
  }));
  it('blocks jumps during both form transitions and rejects an airborne desired form',()=>withSim(sim=>{
    const a=floorActor(sim),floor=a.position.y;tick(sim,a,{stance:'upright',jump:true});
    for(let i=0;i<35;i++)tick(sim,a,{stance:'upright',jump:true});
    expect(a.position.y).toBeCloseTo(floor,1);expect(a.velocity.y).toBe(0);
    for(let i=0;i<10;i++)tick(sim,a,{stance:'upright'});
    tick(sim,a,{stance:'quadruped',jump:true});
    for(let i=0;i<35;i++)tick(sim,a,{jump:true});
    expect(a.position.y).toBeCloseTo(floor,1);expect(a.velocity.y).toBe(0);
    for(let i=0;i<10;i++)tick(sim,a);tick(sim,a,{jump:true});tick(sim,a,{stance:'upright',jump:true});
    expect(a.grounded).toBe(false);expect(a.stance).toBe('quadruped');expect(a.velocity.y).toBeCloseTo(12.2-44/60,7);
  }));
  it('keeps both full-height forms below a solid ceiling and returns them to the floor',()=>{
    for(const up of [false,true])withSim(sim=>{
      const a=floorActor(sim);if(up){tick(sim,a,{stance:'upright'});for(let i=0;i<48;i++)tick(sim,a,{stance:'upright'});}
      const floor=a.position.y-1,height=up?UPRIGHT_HEIGHT:QUADRUPED_HEIGHT,ceilingBottom=floor+height+.25;
      sim.world.createCollider(RAPIER.ColliderDesc.cuboid(8,.3,8).setTranslation(a.position.x,ceilingBottom+.3,a.position.z));sim.world.step();
      const start=a.position.y;tick(sim,a,{jump:true});let touched=false;
      for(let i=0;i<100;i++){
        expect(a.position.y-1+height).toBeLessThanOrEqual(ceilingBottom+.025);
        touched||=a.position.y-start>.15;tick(sim,a);
      }
      expect(touched).toBe(true);expect(a.grounded).toBe(true);expect(a.position.y).toBeCloseTo(start,1);
    });
  });
  it('a jump detaches a real grip without launching again or bypassing the workshop roof',()=>withSim(sim=>{
    const anchor=climbAnchors(sim.seed)[0],radius=actorHullRadius({chassis:'pounce',bot:false});
    const a=sim.addActor('pilot','Pilot','pounce',false,{x:anchor.position.x+anchor.normal.x*(radius+.65),y:anchor.position.y+1,z:anchor.position.z+anchor.normal.z*(radius+.65)});
    settle(sim,a);const yaw=Math.atan2(anchor.normal.x,anchor.normal.z);
    for(let i=0;i<45;i++)tick(sim,a,{forward:1,yaw});for(let i=0;i<15;i++)tick(sim,a,{yaw});
    tick(sim,a,{climb:true,yaw});expect(a.climb).not.toBeNull();
    for(let i=0;i<22;i++)tick(sim,a,{climb:true,forward:1,yaw});expect(a.climb).not.toBeNull();
    tick(sim,a,{climb:true,jump:true,yaw});expect(a.climb).toBeNull();expect(a.velocity.y).toBeLessThan(4);
    for(let i=0;i<120;i++){tick(sim,a,{jump:true,forward:1,yaw});expect(a.climb).toBeNull();expect(a.position.y-1).toBeLessThan(anchor.position.y+anchor.height-4);}
    const normalDistance=(a.position.x-anchor.position.x)*anchor.normal.x+(a.position.z-anchor.position.z)*anchor.normal.z;
    expect(normalDistance).toBeGreaterThanOrEqual(radius-.025);expect(a.grounded||a.velocity.y<0).toBe(true);
  }));
});

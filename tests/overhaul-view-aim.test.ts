import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {emptyInput} from '../shared/types';
import {parseInput} from '../shared/protocol';
import {direction} from '../shared/math';
import {Simulation} from '../shared/simulation';
import {crosshairMuzzleAim} from '../src/game/camera/viewAim';

beforeAll(async()=>{await RAPIER.init();});
it('admits independent finite view yaw, retains legacy omission, rejects forged aim atomically',()=>{
  const source={...emptyInput(),seq:1,yaw:.4,aimYaw:-.8,forward:1,strafe:-1};
  expect(parseInput(source)).toMatchObject({yaw:.4,aimYaw:-.8,forward:1,strafe:-1});
  expect(parseInput({...emptyInput(),seq:1,yaw:1.2})?.aimYaw).toBe(1.2);
  for(const aimYaw of [NaN,Infinity,-Infinity,null,'1',{},[]])expect(parseInput({...source,aimYaw})).toBeNull();
  expect(parseInput({...source,aimYaw:Math.PI*4+.3})?.aimYaw).toBeCloseTo(.3,12);
  expect(emptyInput().aimYaw).toBeUndefined(); // Mutable bot inputs still follow their own yaw.
});
it('solves the real offset muzzle ray through the crosshair target in both stances',()=>{
  const root={x:-8,y:2,z:22};
  for(const stance of ['quadruped','upright'] as const)for(const target of [{x:10,y:5,z:-8},{x:-4,y:1,z:5},{x:7,y:12,z:30}]){
    const viewYaw=Math.atan2(root.x-target.x,root.z-target.z);
    const aim=crosshairMuzzleAim(root,stance,target,viewYaw,0),dir=direction(aim.yaw,aim.pitch),muzzle={x:root.x+dir.x*1.3,y:root.y+(stance==='upright'?1.65:.65),z:root.z+dir.z*1.3};
    expect(aim.reachable).toBe(true);
    const t=((target.x-muzzle.x)*dir.x+(target.y-muzzle.y)*dir.y+(target.z-muzzle.z)*dir.z);
    expect(Math.hypot(muzzle.x+dir.x*t-target.x,muzzle.y+dir.y*t-target.y,muzzle.z+dir.z*t-target.z)).toBeLessThan(1e-6);
  }
  expect(crosshairMuzzleAim(root,'quadruped',root,.2,.1)).toEqual({yaw:.2,pitch:.1,reachable:false});
  expect(crosshairMuzzleAim(root,'quadruped',{x:-8,y:400,z:18},.2,0)).toMatchObject({reachable:false,pitch:.75});
});
it('keeps forward muzzle aim when third-person cover is behind the pilot',()=>{
  const root={x:-8,y:0,z:13.3054};
  for(const stance of ['quadruped','upright'] as const){
    expect(crosshairMuzzleAim(root,stance,{x:-8,y:2,z:19.8},0,.1)).toEqual({yaw:0,pitch:.1,reachable:false});
    expect(crosshairMuzzleAim(root,stance,{x:-2,y:2,z:13.3054},0,.1)).toEqual({yaw:0,pitch:.1,reachable:false});
    expect(crosshairMuzzleAim(root,stance,{x:-14,y:2,z:13.3054},Math.PI/2,.1).reachable).toBe(true);
  }
});
it('native authority keeps identical movement while shooting and admitted strikes use the separate view',()=>{
  const worlds=[new RAPIER.World({x:0,y:-22,z:0}),new RAPIER.World({x:0,y:-22,z:0})],sims=worlds.map(w=>new Simulation(w,1926,'pvp'));
  try{
    for(const sim of sims)for(const actor of [...sim.actors.values()])sim.removeActor(actor.id);
    const actors=sims.map(sim=>sim.addActor('pilot','Pilot','pounce',false,{x:200,y:24,z:208}));
    let seq=0;
    const send=(index:number,extra={})=>{const actor=actors[index],input=parseInput({...emptyInput(),seq,jumpEpoch:actor.jumpEpoch,strikeEpoch:actor.jumpEpoch,yaw:0,...(index===1?{aimYaw:Math.PI/2}:{}),...extra});expect(input).not.toBeNull();sims[index].setInput(actor.id,input!);};
    for(let tick=0;tick<30;tick++){seq++;for(let i=0;i<2;i++){send(i,{forward:1});sims[i].step(1/60);}expect(actors[1].position).toEqual(actors[0].position);expect(actors[1].velocity).toEqual(actors[0].velocity);}
    expect(actors[0].aimYaw).toBe(0);expect(actors[1].aimYaw).toBe(Math.PI/2);
    seq++;for(let i=0;i<2;i++){send(i,{fire:true});sims[i].step(1/60);expect(sims[i].projectiles.length).toBeGreaterThan(0);}
    expect(sims[0].projectiles[0].velocity.z).toBeLessThan(0);expect(sims[0].projectiles[0].velocity.x).toBeCloseTo(0,10);
    expect(sims[1].projectiles[0].velocity.x).toBeLessThan(0);expect(sims[1].projectiles[0].velocity.z).toBeCloseTo(0,10);
    seq++;send(1,{strike:true,strikeId:1,boost:true});sims[1].step(1/60);
    expect(actors[1].strike?.direction.x).toBeCloseTo(-1,10);expect(actors[1].strike?.direction.z).toBeCloseTo(0,10);
  }finally{for(const sim of sims)sim.dispose();for(const world of worlds)world.free();}
});

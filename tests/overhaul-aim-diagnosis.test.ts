import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {PerspectiveCamera,Vector3} from 'three';
import {Simulation} from '../shared/simulation';
import {actorHullRadius,actorQuadHeight} from '../shared/config';
import {segmentCylinder} from '../shared/math';
import {cameraPose} from '../src/game/camera/framing';
import type {ActorState,WeaponId} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
const hostPosition={x:-.6703101354542754,y:.9401772206637543,z:-7.015223347520715};
const scoutPosition={x:-8.52717909924581,y:.9401412583633646,z:-10.883463151287588};
function arena(){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
  const host=sim.addActor('host','Host','pounce',false,hostPosition),scout=sim.addActor('scout','Scout','pounce',true,scoutPosition,'scout');host.stance='upright';sim.time=35;world.step();
  // Isolate actual production projectile acceptance/contact from AI movement,
  // replaying the exact saved source positions rather than modifying a browser run.
  const authority=sim as unknown as {shoot:(actor:ActorState,weapon:WeaponId)=>boolean;advanceProjectiles:(dt:number)=>void};
  const fire=()=>{expect(authority.shoot(host,'pulse')).toBe(true);for(let i=0;i<20;i++){sim.time+=1/60;authority.advanceProjectiles(1/60);}};
  return {world,sim,host,scout,fire,close:()=>{sim.dispose();world.free();}};
}
describe('mission001 native aiming diagnosis',()=>{
  it('reproduces the recorded floor miss at the stale aim without a weapon/contact defect',()=>{
    const run=arena();try{
      run.host.aimYaw=.7406199994564058;run.host.aimPitch=-.25963226703868364;run.fire();expect(run.scout.hp).toBe(95);
      const impact=run.sim.events.find(e=>e.type==='impact'&&e.actor==='host');expect(impact).toBeTruthy();expect(impact!.target).toBeUndefined();expect(impact!.position.y).toBeCloseTo(-.08,5);expect(impact!.position.x).toBeCloseTo(-8.300646,2);expect(impact!.position.z).toBeCloseTo(-15.361441,2);
    }finally{run.close();}
  });
  it('hits the same actual native scout hull when the current position is put on the camera crosshair',()=>{
    const run=arena();try{
      const {host,scout}=run,focus={...host.position,y:host.position.y+1.9},distance=10;
      const target={...scout.position,y:scout.position.y+.65},range=Math.hypot(target.x-host.position.x,target.z-host.position.z),r=(range+distance)/(distance+2);
      const orbitPitch=Math.asin((target.y-focus.y-4+4*r)/(-distance+r*(16+distance))),yaw=Math.atan2(host.position.x-target.x,host.position.z-target.z);
      const camera=new PerspectiveCamera(),look=new Vector3();cameraPose(focus,yaw,orbitPitch,distance,camera.position,look);camera.lookAt(look);camera.updateMatrixWorld();const ray=camera.getWorldDirection(new Vector3()),end=camera.position.clone().addScaledVector(ray,180);
      const half=actorQuadHeight(scout)/2,hit=segmentCylinder(camera.position,end,{...scout.position,y:scout.position.y+half-1},actorHullRadius(scout),half);expect(hit).not.toBeNull();
      const point=camera.position.clone().addScaledVector(ray,hit!*180),horizontal=Math.hypot(point.x-host.position.x,point.z-host.position.z);
      host.aimYaw=yaw;host.aimPitch=Math.atan2(point.y-host.position.y-1.65,Math.max(.1,horizontal-1.3));run.fire();expect(scout.hp).toBeLessThan(95);expect(run.sim.events.some(e=>e.type==='impact'&&e.target==='scout')).toBe(true);
    }finally{run.close();}
  });
});

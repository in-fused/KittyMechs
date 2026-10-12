import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {buildingFaces,facePoint} from '../shared/buildingSurfaces';
import {actorHullRadius} from '../shared/config';
import {buildingGripPose} from '../shared/buildingGrip';
import {cityDistrict} from '../shared/cityDistrict';
import {parseInput} from '../shared/protocol';
import {emptyInput,type InputState} from '../shared/types';

beforeAll(async()=>{await RAPIER.init();});
function fixture(wideEnd=false){
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp','TRAINING',RAPIER,{experimentalPhysicalRubble:true});
  const face=buildingFaces(7734).find(f=>f.buildingId.endsWith(':extension-0')&&f.side==='east')!,radius=actorHullRadius({chassis:'lynx',bot:false}),base=facePoint(face,wideEnd?face.width/2-radius-.3:0,face.minY+1);
  const climber=sim.addActor('climber','Climb policy','lynx',false,{x:base.x+face.normal.x*(radius+.09),y:base.y,z:base.z+face.normal.z*(radius+.09)});
  const cell=cityDistrict(7734)!.structures[0].cells[3],shooter=sim.addActor('shooter','Remote pulse','pounce',false,{x:123,y:.92,z:cell.position[2]});let seq=0;
  const physics=(sim as unknown as {physics:Map<string,{controller:RAPIER.KinematicCharacterController}>}).physics,controller=physics.get(climber.id)!.controller;
  const original={impulses:controller.applyImpulsesToDynamicBodies(),mass:controller.characterMass(),dynamicStep:controller.autostepIncludesDynamicBodies()};
  const step=(climb:Partial<InputState>={},fire=false)=>{
    seq++;for(const [actor,patch] of [[climber,{yaw:Math.atan2(face.normal.x,face.normal.z),...climb}],[shooter,{yaw:Math.PI/2,fire}]] as const){const input=parseInput({...emptyInput(),seq,jumpEpoch:actor.jumpEpoch,...patch});expect(input).not.toBeNull();sim.setInput(actor.id,input!);}sim.step(1/60);
  };
  for(let i=0;i<45;i++)step();
  const breakRemote=()=>{for(let i=0;i<180&&!sim.events.some(e=>e.type==='structure-break');i++)step({climb:!!climber.climb},true);expect(sim.events.some(e=>e.type==='structure-break')).toBe(true);step({climb:!!climber.climb});expect(sim.rubble).toHaveLength(8);};
  const close=()=>{sim.dispose();world.free();};return {sim,world,face,climber,controller,original,step,breakRemote,close};
}
// Real supported approaches and remote parsed weapon damage. Native setting
// reads observe the actual controller; no actor/mask/hull/control policy forges.
describe('rubble preserves native climb and controller mode ownership',()=>{
  it('activation and final expiry preserve a qualified wide-end climb, then detach restores normal mode',()=>{
    // Same previously qualified wide-end approach as universal-climb-authority.
    // Earlier fixtures stopped during the activation blend and held Cling,
    // then incorrectly expected Climb. Both failures remain in checks-002/003.
    const f=fixture(true);try{
      for(let i=0;i<90&&f.climber.climb?.phase!=='climb';i++)f.step({climb:true,forward:1});expect(f.climber.climb?.phase).toBe('climb');expect(f.controller.autostepEnabled()).toBe(false);
      for(let i=0;i<30&&f.sim.time-f.climber.climb!.startedAt<.16;i++)f.step({climb:true,forward:1});expect(f.climber.climb?.phase).toBe('climb');
      for(let i=0;i<15;i++)f.step({climb:true});const held=f.climber.position.y,started=f.climber.climb!.startedAt;
      expect(f.climber.climb!.phase).toBe('climb');
      f.breakRemote();expect(f.controller.autostepEnabled()).toBe(false);expect(f.controller.characterMass()).toBe(1800);
      const expires=f.sim.rubble[0].expires;
      while(f.sim.time<=expires+1/60){f.step({climb:true});expect(f.climber.climb?.phase).toBe('climb');expect(f.climber.climb!.startedAt).toBe(started);expect(f.climber.climb!.gripMask).not.toBe(0);expect(f.controller.autostepEnabled()).toBe(false);expect(f.climber.position.y).toBeCloseTo(held,6);}
      expect(f.sim.rubble).toEqual([]);expect(f.controller.characterMass()).toBe(f.original.mass);expect(f.controller.applyImpulsesToDynamicBodies()).toBe(f.original.impulses);
      f.step();expect(f.climber.climb).toBeNull();expect(f.controller.autostepEnabled()).toBe(true);expect(f.controller.autostepIncludesDynamicBodies()).toBe(true);
    }finally{f.close();}
  },30000);
  it('normal mode can attach, mantle and detach while remote rubble stays active',()=>{
    const f=fixture();try{
      f.breakRemote();expect(f.controller.autostepEnabled()).toBe(true);expect(f.controller.autostepIncludesDynamicBodies()).toBe(false);
      let attached=false,completed=false;const stages=new Set<string>(),roofStages=new Set<string>();
      for(let i=0;i<420;i++){
        f.step({climb:true,forward:1});const state=f.climber.climb;
        if(state){attached=true;expect(f.controller.autostepEnabled()).toBe(false);if(state.mantleStage)stages.add(state.mantleStage);if(state.phase!=='grab'&&!state.mantleStage)expect(state.gripMask).not.toBe(0);
          if(state.roofMask&&state.mantleStage){roofStages.add(state.mantleStage);const pose=buildingGripPose(f.climber,state,f.sim.time,(f.sim as unknown as {gripAdjustments:{wall:number[];roof:number[]}}).gripAdjustments);for(let paw=0;paw<4;paw++)if(state.roofMask&(1<<paw)){expect(pose.roof[paw].targetReach).toBeLessThanOrEqual(.98);expect(pose.roof[paw].reach).toBeLessThanOrEqual(.98);for(const corner of pose.roof[paw].corners)expect(corner.y-state.top).toBeGreaterThanOrEqual(.00399);}}
        }
        else if(attached){completed=f.climber.position.y>f.face.roofCenter.y+.8;break;}
      }
      expect(attached).toBe(true);expect(completed).toBe(true);expect(stages.has('transfer')).toBe(true);expect(stages.has('settle')).toBe(true);expect(roofStages.has('transfer')).toBe(true);expect(roofStages.has('settle')).toBe(true);expect(f.sim.rubble.length).toBeGreaterThan(0);expect(f.controller.autostepEnabled()).toBe(true);expect(f.controller.autostepIncludesDynamicBodies()).toBe(false);
      for(let i=0;i<30;i++)f.step();expect(f.climber.grounded).toBe(true);
      const dx=f.climber.position.x-f.face.roofCenter.x,dz=f.climber.position.z-f.face.roofCenter.z,c=Math.cos(f.face.yaw),s=Math.sin(f.face.yaw),radius=actorHullRadius(f.climber);
      expect(Math.abs(dx*c-dz*s)+radius).toBeLessThanOrEqual(f.face.roofHalfExtents.x);expect(Math.abs(dx*s+dz*c)+radius).toBeLessThanOrEqual(f.face.roofHalfExtents.z);
      while(f.sim.rubble.length)f.step();expect(f.controller.autostepEnabled()).toBe(true);expect(f.controller.autostepIncludesDynamicBodies()).toBe(f.original.dynamicStep);expect(f.controller.characterMass()).toBe(f.original.mass);expect(f.controller.applyImpulsesToDynamicBodies()).toBe(f.original.impulses);
    }finally{f.close();}
  },30000);
});

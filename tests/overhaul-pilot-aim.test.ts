import {describe,expect,it} from 'vitest';
import type {ActorState} from '../shared/types';
import {pilotAim,pilotGunAligned,pilotLatency} from '../tools/overhaul-pilot-aim';

// Mission008 tracked bot-0 round2, snapshot 53.3667. These recorded bodies,
// camera controls and accepted gun command stay separate: the latter is delayed.
const actor={position:{x:-9.747165150880402,y:.9400999582666555,z:-34.242190063125605},aimYaw:-.11909644441518298,aimPitch:-.047601739224046466,stance:'upright'} as ActorState;
const enemy={position:{x:-13.478773037045293,y:.940099985638808,z:-61.89224930662807},velocity:{x:-.027813678839258022,y:0,z:.026802892110339385},bot:true,role:'scout',chassis:'pounce',stance:'quadruped',stanceChangedAt:-100,climb:null,climbDetachedAt:-100} as ActorState;
const camera={lookYaw:.0881600001811986,lookPitch:.1034499994754791,focus:{x:actor.position.x,y:2.8400999420267183,z:actor.position.z},fitDistance:10.931137110002904,preferredDistance:10};

describe('ordinary pilot camera feedback and accepted gun gating',()=>{
  it('steers the recorded current camera error rather than the delayed authority gun error',()=>{
    const correction=pilotAim(actor,enemy,camera,0);
    expect(correction.yaw).toBeCloseTo(.134,2);expect(correction.dyaw).toBeGreaterThan(0);expect(correction.dyaw).toBeLessThan(.05);
    expect(correction.yaw-actor.aimYaw).toBeGreaterThan(.25);
    expect(pilotGunAligned(actor,enemy,correction.target,53.3667)).toBe(false);
    // Changing a delayed gun field cannot change the IJKL turn instruction.
    expect(pilotAim({...actor,aimYaw:.6},enemy,camera,0).dyaw).toBe(correction.dyaw);
  });
  it('rejects the accepted eastbound shot and accepts an actual ray through the same westbound native hull',()=>{
    const target=pilotAim(actor,enemy,camera,0).target;
    const savedShot={...actor,aimYaw:Math.atan2(-31.35812473179266,100.04039515945341),aimPitch:Math.asin(-5.795459399024748/105)};
    expect(pilotGunAligned(savedShot,enemy,target,53.3667)).toBe(false);
    const yaw=Math.atan2(actor.position.x-target.x,actor.position.z-target.z);
    // This is a normal barrel command through the hull, not an input mutation.
    expect(pilotGunAligned({...actor,aimYaw:yaw,aimPitch:-.04},enemy,target,53.3667)).toBe(true);
  });
  it('uses normal pulse flight time and bounded measured snapshot delay without wall time drift',()=>{
    const delay=pilotLatency(0,52,52.145,45);expect(delay).toBeCloseTo(.05,8);
    const correction=pilotAim(actor,enemy,camera,delay),range=Math.hypot(actor.position.x-enemy.position.x,actor.position.z-enemy.position.z);
    expect(correction.lead).toBeCloseTo(range/105+.05,8);
    expect(pilotLatency(.25,1,100,45)).toBe(.25);expect(pilotLatency(0,10,9,45)).toBe(0);
  });
});

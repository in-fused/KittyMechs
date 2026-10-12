import { describe, expect, it, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { createQuadrupedTravel, distancePhase, gaitWeights, pawSupport, quadrupedTravel, turnPose, createTurnPose } from '../src/game/entities/felineMotion';
import { createRenderTimeline, pushRenderSample, sampleRenderTimeline } from '../src/game/entities/renderTimeline';
import type { ActorState, Chassis } from '../shared/types';
import { MECHS } from '../shared/config';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));

const chassis:Chassis[]=['pounce','bastion','lynx','caracal'];
describe('quadruped realized presentation travel',()=>{
  it('measures stable displayed speed across 33/100/300ms frames without inventing a faster gait',()=>{
    for(const intervals of [[.1],[.3],[.033,.1,.033,.3]]){
      const travel=createQuadrupedTravel();let z=0;
      quadrupedTravel(0,z,0,intervals[0],true,true,travel);
      for(let frame=0;frame<120;frame++){
        // Same contract as Actors: raw elapsed duration measures the complete
        // displayed displacement; animation/contact updates use min(dt,.05).
        const elapsed=intervals[frame%intervals.length];z-=3*elapsed;
        quadrupedTravel(0,z,0,elapsed,true,false,travel);
      }
      expect(travel.speed).toBeCloseTo(3,10);expect(travel.active).toBe(true);
      for(const c of chassis){const actual=gaitWeights(travel.speed,MECHS[c].speed,true),expected=gaitWeights(3,MECHS[c].speed,true);
        expect(actual.walk).toBeCloseTo(expected.walk,10);expect(actual.trot).toBeCloseTo(expected.trot,10);expect(actual.gallop).toBeCloseTo(expected.gallop,10);
      }
    }
  });

  it('bounds long-frame smoothing while held packets stop and reset jumps never become gait travel',()=>{
    const travel=createQuadrupedTravel();quadrupedTravel(0,0,0,.3,true,true,travel);
    quadrupedTravel(0,-.9,0,.3,true,false,travel);
    expect(travel.speed).toBeCloseTo(3*(1-Math.exp(-.05*14)),12);
    let z=-.9,phase=.2;
    for(let frame=0;frame<90;frame++){
      const elapsed=frame%2?.1:.033,distance=frame<30?3*elapsed:0;z-=distance;
      quadrupedTravel(0,z,0,elapsed,true,false,travel);phase=distancePhase(phase,distance,1.5);
    }
    expect(travel.active).toBe(false);expect(travel.speed).toBeLessThan(.000001);
    const heldPhase=phase;quadrupedTravel(0,z,0,.3,true,false,travel);phase=distancePhase(phase,0,1.5);expect(phase).toBe(heldPhase);
    quadrupedTravel(500,500,0,.3,true,true,travel);expect(travel.speed).toBe(0);expect(travel.strafe).toBe(0);
    quadrupedTravel(500,500,0,.1,true,false,travel);expect(travel.active).toBe(false);
  });

  it('settles a genuinely Rapier-blocked constant movement command to idle',async()=>{
    await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
    world.createCollider(RAPIER.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1,0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(2,2,.1).setTranslation(0,2,-2));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.51,0));
    const collider=world.createCollider(RAPIER.ColliderDesc.ball(.5),body),controller=world.createCharacterController(.01);
    const travel=createQuadrupedTravel(),dt=1/60,commandSpeed=4.8;
    quadrupedTravel(0,0,0,dt,true,true,travel);
    let actualDistance=0,phase=.37,blockedPhase=0,seenMoving=false;
    try{
      for(let frame=0;frame<180;frame++){
        controller.computeColliderMovement(collider,{x:0,y:0,z:-commandSpeed*dt});
        const movement=controller.computedMovement(),position=body.translation();
        body.setNextKinematicTranslation({x:position.x+movement.x,y:position.y+movement.y,z:position.z+movement.z});world.timestep=dt;world.step();
        const next=body.translation(),realizedDistance=Math.hypot(next.x-position.x,next.z-position.z);actualDistance+=realizedDistance;
        quadrupedTravel(next.x,next.z,0,dt,true,false,travel);
        phase=distancePhase(phase,realizedDistance,1.5);
        seenMoving ||= travel.speed>3;
        // The rounded controller finishes sub-millimetre depenetration after
        // reaching the wall; only the actually held position must freeze phase.
        if(frame===160)blockedPhase=phase;
      }
      expect(seenMoving).toBe(true);expect(actualDistance).toBeGreaterThan(1);
      expect(actualDistance).toBeLessThan(1.5);expect(travel.active).toBe(false);expect(travel.speed).toBeLessThan(.000001);
      expect(phase).toBe(blockedPhase);expect(travel.strafe).toBeCloseTo(0,8);
      for(const c of chassis){const corrected=gaitWeights(travel.active?travel.speed:0,MECHS[c].speed,true);
        expect(corrected.idle).toBe(1);expect(corrected.gallop).toBe(0);
        // Retained commanded speed alone still chooses a moving pose at the wall.
        expect(gaitWeights(commandSpeed,MECHS[c].speed,true).idle).toBe(0);
      }
    }finally{world.free();}
  });

  it('uses buffered displayed segments and fades on a held packet without advancing a footfall',()=>{
    const track=createRenderTimeline(),travel=createQuadrupedTravel();
    const actor={id:'pilot',hp:100,position:{x:0,y:1,z:0},velocity:{x:0,y:0,z:-8},yaw:0,climb:null} as ActorState;
    pushRenderSample(track,actor,0);pushRenderSample(track,{...actor,position:{x:0,y:1,z:-.4}},.05);
    let phase=.23,position=-.4,heldPhase=0;
    for(let frame=0;frame<150;frame++){
      const sample=sampleRenderTimeline(track,frame,1/60,.2,.1)!;
      quadrupedTravel(sample.position.x,sample.position.z,sample.yaw,1/60,true,sample.reset,travel);
      phase=distancePhase(phase,sample.distance,1.5);
      if(frame===30){heldPhase=phase;position=sample.position.z;}
      if(frame>30)expect(sample.distance).toBe(0);
    }
    expect(track.output.position.z).toBe(position);expect(phase).toBe(heldPhase);
    expect(travel.active).toBe(false);expect(travel.speed).toBeLessThan(.000001);
  });

  it('holds the hysteresis band without rearming noise, then allows a genuine fresh start',()=>{
    const travel=createQuadrupedTravel(),dt=1/60;let x=0;
    quadrupedTravel(x,0,0,dt,true,true,travel);
    for(let i=0;i<90;i++){x+=.065*dt;quadrupedTravel(x,0,0,dt,true,false,travel);}
    expect(travel.active).toBe(false);
    for(let i=0;i<60;i++){x+=.3*dt;quadrupedTravel(x,0,0,dt,true,false,travel);}
    expect(travel.active).toBe(true);
    for(let i=0;i<90;i++){x+=.065*dt;quadrupedTravel(x,0,0,dt,true,false,travel);}
    expect(travel.active).toBe(true);
    for(let i=0;i<60;i++)quadrupedTravel(x,0,0,dt,true,false,travel);
    expect(travel.active).toBe(false);
  });

  it('derives lean direction from displayed strafe/reversal, not stale requested heading',()=>{
    const travel=createQuadrupedTravel(),dt=1/60;let x=0;
    quadrupedTravel(x,0,0,dt,true,true,travel);
    for(let i=0;i<60;i++){x+=2*dt;quadrupedTravel(x,0,0,dt,true,false,travel);}
    expect(travel.strafe).toBeCloseTo(2,4);expect(travel.speed).toBeCloseTo(2,4);
    for(let i=0;i<60;i++){x-=2*dt;quadrupedTravel(x,0,0,dt,true,false,travel);}
    expect(travel.strafe).toBeCloseTo(-2,4);expect(travel.speed).toBeCloseTo(2,4);
    for(let i=0;i<60;i++)quadrupedTravel(x,0,0,dt,true,false,travel);
    expect(Math.abs(travel.strafe)).toBeLessThan(.00001);
  });

  it('clears air/form/climb/death/teleport history without feeding a displacement spike into gait',()=>{
    const travel=createQuadrupedTravel(),dt=1/60;
    quadrupedTravel(0,0,0,dt,true,true,travel);quadrupedTravel(.1,0,0,dt,true,false,travel);
    expect(travel.active).toBe(true);
    for(const allowed of [false,false,false,false]){
      quadrupedTravel(100,200,0,dt,allowed,false,travel);
      expect(travel.speed).toBe(0);expect(travel.strafe).toBe(0);expect(travel.active).toBe(false);
    }
    quadrupedTravel(100,200,0,dt,true,false,travel);expect(travel.speed).toBe(0);
    quadrupedTravel(-100,-200,0,dt,true,true,travel);expect(travel.speed).toBe(0);
    quadrupedTravel(-100,-200,0,dt,true,false,travel);expect(travel.speed).toBe(0);
  });

  it('keeps raised gait support released during the stop fade and preserves angular stepping',()=>{
    for(const c of chassis){
      const weights={idle:.9,walk:0,trot:0,gallop:.1,air:0},phase=.7;
      const stationary=weights.walk+weights.trot+weights.gallop<.001;
      expect(pawSupport(c,'FL',phase,weights,false,undefined,stationary)).toBe(0);
      const turn=createTurnPose();turnPose(c,.1,0,MECHS[c].speed,1/60,true,false,turn);
      expect(turn.phase).toBeGreaterThan(0);expect(turn.weight).toBeGreaterThan(0);
      const held=turn.phase;turnPose(c,0,0,MECHS[c].speed,1/60,true,false,turn);expect(turn.phase).toBe(held);
    }
  });

  it('bounds corrected velocity and keeps its pooled result through bad samples',()=>{
    const travel=createQuadrupedTravel();quadrupedTravel(0,0,0,1/60,true,true,travel);
    expect(quadrupedTravel(20,-20,0,1/60,true,false,travel)).toBe(travel);
    expect(travel.speed).toBeLessThanOrEqual(25);expect(Math.abs(travel.strafe)).toBeLessThanOrEqual(travel.speed);
    quadrupedTravel(NaN,0,0,1/60,true,false,travel);expect(travel.initialized).toBe(false);expect(travel.active).toBe(false);
    quadrupedTravel(20,-20,0,1/60,true,false,travel);expect(travel.speed).toBe(0);
  });
});

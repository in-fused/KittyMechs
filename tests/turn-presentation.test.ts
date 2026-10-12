import { describe, expect, it, vi } from 'vitest';
import type { ActorState } from '../shared/types';
import { createRenderTimeline, pushRenderSample, sampleRenderTimeline } from '../src/game/entities/renderTimeline';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));

const actor=(yaw:number):ActorState=>({
  id:'turn',name:'Turn',chassis:'lynx',bot:false,position:{x:0,y:1,z:0},velocity:{x:0,y:0,z:0},yaw,aimYaw:yaw,aimPitch:0,
  hp:100,maxHp:100,energy:100,heat:0,kills:0,salvage:0,grounded:true,boostUntil:0,shieldUntil:0,windupUntil:0,
  abilityReadyAt:0,rocketReadyAt:0,stance:'quadruped',stanceChangedAt:-100,climb:null,climbDetachedAt:-100,
  pulseAt:-100,rocketAt:-100,abilityAt:-100,hurtAt:-100,diedAt:-100,disruptedUntil:0,respawnAt:0,hitAt:-100,fireAt:-100,aiState:'patrol',lastInput:0,jumpEpoch:1,strikeProcessed:0,strikeEndedAt:-100,strike:null,jumpProcessed:0,
});

describe('presented feline turn travel',()=>{
  it('follows stationary heading over jittered 20Hz packets without inventing translation',()=>{
    const track=createRenderTimeline();let packet=0,arrival=0,total=0,previousYaw=0;
    const increments:number[]=[];
    for(let frame=0;frame<=156;frame++){
      const now=frame/120;
      while(packet<=20&&packet*.05+[0,.02,0,.028,.01][packet%5]<=now+1e-9){
        arrival=packet*.05+[0,.02,0,.028,.01][packet%5];pushRenderSample(track,actor(packet*.075),packet*.05);packet++;
      }
      const pose=sampleRenderTimeline(track,frame,1/120,now-arrival,.1)!;
      expect(pose.distance).toBe(0);expect(pose.angularDistance).toBeGreaterThanOrEqual(-1e-9);
      if(!pose.reset)expect(pose.angularDistance).toBeCloseTo(pose.yaw-previousYaw,10);
      if(frame>24&&frame<110)increments.push(pose.angularDistance);
      total+=pose.angularDistance;previousYaw=pose.yaw;
    }
    expect(Math.min(...increments)).toBeGreaterThan(.008);
    expect(Math.max(...increments)).toBeLessThan(.016);
    expect(total).toBeCloseTo(1.5,8);
    expect(sampleRenderTimeline(track,157,1/120,.3,.1)!.angularDistance).toBe(0);
  });

  it('takes the short signed turn across the heading wrap in both directions',()=>{
    for(const sign of [-1,1]){
      const track=createRenderTimeline();pushRenderSample(track,actor(sign*(Math.PI-.1)),0);
      sampleRenderTimeline(track,0,0,0,0);
      pushRenderSample(track,actor(-sign*(Math.PI-.1)),.05);
      const pose=sampleRenderTimeline(track,1,.05,0,0)!;
      expect(pose.angularDistance).toBeCloseTo(sign*.2,10);
      expect(pose.distance).toBe(0);
    }
  });

  it('holds turn travel once the last confirmed heading is reached and shares the camera sample',()=>{
    const track=createRenderTimeline();pushRenderSample(track,actor(0),0);sampleRenderTimeline(track,0,0,0,0);
    pushRenderSample(track,actor(.5),.05);
    const pose=sampleRenderTimeline(track,1,.05,0,0)!;
    expect(pose.angularDistance).toBeCloseTo(.5);
    const camera=sampleRenderTimeline(track,1,.05,0,0)!;
    expect(camera).toBe(pose);expect(camera.angularDistance).toBeCloseTo(.5);
    for(let frame=2;frame<240;frame++){
      const held=sampleRenderTimeline(track,frame,1/60,.5,0)!;
      expect(held.angularDistance).toBe(0);expect(held.yaw).toBeCloseTo(.5);expect(held.distance).toBe(0);
    }
  });

  it('clears angular travel on teleports, death, respawn and long packet gaps',()=>{
    const track=createRenderTimeline();pushRenderSample(track,actor(0),0);sampleRenderTimeline(track,0,0,0,0);
    const teleport=actor(2);teleport.position.x=50;pushRenderSample(track,teleport,.05);
    const reset=sampleRenderTimeline(track,1,.05,0,0)!;expect(reset.reset).toBe(true);expect(reset.angularDistance).toBe(0);
    const dead=actor(-1);dead.position.x=50;dead.hp=0;pushRenderSample(track,dead,.1);
    expect(sampleRenderTimeline(track,2,.05,0,0)!.angularDistance).toBe(0);
    const respawn=actor(1);pushRenderSample(track,respawn,.15);
    expect(sampleRenderTimeline(track,3,.05,0,0)!.angularDistance).toBe(0);
    pushRenderSample(track,actor(-2),1);
    const afterGap=sampleRenderTimeline(track,4,.05,0,0)!;expect(afterGap.reset).toBe(true);expect(afterGap.angularDistance).toBe(0);
  });
});

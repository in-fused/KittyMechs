import {describe,expect,it,vi} from 'vitest';
import type {ActorState} from '../shared/types';
import {createRenderTimeline,pushRenderSample,sampleRenderTimeline} from '../src/game/entities/renderTimeline';
import {groundContactAllowed} from '../src/game/entities/pawContact';
vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));

function actor(grounded:boolean,y=1,epoch=1):ActorState {
  return {id:'air-pilot',hp:100,jumpEpoch:epoch,grounded,position:{x:0,y,z:0},velocity:{x:0,y:grounded?0:10.5,z:0},yaw:0,climb:null,strike:null} as ActorState;
}
function bracket(from:ActorState,to:ActorState,at:number){
  const track=createRenderTimeline();pushRenderSample(track,from,1);pushRenderSample(track,to,1.05);track.initialized=true;track.clock=at;
  return {track,pose:sampleRenderTimeline(track,0,0,0,0)!};
}
const contact=(grounded:boolean)=>groundContactAllowed(true,grounded,false,0,2,-100,.7,-100,.3);

describe('ground ownership follows the displayed confirmed trajectory',()=>{
  it('releases contact as the body rises between grounded and airborne packets without mutating authority state',()=>{
    const from=actor(true),to=actor(false,1.48),{track,pose}=bracket(from,to,1.025);
    expect(pose.position.y).toBeCloseTo(1.24);expect(pose.state.grounded).toBe(true);
    expect(pose.grounded).toBe(false);expect(contact(pose.grounded)).toBe(false);
    expect(from.grounded).toBe(true);expect(to.grounded).toBe(false);expect(track.samples[0].state?.grounded).toBe(true);
  });
  it('keeps exact last ground support before the segment begins and never reacquires it inside takeoff',()=>{
    const {track,pose}=bracket(actor(true),actor(false,1.48),1);expect(pose.grounded).toBe(true);expect(contact(pose.grounded)).toBe(true);
    for(let i=1;i<=12;i++){track.clock=1+i/240;const frame=sampleRenderTimeline(track,i,0,0,0)!;expect(frame.grounded).toBe(false);expect(contact(frame.grounded)).toBe(false);}
  });
  it('releases a confirmed walk-off edge even when interpolated velocity points down',()=>{
    const falling=actor(false,.76);falling.velocity.y=-4;const {pose}=bracket(actor(true),falling,1.0125);
    expect(pose.position.y).toBeCloseTo(.94);expect(pose.velocity.y).toBeCloseTo(-1);expect(pose.grounded).toBe(false);
  });
  it('does not plant a descending pose before the confirmed landing endpoint',()=>{
    const falling=actor(false,1.42);falling.velocity.y=-5;const {track,pose}=bracket(falling,actor(true),1.025);
    expect(pose.position.y).toBeCloseTo(1.21);expect(pose.grounded).toBe(false);
    track.clock=1.05;const landed=sampleRenderTimeline(track,1,0,0,0)!;expect(landed.position.y).toBe(1);expect(landed.grounded).toBe(true);expect(contact(landed.grounded)).toBe(true);
  });
  it('retains grounded slope travel when both confirmed samples have native support',()=>{
    const {pose}=bracket(actor(true),actor(true,1.04),1.025);expect(pose.position.y).toBeCloseTo(1.02);expect(pose.grounded).toBe(true);
  });
  it('holds the last known grounded or airborne sample without inventing an unconfirmed takeoff or landing',()=>{
    for(const grounded of [false,true]){
      const track=createRenderTimeline();pushRenderSample(track,actor(grounded),1);const first=sampleRenderTimeline(track,0,0,0,.1)!;
      expect(first.grounded).toBe(grounded);
      for(let frame=1;frame<=30;frame++){const held=sampleRenderTimeline(track,frame,1/60,.2,.1)!;expect(held.grounded).toBe(grounded);expect(held.position.y).toBe(1);}
    }
  });
  it('overwrites the pooled ground flag on a new life and caches body/camera ownership on the same frame',()=>{
    const {track}=bracket(actor(true),actor(false,1.48),1.025);pushRenderSample(track,actor(true,1,2),1.1);
    const reset=sampleRenderTimeline(track,1,0,0,.1)!;expect(reset.reset).toBe(true);expect(reset.grounded).toBe(true);
    const camera=sampleRenderTimeline(track,1,1/60,.2,.1)!;expect(camera).toBe(reset);expect(camera.grounded).toBe(true);
  });
  it.each(['death','teleport','rewind','packet gap'] as const)('clears stale air ownership on a %s reset without inventing travel',kind=>{
    const {track}=bracket(actor(true),actor(false,1.48),1.025),next=actor(true);let time=1.1;
    if(kind==='death')next.hp=0;
    if(kind==='teleport')next.position.x=30;
    if(kind==='rewind')time=.9;
    if(kind==='packet gap')time=2;
    pushRenderSample(track,next,time);const reset=sampleRenderTimeline(track,1,1/60,.2,.1)!;
    expect(reset.reset).toBe(true);expect(reset.grounded).toBe(true);expect(reset.position).toEqual(next.position);expect(reset.distance).toBe(0);expect(reset.angularDistance).toBe(0);
  });
  it('retires takeoff anchors and waits for landing through monotonic 120Hz presentation of 20Hz confirmations',()=>{
    const track=createRenderTimeline();pushRenderSample(track,actor(true),0);let next=.05,frame=0,ascendingSamples=0,landingSamples=0;
    for(let now=0;now<.5;now+=1/120){
      if(now+1e-9>=next){const airborne=next>=.1&&next<.3,y=airborne?1+Math.sin((next-.05)/.25*Math.PI)*.35:1;pushRenderSample(track,actor(!airborne,y),next);next+=.05;}
      const pose=sampleRenderTimeline(track,frame++,1/120,0,.1)!;
      if(pose.time>.05&&pose.time<.1&&pose.position.y>1){ascendingSamples++;expect(pose.state.grounded).toBe(true);expect(pose.grounded).toBe(false);expect(contact(pose.grounded)).toBe(false);}
      if(pose.time>.25&&pose.time<.3){landingSamples++;expect(pose.grounded).toBe(false);}
    }
    expect(ascendingSamples).toBeGreaterThan(2);expect(landingSamples).toBeGreaterThan(2);
  });
});

import {describe,expect,it,vi} from 'vitest';
import type {ActorState,Chassis,MechStance} from '../shared/types';
import {clamp} from '../shared/math';
import {displayedYawRate,signedAngle} from '../src/game/entities/felineMotion';
import {createRenderTimeline,pushRenderSample,sampleRenderTimeline} from '../src/game/entities/renderTimeline';

vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));

const chassis=['pounce','bastion','lynx','caracal'] as const;
const stances=['quadruped','upright'] as const;
const intervals={hz60:[1/60],hz30:[1/30],ms100:[.1],ms300:[.3],jitter:[1/60,.1,1/30,.3,.025]} as const;

// Controlled confirmed packets, not a native trajectory or browser capture.
// Turn direction reverses and crosses the +/-pi boundary. Every rate assertion
// uses the actual sampled segment, never assumed authority speed * elapsed.
function actor(c:Chassis,stance:MechStance,time:number):ActorState {
  return {id:'reaction-pilot',chassis:c,hp:100,grounded:true,jumpEpoch:0,
    stance,stanceChangedAt:-100,position:{x:.6*time,y:1,z:0},
    velocity:{x:.6,y:0,z:0},yaw:signedAngle(Math.PI-.03+.18*Math.sin(3*time)),
    climb:null,strike:null,strikeEndedAt:-100} as ActorState;
}

describe('torso/tail measured signed yaw rate keeps elapsed separate from cosmetic filtering',()=>{
  for(const c of chassis)for(const stance of stances)for(const [name,schedule] of Object.entries(intervals)){
    it(`${c} ${stance}: actual ${name} local/guest displayed turns drive finite signed reactions`,()=>{
      for(const delay of [1/60,.1]){
        const track=createRenderTimeline();let time=0,packet=0,yaw=0,lean=0,oldLean=0;
        let positive=0,negative=0,long=0,wraps=0;
        pushRenderSample(track,actor(c,stance,0),0);
        for(let frame=0;frame<96;frame++){
          const elapsed=schedule[frame%schedule.length],dt=Math.min(elapsed,.05);
          time+=elapsed;
          while((packet+1)/60<=time+1e-10){packet++;pushRenderSample(track,actor(c,stance,packet/60),packet/60);}
          const sample=sampleRenderTimeline(track,frame,dt,0,delay)!;
          if(sample.reset){yaw=sample.yaw;lean=0;oldLean=0;}
          const delta=sample.yaw-yaw,rate=displayedYawRate(delta,elapsed);
          const oldRate=clamp(signedAngle(delta)/Math.max(dt,.001),-3,3);
          expect(signedAngle(delta)).toBeCloseTo(sample.angularDistance,12);
          if(Math.abs(delta)>Math.PI)wraps++;
          if(rate>1e-8)positive++;if(rate<-1e-8)negative++;
          // The signed integrated rate reconstructs the returned segment when
          // unsaturated; a full interval cannot invent the cap's extra travel.
          expect(Math.abs(rate)).toBeLessThan(3);
          expect(rate*elapsed).toBeCloseTo(sample.angularDistance,12);
          const strafe=0,speed=.6;
          const target=clamp(-strafe*.018-rate*speed*.009,-.13,.13);
          const oldTarget=clamp(-strafe*.018-oldRate*speed*.009,-.13,.13);
          const blend=1-Math.exp(-dt*14);
          lean+=(target-lean)*blend;oldLean+=(oldTarget-oldLean)*blend;
          const stanceAmount=stance==='upright'?1:0;
          const bodyRoll=lean*(1-stanceAmount*.4);
          const tail=Array.from({length:4},(_,i)=>(-rate*.022-lean*.16)*(1-i*.12));
          expect([rate,target,lean,bodyRoll,...tail].every(Number.isFinite)).toBe(true);
          expect(Math.abs(target)).toBeLessThanOrEqual(.13);
          if(rate!==0){expect(Math.sign(target)).toBe(-Math.sign(rate));
            expect(Math.sign(-rate*.022)).toBe(-Math.sign(rate));}
          if(elapsed<=.05){expect(rate).toBe(oldRate);expect(target).toBe(oldTarget);}
          else if(rate!==0){long++;
            // Buffered clock catch-up can saturate the old 3 rad/s cap. The
            // inflation ratio is exact only before that old saturation.
            if(Math.abs(signedAngle(delta))/dt<3)expect(rate).toBeCloseTo(oldRate*dt/elapsed,12);
            expect(Math.abs(target)).toBeLessThan(Math.abs(oldTarget));
          }
          if(!schedule.some(value=>value>.05))expect(lean).toBe(oldLean);
          yaw=sample.yaw;
        }
        expect(positive).toBeGreaterThan(0);expect(negative).toBeGreaterThan(0);
        expect(wraps).toBeGreaterThan(0);
        if(schedule.some(value=>value>.05))expect(long).toBeGreaterThan(0);
      }
    });
  }

  it('preserves the old shortest-angle expression through 50 ms, with bounded rates and invalid input safety',()=>{
    for(const elapsed of [.0001,.001,1/60,1/30,.05])for(const angle of [-8,-Math.PI,-.02,0,.02,Math.PI,8]){
      expect(displayedYawRate(angle,elapsed)).toBe(clamp(signedAngle(angle)/Math.max(elapsed,.001),-3,3));
    }
    expect(displayedYawRate(.0005,.0001)).toBeCloseTo(.5,15);
    expect(displayedYawRate(.004,.001)).toBe(3);
    expect(displayedYawRate(-.004,.001)).toBe(-3);
    for(const angle of [NaN,Infinity,-Infinity])expect(displayedYawRate(angle,.1)).toBe(0);
    for(const elapsed of [NaN,Infinity,-Infinity,0,-.1])expect(displayedYawRate(.1,elapsed)).toBe(0);
  });

  for(const c of chassis)for(const stance of stances){
    it(`${c} ${stance}: actual held output and discontinuity reset cannot create torso/tail yaw impulses`,()=>{
      const track=createRenderTimeline();let yaw=0,lean=0,held=0;
      pushRenderSample(track,actor(c,stance,0),0);pushRenderSample(track,actor(c,stance,.1),.1);
      for(let frame=0;frame<100;frame++){
        const elapsed=frame%2?.3:.1,dt=.05,sample=sampleRenderTimeline(track,frame,dt,.2,.1)!;
        if(sample.reset){yaw=sample.yaw;lean=0;}
        const rate=displayedYawRate(sample.yaw-yaw,elapsed);
        lean+=(-rate*.6*.009-lean)*(1-Math.exp(-dt*14));
        if(frame>20){held++;expect(sample.distance).toBe(0);expect(sample.angularDistance).toBe(0);expect(rate).toBe(0);}
        yaw=sample.yaw;
      }
      expect(held).toBeGreaterThan(50);expect(Math.abs(lean)).toBeLessThan(1e-12);
      const next={...actor(c,stance,.2),jumpEpoch:1,position:{x:80,y:1,z:-60},yaw:-2};
      pushRenderSample(track,next,.2);
      const reset=sampleRenderTimeline(track,101,.05,0,.1)!;
      expect(reset.reset).toBe(true);expect(reset.angularDistance).toBe(0);
      // This is the existing consumer's reset seeding, not a new rate API gate.
      yaw=reset.yaw;lean=0;
      const rate=displayedYawRate(reset.yaw-yaw,.3);
      expect(rate).toBe(0);expect(lean).toBe(0);expect(-rate*.022-lean*.16).toBeCloseTo(0,15);
    });
  }
});

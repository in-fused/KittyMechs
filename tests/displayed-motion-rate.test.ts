import {describe,expect,it,vi} from 'vitest';
import type {ActorState,Chassis} from '../shared/types';
import {MECHS,UPRIGHT} from '../shared/config';
import {
  createTurnPose,createUprightMotion,displayedTravelSpeed,distancePhase,
  turnPose,uprightMotion,UPRIGHT_GAITS,
} from '../src/game/entities/felineMotion';
import {createRenderTimeline,pushRenderSample,sampleRenderTimeline} from '../src/game/entities/renderTimeline';

vi.mock('../src/game/audio',()=>({audio:{resetRound:vi.fn()}}));

const chassis=['pounce','bastion','lynx','caracal'] as const;
// Frozen angular cycle contracts, independent of the rate implementation.
const quadCycle:Record<Chassis,number>={pounce:.62/.72,bastion:.44/.82,lynx:.72/.68,caracal:.52/.78};
const uprightCycle:Record<Chassis,number>={pounce:.38/.72,bastion:.28/.82,lynx:.44/.68,caracal:.34/.76};
const intervals={hz60:[1/60],hz30:[1/30],ms100:[.1],ms300:[.3],jitter:[1/60,.1,1/30,.3,.025]} as const;

// Controlled confirmed-snapshot fixture, not a native/server trajectory. The
// assertions use only the timeline's returned segment, never speed*frame-time.
function actor(c:Chassis,time:number,epoch=0):ActorState {
  return {id:'rate-pilot',chassis:c,hp:100,grounded:true,jumpEpoch:epoch,
    stance:'upright',stanceChangedAt:-100,position:{x:.6*time,y:1,z:-.2*time},
    velocity:{x:.6,y:0,z:-.2},yaw:.05*time,climb:null,strike:null,strikeEndedAt:-100,
  } as ActorState;
}
const wrapped=(phase:number,travel:number,cycle:number)=>{
  const next=phase+travel/cycle;return next-Math.floor(next);
};

describe('displayed segment rates use elapsed time independently of cosmetic filtering',()=>{
  for(const c of chassis)for(const [name,schedule] of Object.entries(intervals)){
    it(`${c}: actual ${name} local/guest timeline segments retain full-interval rates and traveled phases`,()=>{
      for(const delay of [1/60,.1]){
        const track=createRenderTimeline(),turn=createTurnPose(),upright=createUprightMotion();
        let time=0,speed=0,nonzero=0,longNonzero=0,unsaturatedTurns=0;
        pushRenderSample(track,actor(c,time),time);
        for(let frame=0;frame<48;frame++){
          const elapsed=schedule[frame%schedule.length],dt=Math.min(elapsed,.05);
          time+=elapsed;pushRenderSample(track,actor(c,time),time);
          const sample=sampleRenderTimeline(track,frame,dt,0,delay)!;
          const target=sample.distance/Math.max(.001,elapsed);
          expect(displayedTravelSpeed(sample.distance,elapsed)).toBeCloseTo(Math.min(25,target),12);
          if(sample.distance>0){nonzero++;if(elapsed>.05){longNonzero++;
            // The cap bounds smoothing, not the duration of this displayed segment.
            expect(displayedTravelSpeed(sample.distance,elapsed)).toBeLessThan(sample.distance/dt);
          }}
          const blend=1-Math.exp(-dt*14);
          speed+=(displayedTravelSpeed(sample.distance,elapsed)-speed)*blend;
          if(sample.reset)speed=0;
          const beforeTurn={...turn},beforeUpright={...upright,turn:{...upright.turn}};
          // Isolate the unsaturated angular target from translation suppression.
          turnPose(c,sample.angularDistance,0,MECHS[c].speed,dt,true,sample.reset,turn,elapsed);
          uprightMotion(c,sample.distance,sample.angularDistance,speed,MECHS[c].speed*UPRIGHT[c].speed,
            MECHS[c].scale,1,dt,true,sample.reset,upright,elapsed);
          if(sample.reset){expect(turn).toEqual(createTurnPose());expect(upright).toEqual(createUprightMotion());continue;}
          const angularRate=Math.abs(sample.angularDistance)/Math.max(.001,elapsed),turnBlend=1-Math.exp(-dt*18);
          const expectedTurn=beforeTurn.weight+(Math.min(1,angularRate/.55)-beforeTurn.weight)*turnBlend;
          expect(turn.weight).toBeCloseTo(expectedTurn<.00001?0:expectedTurn,12);
          if(angularRate>0&&angularRate<.55)unsaturatedTurns++;
          expect(turn.phase).toBeCloseTo(wrapped(beforeTurn.phase,Math.abs(sample.angularDistance),quadCycle[c]),12);
          expect(upright.turn.phase).toBeCloseTo(wrapped(beforeUpright.turn.phase,Math.abs(sample.angularDistance),uprightCycle[c]),12);
          const ratio=Math.min(1,Math.max(0,speed/(MECHS[c].speed*UPRIGHT[c].speed)));
          const slow=1-Math.min(1,Math.max(0,(ratio-.08)/.22));
          const expectedUprightTurn=beforeUpright.turn.weight+(slow*Math.min(1,angularRate/.55)-beforeUpright.turn.weight)*turnBlend;
          expect(upright.turn.weight).toBeCloseTo(expectedUprightTurn<.00001?0:expectedUprightTurn,12);
          // Upright blend changes may alter its distance cycle. Assert the retained
          // formula using this pose's actual weights, not old/new phase equality.
          const gait=UPRIGHT_GAITS[c],moving=upright.walk+upright.stride;
          const cycle=MECHS[c].scale*(gait.strides[0]/gait.duties[0]*upright.walk+gait.strides[1]/gait.duties[1]*upright.stride)/Math.max(.001,moving);
          expect(upright.phase).toBeCloseTo(sample.distance>0?
            wrapped(beforeUpright.phase,sample.distance,Math.max(.01,cycle)):beforeUpright.phase,12);
          expect(upright.idle+upright.walk+upright.stride).toBeCloseTo(1,12);
          expect([speed,turn.weight,turn.phase,upright.phase,upright.turn.weight].every(Number.isFinite)).toBe(true);
        }
        expect(nonzero).toBeGreaterThan(20);expect(unsaturatedTurns).toBeGreaterThan(20);
        if(schedule.some(elapsed=>elapsed>.05))expect(longNonzero).toBeGreaterThan(0);
      }
    });
  }

  it('bounds linear targets at 25 m/s with a 1 ms denominator floor and rejects invalid measurements',()=>{
    expect(displayedTravelSpeed(.01,.0001)).toBe(10);
    expect(displayedTravelSpeed(.03,.001)).toBe(25);
    expect(displayedTravelSpeed(100,.3)).toBe(25);
    expect(displayedTravelSpeed(0,.3)).toBe(0);
    for(const distance of [NaN,Infinity,-Infinity,-1])expect(displayedTravelSpeed(distance,.1)).toBe(0);
    for(const elapsed of [NaN,Infinity,-Infinity,0,-.1])expect(displayedTravelSpeed(.1,elapsed)).toBe(0);
  });

  it('caps a genuinely returned high-travel timeline segment instead of trusting snapshot velocity',()=>{
    const track=createRenderTimeline(),first=actor('pounce',0);
    pushRenderSample(track,first,0);sampleRenderTimeline(track,0,1/60,0,0);
    const next={...first,position:{x:1.5,y:1,z:0},velocity:{x:0,y:0,z:0}};
    pushRenderSample(track,next,1/60);
    const sample=sampleRenderTimeline(track,1,1/60,0,0)!;
    expect(sample.reset).toBe(false);expect(sample.distance).toBeGreaterThan(1);
    expect(sample.velocity.x).toBe(0);
    expect(displayedTravelSpeed(sample.distance,1/60)).toBe(25);
  });

  for(const c of chassis){
    it(`${c}: unsaturated turn targets have a 1 ms rate floor, safe invalid elapsed and finite invalid angles`,()=>{
      const dt=.05,blend=1-Math.exp(-dt*18),angle=.00005;
      const turn=createTurnPose(),upright=createUprightMotion();
      turnPose(c,angle,0,5,dt,true,false,turn,.0001);
      uprightMotion(c,0,angle,0,5,1,1,dt,true,false,upright,.0001);
      expect(turn.weight).toBeCloseTo((.05/.55)*blend,12);
      expect(upright.turn.weight).toBeCloseTo((.05/.55)*blend,12);
      for(const elapsed of [NaN,Infinity,-Infinity,0,-.1]){
        const t=createTurnPose(),u=createUprightMotion();
        turnPose(c,.01,0,5,dt,true,false,t,elapsed);
        uprightMotion(c,0,.01,0,5,1,1,dt,true,false,u,elapsed);
        expect(t.weight).toBe(0);expect(u.turn.weight).toBe(0);
        // Invalid rate time cannot invent a turn weight, but finite recorded
        // angular travel still advances the existing distance-owned phase.
        expect(t.phase).toBeCloseTo(.01/quadCycle[c],12);
      }
      for(const badAngle of [NaN,Infinity,-Infinity]){
        const t=createTurnPose(),u=createUprightMotion();
        turnPose(c,badAngle,0,5,dt,true,false,t,.1);
        uprightMotion(c,0,badAngle,0,5,1,1,dt,true,false,u,.1);
        expect(t).toEqual(createTurnPose());expect(u).toEqual(createUprightMotion());
      }
    });

    it(`${c}: omitted elapsed remains exactly backward-compatible through 50 ms`,()=>{
      const implicit=createTurnPose(),explicit=createTurnPose(),uImplicit=createUprightMotion(),uExplicit=createUprightMotion();
      for(let i=0;i<36;i++){
        const dt=[1/60,1/30,.05][i%3],angle=i%3===0?-.004:.003,speed=i%4===0?0:.4;
        turnPose(c,angle,speed,5,dt,true,false,implicit);
        turnPose(c,angle,speed,5,dt,true,false,explicit,dt);
        uprightMotion(c,.015,angle,speed,5,MECHS[c].scale,i%2?1:-1,dt,true,false,uImplicit);
        uprightMotion(c,.015,angle,speed,5,MECHS[c].scale,i%2?1:-1,dt,true,false,uExplicit,dt);
        expect(implicit).toEqual(explicit);expect(uImplicit).toEqual(uExplicit);
      }
    });

    it(`${c}: a held timeline freezes phases, fades weights and clears discontinuities/excluded poses`,()=>{
      const track=createRenderTimeline(),turn=createTurnPose(),upright=createUprightMotion();
      pushRenderSample(track,actor(c,0),0);pushRenderSample(track,actor(c,.1),.1);
      let held=0,phase=0,heldPhase=0,quadTurnPhase=0,uPhase=0,uTurnPhase=0,speed=0;
      for(let frame=0;frame<100;frame++){
        const elapsed=frame%2?.3:.1,dt=.05,sample=sampleRenderTimeline(track,frame,dt,.2,.1)!;
        speed+=(displayedTravelSpeed(sample.distance,elapsed)-speed)*(1-Math.exp(-dt*14));
        if(sample.reset){speed=0;phase=0;}else phase=distancePhase(phase,sample.distance,1.5);
        turnPose(c,sample.angularDistance,0,5,dt,true,sample.reset,turn,elapsed);
        uprightMotion(c,sample.distance,sample.angularDistance,speed,5,MECHS[c].scale,1,dt,true,sample.reset,upright,elapsed);
        if(frame>20){expect(sample.distance).toBe(0);expect(sample.angularDistance).toBe(0);
          if(held){expect(phase).toBe(heldPhase);expect(turn.phase).toBe(quadTurnPhase);expect(upright.phase).toBe(uPhase);expect(upright.turn.phase).toBe(uTurnPhase);}
          heldPhase=phase;quadTurnPhase=turn.phase;uPhase=upright.phase;uTurnPhase=upright.turn.phase;held++;
        }
      }
      expect(held).toBeGreaterThan(50);expect(speed).toBeLessThan(.000001);
      expect(turn.weight).toBe(0);expect(upright.turn.weight).toBe(0);
      expect(upright.idle).toBeGreaterThan(.999);
      const teleported={...actor(c,.2,1),position:{x:80,y:1,z:-60},yaw:-2};
      pushRenderSample(track,teleported,.2);
      const reset=sampleRenderTimeline(track,101,.05,0,.1)!;
      expect(reset.reset).toBe(true);expect(reset.distance).toBe(0);expect(reset.angularDistance).toBe(0);
      for(const gate of [{allowed:true,reset:reset.reset},{allowed:false,reset:false}]){
        turnPose(c,.4,0,5,.05,gate.allowed,gate.reset,turn,.3);
        uprightMotion(c,.8,.4,2,5,1,1,.05,gate.allowed,gate.reset,upright,.3);
        expect(turn).toEqual(createTurnPose());expect(upright).toEqual(createUprightMotion());
      }
    });
  }
});

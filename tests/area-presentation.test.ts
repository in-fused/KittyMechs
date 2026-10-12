import {describe,expect,it} from 'vitest';
import {AREA_STYLES,MAX_FIELD_PARTICLES,areaArc,areaSeed,burstEnvelope,createFieldParticle,fieldEnvelope,sampleFieldParticle} from '../src/game/effects/areaPresentation';
import {areaRing} from '../shared/areaGeometry';
import {UPRIGHT} from '../shared/config';
import type {AreaEffectKind} from '../shared/types';

const kinds:AreaEffectKind[]=['rake','shockwave','shield','repair','snare','emp'];
const finiteObject=(object:object)=>Object.values(object).filter(value=>typeof value==='number').every(Number.isFinite);
describe('bounded authored area presentation envelopes',()=>{
  it('keeps immutable distinct semantic palettes and bounded presentation lifetimes',()=>{
    expect(Object.isFrozen(AREA_STYLES)).toBe(true);
    expect(new Set(kinds.map(k=>AREA_STYLES[k].color)).size).toBe(6);
    for(const kind of kinds){const s=AREA_STYLES[kind];expect(Object.isFrozen(s)).toBe(true);expect(s.lifetime).toBeGreaterThan(0);expect(s.lifetime).toBeLessThanOrEqual(1.4);expect(s.particleCount).toBeLessThanOrEqual(32);}
    // Shield/repair/snare bursts are bounded afterglows, not extensions of
    // their authoritative fields. The rake happens to share its .7 s action.
    expect(AREA_STYLES.rake.lifetime).toBe(.7);
    expect(AREA_STYLES.shield.lifetime).toBeLessThan(UPRIGHT.bastion.duration);
    expect(AREA_STYLES.repair.lifetime).toBeLessThan(UPRIGHT.caracal.duration);
    expect(AREA_STYLES.snare.lifetime).toBeLessThan(UPRIGHT.lynx.duration);
  });
  for(const kind of kinds)it(`${kind} starts and ends smoothly, advances one bounded front, and has finite soft trails`,()=>{
    const lifetime=AREA_STYLES[kind].lifetime;
    expect(burstEnvelope(kind,-.01).visible).toBe(false);expect(burstEnvelope(kind,0).opacity).toBe(0);
    let prior=0;
    for(let i=1;i<100;i++){
      const e=burstEnvelope(kind,lifetime*i/100);
      expect(finiteObject(e)).toBe(true);expect(e.front).toBeGreaterThanOrEqual(prior);expect(e.front).toBeLessThanOrEqual(1);prior=e.front;
      expect(e.trail).toBeGreaterThanOrEqual(0);expect(e.trail).toBeLessThanOrEqual(e.front);
      expect(e.opacity).toBeGreaterThanOrEqual(0);expect(e.opacity).toBeLessThanOrEqual(1);
      const inner=Math.max(0,e.front-e.frontWidth);expect(inner).toBeLessThanOrEqual(e.front);
    }
    expect(burstEnvelope(kind,lifetime-1e-7).opacity).toBeLessThan(1e-10);
    expect(burstEnvelope(kind,lifetime).visible).toBe(false);expect(burstEnvelope(kind,lifetime+100).opacity).toBe(0);
  });
  it('reduced flashes use a slower single front and low opacity without periodic bursts',()=>{
    for(const kind of kinds)for(let i=0;i<100;i++){
      const age=AREA_STYLES[kind].lifetime*i/100,normal=burstEnvelope(kind,age),reduced=burstEnvelope(kind,age,true);
      expect(reduced.front).toBeLessThanOrEqual(normal.front);expect(reduced.opacity).toBeLessThanOrEqual(normal.opacity);expect(reduced.opacity).toBeLessThanOrEqual(.45);
    }
    expect(burstEnvelope('emp',.001,true).opacity).toBeLessThan(.001);
  });
  it('field age/remaining fades are smooth and reduced-flash modulation is steady',()=>{
    expect(fieldEnvelope(0,4).opacity).toBe(0);expect(fieldEnvelope(1,0).visible).toBe(false);
    expect(fieldEnvelope(.001,4).opacity).toBeLessThan(.001);expect(fieldEnvelope(1,.001).opacity).toBeLessThan(.001);
    for(let i=1;i<=100;i++){
      const steady=fieldEnvelope(i/10,2,true),normal=fieldEnvelope(i/10,2,false);
      expect(steady.modulation).toBe(1);expect(normal.modulation).toBeGreaterThanOrEqual(.84);expect(normal.modulation).toBeLessThanOrEqual(1);
      expect(finiteObject(normal)).toBe(true);expect(normal.opacity).toBeGreaterThanOrEqual(0);expect(normal.opacity).toBeLessThanOrEqual(1);
    }
    expect(fieldEnvelope(1,2,true).opacity).toBe(1);
  });
  it('rejects invalid clocks safely, including finite extreme values without overflow',()=>{
    for(const age of [NaN,Infinity,-Infinity,-1]){
      expect(burstEnvelope('repair',age).visible).toBe(false);expect(fieldEnvelope(age,2).visible).toBe(false);
      expect(finiteObject(burstEnvelope('repair',age))).toBe(true);expect(finiteObject(fieldEnvelope(age,2))).toBe(true);
    }
    for(const remaining of [NaN,Infinity,-Infinity,-1,0])expect(fieldEnvelope(1,remaining).visible).toBe(false);
    expect(finiteObject(fieldEnvelope(Number.MAX_VALUE,Number.MAX_VALUE))).toBe(true);
  });
});

describe('footprint and deterministic instanced cues',()=>{
  for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI])it(`native rake geometry stays inside the 120 degree forward sector at yaw ${yaw}`,()=>{
    const arc=areaArc('rake',yaw),center={x:-8,y:1,z:22},radius=UPRIGHT.pounce.radius;
    expect(arc.length).toBe(Math.PI*2/3);
    const data=areaRing(7734,center,radius,.86,arc.start,arc.length);
    expect(data.vertices.length).toBeGreaterThan(0);
    const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)};
    for(let i=0;i<data.vertices.length;i+=3){
      const x=data.vertices[i]-center.x,z=data.vertices[i+2]-center.z,d=Math.hypot(x,z);
      // This margin is only Float32 geometry storage error, not damage reach.
      expect(d).toBeLessThanOrEqual(radius+1e-5);expect((x*forward.x+z*forward.z)/d).toBeGreaterThanOrEqual(.5-1e-5);
    }
  });
  it('all radial styles preserve a full native circle and invalid yaw stays finite',()=>{
    for(const kind of kinds.filter(k=>k!=='rake'))expect(areaArc(kind,1.7)).toEqual({start:0,length:Math.PI*2});
    expect(areaArc('rake',NaN)).toEqual(areaArc('rake',0));
  });
  it('ID-derived samples are deterministic independent of call order and reuse the supplied output',()=>{
    expect(areaSeed('field:17')).toBe(areaSeed('field:17'));expect(areaSeed('field:17')).not.toBe(areaSeed('field:18'));
    const seed=areaSeed(17),out=createFieldParticle(),saved=Array.from({length:24},(_,i)=>({...sampleFieldParticle('repair',seed,i,24,.8,out)}));
    for(let i=23;i>=0;i--){expect(sampleFieldParticle('repair',seed,i,24,.8,out)).toBe(out);expect(out).toEqual(saved[i]);}
    expect(areaSeed(NaN)).toBe(0);expect(areaSeed(Infinity)).toBe(0);
  });
  for(const kind of ['repair','snare'] as const)it(`${kind} keeps centers plus sprite extent inside the actual 3D field radius`,()=>{
    const out=createFieldParticle(),radius=kind==='repair'?UPRIGHT.caracal.radius:UPRIGHT.lynx.radius;
    const center={x:17,y:5,z:-23};
    for(const id of [0,1,999,'field:latejoin'])for(let index=0;index<32;index++)for(let t=0;t<=40;t++){
      sampleFieldParticle(kind,areaSeed(id),index,32,t*.137,out);
      const world={x:center.x+radius*out.x,y:center.y+radius*out.y,z:center.z+radius*out.z};
      expect(Math.hypot(world.x-center.x,world.y-center.y,world.z-center.z)+radius*out.scale).toBeLessThanOrEqual(radius);
      expect(finiteObject(out)).toBe(true);expect(out.opacity).toBeGreaterThanOrEqual(0);expect(out.opacity).toBeLessThanOrEqual(1);
    }
  });
  it('repair columns rise without lateral sliding while snare spirals converge',()=>{
    const seed=areaSeed('distinct-cue'),first=createFieldParticle(),second=createFieldParticle();
    // Small interval cannot wrap these deterministic chosen phases; check the
    // actual cue displacement rather than requiring a specific hash value.
    let repairRise=false,snareConverge=false;
    for(let i=0;i<24;i++){
      sampleFieldParticle('repair',seed,i,24,.1,first);sampleFieldParticle('repair',seed,i,24,.15,second);
      if(second.y>first.y){expect(second.x).toBe(first.x);expect(second.z).toBe(first.z);repairRise=true;}
      sampleFieldParticle('snare',seed,i,24,.1,first);sampleFieldParticle('snare',seed,i,24,.15,second);
      if(Math.hypot(second.x,second.z)<Math.hypot(first.x,first.z)){expect(Math.hypot(second.x-first.x,second.z-first.z)).toBeGreaterThan(0);snareConverge=true;}
    }
    expect(repairRise).toBe(true);expect(snareConverge).toBe(true);
  });
  it('bounds particle work and clears stale output on every invalid index/input',()=>{
    const out=createFieldParticle();expect(MAX_FIELD_PARTICLES).toBe(32);
    sampleFieldParticle('repair',1,31,1000,.5,out);expect(out.scale).toBeGreaterThan(0);
    for(const [seed,index,count,age] of [[1,32,1000,.5],[1,-1,24,.5],[1,.5,24,.5],[1,0,0,.5],[1,0,Infinity,.5],[NaN,0,24,.5],[1,0,24,NaN],[1,0,24,-.1],[-1,0,24,.5]]){
      sampleFieldParticle('snare',seed,index,count,age,out);expect(out).toEqual({x:0,y:0,z:0,visible:false,opacity:0,scale:0});
    }
    sampleFieldParticle('repair',1,0,24,Number.MAX_VALUE,out);expect(finiteObject(out)).toBe(true);
  });
});

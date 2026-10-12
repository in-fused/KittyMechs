import { describe,it,expect } from 'vitest';
import { emptyWeather, weatherAt, wrapWeather } from '../shared/weather';
describe('shared weather fronts',()=>{
  it('gives each theater its own climate and reproduces the same room clock',()=>{
    expect(weatherAt(7734,37)).toEqual(weatherAt(7734,37));
    expect([7734,1926,4107].map(seed=>weatherAt(seed,37).kind)).toEqual(['rain','ash','snow']);
    for(const seed of [7734,1926,4107]){const levels=Array.from({length:181},(_,time)=>weatherAt(seed,time).intensity);expect(Math.max(...levels)-Math.min(...levels)).toBeGreaterThan(.87);}
  });
  it('keeps fronts gradual and bounded over long sessions without allocation when supplied a frame',()=>{
    const frame=emptyWeather();
    for(const seed of [7734,1926,4107])for(let time=0;time<3600;time+=.7){
      const w=weatherAt(seed,time,false,frame),next=weatherAt(seed,time+.05);expect(w).toBe(frame);
      expect(w.intensity).toBeGreaterThanOrEqual(.12);expect(w.intensity).toBeLessThanOrEqual(1);expect(w.visibility).toBeGreaterThan(.5);
      expect(Math.abs(w.intensity-next.intensity)).toBeLessThan(.002);expect(Math.hypot(w.windX,w.windZ)).toBeLessThan(5);
    }
  });
  it('suppresses actual lightning pulses with reduced flashes and sanitizes a bad clock',()=>{
    let pulses=0;
    for(let time=0;time<720;time+=.02){if(weatherAt(7734,time).lightning>0)pulses++;expect(weatherAt(7734,time,true).lightning).toBe(0);expect(weatherAt(1926,time).lightning).toBe(0);expect(weatherAt(4107,time).lightning).toBe(0);}
    expect(pulses).toBeGreaterThan(0);expect(weatherAt(7734,NaN)).toEqual(weatherAt(7734,0));
  });
  it('keeps signed long-session precipitation drift around the pilot and integrates bounded wind',()=>{
    for(const seed of [7734,1926,4107])for(const time of [180,600,3600,7200]){
      const w=weatherAt(seed,time),next=weatherAt(seed,time+.001);
      expect((next.driftX-w.driftX)/.001).toBeCloseTo(w.windX,3);expect((next.driftZ-w.driftZ)/.001).toBeCloseTo(w.windZ,3);
      for(const start of [-27.5,0,27.4])for(const drift of [w.driftX,w.driftZ]){const x=wrapWeather(start+drift*.35);expect(x).toBeGreaterThanOrEqual(-27.5);expect(x).toBeLessThan(27.5);}
    }
  });
});

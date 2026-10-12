import {describe,it,expect} from 'vitest';
import {combatParticle,particlePosition,sparkEvent} from '../src/game/effects/combatParticles';
import type {CombatEvent} from '../shared/types';
const event:CombatEvent={id:98,type:'explosion',position:{x:4,y:2,z:-6},at:10};
describe('event-clock combat particles',()=>{
  it('presents a late admitted event at its original age and expires it on time',()=>{const p=combatParticle(event,0),out={x:0,y:0,z:0};expect(p.born).toBe(10);expect(particlePosition(p,10.4,out)).toBe(true);expect(out.x).toBeCloseTo(4+p.velocity.x*.4);expect(particlePosition(p,10+p.life,out)).toBe(false);expect(sparkEvent(event,12)).toBe(false);});
  it('has no displacement drift over repeated paused or stalled frames',()=>{const p=combatParticle(event,7),out={x:0,y:0,z:0};particlePosition(p,10.2,out);const expected={...out};for(let i=0;i<100;i++)expect(particlePosition(p,10.2,out)).toBe(true);expect(out).toEqual(expected);expect(combatParticle(event,7)).toEqual(p);});
  it('rejects future or invalid events and never produces a negative-age trajectory',()=>{const p=combatParticle(event,1),out={x:3,y:4,z:5};expect(particlePosition(p,9.9,out)).toBe(false);expect(out).toEqual({x:3,y:4,z:5});for(const e of [{...event,at:Infinity},{...event,position:{x:NaN,y:2,z:0}},{...event,id:1.5}])expect(sparkEvent(e,10.1)).toBe(false);expect(sparkEvent(event,9)).toBe(false);});
  it('rejects empty or missing-axis positions before constructing matrices',()=>{
    for(const position of [{},{x:1,y:2},null])expect(sparkEvent({...event,position:position as CombatEvent['position']},10.1)).toBe(false);
  });
});

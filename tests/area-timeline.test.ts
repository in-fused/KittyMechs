import {describe,it,expect} from 'vitest';
import {advanceEffectClock,areaArenaKey,burstKind,createEffectClock,effectDisplayTime,visibleAreaEvents,visibleAreaFields} from '../src/game/effects/areaTimeline';
import type {CombatEvent,GameSnapshot} from '../shared/types';
const event:CombatEvent={id:12,type:'area',at:4,position:{x:0,y:1,z:0},radius:7,direction:0,effect:'rake'};
const state=()=>({room:'one',seed:7734,events:[event],fields:[{id:13,kind:'repair',owner:'medic',position:{x:0,y:1,z:0},radius:8,born:4,expires:9}],actors:[{id:'medic',hp:100}]} as GameSnapshot);
describe('authoritative area presentation admission',()=>{
  it('does not turn takeoff, dash or a future/expired attack into a damaging ring',()=>{
    expect(burstKind({...event,type:'pounce',effect:undefined,radius:5})).toBeNull();
    expect(burstKind({...event,type:'pounce',effect:undefined,radius:undefined})).toBeNull();
    expect(visibleAreaEvents(state(),3.9)).toEqual([]);expect(visibleAreaEvents(state(),4)).toEqual([event]);expect(visibleAreaEvents(state(),4.7)).toEqual([]);
    expect(burstKind({...event,type:'area',effect:'shockwave',radius:5})).toBe('shockwave');
    expect(burstKind({...event,type:'repair',effect:'repair',radius:10})).toBe('repair');
  });
  it('rejects invalid geometry and clocks before they reach shaders',()=>{
    for(const altered of [{radius:Infinity},{radius:0},{radius:100},{at:NaN},{direction:Infinity},{position:{x:NaN,y:1,z:0}},{id:1.1}])expect(burstKind({...event,...altered})).toBeNull();
    const s=state();s.fields[0].position.x=Infinity;expect(visibleAreaFields(s,5)).toEqual([]);
    s.fields[0].position.x=0;s.fields[0].expires=NaN;expect(visibleAreaFields(s,5)).toEqual([]);
  });
  it('keeps live late-join fields while rejecting dead-owner, unborn and expired fields',()=>{
    const s=state();expect(visibleAreaFields(s,7)).toEqual(s.fields);expect(visibleAreaFields(s,3.9)).toEqual([]);expect(visibleAreaFields(s,9)).toEqual([]);
    s.actors[0].hp=0;expect(visibleAreaFields(s,7)).toEqual([]);
  });
  it('caps simultaneous visuals and separates reused IDs across arena generations',()=>{
    const s=state();s.events=Array.from({length:24},(_,i)=>({...event,id:i}));s.fields=Array.from({length:20},(_,i)=>({...s.fields[0],id:i}));
    expect(visibleAreaEvents(s,4.2).map(e=>e.id)).toEqual(Array.from({length:16},(_,i)=>i+8));expect(visibleAreaFields(s,5)).toHaveLength(12);
    expect(areaArenaKey(1,s)).not.toBe(areaArenaKey(2,s));expect(areaArenaKey(1,s)).not.toBe(areaArenaKey(1,{...s,room:'two'}));
  });
  it('uses native time, bounded guest interpolation and frozen paused/stalled clocks',()=>{
    expect(effectDisplayTime(4,4.05,10)).toBe(4.05);expect(effectDisplayTime(4,undefined,.02)).toBe(4.02);
    expect(effectDisplayTime(4,undefined,1)).toBe(4.075);expect(effectDisplayTime(4,undefined,20)).toBe(4.075);
    expect(effectDisplayTime(4,undefined,1,true)).toBe(4);expect(effectDisplayTime(4,3,-1)).toBe(4);expect(effectDisplayTime(4,Infinity,NaN)).toBe(4);
  });
  it('never reverses on new ordinary guest packets and resets on generation or rewind',()=>{
    const c=createEffectClock();expect(advanceEffectClock(c,'one',4,undefined,1)).toBe(4.075);expect(advanceEffectClock(c,'one',4.05,undefined,0)).toBe(4.075);
    expect(advanceEffectClock(c,'one',4.1,undefined,0)).toBe(4.1);expect(advanceEffectClock(c,'two',0,undefined,0)).toBe(0);expect(advanceEffectClock(c,'two',3,undefined,0)).toBe(3);expect(advanceEffectClock(c,'two',1,undefined,0)).toBe(1);
  });
});

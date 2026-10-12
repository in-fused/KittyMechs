import {describe,it,expect} from 'vitest';
import {cityDistrict} from '../shared/cityDistrict';
import type {CombatEvent} from '../shared/types';
import {CityDebrisPool,CITY_DEBRIS_LIMIT,CITY_DEBRIS_LIFETIME} from '../src/game/world/cityFragments';
import {CityPresentation} from '../src/game/world/cityPresentation';
describe('presented directional city debris',()=>{
 const district=cityDistrict(7734)!;
 const states=()=>district.structures.map(s=>({id:s.id,layoutVersion:1 as const,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)}));
 const event=(id=1,side=1):CombatEvent=>({id,type:'structure-break',at:1,position:{x:114,y:2,z:10},structureId:district.structures[0].id,cellId:0,incoming:{x:side,y:0,z:0},normal:{x:-side,y:0,z:0}});
 it('retains a continuous monotonic cosmetic clock between discrete structural snapshots',()=>{
  const presentation=new CityPresentation();presentation.push(60,1,states());presentation.push(63,1.05,states());
  const clocks=[];for(const time of [1,1.01,1.02,1.03,1.04,1.05]){presentation.present(time);clocks.push(presentation.readClock());if(time<1.05)expect(presentation.read()?.time).toBe(1);}
  expect(clocks).toEqual([1,1.01,1.02,1.03,1.04,1.05]);presentation.present(1.02);expect(presentation.readClock()).toBe(1.05);expect(presentation.read()?.time).toBe(1.05);
 });
 it('waits for both the body presentation clock and accepted cell removal; deduplicates and expires',()=>{
  const pool=new CityDebrisPool(district),state=states();pool.update([event()],state,.9);expect(pool.fragments).toHaveLength(0);pool.update([event()],state,1);expect(pool.fragments).toHaveLength(0);
  state[0].brokenMask=1;state[0].hp[0]=0;pool.update([event()],state,1);expect(pool.fragments).toHaveLength(8);pool.update([event()],state,1.1);expect(pool.fragments).toHaveLength(8);
  pool.update([event()],state,1+CITY_DEBRIS_LIFETIME);expect(pool.fragments).toHaveLength(0);
 });
 it('opposite winning trajectories reverse average push; bounded bursts reject malformed or unknown events',()=>{
  const state=states();state[0].brokenMask=1;state[0].hp[0]=0;
  const a=new CityDebrisPool(district),b=new CityDebrisPool(district);a.update([event()],state,1);b.update([event(1,-1)],state,1);
  expect(a.fragments.reduce((n,f)=>n+f.velocity.x,0)).toBeGreaterThan(20);expect(b.fragments.reduce((n,f)=>n+f.velocity.x,0)).toBeLessThan(-20);
  a.update(Array.from({length:100},(_,i)=>event(i+2)),state,1);expect(a.fragments).toHaveLength(8);
  const burst=Array.from({length:10},(_,i)=>({...event(i+102),cellId:i}));for(const e of burst){state[0].hp[e.cellId!]=0;state[0].brokenMask=(state[0].brokenMask|(1<<e.cellId!))>>>0;}
  a.update(burst,state,1);expect(a.fragments).toHaveLength(CITY_DEBRIS_LIMIT);
  const c=new CityDebrisPool(district);c.update([{...event(),incoming:{x:NaN,y:0,z:0}},{...event(2),cellId:99},{...event(3),normal:{x:0,y:0,z:0}},{...event(4),structureId:'foreign'}],state,1);expect(c.fragments).toHaveLength(0);
 });
 it('retains pending breaks after the latest event ring expires and rejects new-ID same-cell replay',()=>{
  const pool=new CityDebrisPool(district),state=states();pool.update([event()],state,.95);expect(pool.fragments).toHaveLength(0);
  pool.update([],state,1.1);expect(pool.fragments).toHaveLength(0);
  state[0].brokenMask=1;state[0].hp[0]=0;pool.update([],state,2.3);expect(pool.fragments).toHaveLength(8);
  pool.update([],state,3.8);expect(pool.fragments).toHaveLength(0);
  pool.update([{...event(999),at:4}],state,4);expect(pool.fragments).toHaveLength(0);
 });
});

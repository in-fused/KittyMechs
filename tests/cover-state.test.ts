import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {describe,expect,it} from 'vitest';
import {parseCoverState,MAX_AUTHORED_COVER} from '../shared/coverState';
import {breakableCover} from '../shared/traversal';
import {cityDistrict} from '../shared/cityDistrict';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import type {CoverState,GameSnapshot} from '../shared/types';
import {CityPresentation} from '../src/game/world/cityPresentation';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
const coverFor=(seed:number):CoverState[]=>breakableCover(seed).slice(0,MAX_AUTHORED_COVER).map(p=>({id:p.id!,hp:p.breakableHp!,maxHp:p.breakableHp!,destroyedAt:null}));
const packet=(cover=coverFor(7734)):GameSnapshot=>({worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick:100,time:5,seed:7734,room:'COVER',mode:'coop',actors:[],projectiles:[],events:[],fields:[],cover,structures:(cityDistrict(7734)?.structures??[]).map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)})),rubble:[],supplies:[],objectives:[],checkpoint:null,phase:'active',winner:null});
describe('canonical bounded persistent cover admission',()=>{
  it('admits and detaches each theater catalog, preserving damage through omitted packets',()=>{
    for(const seed of [7734,1926,4107]){
      const source=coverFor(seed),first=parseCoverState(source,seed,5)!;expect(first).toEqual(source);source[0].hp=1;expect(first[0].hp).toBe(first[0].maxHp);
      const broken={...first[0],hp:0,destroyedAt:5},second=parseCoverState([broken],seed,5,first)!;expect(second).toHaveLength(first.length);expect(second[0].hp).toBe(0);
      const omitted=parseCoverState([],seed,6,second)!;expect(omitted).toEqual(second);expect(omitted[0]).not.toBe(second[0]);expect(parseCoverState([{...broken,hp:1,destroyedAt:null}],seed,7,omitted)).toBeNull();expect(parseCoverState([{...broken,destroyedAt:6}],seed,7,omitted)).toBeNull();
    }
  });
  it('rejects unknown/duplicate IDs, forged catalog values and nonfinite/inconsistent damage atomically',()=>{
    const good=coverFor(7734)[0];
    const malformed=[null,{},false,{...good,id:'fresh-id'},{...good,id:undefined},{...good,id:42},{...good,maxHp:good.maxHp+1},{...good,hp:NaN},{...good,hp:Infinity},{...good,hp:-1},{...good,hp:good.maxHp+1},{...good,hp:'180'},{...good,destroyedAt:0},{...good,hp:0,destroyedAt:null},{...good,hp:0,destroyedAt:-1},{...good,hp:0,destroyedAt:6},{...good,hp:0,destroyedAt:NaN}];
    for(const bad of malformed)for(const rows of [[good,bad],[bad,good]])expect(parseCoverState(rows,7734,5)).toBeNull();
    expect(parseCoverState([good,good],7734,5)).toBeNull();expect(parseCoverState([good],1926,5)).toBeNull();expect(parseCoverState([good],0,5)).toBeNull();expect(parseCoverState([good],7734,Infinity)).toBeNull();
    expect(parseCoverState([good],7734,5,[{...good,id:'forged-previous'}])).toBeNull();
  });
  it('bounds history under successive fresh-ID schedules and missing-ID orderings without throwing or changing the accepted world revision',()=>{
    const presentation=new CityPresentation(7734),good=coverFor(7734);presentation.push(1,1,[],good);presentation.present(1);
    for(let i=0;i<100;i++){
      const forged=Array.from({length:64},(_,j)=>({...good[0],id:`fresh-${i}-${j}`}));expect(()=>presentation.push(i+2,i+2,[],forged)).not.toThrow();presentation.present(i+2);
      presentation.push(i+2,i+2,[],[{...good[0],id:`single-fresh-${i}`}]);
      for(const rows of [[good[0],{hp:1}], [{hp:1},good[0]]])expect(()=>presentation.push(i+2,i+2,[],rows as CoverState[])).not.toThrow();
    }
    expect(presentation.snapshot().history).toBe(1);expect(presentation.read()?.tick).toBe(1);expect(presentation.read()?.cover).toHaveLength(good.length);
    for(let i=0;i<30;i++){presentation.push(i+2,i+2,[],[]);presentation.present(i+2);}expect(presentation.snapshot().history).toBe(8);expect(presentation.read()?.cover).toHaveLength(good.length);expect(good.length).toBeLessThanOrEqual(MAX_AUTHORED_COVER);
  });
  it('rejects a malformed cover bank with the entire snapshot and cannot heal after an omitted bank',()=>{
    const original=packet(),first=admitStructuralSnapshot(original,null)!;expect(first).toBeTruthy();original.cover[0].hp=0;expect(first.cover[0].hp).toBe(first.cover[0].maxHp);
    const broken=packet([{...first.cover[0],hp:0,destroyedAt:5.1}]);broken.tick=106;broken.time=5.1;const damaged=admitStructuralSnapshot(broken,first)!;expect(damaged).toBeTruthy();
    const missing={...packet([]),tick:112,time:5.2},retained=admitStructuralSnapshot(missing,damaged)!;expect(retained.cover.find(c=>c.id===first.cover[0].id)?.hp).toBe(0);
    expect(admitStructuralSnapshot({...packet(),tick:118,time:5.3},retained)).toBeNull();
    for(const cover of [[{...first.cover[0],id:'not-canonical'}],[{...first.cover[0],hp:NaN}],Array.from({length:64},(_,i)=>({...first.cover[0],id:`fresh-${i}`}))])expect(admitStructuralSnapshot({...packet(cover),tick:101,time:5.05},first)).toBeNull();
    expect(first.cover[0].hp).toBe(first.cover[0].maxHp);
  });
});

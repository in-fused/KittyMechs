import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {describe,expect,it} from 'vitest';
import {cityDistrict} from '../shared/cityDistrict';
import type {GameSnapshot,StructureState} from '../shared/types';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {parseStructures} from '../shared/protocol';
import {CityPresentation} from '../src/game/world/cityPresentation';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';

const healthy=():StructureState[]=>cityDistrict(7734)!.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)}));
function damage(state:StructureState[],cell=0):StructureState[]{const result=state.map(s=>({...s,hp:[...s.hp]}));result[0].hp[cell]=0;result[0].brokenMask=(result[0].brokenMask|1<<cell)>>>0;result[0].revision++;return result;}
function packet(structures=healthy()):GameSnapshot{return {worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick:100,time:5,seed:7734,room:'CITY',mode:'coop',actors:[],projectiles:[],events:[],fields:[],rubble:[],cover:[],structures,supplies:[],objectives:[],checkpoint:null,phase:'active',winner:null};}
describe('coherent discrete city presentation',()=>{
  it('dispatches a ruin snapshot once while advancing the render clock and admits subsequent ruin motion',()=>{
    const owner=new CityPresentation(),seen:number[]=[];
    const ruin={block:0,born:5,position:{x:1,y:2,z:3},rotation:{x:0,y:0,z:0,w:1},settled:false,revision:0};
    owner.register(state=>seen.push(state.ruins![0].position.x));
    owner.push(100,5,healthy(),[],[],[],false,[ruin]);
    owner.present(5);owner.present(5.02);owner.present(5.04);
    expect(seen).toEqual([1]);expect(owner.readClock()).toBe(5.04);
    owner.push(106,5.1,healthy(),[],[],[],false,[{...ruin,position:{...ruin.position,x:4},revision:1}]);
    owner.present(5.09);expect(seen).toEqual([1]);
    owner.present(5.1);owner.present(5.12);expect(seen).toEqual([1,4]);
    let late=0;owner.register(state=>{late=state.ruins![0].position.x;});expect(late).toBe(4);
  });
  it('keeps intact visuals and guest proxies until the body clock reaches the damaged sample, then changes both together',()=>{
    const owner=new CityPresentation(),updates:{name:string;mask:number;tick:number}[]=[];
    owner.register(state=>updates.push({name:'mesh',mask:state.structures[0].brokenMask,tick:state.tick}));
    owner.register(state=>updates.push({name:'proxy',mask:state.structures[0].brokenMask,tick:state.tick}));
    const before=healthy(),after=damage(before);owner.push(100,5,before);owner.push(106,5.1,after);
    expect(owner.present(5.075)?.structures[0].brokenMask).toBe(0);expect(updates).toEqual([{name:'mesh',mask:0,tick:100},{name:'proxy',mask:0,tick:100}]);
    owner.present(5.1);expect(updates.slice(-2)).toEqual([{name:'mesh',mask:1,tick:106},{name:'proxy',mask:1,tick:106}]);
    owner.present(5.15);expect(updates).toHaveLength(4);expect(owner.present(4)?.tick).toBe(106);
  });
  it('detaches retained state, gives late joins and suspended scene listeners the full current mask, and bounds history',()=>{
    const owner=new CityPresentation(),state=damage(healthy(),31);owner.push(120,6,state);state[0].hp[0]=-999;
    expect(owner.present(5.9)?.structures[0].hp[0]).toBe(65);expect(owner.present(5.9)?.structures[0].brokenMask).toBe(0x80000000);
    let observed=0;const remove=owner.register(current=>{observed=current.structures[0].brokenMask;});expect(observed).toBe(0x80000000);remove();
    for(let i=1;i<30;i++)owner.push(120+i,6+i*.05,damage(healthy(),31));expect(owner.snapshot().history).toBe(8);
    owner.push(3,1,healthy());expect(owner.snapshot().history).toBe(8);expect(new CityPresentation().snapshot().tick).toBeNull();
  });
});
describe('atomic structural network envelope',()=>{
  it('budgets full-precision damaged HP and maximum admitted revisions, retaining the exact damage truth',()=>{
    const state=healthy().map(s=>({...s,revision:1e9,hp:s.hp.map(()=>.0000012345678901234567)})),serialized=JSON.stringify(state),admitted=parseStructures(JSON.parse(serialized),7734)!;
    expect(admitted).toEqual(state);expect(Buffer.byteLength(serialized)).toBeGreaterThan(32768);expect(Buffer.byteLength(serialized)).toBeLessThanOrEqual(49152);
    // Conservatively reserve32 characters per finite positive JS double plus
    // its delimiter, and10 characters each for the admitted mask/revision.
    const bound=state.reduce((bytes,s)=>bytes+Buffer.byteLength(JSON.stringify({...s,revision:1e9,brokenMask:0xffffffff,hp:[]}))+s.hp.length*33,2+state.length-1);
    expect(bound).toBeLessThanOrEqual(49152);expect(admitted[0].hp[0]).toBe(state[0].hp[0]);
  });
  it('copies full banks and rejects stale or cross-room/seed packets without changing the last admitted snapshot',()=>{
    const source=packet(),first=admitStructuralSnapshot(source,null)!;expect(first).toBeTruthy();source.structures[0].hp[0]=0;expect(first.structures[0].hp[0]).toBe(65);
    const next={...packet(damage(healthy())),tick:106,time:5.1};expect(admitStructuralSnapshot(next,first)?.structures[0].brokenMask).toBe(1);
    for(const bad of [{...next,tick:99},{...next,time:4.9},{...next,room:'OTHER'},{...next,seed:4107},{...next,structures:[]},{...next,time:NaN}])expect(admitStructuralSnapshot(bad,first)).toBeNull();
    expect(first.structures[0].brokenMask).toBe(0);expect(Buffer.byteLength(JSON.stringify(next.structures))).toBeLessThanOrEqual(49152);
  });
  it('rejects an invalid bank atomically and cannot restore broken geometry with delayed damage contents',()=>{
    const before=packet(damage(healthy())),bad=packet(healthy());bad.tick=101;bad.time=5.1;
    expect(admitStructuralSnapshot(bad,before)).toBeNull();
    const unknown=packet();unknown.structures[0].id='unrelated-model';expect(admitStructuralSnapshot(unknown,null)).toBeNull();
    const tooLarge=packet();tooLarge.actors=Array(65).fill({});expect(admitStructuralSnapshot(tooLarge,null)).toBeNull();
  });
});

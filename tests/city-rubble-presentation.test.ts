import {INPUT_PROTOCOL_VERSION} from '../shared/inputProtocol';
import {describe,expect,it} from 'vitest';
import {BoxGeometry,Group,Matrix4,Mesh,MeshStandardMaterial,Quaternion,Vector3} from 'three';
import {cityDistrict} from '../shared/cityDistrict';
import {cityFractureCenter} from '../shared/cityFracture';
import asset from '../shared/data/city-fracture-v1.json';
import {WORLD_LAYOUT_VERSION} from '../shared/layout';
import {CITY_RUBBLE_LIFETIME,type CityRubbleState} from '../shared/cityRubble';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';
import {CityPresentation} from '../src/game/world/cityPresentation';
import {CityFractureRenderer} from '../src/game/world/cityFractureRenderer';
import type {GameSnapshot} from '../shared/types';

const district=cityDistrict(7734)!,cell=district.structures[0].cells[3];
// Synthetic complete packet fixtures qualify admission/presentation only.
const rows=(block=cell,born=2):CityRubbleState[]=>asset.pieces.map(p=>({id:`${block.id}:${p.id}`,blockId:block.id,piece:p.id,born,expires:born+CITY_RUBBLE_LIFETIME,position:cityFractureCenter(block,p),rotation:{x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}}));
function packet(rubble=rows(),time=2,tick=120):GameSnapshot {
  const broken=new Set(rubble.map(r=>r.blockId));
  return {experimentalPhysicalRubble:true,worldLayoutVersion:WORLD_LAYOUT_VERSION,inputVersion:INPUT_PROTOCOL_VERSION,tick,time,seed:7734,room:'RUBBLE',mode:'pvp',actors:[],projectiles:[],events:[],fields:[],rubble,cover:[],supplies:[],objectives:[],checkpoint:null,phase:'active',winner:null,
    structures:district.structures.map(s=>({id:s.id,layoutVersion:1,revision:s.cells.some(c=>broken.has(c.id))?1:0,brokenMask:s.cells.reduce((m,c,i)=>broken.has(c.id)?(m|(1<<i))>>>0:m,0),hp:s.cells.map(c=>broken.has(c.id)?0:s.maxHp)}))};
}
describe('bounded replicated physical rubble and its actor presentation clock',()=>{
  it('admits only boolean authority modes, rejects physical state in cosmetic mode and keeps mode immutable',()=>{
    const s=packet();for(const experimentalPhysicalRubble of [undefined,false,1,'true'])expect(admitStructuralSnapshot({...s,experimentalPhysicalRubble},null)).toBeNull();
    const active=admitStructuralSnapshot(s,null)!;expect(admitStructuralSnapshot({...s,tick:121,time:2.1,rubble:[],experimentalPhysicalRubble:false},active)).toBeNull();
    const omitted={...s,rubble:[],experimentalPhysicalRubble:undefined},baseline=admitStructuralSnapshot(omitted,null)!;
    expect(admitStructuralSnapshot({...omitted,tick:121,time:2.1,experimentalPhysicalRubble:true},baseline)).toBeNull();
    expect(admitStructuralSnapshot({...omitted,tick:121,time:2.1,experimentalPhysicalRubble:false},baseline)).not.toBeNull();
  });
  it('admits 3 complete components and detaches every sender transform',()=>{
    const input=packet(district.structures[0].cells.slice(0,3).flatMap(c=>rows(c))),accepted=admitStructuralSnapshot(input,null)!;
    expect(accepted.rubble).toHaveLength(24);expect(accepted.rubble).toEqual(input.rubble);
    input.rubble[0].position.x=NaN;input.rubble[0].rotation.w=0;expect(Number.isFinite(accepted.rubble[0].position.x)).toBe(true);expect(accepted.rubble[0].rotation.w).toBe(1);
  });
  it('rejects incomplete, duplicate, excess, forged, intact and invalid physical states atomically',()=>{
    const mutations:((s:GameSnapshot)=>void)[]=[s=>s.rubble.pop(),s=>{s.rubble[1]=s.rubble[0];},s=>{s.rubble.push(...district.structures[0].cells.slice(0,3).flatMap(c=>rows(c)));},s=>{s.rubble[0].id='forged';},s=>{s.structures[0].hp[3]=65;s.structures[0].brokenMask=0;},s=>{s.rubble[0].position.y=Infinity;},s=>{s.rubble[0].position.x=10000;},s=>{s.rubble[0].rotation.w=.5;},s=>{s.rubble[0].piece=.5;},s=>{s.rubble[0].born=2.1;},s=>{s.rubble[0].expires+=1;},s=>{s.time=10;},s=>{(s as unknown as Record<string,unknown>).rubble=undefined;}];
    for(const mutate of mutations){const input=packet();mutate(input);expect(admitStructuralSnapshot(input,null)).toBeNull();}
  });
  it('removes omitted groups and rejects resurrection even after later empty packets',()=>{
    const first=admitStructuralSnapshot(packet(),null)!;
    const empty={...first,tick:121,time:2.1,rubble:[]};const retired=admitStructuralSnapshot(empty,first)!;expect(retired.rubble).toEqual([]);
    const later=admitStructuralSnapshot({...empty,tick:122,time:2.2},retired)!;
    expect(admitStructuralSnapshot({...first,tick:123,time:2.3},later)).toBeNull();
    const reborn={...first,tick:123,time:2.3,rubble:rows(cell,2.3)};expect(admitStructuralSnapshot(reborn,later)).toBeNull();
  });
  it('a rejected intermediate packet cannot mutate the previous lifetime history',()=>{
    const first=admitStructuralSnapshot(packet(),null)!;
    const invalid={...first,tick:121,time:2.1,rubble:[],cover:[{id:'forged',hp:0,maxHp:1,destroyedAt:2.1}]};
    expect(admitStructuralSnapshot(invalid,first)).toBeNull();expect(admitStructuralSnapshot({...first,tick:122,time:2.2},first)?.rubble).toEqual(first.rubble);
    expect(admitStructuralSnapshot({...first,tick:122,time:2.2,rubble:rows(cell,2.1)},first)).toBeNull();
  });
  it('birth, interpolated translation/rotation and group eviction follow the same buffered clock',()=>{
    const p=new CityPresentation(),first=packet(),second=packet(rows().map(r=>({...r,position:{...r.position,x:r.position.x+2},rotation:{x:0,y:1,z:0,w:0}})),2.1,126);
    p.push(114,1.9,first.structures,[],[],[],true);p.push(first.tick,first.time,first.structures,[],first.rubble,[],true);p.push(second.tick,second.time,second.structures,[],second.rubble,[],true);
    first.rubble[0].position.x+=100; // Caller mutation cannot move presented bodies.
    p.present(1.99);expect(p.sampleRubble()).toEqual([]);p.present(2.05);const shown=p.sampleRubble();expect(shown).toHaveLength(8);
    expect(shown[0].position.x).toBeCloseTo(rows()[0].position.x+1,10);expect(shown[0].rotation.y).toBeCloseTo(Math.SQRT1_2,10);expect(shown[0].rotation.w).toBeCloseTo(Math.SQRT1_2,10);
    p.push(132,2.2,second.structures,[],[],[],true);p.present(2.19);expect(p.sampleRubble()).toHaveLength(8);p.present(2.2);expect(p.sampleRubble()).toEqual([]);p.present(2);expect(p.sampleRubble()).toEqual([]);
  });
  it('holds the latest native pose without ballistic extrapolation and hides at actual expiry',()=>{
    const s=packet(),p=new CityPresentation();p.push(s.tick,s.time,s.structures,[],s.rubble,[],true);p.present(9.999);expect(p.sampleRubble()).toEqual(s.rubble);p.present(10);expect(p.sampleRubble()).toEqual([]);
  });
  it('draws authoritative position/quaternion at source scale exactly once and clears a handoff',()=>{
    const factory=new Group(),geometry=new BoxGeometry(),brick=new MeshStandardMaterial(),steel=new MeshStandardMaterial();brick.name='modular_factory_facade_brick';steel.name='modular_factory_facade_garage';factory.add(new Mesh(geometry,[brick,steel]));
    const renderer=new CityFractureRenderer(district,asset,factory,null),rubble=rows().map(r=>({...r,position:{x:r.piece+10,y:5,z:-9},rotation:{x:0,y:Math.sin(.73/2),z:0,w:Math.cos(.73/2)}}));
    try{
      renderer.updateRubble(rubble,2.5);expect(renderer.diagnostics().visible).toBe(8);
      const batch=renderer.group.children.find(m=>m.visible)! as unknown as {getMatrixAt:(id:number,m:Matrix4)=>Matrix4},m=new Matrix4();
      batch.getMatrixAt(0,m);const pos=new Vector3(),q=new Quaternion(),scale=new Vector3();m.decompose(pos,q,scale);
      expect(pos.toArray()).toEqual([10,5,-9]);expect(q.y).toBeCloseTo(rubble[0].rotation.y,6);expect(scale.toArray().every(s=>Math.abs(s-1)<1e-6)).toBe(true);
      renderer.updateRubble([],2.5);expect(renderer.diagnostics().visible).toBe(0);renderer.updateRubble(rubble,10);expect(renderer.diagnostics().visible).toBe(0);
    }finally{renderer.dispose();geometry.dispose();brick.dispose();steel.dispose();}
  });
});

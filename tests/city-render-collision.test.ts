import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {cityDistrict,cityBlockActive} from '../shared/cityDistrict';
import type {StructureState} from '../shared/types';
import {chunkAt} from '../shared/world';
import {GuestCollisionTiles} from '../src/game/world/guestCollisionTiles';
import {applyCityDamage,buildCityGeometry} from '../src/game/world/cityGeometry';

beforeAll(async()=>{await RAPIER.init();});
const healthy=():StructureState[]=>cityDistrict(7734)!.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)}));
function destroy(states:StructureState[],id:string,cells:number[]){const copy=states.map(s=>({...s,hp:[...s.hp]})),state=copy.find(s=>s.id===id)!;for(const i of cells){state.hp[i]=0;state.brokenMask=(state.brokenMask|1<<i)>>>0;}state.revision++;return copy;}
describe('city mesh and scene-owned physics share exact persistent solids',()=>{
  it('retires a hit facade cell but retains its neighbor, through tile eviction, late join and invalid restoration',()=>{
    const district=cityDistrict(7734)!,definition=district.structures.find(s=>s.id.endsWith(':facade'))!,cell=definition.cells[2],neighbor=definition.cells[3],world=new RAPIER.World({x:0,y:-22,z:0}),owner=new GuestCollisionTiles(world,7734,'coop'),before=healthy();
    owner.syncStructures(before);owner.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));world.step();
    const hit=(block:typeof cell)=>world.castRay(new RAPIER.Ray({x:block.position[0]+2,y:block.position[1],z:block.position[2]},{x:-1,y:0,z:0}),3,true);
    expect(hit(cell)).toBeTruthy();expect(hit(neighbor)).toBeTruthy();const collider=hit(cell)!.collider;
    const after=destroy(before,definition.id,[2]);expect(owner.syncStructures(after)).toBe(true);world.step();expect(collider.isValid()).toBe(false);expect(hit(cell)).toBeNull();expect(hit(neighbor)).toBeTruthy();
    expect(owner.syncStructures(before)).toBe(false);owner.sync(7,7);owner.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));world.step();expect(hit(cell)).toBeNull();expect(hit(neighbor)).toBeTruthy();
    owner.dispose();expect(world.colliders.len()).toBe(0);
    const late=new GuestCollisionTiles(world,7734,'coop');late.syncStructures(after);late.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));world.step();expect(hit(cell)).toBeNull();expect(hit(neighbor)).toBeTruthy();late.dispose();world.free();
  });
  it('removes precisely a dependent roof and its attached detail while retaining the surrounding floor, wall and supported sectors',()=>{
    const district=cityDistrict(7734)!,deck=district.blocks.find(b=>b.support)!,support=district.structures.find(s=>s.id===deck.support!.structureId)!,after=destroy(healthy(),support.id,support.cells.slice(0,5).map(c=>c.cellId!)),batches=buildCityGeometry(district);
    expect(cityBlockActive(deck,after)).toBe(false);applyCityDamage(batches,after);
    const removed=batches.flatMap(b=>b.ranges.filter(r=>r.block.id===deck.id).map(r=>({batch:b,range:r})));expect(removed.length).toBeGreaterThan(1);
    for(const {batch,range} of removed){const index=batch.geometry.index!;expect(new Set(Array.from({length:range.count},(_,i)=>index.getX(range.start+i))).size).toBe(1);}
    for(const batch of batches)for(const range of batch.ranges)if(cityBlockActive(range.block,after))expect(Array.from({length:range.count},(_,i)=>batch.geometry.index!.getX(range.start+i))).toEqual(range.indices);
    const world=new RAPIER.World({x:0,y:-22,z:0}),owner=new GuestCollisionTiles(world,7734,'coop');owner.syncStructures(healthy());owner.sync(chunkAt(deck.position[0]),chunkAt(deck.position[2]));world.step();
    const down=()=>world.castRay(new RAPIER.Ray({x:deck.position[0]+1.5,y:deck.position[1]+3,z:deck.position[2]},{x:0,y:-1,z:0}),12,true);
    const initial=down()!;expect(initial.collider.translation().y).toBeCloseTo(deck.position[1],4);expect(owner.syncStructures(after)).toBe(true);world.step();const floor=down()!;expect(floor.collider.translation().y).toBeLessThan(deck.position[1]-5);
    owner.dispose();world.free();for(const batch of batches)batch.geometry.dispose();
  });
  it('keeps finite batched geometry and bounded budgets without a duplicated road surface',()=>{
    const district=cityDistrict(7734)!,batches=buildCityGeometry(district);expect(district.blocks.length).toBeLessThanOrEqual(1200);expect(batches.length).toBeLessThanOrEqual(8);expect(batches.some(b=>b.surface==='road'||b.surface==='marking')).toBe(false);
    let triangles=0;for(const batch of batches){triangles+=batch.geometry.index!.count/3;for(const attribute of Object.values(batch.geometry.attributes))expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);batch.geometry.dispose();}
    expect(triangles).toBeLessThan(125000);
  });
});

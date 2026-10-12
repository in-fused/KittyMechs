import fs from 'node:fs';
import {Quaternion,Vector3} from 'three';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../shared/simulation';
import {cityDistrict} from '../shared/cityDistrict';
import {parseInput,parseStructures} from '../shared/protocol';
import {emptyInput,type CombatEvent,type GameSnapshot} from '../shared/types';
import {chunkAt} from '../shared/world';
import {CityDebrisPool,CITY_DEBRIS_LIMIT,CITY_DEBRIS_LIFETIME,sampleCityFragment} from '../src/game/world/cityFragments';
import {CityPresentation} from '../src/game/world/cityPresentation';
import {buildCityGeometry,applyCityDamage,type CityBatch} from '../src/game/world/cityGeometry';
import {GuestCollisionTiles} from '../src/game/world/guestCollisionTiles';

const district=cityDistrict(7734)!,bank=district.structures[0],cell=bank.cells[3],neighbor=bank.cells[4];
type BreakReceipt={before:GameSnapshot;after:GameSnapshot;late:GameSnapshot;event:CombatEvent;inputs:unknown[]};
const receipts:BreakReceipt[]=[];
/** Two controlled supported source placements with REAL unchanged pulse/KCC
 * logic. Source damage comes only from parsed input; no private damage method,
 * mask/HP/velocity/clock mutation. This is not a normal-spawn route proof. */
function acceptedBreak(interior:boolean):BreakReceipt {
  const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp'),source=sim.addActor('pilot','Fracture pilot','pounce',false,{x:interior?109:123,y:.92,z:cell.position[2]}),inputs:unknown[]=[];
  let seq=0;const frames:unknown[]=[];
  const step=(fire=false)=>{const input=parseInput({...emptyInput(),seq:++seq,jumpEpoch:source.jumpEpoch,yaw:interior?-Math.PI/2:Math.PI/2,fire});if(!input)throw Error('Invalid fracture input');inputs.push({tick:sim.tick,input});sim.setInput(source.id,input);sim.step(1/60);frames.push({tick:sim.tick,time:sim.time,source:structuredClone(source),projectiles:structuredClone(sim.projectiles),bank:structuredClone(sim.structures[0]),events:structuredClone(sim.events)});};
  try{
    for(let i=0;i<60;i++)step();expect(source.grounded).toBe(true);const before=sim.snapshot();let event:CombatEvent|undefined;
    for(let i=0;i<180&&!event;i++){step(true);event=sim.events.find(e=>e.type==='structure-break'&&e.structureId===bank.id&&e.cellId===3);}
    if(!event)throw Error(`Accepted ${interior?'interior':'exterior'} pulses did not break source cell`);
    const after=sim.snapshot();expect(source.pulseAt).toBeGreaterThan(1);expect(after.structures[0].brokenMask).toBe(8);expect(after.structures[0].hp.filter(h=>h<65)).toHaveLength(1);expect(after.structures[0].hp[3]).toBe(0);expect(after.structures[0].hp[4]).toBe(65);
    for(let i=0;i<240;i++)step();const late=sim.snapshot();expect(late.events.some(e=>e.type==='structure-break')).toBe(false);
    return {before,after,late,event:structuredClone(event),inputs};
  }finally{const out=process.env.CITY_FRACTURE_EVIDENCE;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/native-${interior?'interior':'exterior'}.json`,JSON.stringify({inputs,frames,final:sim.snapshot()},null,2));}sim.dispose();world.free();}
}
beforeAll(async()=>{await RAPIER.init();receipts.push(acceptedBreak(false),acceptedBreak(true));const out=process.env.CITY_FRACTURE_EVIDENCE;if(out){fs.mkdirSync(out,{recursive:true});receipts.forEach((r,i)=>fs.writeFileSync(`${out}/accepted-${i?'interior':'exterior'}.json`,JSON.stringify(r,null,2)));}},30000);
const breaks=(receipt:BreakReceipt)=>receipt.after.events.filter(e=>e.type==='structure-break');
const indices=(batches:CityBatch[],id:string)=>batches.flatMap(b=>b.ranges.filter(r=>r.block.id===id).map(r=>Array.from({length:r.count},(_,i)=>b.geometry.index!.getX(r.start+i))));

// Geometry-only CPU assertions exercise the exact shared renderer transform;
// these are cosmetic component tests, not rubble physics qualification.
describe('accepted structural breaks drive original component fracture presentation',()=>{
  it('uses real opposite winning pulse directions and repeats deterministic source components/transforms',()=>{
    const [outside,inside]=receipts;expect(outside.event.incoming!.x).toBeCloseTo(-1,6);expect(inside.event.incoming!.x).toBeCloseTo(1,6);expect(outside.event.normal!.x).toBeCloseTo(1,6);expect(inside.event.normal!.x).toBeCloseTo(-1,6);
    const pools=receipts.map(r=>{const pool=new CityDebrisPool(district);pool.update(breaks(r),r.after.structures,r.after.time);return pool;});
    for(let j=0;j<pools.length;j++){
      const pool=pools[j],receipt=receipts[j],repeat=new CityDebrisPool(district);repeat.update(breaks(receipt),receipt.after.structures,receipt.after.time);
      expect(pool.fragments).toHaveLength(8);expect(pool.fragments).toEqual(repeat.fragments);expect(new Set(pool.fragments.map(f=>f.piece)).size).toBe(8);
      for(const f of pool.fragments){expect(f.blockId).toBe(cell.id);expect(f.piece).toBeGreaterThanOrEqual(0);expect(f.piece).toBeLessThan(8);expect(f.size).toEqual({x:cell.halfExtents[0]*2,y:cell.halfExtents[1]*2,z:cell.halfExtents[2]*2});
        const born=sampleCityFragment(f,f.at);expect(born.visible).toBe(true);expect(born.position).toEqual(f.position);expect(born.size).toEqual(f.size);const yaw=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),f.yaw);for(const k of ['x','y','z','w'] as const)expect(born.quaternion[k]).toBeCloseTo(yaw[k],12);const sampled=sampleCityFragment(f,f.at+.25);expect(Math.hypot(sampled.quaternion.x,sampled.quaternion.y,sampled.quaternion.z,sampled.quaternion.w)).toBeCloseTo(1,12);expect(sampled.position.x).toBeCloseTo(f.position.x+f.velocity.x*.25,12);expect(sampled.position.y).toBeCloseTo(f.position.y+f.velocity.y*.25-11*.25*.25,12);
        for(const [k,i] of [['x',0],['y',1],['z',2]] as const)expect(Math.abs(born.position[k]-cell.position[i])).toBeLessThanOrEqual(cell.halfExtents[i]+1e-6);
        expect(sampleCityFragment(f,f.at+.25)).toEqual(sampleCityFragment(repeat.fragments.find(g=>g.piece===f.piece)!,f.at+.25));
      }
    }
    expect(pools[0].fragments.reduce((n,f)=>n+f.velocity.x,0)/8).toBeLessThan(-1);expect(pools[1].fragments.reduce((n,f)=>n+f.velocity.x,0)/8).toBeGreaterThan(1);
    // Impact-point sides differ, but pieces originate at the same real cell.
    expect(pools[0].fragments.map(f=>f.position)).toEqual(pools[1].fragments.map(f=>f.position));
  });
  it('waits for the displayed clock AND mask, removes only the actual cell, and preserves every intact neighbor index/collider',()=>{
    const r=receipts[0],presentation=new CityPresentation(),pool=new CityDebrisPool(district),world=new RAPIER.World({x:0,y:-22,z:0}),guest=new GuestCollisionTiles(world,7734,'pvp'),batches=buildCityGeometry(district);
    try{
      guest.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));const collider=guest.buildingCollider(cell.id)!,adjacent=guest.buildingCollider(neighbor.id)!,adjacentHandle=adjacent.handle;
      expect(collider.isValid()).toBe(true);const intact=indices(batches,neighbor.id);expect(intact.length).toBeGreaterThan(0);
      const untouched=new Map(district.blocks.filter(b=>b.id!==cell.id).map(b=>[b.id,indices(batches,b.id)]));
      presentation.register(s=>{applyCityDamage(batches,s.structures);expect(guest.syncStructures(s.structures)).toBe(true);});presentation.push(r.before.tick,r.before.time,r.before.structures);presentation.push(r.after.tick,r.after.time,r.after.structures);
      presentation.present(r.event.at-1e-6);pool.update(breaks(r),presentation.read()!.structures,presentation.readClock());expect(pool.fragments).toHaveLength(0);expect(guest.buildingCollider(cell.id)).toBe(collider);expect(indices(batches,neighbor.id)).toEqual(intact);
      // Clock eligibility alone cannot reveal shards against an intact mask.
      pool.update(breaks(r),r.before.structures,r.event.at);expect(pool.fragments).toHaveLength(0);
      presentation.present(r.after.time);pool.update(breaks(r),presentation.read()!.structures,presentation.readClock());expect(pool.fragments).toHaveLength(8);expect(guest.buildingCollider(cell.id)).toBeUndefined();expect(collider.isValid()).toBe(false);
      expect(guest.buildingCollider(neighbor.id)!.handle).toBe(adjacentHandle);expect(adjacent.isValid()).toBe(true);for(const [id,values]of untouched)expect(indices(batches,id)).toEqual(values);
      for(const range of indices(batches,cell.id))expect(new Set(range).size).toBe(1);
      const f=pool.fragments[0],a=sampleCityFragment(f,r.after.time+.01),b=sampleCityFragment(f,r.after.time+.02);expect(b.position).not.toEqual(a.position);
      pool.update(breaks(r),presentation.read()!.structures,r.after.time+.1);expect(pool.fragments).toHaveLength(8);
    }finally{batches.forEach(b=>b.geometry.dispose());guest.dispose();world.free();}
  });
  it('late snapshot and chunk eviction retain the actual permanent opening without replaying expired rubble',()=>{
    const r=receipts[0],packet=JSON.parse(JSON.stringify(r.late)) as GameSnapshot,admitted=parseStructures(packet.structures,7734);expect(admitted).toEqual(r.after.structures);
    const world=new RAPIER.World({x:0,y:-22,z:0}),guest=new GuestCollisionTiles(world,7734,'pvp'),pool=new CityDebrisPool(district),batches=buildCityGeometry(district);
    try{
      expect(guest.syncStructures(admitted!)).toBe(true);guest.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));applyCityDamage(batches,admitted!);
      const ray=new RAPIER.Ray({x:122,y:1.5,z:cell.position[2]},{x:-1,y:0,z:0});world.step();expect(world.castRay(ray,10,true)).toBeNull();expect(guest.buildingCollider(cell.id)).toBeUndefined();expect(guest.buildingCollider(neighbor.id)!.isValid()).toBe(true);
      guest.sync(-8,-8);guest.sync(chunkAt(cell.position[0]),chunkAt(cell.position[2]));world.step();expect(world.castRay(ray,10,true)).toBeNull();expect(guest.buildingCollider(cell.id)).toBeUndefined();expect(guest.buildingCollider(neighbor.id)!.isValid()).toBe(true);
      pool.update(packet.events,admitted!,packet.time);pool.update(breaks(r),admitted!,packet.time);expect(pool.fragments).toHaveLength(0);for(const range of indices(batches,cell.id))expect(new Set(range).size).toBe(1);
    }finally{batches.forEach(b=>b.geometry.dispose());guest.dispose();world.free();}
  });
  it('bounds synthetic presentation bursts to48 components and2.8s, never duplicates actual event replay',()=>{
    const r=receipts[0],pool=new CityDebrisPool(district);expect(CITY_DEBRIS_LIMIT).toBe(48);expect(CITY_DEBRIS_LIFETIME).toBe(2.8);
    pool.update(breaks(r),r.after.structures,r.after.time);const keys=pool.fragments.map(f=>f.key);pool.update(breaks(r),r.after.structures,r.after.time+.05);expect(pool.fragments.map(f=>f.key)).toEqual(keys);
    // A different event ID for the SAME canonical cell is replay, not another
    // physical component burst. Preserve its already admitted piece keys.
    pool.update([{...r.event,id:r.event.id+100}],r.after.structures,r.after.time);expect(pool.fragments.map(f=>f.key)).toEqual(keys);
    // SYNTHETIC presentation-only distinct catalog-cell flood and corresponding
    // detached masks test capacity. No source contact/damage claim comes from
    // these fabricated packets; both real source receipts above remain intact.
    const many=r.after.structures.map(s=>({...s,hp:[...s.hp]})),state=many.find(s=>s.id===bank.id)!;state.hp.fill(0);state.brokenMask=0xffffffff;state.revision++;
    const flood=bank.cells.map((c,i)=>({...r.event,id:r.event.id+200+i,cellId:i,position:{x:c.position[0]+c.halfExtents[0],y:c.position[1],z:c.position[2]}}));pool.update(flood,many,r.after.time);expect(pool.fragments).toHaveLength(48);expect(new Set(pool.fragments.map(f=>f.key)).size).toBe(48);
    for(const f of pool.fragments){expect(sampleCityFragment(f,f.at-1e-6).visible).toBe(false);expect(sampleCityFragment(f,f.at+2.8).visible).toBe(false);}
    pool.update([...breaks(r),...flood],many,r.event.at+2.8);expect(pool.fragments).toHaveLength(0);pool.update(breaks(r),r.after.structures,r.event.at+10);expect(pool.fragments).toHaveLength(0);
  });
});

import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {buildOverhaulDistrict} from '../shared/overhaulDistrict';
import {buildOverhaulArchitecture,getOverhaulArchitectureComponent,isOverhaulArchitectureBlock,overhaulArchitectureFaces,OVERHAUL_ARCHITECTURE_SPECS} from '../shared/overhaulArchitecture';
import {compileOverhaulSupport,resolveOverhaulSupport} from '../shared/overhaulSupport';
import {buildingFaces,faceLanding,facePoint} from '../shared/buildingSurfaces';
import type {CityDistrict} from '../shared/cityDistrict';
import type {StructureState} from '../shared/types';
import {Simulation} from '../shared/simulation';
import {admitStructuralSnapshot} from '../src/game/snapshotAdmission';

const compiled=buildOverhaulDistrict(7734)!;
const canonical:CityDistrict={...compiled,blocks:compiled.blocks.filter(b=>!isOverhaulArchitectureBlock(b)),structures:compiled.structures.filter(s=>!isOverhaulArchitectureBlock(s.buildingId))};
const original=JSON.stringify({blocks:canonical.blocks,structures:canonical.structures,buildings:canonical.buildings});
const architecture=buildOverhaulArchitecture(canonical);
const district:CityDistrict={...canonical,blocks:[...canonical.blocks,...architecture.blocks],structures:[...canonical.structures,...architecture.structures]};
const graph=compileOverhaulSupport(district);
const initial=():StructureState[]=>district.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)}));
const breakCell=(states:StructureState[],bank:string,index:number)=>{const s=states.find(s=>s.id===bank)!;s.hp[index]=0;s.brokenMask=(s.brokenMask|1<<index)>>>0;s.revision++;};
beforeAll(async()=>{await RAPIER.init();});

describe('candidate002 exact roof architecture',()=>{
  it('appends the artist 39-cuboid recipe without modifying any canonical identity or pose',()=>{
    expect(canonical.blocks).toHaveLength(1084);expect(architecture.blocks).toHaveLength(39);expect(district.blocks).toHaveLength(1123);
    expect(JSON.stringify({blocks:canonical.blocks,structures:canonical.structures,buildings:canonical.buildings})).toBe(original);
    expect(architecture.structures.map(s=>s.cells.length)).toEqual([14,10,3,12]);
    expect(new Set(district.blocks.map(b=>b.id)).size).toBe(1123);
    expect(buildOverhaulArchitecture(canonical).blocks).toEqual(architecture.blocks);
    for(const b of architecture.blocks){expect(b.yaw).toBe(0);expect(b.halfExtents.every(n=>n>0)).toBe(true);expect(getOverhaulArchitectureComponent(b)).toEqual(architecture.components.get(b.id));}
    expect(resolveOverhaulSupport(graph,initial()).brokenBlockIds).toEqual([]);
  });
  it('losing any original quarter retires the entire attached roof assembly, retaining other roofs',()=>{
    for(const spec of OVERHAUL_ARCHITECTURE_SPECS)for(let quarter=0;quarter<4;quarter++){
      const states=initial();breakCell(states,`7734:overhaul:${spec.lot}:roof-bank`,quarter);
      const closure=resolveOverhaulSupport(graph,states),members=architecture.blocks.filter(b=>getOverhaulArchitectureComponent(b)?.assemblyId.endsWith(':'+spec.id));
      for(const b of members)expect(closure.unsupportedBlockIds,b.id).toContain(b.id);
      expect(closure.detachedClusters.flatMap(c=>c.parts).filter(p=>members.some(b=>b.id===p.blockId))).toHaveLength(members.length);
      expect(closure.brokenBlockIds.filter(id=>isOverhaulArchitectureBlock(id))).toHaveLength(members.length);
    }
  });
  it('one real wall failure drops its dependent cap without taking the pad or adjacent cap',()=>{
    const bank=architecture.structures[0],wall=bank.cells.find(b=>b.id.endsWith(':north-0'))!,cap=bank.cells.find(b=>b.id.endsWith(':cap-0'))!;
    const states=initial();breakCell(states,bank.id,wall.cellId!);const closure=resolveOverhaulSupport(graph,states);
    expect(closure.unsupportedBlockIds).toContain(cap.id);expect(closure.brokenBlockIds).not.toContain(bank.cells[0].id);
    expect(closure.brokenBlockIds).not.toContain(bank.cells.find(b=>b.id.endsWith(':cap-1'))!.id);
  });
  it('keeps the full perimeter band and leaves actual guarded roof/patrol/objective hardware owners unchanged',()=>{
    for(const spec of OVERHAUL_ARCHITECTURE_SPECS){const b=canonical.buildings.find(b=>b.id.endsWith(':'+spec.lot))!;
      expect(b.width/2-Math.abs(spec.center[0]-b.position.x)-spec.width/2).toBeGreaterThanOrEqual(4.2-1e-7);
      expect(b.depth/2-Math.abs(spec.center[2]-b.position.z)-spec.depth/2).toBeGreaterThanOrEqual(4.2-1e-7);
    }
    const guardOwners=canonical.npcs.filter(n=>n.roofId).map(n=>n.roofId!.replace(/:roof$/,''));
    expect(OVERHAUL_ARCHITECTURE_SPECS.some(s=>guardOwners.includes('7734:overhaul:'+s.lot))).toBe(false);
    const monitor=architecture.blocks.filter(b=>b.buildingId.endsWith(':station-lantern'));
    // Actual uplink roof terminal at (-33,-59), including the full Anchor hull.
    for(const b of monitor){const dx=Math.max(0,Math.abs(-33-b.position[0])-b.halfExtents[0]),dz=Math.max(0,Math.abs(-59-b.position[2])-b.halfExtents[2]);expect(Math.hypot(dx,dz),b.id).toBeGreaterThan(2.05+.15);}
  });
  it('compiles source-owned finite faces and refuses falsely broad landing footprints',()=>{
    const faces=overhaulArchitectureFaces(district.blocks);expect(faces.length).toBeGreaterThan(0);
    for(const f of faces){expect(f.supportingBlockIds.length).toBeGreaterThan(0);expect(f.roofBlockIds).toHaveLength(1);
      const roof=district.blocks.find(b=>b.id===f.roofBlockIds[0])!;
      expect(f.roofCenter.y).toBeCloseTo(roof.position[1]+roof.halfExtents[1],8);
      expect(f.roofHalfExtents).toEqual({x:roof.halfExtents[0],z:roof.halfExtents[2]});
      expect(faceLanding(f,0,1.75),f.id).toBeNull();expect(faceLanding(f,0,2.05),f.id).toBeNull();
    }
    // Production compile must publish these same descriptors after integration.
    expect(buildingFaces(7734).filter(f=>isOverhaulArchitectureBlock(f.buildingId))).toEqual(faces);
  });
  it('native monitor interior stays hollow and a broken cap cannot supply its old roof hit',()=>{
    const world=new RAPIER.World({x:0,y:-9.81,z:0});
    try{
      const refs=new Map<string,RAPIER.Collider>();
      for(const b of architecture.blocks){const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...b.position));refs.set(b.id,world.createCollider(RAPIER.ColliderDesc.cuboid(...b.halfExtents),body));}
      world.step();
      expect(world.intersectionWithShape({x:-32,y:9.4,z:23},{x:0,y:0,z:0,w:1},new RAPIER.Ball(.2))).toBeNull();
      const cap=architecture.blocks.find(b=>b.id.endsWith(':loading-monitor:cap-0'))!,face=architecture.faces.find(f=>f.roofBlockIds[0]===cap.id&&f.side==='south')!;
      const p=facePoint(face,0,face.minY+.3),wallHit=world.castRayAndGetNormal(new RAPIER.Ray({x:p.x+face.normal.x*.1,y:p.y,z:p.z+face.normal.z*.1},{x:-face.normal.x,y:0,z:-face.normal.z}),.2,false);
      expect(wallHit).not.toBeNull();expect(face.supportingBlockIds).toContain([...refs].find(([,c])=>c.handle===wallHit!.collider.handle)![0]);
      // The lower plate's east edge is behind the real step riser (.06m
      // farther out). Nearest-hit ownership must reject that hidden plane.
      const hidden=architecture.faces.find(f=>f.roofBlockIds[0]===cap.id&&f.side==='east')!,q=facePoint(hidden,0,hidden.minY+.3);
      const occluder=world.castRayAndGetNormal(new RAPIER.Ray({x:q.x+.1,y:q.y,z:q.z},{x:-1,y:0,z:0}),.2,false)!;
      const blocker=[...refs].find(([,c])=>c.handle===occluder.collider.handle)![0];
      expect(blocker).toBe(cap.buildingId+':step-riser-0');expect(hidden.supportingBlockIds).not.toContain(blocker);
      const top=()=>world.castRayAndGetNormal(new RAPIER.Ray({x:cap.position[0],y:cap.position[1]+.5,z:cap.position[2]},{x:0,y:-1,z:0}),.7,false);
      expect(top()?.collider.handle).toBe(refs.get(cap.id)!.handle);world.removeCollider(refs.get(cap.id)!,true);world.step();expect(top()).toBeNull();
    }finally{world.free();}
  });
  it('production support retirement removes original carriers and publishes persistent source pieces to guests',()=>{
    const world=new RAPIER.World({x:0,y:-22,z:0}),sim=new Simulation(world,7734,'pvp');
    const internal=sim as unknown as {buildingCollider(id:string):RAPIER.Collider|undefined;damageCell(b:typeof compiled.blocks[number],amount:number,owner:string,point:{x:number;y:number;z:number},incoming:{x:number;y:number;z:number},normal:{x:number;y:number;z:number}):void};
    try{
      sim.syncChunks(compiled.buildings.map(b=>b.position));world.step();
      const members=compiled.blocks.filter(b=>b.buildingId.endsWith(':architecture:loading-monitor'));
      expect(members).toHaveLength(14);for(const b of members)expect(internal.buildingCollider(b.id)).toBeDefined();
      const quarter=compiled.blocks.find(b=>b.id==='7734:overhaul:spawn-west:roof-0')!;
      internal.damageCell(quarter,1e6,'qualification',{x:quarter.position[0],y:quarter.position[1],z:quarter.position[2]},{x:0,y:-1,z:0},{x:0,y:1,z:0});
      for(const b of members)expect(internal.buildingCollider(b.id),b.id).toBeUndefined();
      const packet=sim.snapshot();
      const persistentIds=new Set(packet.ruins!.map(r=>compiled.blocks[r.block].id));
      for(const b of members)expect(persistentIds,b.id).toContain(b.id);
      expect(admitStructuralSnapshot(packet,null)).not.toBeNull();
      expect(internal.buildingCollider('7734:overhaul:architecture:station-lantern:pad')).toBeDefined();
    }finally{sim.dispose();world.free();}
  });
});

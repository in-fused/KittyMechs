import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import type {CityDistrict} from '../shared/cityDistrict';
import type {StructureState} from '../shared/types';
import {buildOverhaulDistrict,getOverhaulComponent} from '../shared/overhaulDistrict';
import {buildRainlineExtraction039,isRainlineExtraction039Block,RAINLINE_EXTRACTION039_PREFIX,RAINLINE_EXTRACTION039_SPECS} from '../shared/rainlineExtraction039';
import {buildingFaces,faceCoordinates,faceLanding,facePoint} from '../shared/buildingSurfaces';
import {compileOverhaulSupport,overhaulContactLive,resolveOverhaulSupport, type OverhaulContactReceipt} from '../shared/overhaulSupport';
import {cityBlockColliderDesc} from '../shared/rainlineStreetAdmission';
import {actorHullRadius,actorClimbHeight} from '../shared/config';
import {overhaulCornerCandidates,overhaulCornerSample} from '../shared/overhaulCornerClimb';

const district=buildOverhaulDistrict(7734)!,added=district.blocks.filter(isRainlineExtraction039Block),graph=compileOverhaulSupport(district);
const baselineText=readFileSync(new URL('../tools/overhaul-extraction-039/legacy031-district.json',import.meta.url),'utf8');
const legacy=JSON.parse(baselineText) as CityDistrict;
const initial=():StructureState[]=>district.structures.map(s=>({id:s.id,layoutVersion:1,revision:0,brokenMask:0,hp:s.cells.map(()=>s.maxHp)}));
function breakCell(states:StructureState[],id:string,cell:number){const s=states.find(s=>s.id===id)!;s.hp[cell]=0;s.brokenMask=(s.brokenMask|1<<cell)>>>0;s.revision++;}
beforeAll(async()=>{await RAPIER.init();});

describe('extraction039 appended structural pocket',()=>{
  it('preserves every full031 identity, pose, wire index and existing admission order',()=>{
    expect(createHash('sha256').update(baselineText).digest('hex')).toBe('7d38f7477823e8f758967efe67e606fb5293f8bceab5d7655ad3cce391712d2c');
    expect(legacy.blocks).toHaveLength(1193);expect(legacy.structures).toHaveLength(197);expect(legacy.buildings).toHaveLength(21);
    for(const key of ['blocks','structures','buildings','approaches'] as const)expect(district[key].slice(0,legacy[key].length),key).toEqual(legacy[key]);
    for(const key of ['streets','grading','npcs'] as const)expect(district[key],key).toEqual(legacy[key]);
    expect(added).toHaveLength(135);expect(added.length).toBeLessThanOrEqual(150);
    expect(district.blocks.slice(legacy.blocks.length)).toEqual(added);expect(new Set(district.blocks.map(b=>b.id)).size).toBe(district.blocks.length);
    expect(buildRainlineExtraction039(legacy).blocks).toEqual(added);
    expect(()=>buildRainlineExtraction039(district)).toThrow('append once');
    for(const block of added){expect(getOverhaulComponent(block)).toBeDefined();expect(block.halfExtents.every(n=>n>0)).toBe(true);expect(block.yaw).toBe(0);expect(district.structures.find(s=>s.id===block.structureId)!.cells[block.cellId!]).toBe(block);}
    expect(resolveOverhaulSupport(graph,initial()).brokenBlockIds).toEqual([]);
  });
  it('keeps graded bounds and the full mission spine, objectives and legacy roads open',()=>{
    const low=added.filter(b=>b.position[1]+b.halfExtents[1]>0&&b.position[1]-b.halfExtents[1]<3.8);
    for(const b of added){expect(b.position[0]-b.halfExtents[0],b.id).toBeGreaterThanOrEqual(-72);expect(b.position[0]+b.halfExtents[0],b.id).toBeLessThanOrEqual(72);expect(b.position[2]-b.halfExtents[2],b.id).toBeGreaterThanOrEqual(-118);expect(b.position[2]+b.halfExtents[2],b.id).toBeLessThanOrEqual(72);}
    for(const b of low)expect(Math.abs(b.position[0])-b.halfExtents[0],b.id).toBeGreaterThanOrEqual(8);
    const clearance=(x:number,z:number)=>Math.min(...low.map(b=>Math.hypot(Math.max(0,Math.abs(x-b.position[0])-b.halfExtents[0]),Math.max(0,Math.abs(z-b.position[2])-b.halfExtents[2]))));
    for(const street of legacy.streets){const [a,b]=street.points,len=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<=len;d+=.5){const t=d/len;expect(clearance(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),street.id).toBeGreaterThanOrEqual(2.2);}}
    for(const p of [{x:0,z:-108},{x:0,z:-76},{x:-8,z:12}])expect(clearance(p.x,p.z)).toBeGreaterThanOrEqual(4.5);
    // Positive volume intersection excludes flush foundation contact. Existing
    // street owners retain their actual convex colliders in the native test.
    for(const a of added)for(const b of legacy.blocks)expect(a.position.some((n,axis)=>Math.abs(n-b.position[axis])>=a.halfExtents[axis]+b.halfExtents[axis]-1e-7),`${a.id} intersects legacy ${b.id}`).toBe(true);
  });
  it('preserves a sector with one lost post, then removes its beam, roof, facade and stale contacts after bearing-line loss',()=>{
    for(const spec of RAINLINE_EXTRACTION039_SPECS){
      const id=RAINLINE_EXTRACTION039_PREFIX+spec.id,states=initial(),roof=graph.byBlock.get(id+':roof-0')!,wall=graph.byBlock.get(id+':facade-north-0-0')!;
      const receipt=(node:typeof roof,surface:'wall'|'roof',anchorId:string):OverhaulContactReceipt=>({generation:39,blockId:node.blockId,structureId:node.structureId,cellId:node.cellId,revision:0,surface,anchorId});
      const roofReceipt=receipt(roof,'roof',id+':grip-west'),wallReceipt=receipt(wall,'wall',id+':grip-north');
      breakCell(states,id+':frame-bank',0);expect(resolveOverhaulSupport(graph,states).unsupportedBlockIds).toEqual([]);
      breakCell(states,id+':frame-bank',1);const closure=resolveOverhaulSupport(graph,states);
      expect(closure.unsupportedBlockIds).toContain(id+':beam-0-0');expect(closure.unsupportedBlockIds).toContain(roof.blockId);expect(closure.unsupportedBlockIds).toContain(wall.blockId);
      expect(overhaulContactLive(roofReceipt,graph,states,39,closure)).toBe(false);expect(overhaulContactLive(wallReceipt,graph,states,39,closure)).toBe(false);
      for(let sector=1;sector<4;sector++)expect(closure.brokenBlockIds).not.toContain(id+':roof-'+sector);
      const floorLoss=initial();breakCell(floorLoss,id+':foundation-bank',0);
      expect(new Set(resolveOverhaulSupport(graph,floorLoss).brokenBlockIds)).toEqual(new Set(added.filter(b=>b.buildingId===id).map(b=>b.id)));
    }
  });
  it('publishes only actual exterior wall cells and lands on the supported roof footprint',()=>{
    const faces=buildingFaces(7734).filter(f=>isRainlineExtraction039Block(f.buildingId));expect(faces).toHaveLength(12);
    const world=new RAPIER.World({x:0,y:-9.81,z:0}),refs=new Map<string,RAPIER.Collider>();
    try{
      for(const b of added)refs.set(b.id,world.createCollider(RAPIER.ColliderDesc.cuboid(...b.halfExtents).setTranslation(...b.position)));world.step();
      for(const f of faces){
        expect(f.supportingBlockIds.length,f.id).toBeGreaterThan(0);
        for(const id of f.supportingBlockIds){const b=graph.byBlock.get(id)!.block,q=faceCoordinates(f,{x:b.position[0],y:b.position[1],z:b.position[2]});expect(q.normal+Math.abs(f.normal.x)*b.halfExtents[0]+Math.abs(f.normal.z)*b.halfExtents[2],id).toBeCloseTo(0,8);}
        // Positive-z half of front facades is the real remaining wall.
        const b=district.buildings.find(b=>b.id===f.buildingId)!,at={x:b.position.x,y:b.position.y+1.5,z:b.position.z+b.depth/4},t=faceCoordinates(f,at).tangent,p=facePoint(f,t,at.y);
        const hit=world.castRayAndGetNormal(new RAPIER.Ray({x:p.x+f.normal.x*.2,y:p.y,z:p.z+f.normal.z*.2},{x:-f.normal.x,y:0,z:-f.normal.z}),.4,false);
        expect(hit,f.id).not.toBeNull();expect(f.supportingBlockIds).toContain([...refs].find(([,c])=>c.handle===hit!.collider.handle)![0]);
        const landing=faceLanding(f,0,1.75)!;expect(landing,f.id).not.toBeNull();
        const roofHit=world.castRayAndGetNormal(new RAPIER.Ray({...landing,y:landing.y+.5},{x:0,y:-1,z:0}),.7,false);
        expect(roofHit,f.id).not.toBeNull();expect(f.roofBlockIds).toContain([...refs].find(([,c])=>c.handle===roofHit!.collider.handle)![0]);
      }
      for(const spec of RAINLINE_EXTRACTION039_SPECS){const sign=spec.front==='east'?1:-1,front=spec.x+sign*spec.width/2,y=district.grading.height;
        // A complete tall Pounce-sized hull fits on the apron and inside the
        // actual five-metre loading opening; neither volume has a box shell.
        for(const offset of [3,-3])expect(world.intersectionWithShape({x:front+sign*offset,y:y+1.96,z:spec.z-spec.depth/4},{x:0,y:0,z:0,w:1},new RAPIER.RoundCylinder(1.78,1.63,.12)),spec.id).toBeNull();
      }
      const states=initial(),id=RAINLINE_EXTRACTION039_PREFIX+'freight-hall';breakCell(states,id+':frame-bank',0);breakCell(states,id+':frame-bank',1);
      for(const broken of resolveOverhaulSupport(graph,states).brokenBlockIds){const collider=refs.get(broken);if(collider)world.removeCollider(collider,true);}world.step();
      const gone=graph.byBlock.get(id+':roof-0')!.block,p=gone.position;
      expect(world.castRayAndGetNormal(new RAPIER.Ray({x:p[0],y:p[1]+1,z:p[2]},{x:0,y:-1,z:0}),1.5,false)).toBeNull();
    }finally{world.free();}
  });
  it('keeps complete Pounce and Bastion wall/corner/roof paths clear against actual full legacy and new native solids',()=>{
    const faces=buildingFaces(7734).filter(f=>isRainlineExtraction039Block(f.buildingId)),world=new RAPIER.World({x:0,y:-9.81,z:0}),rotation={x:0,y:0,z:0,w:1},owners=new Map<number,string>();
    try{
      for(const b of district.blocks){const collider=world.createCollider(cityBlockColliderDesc(b).setTranslation(...b.position).setRotation({x:0,y:Math.sin(b.yaw/2),z:0,w:Math.cos(b.yaw/2)}));owners.set(collider.handle,b.id);}world.step();
      const failures=new Set<string>(),check=(position:{x:number;y:number;z:number},shape:RAPIER.Shape,label:string)=>world.intersectionsWithShape(position,rotation,shape,collider=>{const contact=shape.contactShape(position,rotation,collider.shape,collider.translation(),collider.rotation(),0);if(contact&&contact.distance< -1e-5)failures.add(label+' overlaps '+owners.get(collider.handle));return true;});
      for(const chassis of ['pounce','bastion'] as const){const radius=actorHullRadius({chassis,bot:false}),height=actorClimbHeight({bot:false}),shape=new RAPIER.RoundCylinder(height/2-.12,radius-.12,.12),mantle=new RAPIER.Cuboid(radius,height/2,radius);
        for(const face of faces){const limit=face.width/2-radius-.08;
          for(let tangent=-limit;tangent<=limit+1e-6;tangent+=.25){
            for(const base of [face.minY+.04,face.minY+1.5,face.topY-height]){const p=facePoint(face,tangent,base+height/2);p.x+=face.normal.x*(radius+.09);p.z+=face.normal.z*(radius+.09);check(p,shape,chassis+' wall '+face.id);}
            const landing=faceLanding(face,tangent,radius);if(landing)check({...landing,y:landing.y+.12+height/2},mantle,chassis+' roof '+face.id);
          }
          for(const side of [-1,1] as const)for(const plan of overhaulCornerCandidates(face,faces,side,radius+.09))for(let d=0;d<=plan.length;d+=.08)check(overhaulCornerSample(plan,d,face.minY+height/2+.04).position,shape,chassis+' corner '+face.id);
        }
      }
      expect([...failures]).toEqual([]);
    }finally{world.free();}
  });
});

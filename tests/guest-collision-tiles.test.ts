import {beforeAll,describe,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {Matrix4,Vector3} from 'three';
import {getMap} from '../shared/maps';
import {chunkAt,generateChunk,landmarkBlocks,propCollider,terrainHeight,terrainMesh} from '../shared/world';
import {traversalBlocks} from '../shared/traversal';
import {workshopCollision} from '../shared/workshopCollision';
import {isStructuralPropKind,structuralPropCollision} from '../shared/structuralPropCollision';
import {encounterBlocks} from '../shared/encounters';
import {cityBlocks} from '../shared/cityDistrict';
import {buildingFaces} from '../shared/buildingSurfaces';
import {createGuestCollisionTiles,GuestCollisionTiles} from '../src/game/world/guestCollisionTiles';
import {ownsBuildingContact,registerBuildingContacts} from '../src/game/world/buildingContacts';
import {createPawAnchor,createPawProbe,pawFootprint,sampleStaticPaw,surfacePresent} from '../src/game/entities/pawContact';

beforeAll(async()=>{await RAPIER.init();});
describe('incremental scene-owned guest collision tiles',()=>{
  it('releases exact workshop contact ownership on eviction and keeps replacement owners through cleanup',()=>{
    const seed=7734,face=buildingFaces(seed).find(f=>f.kind==='workshop')!,cx=chunkAt(face.origin.x),cz=chunkAt(face.origin.z),id=face.supportingBlockIds[0];
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),owner=new GuestCollisionTiles(world,seed,'pvp'),cleanup=registerBuildingContacts(world,key=>owner.buildingCollider(key));
    try{
      owner.sync(cx,cz);const before=owner.buildingCollider(id)!;expect(before).toBeDefined();expect(ownsBuildingContact(world,[id],before)).toBe(true);
      owner.sync(cx+8,cz+8);expect(owner.buildingCollider(id)).toBeUndefined();expect(before.isValid()).toBe(false);expect(ownsBuildingContact(world,[id],before)).toBe(false);
      owner.sync(cx,cz);const after=owner.buildingCollider(id)!;expect(after).toBeDefined();expect(after).not.toBe(before);expect(ownsBuildingContact(world,[id],after)).toBe(true);expect(ownsBuildingContact(world,[id],before)).toBe(false);
      const foreign=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(500,500,500));expect(ownsBuildingContact(world,[id],foreign)).toBe(false);
      const replacement=registerBuildingContacts(world,key=>key==='replacement'?foreign:undefined);cleanup();expect(ownsBuildingContact(world,['replacement'],foreign)).toBe(true);
      owner.dispose();expect(owner.buildingCollider(id)).toBeUndefined();expect(after.isValid()).toBe(false);expect(foreign.isValid()).toBe(true);
      replacement();expect(ownsBuildingContact(world,['replacement'],foreign)).toBe(false);world.removeCollider(foreign,true);
    }finally{cleanup();owner.dispose();world.free();}
  });
  it('retains six exact terrain/prop ownership sets, creates incoming before removal and preserves real foot support on recross',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0}),events:string[]=[],instrumented=new Proxy(world,{get(target,key){if(key==='createCollider')return (...args:Parameters<RAPIER.World['createCollider']>)=>{events.push('create');return target.createCollider(...args);};if(key==='removeCollider')return (...args:Parameters<RAPIER.World['removeCollider']>)=>{events.push('remove');return target.removeCollider(...args);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}}),owner=new GuestCollisionTiles(instrumented,7734,'coop');
    owner.sync(-1,0);world.step();const before=new Map(owner.tiles),frozen=new Map([...before].map(([key,t])=>[key,{terrain:t.terrain,colliders:[...t.colliders]}] as const)),spawn=getMap(7734).spawn,probe=createPawProbe(),anchor=createPawAnchor(),corners:Vector3[]=[];for(const x of [-.12,.12])for(const y of [-.1,.1])for(const z of [-.22,.22])corners.push(new Vector3(x,y,z));pawFootprint(corners,new Matrix4(),new Vector3(),probe);sampleStaticPaw(world,probe,anchor.surface,spawn.x,spawn.z,terrainHeight(spawn.x,spawn.z,7734),1);expect(surfacePresent(anchor.surface)).toBe(true);const support=anchor.surface.colliders.slice();events.length=0;
    owner.sync(0,0);expect(owner.tiles.size).toBe(9);const overlap=[...before.keys()].filter(k=>owner.tiles.has(k));expect(overlap).toHaveLength(6);
    for(const key of overlap){expect(owner.tiles.get(key)).toBe(before.get(key));expect([...owner.tiles.get(key)!.colliders]).toEqual(frozen.get(key)!.colliders);expect(owner.tiles.get(key)!.terrain).toBe(frozen.get(key)!.terrain);for(const c of frozen.get(key)!.colliders)expect(c.isValid()).toBe(true);}
    const firstRemove=events.indexOf('remove');expect(firstRemove).toBeGreaterThan(0);expect(events.slice(firstRemove)).not.toContain('create');expect(owner.snapshot()).toMatchObject({created:12,retired:3,peakTiles:12});
    world.step();expect(surfacePresent(anchor.surface)).toBe(true);expect(anchor.surface.colliders).toEqual(support);const center=world.castRay(new RAPIER.Ray({x:spawn.x,y:spawn.y+4,z:spawn.z},{x:0,y:-1,z:0}),10,false);expect(center?.collider).toBe(support[0]);
    owner.sync(-1,0);expect(owner.snapshot()).toMatchObject({created:15,retired:6,peakTiles:12});for(const key of overlap)expect(owner.tiles.get(key)).toBe(before.get(key));expect(surfacePresent(anchor.surface)).toBe(true);
    owner.sync(-1,0);expect(owner.snapshot().created).toBe(15);owner.dispose();expect(surfacePresent(anchor.surface)).toBe(false);expect(world.colliders.len()).toBe(0);expect(owner.snapshot().removedColliders).toBe(owner.snapshot().createdColliders);owner.dispose();world.free();owner.dispose();
  });
  it('preserves exact canonical terrain, prop, landmark, traversal and mode-specific encounter shapes',()=>{
    for(const seed of [7734,1926,4107])for(const mode of ['coop','pvp','pvpve','training'] as const){
      const world=new RAPIER.World({x:0,y:-9.8,z:0}),owner=new GuestCollisionTiles(world,seed,mode);owner.sync(0,0);
      for(const [key,tile] of owner.tiles){const [cx,cz]=key.split(',').map(Number),data=terrainMesh(cx,cz,32,seed),terrain=tile.terrain.shape as RAPIER.TriMesh;expect(Array.from(terrain.vertices)).toEqual(Array.from(data.vertices));expect(Array.from(terrain.indices)).toEqual(Array.from(data.indices));
        const expected:{size?:number[];mesh?:ReturnType<typeof workshopCollision>;position:number[];yaw:number}[]=[];
        for(const p of generateChunk(seed,cx,cz).props){if(p.kind==='workshop'||isStructuralPropKind(p.kind)){expected.push({mesh:p.kind==='workshop'?workshopCollision(seed,p.scale):structuralPropCollision(p.kind,p.scale),position:[p.x,p.y,p.z],yaw:p.rotation});continue;}const size=propCollider(p);if(size)expected.push({size,position:[p.x,p.y+size[1],p.z],yaw:p.rotation});}
        for(const b of [...landmarkBlocks(seed),...traversalBlocks(seed),...(mode==='pvp'?[]:encounterBlocks(seed)),...cityBlocks(seed)])if(chunkAt(b.position[0])===cx&&chunkAt(b.position[2])===cz)expected.push({size:b.halfExtents,position:b.position,yaw:b.yaw});
        const actual=[...tile.colliders].filter(c=>c!==tile.terrain);expect(actual.length).toBe(expected.length);
        actual.forEach((c,i)=>{expect(c.isSensor()).toBe(false);expect(c.parent()).toBeNull();const p=c.translation(),q=c.rotation(),e=expected[i];
          if(e.mesh){const shape=c.shape as RAPIER.TriMesh;expect(Array.from(shape.vertices)).toEqual(Array.from(e.mesh.vertices));expect(Array.from(shape.indices)).toEqual(Array.from(e.mesh.indices));}
          else {const shape=c.shape as RAPIER.Cuboid;for(const [a,b] of [[shape.halfExtents.x,e.size![0]],[shape.halfExtents.y,e.size![1]],[shape.halfExtents.z,e.size![2]]])expect(a).toBeCloseTo(b,4);}
          for(const [a,b] of [[p.x,e.position[0]],[p.y,e.position[1]],[p.z,e.position[2]],[q.y,Math.sin(e.yaw/2)],[q.w,Math.cos(e.yaw/2)]])expect(a).toBeCloseTo(b,4);
        });
      }owner.dispose();expect(world.colliders.len()).toBe(0);world.free();
    }
  });
  it('keeps destroyed authored cover gone through omitted packets, reentry and late join without touching foreign handles',()=>{
    const seed=7734,map=getMap(seed);let fixture:ReturnType<typeof generateChunk>['props'][number]|undefined;
    for(const prop of map.props){const admitted=generateChunk(seed,chunkAt(prop.x),chunkAt(prop.z)).props.find(p=>p.id&&p.breakableHp);if(admitted){fixture=admitted;break;}}
    expect(fixture?.id).toBeTruthy();const prop=fixture!,id=prop.id!,cx=chunkAt(prop.x),cz=chunkAt(prop.z),world=new RAPIER.World({x:0,y:-9.8,z:0}),owner=new GuestCollisionTiles(world,seed,'coop');owner.sync(cx,cz);const initial=owner.snapshot(),cover=owner.buildingCollider(`${id}:mesh`)!;expect(cover).toBeDefined();
    owner.destroyCover([id,id,'invalid-unbounded-input']);expect(cover.isValid()).toBe(false);expect(owner.buildingCollider(`${id}:mesh`)).toBeUndefined();expect(owner.snapshot().coverCount).toBe(initial.coverCount-1);expect(owner.snapshot().destroyedCoverCount).toBe(1);const foreign=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(500,500,500));
    owner.sync(cx+8,cz+8);owner.sync(cx,cz);expect(owner.destroyedIds.has(id)).toBe(true);expect(owner.snapshot().coverCount).toBe(initial.coverCount-1);expect(owner.tiles.get(`${cx},${cz}`)!.colliders.size).toBe(initial.tiles.find(t=>t.key===`${cx},${cz}`)!.colliderCount-1);owner.dispose();expect(foreign.isValid()).toBe(true);world.removeCollider(foreign,true);expect(world.colliders.len()).toBe(0);
    const late=new GuestCollisionTiles(world,seed,'coop');late.sync(cx,cz,[id]);expect(late.snapshot().coverCount).toBe(initial.coverCount-1);late.dispose();world.free();
  });
  it('owns no host colliders and starts clean for another seed, mode, room lifetime or world',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0});expect(createGuestCollisionTiles(world,7734,'coop',true)).toBeNull();expect(world.colliders.len()).toBe(0);
    for(const [seed,mode] of [[7734,'pvp'],[1926,'coop'],[4107,'pvpve']] as const){const owner=createGuestCollisionTiles(world,seed,mode,false)!;owner.sync(-1,0);expect(owner.tiles.size).toBe(9);owner.dispose();owner.sync(0,0);expect(world.colliders.len()).toBe(0);}
    world.free();const next=new RAPIER.World({x:0,y:-9.8,z:0}),owner=new GuestCollisionTiles(next,7734,'coop');owner.sync(0,0);expect(owner.snapshot().created).toBe(9);owner.dispose();next.free();
  });
  it('rolls back only a failed incoming batch, preserving all previous live support',()=>{
    const world=new RAPIER.World({x:0,y:-9.8,z:0});let failing=false,incomingTerrain=0;
    const instrumented=new Proxy(world,{get(target,key){if(key==='createCollider')return (...args:Parameters<RAPIER.World['createCollider']>)=>{if(failing&&args[0].shape instanceof RAPIER.TriMesh&&++incomingTerrain===2)throw new Error('admission failed');return target.createCollider(...args);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}}),owner=new GuestCollisionTiles(instrumented,7734,'coop');owner.sync(0,0);const old=new Map(owner.tiles),count=world.colliders.len();failing=true;expect(()=>owner.sync(1,0)).toThrow('admission failed');expect(owner.tiles.size).toBe(9);expect(world.colliders.len()).toBe(count);for(const [key,tile] of old){expect(owner.tiles.get(key)).toBe(tile);for(const collider of tile.colliders)expect(collider.isValid()).toBe(true);}owner.dispose();expect(world.colliders.len()).toBe(0);world.free();
  });
});

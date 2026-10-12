import RAPIER from '@dimforge/rapier3d-compat';
import {cityBlockColliderDesc,trackStreetCollider} from '../../../shared/rainlineStreetAdmission';
import { CHUNK_SIZE } from '../../../shared/config';
import { getMap } from '../../../shared/maps';
import type { Mode,StructureState } from '../../../shared/types';
import {cityBlocks,cityBlockActive} from '../../../shared/cityDistrict';
import {parseStructures} from '../../../shared/protocol';
import { authoredPropId, chunkAt, chunkKeys, generateChunk, landmarkBlocks, propCollider, terrainMesh } from '../../../shared/world';
import { traversalBlocks } from '../../../shared/traversal';
import { encounterBlocks } from '../../../shared/encounters';
import {workshopCollision} from '../../../shared/workshopCollision';
import {isStructuralPropKind,structuralPropCollision} from '../../../shared/structuralPropCollision';
import {createRetainedLampColliderDescriptors} from '../../../shared/rainlineLampCollision';

export interface GuestCollisionTile {readonly key:string;readonly terrain:RAPIER.Collider;readonly colliders:ReadonlySet<RAPIER.Collider>;}
interface OwnedTile {key:string;terrain:RAPIER.Collider;colliders:Set<RAPIER.Collider>;}
interface CoverRef {tile:OwnedTile;collider:RAPIER.Collider;}
/** Scene-owned fixed collision only. Authority keeps its Simulation ownership. */
export class GuestCollisionTiles {
  private owned=new Map<string,OwnedTile>();
  private cover=new Map<string,CoverRef>();
  private gone=new Set<string>();
  private knownCover=new Set<string>();
  private city:ReturnType<typeof cityBlocks>;
  private structures:StructureState[]=[];
  private structuralRefs=new Map<string,CoverRef>();
  private buildingMeshes=new Map<string,CoverRef>();
  private blocks:ReturnType<typeof landmarkBlocks>;
  private created=0;private retired=0;private createdColliders=0;private removedColliders=0;private peak=0;private disposed=false;
  constructor(private world:RAPIER.World,readonly seed:number,readonly mode:Mode){
    this.city=cityBlocks(seed);
    this.blocks=[...landmarkBlocks(seed),...traversalBlocks(seed),...(mode==='pvp'?[]:encounterBlocks(seed))];
    for(const prop of getMap(seed).props)if(prop.breakableHp||prop.kind==='wall')this.knownCover.add(authoredPropId(seed,prop));
  }
  get tiles():ReadonlyMap<string,GuestCollisionTile>{return this.owned;}
  get destroyedIds():ReadonlySet<string>{return this.gone;}
  buildingCollider(id:string):RAPIER.Collider|undefined {
    const collider=(this.buildingMeshes.get(id)??this.structuralRefs.get(id))?.collider;
    return !this.disposed&&collider?.isValid()?collider:undefined;
  }
  sync(cx:number,cz:number,destroyed:Iterable<string>=[]):void {
    if(this.disposed)return;
    this.destroyCover(destroyed);
    const wanted=new Set(chunkKeys(cx*CHUNK_SIZE+CHUNK_SIZE/2,cz*CHUNK_SIZE+CHUNK_SIZE/2,1)),incoming:OwnedTile[]=[];
    // Complete incoming ownership before retiring any outgoing support. A
    // failed creation rolls back only this batch; the previous window survives.
    try {for(const key of wanted)if(!this.owned.has(key)){const tile=this.createTile(key);incoming.push(tile);this.owned.set(key,tile);this.created++;this.peak=Math.max(this.peak,this.owned.size);}}
    catch(error){for(const tile of incoming)this.retire(tile);throw error;}
    for(const [key,tile] of this.owned)if(!wanted.has(key))this.retire(tile);
  }
  destroyCover(ids:Iterable<string>):void {
    if(this.disposed)return;
    for(const id of ids){if(!this.knownCover.has(id))continue;this.gone.add(id);const ref=this.cover.get(id);if(!ref)continue;this.cover.delete(id);
      for(const [key,owner] of this.buildingMeshes)if(owner===ref||owner.collider===ref.collider)this.buildingMeshes.delete(key);
      for(const [key,owner] of this.structuralRefs)if(owner.collider===ref.collider)this.structuralRefs.delete(key);
      ref.tile.colliders.delete(ref.collider);this.remove(ref.collider);
    }
  }
  /** Apply the same displayed revision as the city mesh, before camera/paw
   * queries. Removal is persistent across tile eviction and missing events. */
  syncStructures(states:readonly StructureState[]):boolean {
    if(this.disposed)return false;
    const parsed=parseStructures(states,this.seed,this.structures);if(!parsed)return false;
    this.structures=parsed;
    for(const block of this.city)if(!cityBlockActive(block,this.structures)){
      const ref=this.structuralRefs.get(block.id);if(!ref)continue;
      this.structuralRefs.delete(block.id);ref.tile.colliders.delete(ref.collider);this.remove(ref.collider);
    }
    return true;
  }
  private createTile(key:string):OwnedTile {
    const [cx,cz]=key.split(',').map(Number),data=terrainMesh(cx,cz,32,this.seed),colliders=new Set<RAPIER.Collider>();
    const make=(desc:RAPIER.ColliderDesc)=>{const c=this.world.createCollider(desc);colliders.add(c);this.createdColliders++;return c;};
    const terrain=make(RAPIER.ColliderDesc.trimesh(data.vertices,data.indices)),tile={key,terrain,colliders},covers:{id:string;collider:RAPIER.Collider}[]=[],structures:{id:string;collider:RAPIER.Collider}[]=[],meshes:{id:string;collider:RAPIER.Collider}[]=[];
    try {
      for(const prop of generateChunk(this.seed,cx,cz).props){
        if(prop.id&&this.gone.has(prop.id))continue;
        const rotation={x:0,y:Math.sin(prop.rotation/2),z:0,w:Math.cos(prop.rotation/2)};
        if(prop.kind==='workshop'){
          const mesh=workshopCollision(this.seed,prop.scale);
          const collider=make(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices).setTranslation(prop.x,prop.y,prop.z).setRotation(rotation));
          if(prop.id)meshes.push({id:`${prop.id}:mesh`,collider});
          continue;
        }
        if(isStructuralPropKind(prop.kind)){
          const mesh=structuralPropCollision(prop.kind,prop.scale);
          const collider=make(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices).setTranslation(prop.x,prop.y,prop.z).setRotation(rotation));
          if(prop.id)meshes.push({id:`${prop.id}:mesh`,collider});
          if(prop.id&&prop.breakableHp)covers.push({id:prop.id,collider});
          continue;
        }
        const lamps=createRetainedLampColliderDescriptors(prop);
        if(lamps.length){for(const desc of lamps)make(desc);continue;}
        const size=propCollider(prop);if(!size)continue;
        const c=make(RAPIER.ColliderDesc.cuboid(...size).setTranslation(prop.x,prop.y+size[1],prop.z).setRotation(rotation));if(prop.id&&prop.breakableHp)covers.push({id:prop.id,collider:c});
      }
      for(const block of this.blocks)if(chunkAt(block.position[0])===cx&&chunkAt(block.position[2])===cz)make(RAPIER.ColliderDesc.cuboid(...block.halfExtents).setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)}));
      for(const block of this.city)if(chunkAt(block.position[0])===cx&&chunkAt(block.position[2])===cz&&cityBlockActive(block,this.structures)){
        const collider=trackStreetCollider(this.world,block,make(cityBlockColliderDesc(block).setTranslation(...block.position).setRotation({x:0,y:Math.sin(block.yaw/2),z:0,w:Math.cos(block.yaw/2)})));structures.push({id:block.id,collider});
      }
      for(const ref of structures)this.structuralRefs.set(ref.id,{tile,collider:ref.collider});
      for(const ref of meshes)this.buildingMeshes.set(ref.id,{tile,collider:ref.collider});
      for(const ref of covers)this.cover.set(ref.id,{tile,collider:ref.collider});return tile;
    }catch(error){for(const c of colliders)this.remove(c);throw error;}
  }
  private remove(c:RAPIER.Collider):void {if(c.isValid()){this.world.removeCollider(c,true);this.removedColliders++;}}
  private retire(tile:OwnedTile):void {
    this.owned.delete(tile.key);for(const [id,ref] of this.cover)if(ref.tile===tile)this.cover.delete(id);
    for(const [id,ref] of this.structuralRefs)if(ref.tile===tile)this.structuralRefs.delete(id);
    for(const [id,ref] of this.buildingMeshes)if(ref.tile===tile)this.buildingMeshes.delete(id);
    for(const c of tile.colliders)this.remove(c);tile.colliders.clear();this.retired++;
  }
  /** Called from World layout cleanup, before Physics frees its WASM world. */
  dispose():void {if(this.disposed)return;for(const tile of this.owned.values())this.retire(tile);this.cover.clear();this.structuralRefs.clear();this.buildingMeshes.clear();this.structures=[];this.gone.clear();this.disposed=true;}
  snapshot(){return {tiles:[...this.owned.values()].map(t=>({key:t.key,terrainHandle:t.terrain.handle,colliderCount:t.colliders.size})),created:this.created,retired:this.retired,peakTiles:this.peak,createdColliders:this.createdColliders,removedColliders:this.removedColliders,coverCount:this.cover.size,destroyedCoverCount:this.gone.size,structuralColliders:this.structuralRefs.size,structures:this.structures.map(s=>({id:s.id,revision:s.revision,brokenMask:s.brokenMask}))};}
}
export function createGuestCollisionTiles(world:RAPIER.World,seed:number,mode:Mode,authority:boolean):GuestCollisionTiles|null {return authority?null:new GuestCollisionTiles(world,seed,mode);}

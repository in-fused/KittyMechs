import type RAPIER from '@dimforge/rapier3d-compat';
import {faceDistance,type BuildingFace} from './buildingSurfaces';
import type {CityDistrict} from './cityDistrict';
import {overhaulRuinPatches,type OverhaulRuinPatch,type OverhaulRuinState} from './overhaulRuins';
import {overhaulFragmentBlock} from './overhaulFracture';
import type {Vec3} from './types';

const FLAT_EPS=1e-5,PLANE_EPS=2e-4;
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const scale=(a:Vec3,s:number):Vec3=>({x:a.x*s,y:a.y*s,z:a.z*s});
export const overhaulRuinColliderKey=(p:Pick<OverhaulRuinPatch,'block'|'piece'|'born'|'revision'>)=>`ruin-cell:${p.block}:${p.born}:${p.revision}${p.piece===undefined?'':`:piece:${p.piece}`}`;
const bucket=(normal:Vec3,plane:number)=>`${Math.round(normal.x/PLANE_EPS)},${Math.round(normal.z/PLANE_EPS)},${Math.round(plane/PLANE_EPS)}`;
function fingerprint(keys:readonly string[]):string {
  let hash=2166136261;for(const char of keys.join('|'))hash=Math.imul(hash^char.charCodeAt(0),16777619);return(hash>>>0).toString(36);
}
const range=(p:OverhaulRuinPatch,axis:Vec3):[number,number]=>{const values=p.corners.map(c=>dot(c,axis));return[Math.min(...values),Math.max(...values)];};

/** Compiles only gravity-aligned real cuboid faces. Arbitrary yaw is retained;
 * inclined roofs/walls are rejected because the existing articulated climb
 * owner cannot certify their poses. Coplanar stack strips keep every original
 * collider owner: gaps and hidden faces still fail ordinary native paw rays. */
export function overhaulRuinFaces(patches:readonly OverhaulRuinPatch[]):BuildingFace[] {
  const walls=new Map<string,OverhaulRuinPatch[]>();
  for(const patch of patches)if(patch.surface==='wall'&&Math.abs(patch.normal.y)<=FLAT_EPS){
    const key=bucket(patch.normal,dot(patch.normal,patch.center)),group=walls.get(key)??[];group.push(patch);walls.set(key,group);
  }
  const faces:BuildingFace[]=[];
  for(const roof of patches){
    if(roof.surface!=='roof'||Math.abs(roof.normal.x)>FLAT_EPS||Math.abs(roof.normal.z)>FLAT_EPS||roof.normal.y<1-FLAT_EPS)continue;
    if(Math.abs(roof.axisU.y)>FLAT_EPS||Math.abs(roof.axisV.y)>FLAT_EPS)continue;
    const roofKey=overhaulRuinColliderKey(roof);
    for(const [axis,halfNormal,halfTangent] of [[roof.axisU,roof.halfWidth,roof.halfHeight],[roof.axisV,roof.halfHeight,roof.halfWidth]] as const)for(const sign of [-1,1]){
      const normal=scale(axis,sign),tangent={x:-normal.z,y:0,z:normal.x},plane=dot(normal,roof.center)+halfNormal;
      const roofRange=range(roof,tangent),candidates:OverhaulRuinPatch[]=[];
      // Search adjacent quantization bins; admission remains exact below.
      for(const delta of [-PLANE_EPS,0,PLANE_EPS])for(const wall of walls.get(bucket(normal,plane+delta))??[]){
        if(candidates.includes(wall)||dot(wall.normal,normal)<1-1e-8||Math.abs(dot(normal,wall.center)-plane)>PLANE_EPS)continue;
        const r=range(wall,tangent),ys=wall.corners.map(c=>c.y);
        if(r[1]<=roofRange[0]+FLAT_EPS||r[0]>=roofRange[1]-FLAT_EPS||Math.min(...ys)>=roof.center.y-FLAT_EPS||Math.max(...ys)>roof.center.y+PLANE_EPS)continue;
        candidates.push(wall);
      }
      if(!candidates.length||Math.max(...candidates.flatMap(p=>p.corners.map(c=>c.y)))<roof.center.y-.04)continue;
      const minY=Math.min(...candidates.flatMap(p=>p.corners.map(c=>c.y))),height=roof.center.y-minY;
      if(height<.1)continue;
      const keys=[...new Set(candidates.map(overhaulRuinColliderKey))].sort(),membership=[...keys,roofKey].sort();
      const edge=axis===roof.axisU?'u':'v',id=`ruin-face:${roof.block}:${roof.born}:${roof.revision}:${roof.piece===undefined?'':`piece:${roof.piece}:`}${edge}:${sign}:${fingerprint(membership)}`;
      faces.push({id,buildingId:`ruin:${roof.block}:${roof.born}`,kind:'city',side:'east',
        origin:{x:roof.center.x+normal.x*halfNormal,y:minY,z:roof.center.z+normal.z*halfNormal},normal,tangent,
        width:2*halfTangent,height,minY,topY:roof.center.y,
        roofId:roof.id,roofBlockIds:[roofKey],supportingBlockIds:keys,
        roofCenter:{...roof.center},roofHalfExtents:{x:halfNormal,z:halfTangent},yaw:Math.atan2(-normal.z,normal.x)});
    }
  }
  return faces.sort((a,b)=>a.id.localeCompare(b.id));
}

/** Snapshot admission uses already validated settled states; no native world,
 * guest extrapolation or sender-supplied face descriptor is required. */
export function overhaulRuinSnapshotFaces(district:CityDistrict|null,states:readonly OverhaulRuinState[]):BuildingFace[] {
  return overhaulRuinFaces(states.filter(s=>s.settled).flatMap(s=>district?.blocks[s.block]?overhaulRuinPatches(s.piece===undefined?district.blocks[s.block]:overhaulFragmentBlock(district.blocks[s.block],s.piece),s):[]));
}
export interface OverhaulRuinSurfaceSource {
  patches(settledOnly?:boolean):OverhaulRuinPatch[];
  collider(block:number,piece?:number):RAPIER.Collider|undefined;
}
const worldOwners=new WeakMap<RAPIER.World,OverhaulRuinSurfaces>();
/** One selected presentation/authority surface owner per native world. */
export function registerOverhaulRuinSurfaces(world:RAPIER.World,owner:OverhaulRuinSurfaces):()=>void {
  worldOwners.set(world,owner);return()=>{if(worldOwners.get(world)===owner)worldOwners.delete(world);};
}
export function overhaulRuinWorldSurfaces(world:RAPIER.World):OverhaulRuinSurfaces|undefined{return worldOwners.get(world);}
/** One authority/guest registry. Sync after support retirement or waking and
 * detach any climb whose complete revision-bound face is no longer live. */
export class OverhaulRuinSurfaces {
  private faces:BuildingFace[]=[];
  private faceIds=new Set<string>();
  private faceById=new Map<string,BuildingFace>();
  private bindings=new Map<string,{block:number;piece?:number;handle:number}>();
  private signature='';
  constructor(private source:OverhaulRuinSurfaceSource){}
  sync():ReadonlySet<string> {
    const patches=this.source.patches(true).filter(p=>{const c=this.source.collider(p.block,p.piece);return c?.isValid()&&c.isEnabled()&&!c.isSensor()&&c.parent()?.isFixed();});
    const signature=patches.map(p=>`${p.id}:${p.born}:${p.revision}:${p.colliderHandle}:${p.center.x}:${p.center.y}:${p.center.z}:${p.normal.x}:${p.normal.y}:${p.normal.z}`).join('|');
    if(signature===this.signature)return new Set();
    const prior=this.faceIds;this.faces=overhaulRuinFaces(patches);this.faceById=new Map(this.faces.map(f=>[f.id,f]));this.faceIds=new Set(this.faceById.keys());this.bindings.clear();
    for(const p of patches){const c=this.source.collider(p.block,p.piece)!;this.bindings.set(overhaulRuinColliderKey(p),{block:p.block,...(p.piece!==undefined?{piece:p.piece}:{}),handle:c.handle});}
    this.signature=signature;return new Set([...prior].filter(id=>!this.faceIds.has(id)));
  }
  read():readonly BuildingFace[]{return this.faces;}
  collider(key:string):RAPIER.Collider|undefined {
    const binding=this.bindings.get(key);if(!binding)return;
    const collider=this.source.collider(binding.block,binding.piece);
    return collider?.handle===binding.handle&&collider.isValid()&&collider.isEnabled()&&!collider.isSensor()&&collider.parent()?.isFixed()?collider:undefined;
  }
  live(face:BuildingFace|string):boolean {
    const id=typeof face==='string'?face:face.id,f=this.faceById.get(id);
    return !!f&&f.supportingBlockIds.every(id=>!!this.collider(id))&&f.roofBlockIds.every(id=>!!this.collider(id));
  }
  nearby(position:Vec3,range:number,limit=16):BuildingFace[]{
    return this.faces.filter(f=>faceDistance(f,position)<=range&&this.live(f)).sort((a,b)=>faceDistance(a,position)-faceDistance(b,position)||a.id.localeCompare(b.id)).slice(0,limit);
  }
}

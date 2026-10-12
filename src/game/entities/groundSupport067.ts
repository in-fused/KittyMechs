import type RAPIER from '@dimforge/rapier3d-compat';
import {Vector3} from 'three';

export interface GroundLease067 {worldKey:string;generation:number;life:number;ownerKey:string;colliderHandle:number;shapePoseKey:string;}
export interface GroundHit067 {point:Vector3;normal:Vector3;colliderHandle:number;worldKey:string;shapePoseKey:string;lease:GroundLease067;}
export interface GroundSupport067 {
 begin(frameClock:number,presentationTime:number,life:number):void;
 probe(point:Vector3,up:number,depth:number):GroundHit067|null;
 validate(lease:GroundLease067):boolean;
 readonly diagnostic:{frameClock:number;presentationTime:number;generation:number;life:number;inventoryBuilds:number;queries:number;lastReason:string|null};
}
interface Entry067 {collider:RAPIER.Collider;shape:RAPIER.Shape;ownerKey:string;shapeSerial:number;}
interface World067 {key:string;generation:number;frameClock:number;allowed:Set<number>;entries:Map<number,Entry067>;serial:number;builds:number;}
const worlds=new WeakMap<RAPIER.World,World067>();let worldSerial=0;
const finite=(values:readonly number[])=>values.every(Number.isFinite);
function fixedLive(c:RAPIER.Collider){if(!c.isValid()||!c.isEnabled()||c.isSensor())return false;const body=c.parent();return !body||body.isValid()&&body.isEnabled()&&body.isFixed();}

/** Read-only current client-scene fixed/settled support, never a server pad,
 * bank revision, moving-platform prediction or force/balance certificate. */
export function createGroundSupport067(world:RAPIER.World,rapier:typeof RAPIER,getGeneration:()=>number):GroundSupport067 {
 let shared=worlds.get(world);if(!shared){shared={key:`ground067-world:${++worldSerial}`,generation:-1,frameClock:NaN,allowed:new Set(),entries:new Map(),serial:0,builds:0};worlds.set(world,shared);}
 const scene=shared,diagnostic={frameClock:NaN,presentationTime:NaN,generation:-1,life:-1,inventoryBuilds:0,queries:0,lastReason:null as string|null};
 const reason=(message:string)=>{diagnostic.lastReason=message;return false;};
 const current=()=>diagnostic.generation===getGeneration()&&diagnostic.generation===scene.generation&&diagnostic.frameClock===scene.frameClock&&finite([diagnostic.frameClock,diagnostic.presentationTime])&&Number.isSafeInteger(diagnostic.life)&&diagnostic.life>=0;
 // Query predicates never read Rapier properties while its collider set is borrowed.
 const filter=(c:RAPIER.Collider)=>scene.allowed.has(c.handle);
 const describe=(c:RAPIER.Collider)=>{
  if(!scene.allowed.has(c.handle)||!fixedLive(c)){scene.entries.delete(c.handle);return null;}
  const shape=c.shape,type=c.shapeType();let entry=scene.entries.get(c.handle);
  if(!entry||entry.collider!==c){entry={collider:c,shape,ownerKey:`${scene.key}:owner:${++scene.serial}`,shapeSerial:++scene.serial};scene.entries.set(c.handle,entry);}
  else if(entry.shape!==shape){entry.shape=shape;entry.shapeSerial=++scene.serial;}
  const p=c.translation(),q=c.rotation(),geometry:number[]=[type];
  // Native primitive dimensions also detect in-place setters without relying
  // on the cached JS shape. Mesh geometry uses its immutable shape identity.
  switch(type){
   case rapier.ShapeType.Cuboid:case rapier.ShapeType.RoundCuboid:{const h=c.halfExtents();geometry.push(h.x,h.y,h.z);if(type===rapier.ShapeType.RoundCuboid)geometry.push(c.roundRadius());break;}
   case rapier.ShapeType.Ball:geometry.push(c.radius());break;
   case rapier.ShapeType.Capsule:case rapier.ShapeType.Cylinder:case rapier.ShapeType.Cone:geometry.push(c.radius(),c.halfHeight());break;
   case rapier.ShapeType.RoundCylinder:case rapier.ShapeType.RoundCone:geometry.push(c.radius(),c.halfHeight(),c.roundRadius());break;
   case rapier.ShapeType.TriMesh:case rapier.ShapeType.ConvexPolyhedron:break;
   case rapier.ShapeType.RoundConvexPolyhedron:geometry.push(c.roundRadius());break;
   default:return null;
  }
  const pose=[p.x,p.y,p.z,q.x,q.y,q.z,q.w];if(!finite([...geometry,...pose])||Math.abs(Math.hypot(q.x,q.y,q.z,q.w)-1)>1e-4)return null;
  return {entry,key:`${entry.shapeSerial}:${geometry.join(',')}:${pose.join(',')}`};
 };
 return {diagnostic,
  begin(frameClock,presentationTime,life){
   Object.assign(diagnostic,{frameClock,presentationTime,life,generation:getGeneration(),queries:0,lastReason:null});
   if(!finite([frameClock,presentationTime])||!Number.isSafeInteger(life)||life<0||!Number.isSafeInteger(diagnostic.generation)||diagnostic.generation<0){reason('INVALID_FRAME_OR_LIFE');return;}
   if(scene.generation!==diagnostic.generation){scene.generation=diagnostic.generation;scene.frameClock=NaN;scene.allowed.clear();scene.entries.clear();}
   if(scene.frameClock!==frameClock){
    scene.allowed.clear();world.colliders.forEach(c=>{if(fixedLive(c))scene.allowed.add(c.handle);});
    for(const handle of scene.entries.keys())if(!scene.allowed.has(handle))scene.entries.delete(handle);
    scene.frameClock=frameClock;scene.builds++;
   }
   diagnostic.inventoryBuilds=scene.builds;
  },
  probe(point,up,depth){
   if(!current()){reason('STALE_FRAME_GENERATION_OR_LIFE');return null;}
   if(!finite([point.x,point.y,point.z,up,depth])||up<=0||depth<=0){reason('INVALID_PROBE');return null;}
   const origin={x:point.x,y:point.y+up,z:point.z};if(!Number.isFinite(origin.y)){reason('INVALID_PROBE_ORIGIN');return null;}diagnostic.queries++;
   const hit=world.castRayAndGetNormal(new rapier.Ray(origin,{x:0,y:-1,z:0}),depth,true,rapier.QueryFilterFlags.ONLY_FIXED|rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,undefined,undefined,filter);
   if(!hit){reason('NO_CURRENT_FIXED_SUPPORT');return null;}
   const n=hit.normal;if(!finite([hit.timeOfImpact,n.x,n.y,n.z])||hit.timeOfImpact<=1e-6||hit.timeOfImpact>depth||Math.abs(Math.hypot(n.x,n.y,n.z)-1)>1e-4||n.y<=.55){reason('AMBIGUOUS_OR_UNWALKABLE_SUPPORT');return null;}
   const owned=describe(hit.collider);if(!owned){reason('RETIRED_OR_CHANGED_SUPPORT');return null;}
   const lease:GroundLease067={worldKey:scene.key,generation:diagnostic.generation,life:diagnostic.life,ownerKey:owned.entry.ownerKey,colliderHandle:hit.collider.handle,shapePoseKey:owned.key};
   diagnostic.lastReason=null;return {point:new Vector3(origin.x,origin.y-hit.timeOfImpact,origin.z),normal:new Vector3(n.x,n.y,n.z),colliderHandle:hit.collider.handle,worldKey:scene.key,shapePoseKey:owned.key,lease};
  },
  validate(lease){
   if(!current()||lease.worldKey!==scene.key||lease.generation!==diagnostic.generation||lease.life!==diagnostic.life)return reason('LEASE_WORLD_GENERATION_OR_LIFE_CHANGED');
   const collider=world.getCollider(lease.colliderHandle);if(!collider||!fixedLive(collider)){scene.entries.delete(lease.colliderHandle);return reason('LEASE_SUPPORT_RETIRED');}
   const owned=describe(collider);if(!owned||owned.entry.ownerKey!==lease.ownerKey||owned.key!==lease.shapePoseKey)return reason('LEASE_SHAPE_POSE_OR_OWNER_CHANGED');
   diagnostic.lastReason=null;return true;
  }
 };
}

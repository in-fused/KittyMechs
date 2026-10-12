import RAPIER from '@dimforge/rapier3d-compat';
import {rainlinePopulatedPlacements} from './rainlineStreetPopulation030';
import type {CityBlock,CityDistrict,CityStructure} from './cityDistrict';
import type {OverhaulRuinState} from './overhaulRuins';

export const RAINLINE_STREET_REVISION='rainline-route-population-030';
export const RAINLINE_STREET_PREFIX='7734:overhaul:street001:';
export const RAINLINE_STREET_SUPERSEDED=new Set(['7734:overhaul:dressing:works-pipes:bank','7734:overhaul:dressing:works-crawler:bank']);
export const rainlineStreetPlacements=rainlinePopulatedPlacements;
const byId=new Map(rainlineStreetPlacements.map(p=>[RAINLINE_STREET_PREFIX+p.id.slice('street001:'.length)+':solid',p]));
const native=new WeakMap<RAPIER.World,Map<string,RAPIER.Collider>>();
export function isRainlineStreetBlock(block:CityBlock|string):boolean{return (typeof block==='string'?block:block.id).startsWith(RAINLINE_STREET_PREFIX);}
export function rainlineStreetSource(block:CityBlock){return byId.get(block.id);}
/** One whole-prop owner, retaining source meter coordinates and hull center. */
export function buildRainlineStreetAdmission(district:CityDistrict):{blocks:CityBlock[];structures:CityStructure[]} {
 if(district.seed!==7734)return {blocks:[],structures:[]};
 const structures=rainlineStreetPlacements.map(p=>{const id=RAINLINE_STREET_PREFIX+p.id.slice('street001:'.length),bank:CityStructure={id:id+':bank',buildingId:id,maxHp:110,cells:[]};
  bank.cells.push({id:id+':solid',buildingId:id,part:'cell',position:p.pivot.map((n,a)=>n+p.center[a]) as [number,number,number],halfExtents:[...p.halfExtents] as [number,number,number],yaw:p.yaw,material:'steel',structureId:bank.id,cellId:0});return bank;});
 return {blocks:structures.flatMap(s=>s.cells),structures};
}
/** Identical native convex shape in all four intact/wreck authority/guest paths.
 * Convex envelope fills source concavity; bounds never become its collider. */
export function cityBlockColliderDesc(block:CityBlock):RAPIER.ColliderDesc {
 const row=rainlineStreetSource(block);if(!row){if(isRainlineStreetBlock(block))throw Error('Unknown street owner '+block.id);return RAPIER.ColliderDesc.cuboid(...block.halfExtents);}
 if(row.hullVertices.length<12||row.hullVertices.length%3||!row.hullVertices.every(Number.isFinite)||!Number.isFinite(row.massKg)||row.massKg<=0||row.halfExtents.some(n=>!Number.isFinite(n)||n<=0))throw Error('Invalid frozen street hull '+block.id);
 const desc=RAPIER.ColliderDesc.convexHull(new Float32Array(row.hullVertices));if(!desc)throw Error('Native street hull allocation failed '+block.id);
 return desc.setMass(row.massKg).setFriction(.85).setRestitution(0);
}
export function trackStreetCollider(world:RAPIER.World,block:CityBlock,collider:RAPIER.Collider):RAPIER.Collider {
 if(rainlineStreetSource(block)){let rows=native.get(world);if(!rows){rows=new Map();native.set(world,rows);}rows.set(block.id,collider);}return collider;
}
/** Read-only actual collider poses; stale streamed/retired objects are removed. */
export function readStreetNativeColliders(world:RAPIER.World){const rows=native.get(world);if(!rows)return [];
 return [...rows].flatMap(([id,c])=>{if(!c.isValid()){rows.delete(id);return [];}return [{id,handle:c.handle,shape:c.shape.type,position:{...c.translation()},rotation:{...c.rotation()},mass:c.parent()?.mass()??null,bodyType:c.parent()?.bodyType()??null,enabled:c.isEnabled()}];});
}
/** Conservative occupancy of current quaternion poses; never a native shape. */
export function streetRuinNavigationBlocks(district:CityDistrict|null,poses:readonly OverhaulRuinState[]):CityBlock[]{return poses.flatMap(p=>{
 const b=district?.blocks[p.block];if(!b||!rainlineStreetSource(b))return [];
 const {x,y,z,w}=p.rotation,m=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];
 return [{...b,id:b.id+':ruin-occupancy',yaw:0,position:[p.position.x,p.position.y,p.position.z] as [number,number,number],halfExtents:m.map(axis=>axis.reduce((sum,v,i)=>sum+Math.abs(v)*b.halfExtents[i],0)) as [number,number,number]}];
});}

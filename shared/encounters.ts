import {getMap} from './maps';
import {cityBlockActive,cityDistrict} from './cityDistrict';
import {climbAnchors,roofSurfaces,type RoofSurface} from './traversal';
import {workshopGeometry} from './workshopGeometry';
import {terrainHeight,type LandmarkBlock} from './world';
import type {EnemyRole,StructureState,Vec3} from './types';

export interface ObjectiveDefinition {id:string;name:string;position:Vec3;seconds:number;optional?:boolean;}
export interface RooftopEncounter {
  id:string;roof:RoofSurface;objective:ObjectiveDefinition;pulseOrigin:Vec3;interactionPoint:Vec3;
  guardian:{id:string;role:EnemyRole;position:Vec3};pursuer:{id:string;role:EnemyRole;position:Vec3};
  radius:number;duration:number;salvage:number;
}
const cache=new Map<number,RooftopEncounter>();
/** One forward combat roof per theater makes climbing part of an encounter.
 * Positions use the same admitted roof surface as collision and rendering. */
export function rooftopEncounter(seed:number):RooftopEncounter {
  seed=getMap(seed).seed;const cached=cache.get(seed);if(cached)return cached;
  const overhaul=cityDistrict(seed)?.id.includes('overhaul'),owner=overhaul?cityDistrict(seed)?.buildings.find(b=>b.id.endsWith(':west-relay-yard')):undefined;
  const roof=owner?roofSurfaces(seed).find(r=>r.id===owner.roof.id)!:roofSurfaces(seed)[1],anchor=climbAnchors(seed).find(a=>a.id===roof.anchorId)!;
  const c=Math.cos(roof.yaw),s=Math.sin(roof.yaw),scale=roof.halfExtents.x/workshopGeometry(seed).roofHalfX;
  const point=(x:number,z:number):Vec3=>({x:roof.center.x+x*c+z*s,y:roof.center.y,z:roof.center.z-x*s+z*c});
  const position=owner?{...roof.center,x:roof.center.x-3,z:roof.center.z-3}:point(-2.1*scale,2*scale),pursuer={x:anchor.position.x+anchor.normal.x*7,y:0,z:anchor.position.z+anchor.normal.z*7};
  pursuer.y=terrainHeight(pursuer.x,pursuer.z,seed);
  // The admitted overhaul guardian occupies the same northwest deck, with its
  // full2.2m hull clear of the retained mast/terminal and .3m edge margin.
  const guardian=owner?point(-5.5,-6.5):{...roof.guardianSpawn};
  const encounter:RooftopEncounter={id:`${seed}:rooftop-uplink`,roof,objective:{id:'sky-uplink',name:'SKY UPLINK',position,seconds:3,optional:true},pulseOrigin:{...position,y:position.y+4.5},interactionPoint:{...position,y:position.y+1.5},guardian:{id:'roof-guardian',role:'anchor',position:guardian},pursuer:{id:'roof-pursuer',role:'scout',position:pursuer},radius:60,duration:8,salvage:200};
  cache.set(seed,encounter);return encounter;
}
export function objectiveDefinitions(seed:number):ObjectiveDefinition[] {
  const city=cityGridEncounter(seed);
  return [...getMap(seed).objectives.map(o=>({...o,position:{...o.position,y:terrainHeight(o.position.x,o.position.z,seed)}})),rooftopEncounter(seed).objective,...(city?[city.objective]:[])];
}
/** Optional east-district contract uses a real supported transit roof. */
export function cityGridEncounter(seed:number):RooftopEncounter|null {
  const district=cityDistrict(seed),overhaul=district?.id.includes('overhaul');const building=district?.buildings.find(b=>b.id.endsWith(overhaul?':east-midrise':':extension-7'));if(!building)return null;
  const roof=roofSurfaces(seed).find(r=>r.id===building.roof.id)!,position={...roof.center,x:roof.center.x-3,z:roof.center.z-3};
  return {id:'7734:city-grid-uplink',roof,objective:{id:'city-grid',name:'CITY GRID',position,seconds:4,optional:true},pulseOrigin:{...position,y:position.y+4.5},interactionPoint:{...position,y:position.y+1.5,z:position.z+.8},guardian:{id:'city-grid-guardian',role:'anchor',position:{...roof.center,x:roof.center.x+3,z:roof.center.z+3}},pursuer:{id:'city-grid-scout',role:'scout',position:overhaul?{...roof.center,x:roof.center.x+10,y:-.08,z:roof.center.z+12}:{x:229,y:-.08,z:61}},radius:75,duration:10,salvage:250};
}
export function optionalEncounter(seed:number,id:string):RooftopEncounter|null {
  return id==='sky-uplink'?rooftopEncounter(seed):id==='city-grid'?cityGridEncounter(seed):null;
}
/** The city terminal and its eligibility retire with the same owning deck. */
export function optionalEncounterSupported(seed:number,id:string,states:readonly StructureState[]):boolean {
  const district=cityDistrict(seed);if(district?.id.includes('overhaul')){const terminal=district.blocks.find(b=>b.id.endsWith(':'+id+'-terminal'));return !!terminal&&cityBlockActive(terminal,states);}
  if(id==='sky-uplink')return true;
  if(id!=='city-grid')return false;
  const terminal=cityDistrict(seed)?.blocks.find(b=>b.id.endsWith(':grid-mast'));
  return !!terminal&&cityBlockActive(terminal,states);
}
/** Antenna posts and terminal share their visible box geometry with collision. */
export function encounterBlocks(seed:number,objectiveId='sky-uplink'):LandmarkBlock[]{
  // CITY GRID's antenna belongs to the damage-aware district batch and
  // colliders. Its Beacon must not duplicate SKY UPLINK hardware.
  if(cityDistrict(seed)?.id.includes('overhaul')||objectiveId!=='sky-uplink')return [];
  const p=rooftopEncounter(seed).objective.position;
  const box=(x:number,y:number,z:number,hx:number,hy:number,hz:number,material:LandmarkBlock['material']='steel'):LandmarkBlock=>({position:[p.x+x,p.y+y,p.z+z],halfExtents:[hx,hy,hz],yaw:0,material});
  return [box(0,2.3,0,.12,2,.12),box(0,4.2,0,1.2,.09,.16,'signal'),box(0,1.7,.35,.65,.35,.22,'signal')];
}

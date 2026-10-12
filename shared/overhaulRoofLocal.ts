import type RAPIER from '@dimforge/rapier3d-compat';
import {ACTOR_HEIGHT} from './config';
import {onRoof,type SupportedRoof} from './vertical-navigation';
import type {Vec3} from './types';
type Deck={collider:RAPIER.Collider;block:{position:readonly number[];halfExtents:readonly number[]}};
export interface LocalRoofProof {status:'clear'|'blocked'|'unsupported';path:Vec3[];support:number|null;}
export function localRoofDomain(roof:SupportedRoof,from:Vec3,to:Vec3):boolean {
 return onRoof(roof,from)&&onRoof(roof,to)&&Math.abs(from.y-to.y)<.15&&Math.hypot(from.x-to.x,from.z-to.z)<=3;
}
/** One current convex native deck must cover both full square footprints. Its
 * convex top then covers every footprint along the segment, including seams or
 * holes that endpoint-only metadata/sample checks could otherwise miss. */
export function proveLocalRoofRoute(rapier:typeof RAPIER,from:Vec3,to:Vec3,radius:number,decks:Iterable<Deck>,clear:(position:Vec3)=>boolean,sweep:(from:Vec3,to:Vec3)=>boolean):LocalRoofProof {
 const goal={...to,y:from.y},floor=from.y-ACTOR_HEIGHT,offsets=[[0,0],[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]];let support:number|null=null;
 for(const {collider,block} of decks){
  if(!collider.isValid()||!collider.isEnabled()||collider.isSensor()||!(collider.shape instanceof rapier.Cuboid)||!collider.parent()?.isFixed()||!collider.parent()?.isEnabled()||Math.abs(block.position[1]+block.halfExtents[1]-floor)>.08)continue;
  const supported=[from,goal].every(p=>offsets.every(([x,z])=>{const hit=collider.castRayAndGetNormal(new rapier.Ray({x:p.x+x,y:floor+.1,z:p.z+z},{x:0,y:-1,z:0}),.2,true);return !!hit&&hit.normal.y>.99&&hit.timeOfImpact<=.18;}));
  if(supported){support=collider.handle;break;}
 }
 if(support===null)return {status:'unsupported',path:[],support};
 if(!clear(from)||!clear(goal)||!sweep(from,goal))return {status:'blocked',path:[],support};
 return {status:'clear',path:[goal],support};
}

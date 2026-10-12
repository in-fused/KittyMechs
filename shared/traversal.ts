import {cityDistrict} from './cityDistrict';
import {getMap,serviceWorkshops} from './maps';
import {workshopGeometry} from './workshopGeometry';
import type {Vec3} from './types';
import {authoredPropId,chunkAt,generateChunk,type LandmarkBlock,type PropDescriptor} from './world';

export interface ClimbAnchor {
  id:string;propId:string;position:Vec3;normal:Vec3;width:number;height:number;landing:Vec3;approach:Vec3;meshId?:string;
}
export interface TraversalBlock extends LandmarkBlock {anchorId:string;part:'facade'|'deck';}
export interface RoofSurface {
  id:string;anchorId:string;anchorIds?:string[];center:Vec3;yaw:number;halfExtents:{x:number;z:number};
  patrol:Vec3[];guardianSpawn:Vec3;exit:Vec3;outside:Vec3;obstacles:PropDescriptor[];meshId?:string;
}
const anchorCache=new Map<number,ClimbAnchor[]>();
const blockCache=new Map<number,TraversalBlock[]>();
const roofCache=new Map<number,RoofSurface[]>();
const coverCache=new Map<number,PropDescriptor[]>();
/** Legacy AI route hints remain stable; their geometry now follows the actual
 * workshop mesh. Universal player contacts use the full face registry and
 * physical triangle hits rather than these representative approach points. */
export function climbAnchors(seed:number):ClimbAnchor[] {
  seed=getMap(seed).seed;
  const cached=anchorCache.get(seed);if(cached)return cached;
  const anchors:ClimbAnchor[]=[],blocks:TraversalBlock[]=[],roofs:RoofSurface[]=[];
  const priorities=serviceWorkshops(seed),workshops=getMap(seed).props.filter(p=>p.kind==='workshop').flatMap(location=>
    generateChunk(seed,chunkAt(location.x),chunkAt(location.z)).props.filter(p=>p.id===authoredPropId(seed,location)));
  workshops.sort((a,b)=>{
    const rank=(p:PropDescriptor)=>{const i=priorities.findIndex(q=>q.x===p.x&&q.z===p.z);return i<0?2:i;};
    return rank(a)-rank(b)||(a.id??'').localeCompare(b.id??'');
  });
  for(const p of workshops){
    const index=priorities.findIndex(q=>q.x===p.x&&q.z===p.z);
    const s=p.scale,c=Math.cos(p.rotation),n=Math.sin(p.rotation);
    const point=(x:number,y:number,z:number):Vec3=>({x:p.x+x*c+z*n,y:p.y+y,z:p.z-x*n+z*c});
    const fit=workshopGeometry(seed),propId=authoredPropId(seed,p),meshId=`${propId}:mesh`,height=fit.wallTop*s,roofHeight=fit.roofTop*s;
    const id=index>=0?`${seed}:${index===0?'service':'combat'}-climb`:`${propId}:face:east`,position=point(fit.wallHalfX*s,0,0),normal={x:c,y:0,z:-n};
    const approach=point(fit.wallHalfX*s+2.5,0,0);
    if(index>=0)anchors.push({id,propId,position,normal,width:2*fit.wallHalfZ*s,height,landing:point(6*s,roofHeight,0),approach,meshId});
    const outside=point(fit.roofHalfX*s+2.5,0,0);
    const obstacles=getMap(seed).props.filter(q=>q.roofOwner?.x===p.x&&q.roofOwner?.z===p.z).flatMap(q=>generateChunk(seed,chunkAt(q.x),chunkAt(q.z)).props.filter(r=>r.id===authoredPropId(seed,q)));
    roofs.push({id:`${propId}:roof`,anchorId:id,anchorIds:[id,...['west','east','south','north'].map(side=>`${propId}:face:${side}`)],center:point(0,roofHeight,0),yaw:p.rotation,halfExtents:{x:fit.roofHalfX*s,z:fit.roofHalfZ*s},patrol:[point(-6*s,roofHeight,-5*s),point(4*s,roofHeight,-5*s),point(4*s,roofHeight,5*s),point(-6*s,roofHeight,5*s)],guardianSpawn:point(-6*s,roofHeight,-4*s),exit:point(fit.roofHalfX*s+2.5,roofHeight,0),outside,obstacles,meshId});
  }
  for(const b of cityDistrict(seed)?.buildings??[]) {anchors.push(...b.anchors);roofs.push({...b.roof,anchorId:b.anchor.id,yaw:b.yaw,guardianSpawn:{...b.roof.patrol[0]},obstacles:[]});}
  blockCache.set(seed,blocks);roofCache.set(seed,roofs);anchorCache.set(seed,anchors);return anchors;
}
export function traversalBlocks(seed:number):TraversalBlock[] {seed=getMap(seed).seed;climbAnchors(seed);return blockCache.get(seed)!;}
export function roofSurfaces(seed:number):RoofSurface[] {seed=getMap(seed).seed;climbAnchors(seed);return roofCache.get(seed)!;}
export function roofAt(seed:number,position:Vec3,tolerance=.75):RoofSurface|undefined {
  return roofSurfaces(seed).find(roof=>{
    const dx=position.x-roof.center.x,dz=position.z-roof.center.z,c=Math.cos(roof.yaw),s=Math.sin(roof.yaw);
    return Math.abs(position.y-roof.center.y)<tolerance&&Math.abs(dx*c-dz*s)<=roof.halfExtents.x&&Math.abs(dx*s+dz*c)<=roof.halfExtents.z;
  });
}
/** Stable authored cover only. Terrain retains its original graded foundations
 * after destruction and random decoration never acquires persistent state. */
export function breakableCover(seed:number):PropDescriptor[] {
  seed=getMap(seed).seed;const cached=coverCache.get(seed);if(cached)return cached;
  const props=getMap(seed).props.filter(p=>p.kind==='wall'||p.breakableHp).flatMap(p=>generateChunk(seed,chunkAt(p.x),chunkAt(p.z)).props.filter(q=>q.id===authoredPropId(seed,p)&&q.breakableHp));
  coverCache.set(seed,props);return props;
}

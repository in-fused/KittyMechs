import {cityDistrict} from './cityDistrict';
import {getMap} from './maps';
import type {Vec3} from './types';
import {authoredPropId,chunkAt,generateChunk} from './world';
import {workshopGeometry} from './workshopGeometry';
import {overhaulClimbFaces} from './overhaulGantryPortal';
import {overhaulArchitectureFaces} from './overhaulArchitecture';

export type BuildingSide='west'|'east'|'south'|'north';
/** Immutable geometric ownership, never proof that a damaged collider survives. */
export interface BuildingFace {
  id:string;buildingId:string;kind:'city'|'workshop';side:BuildingSide;
  origin:Vec3;normal:Vec3;tangent:Vec3;width:number;height:number;minY:number;topY:number;
  roofId:string;supportingBlockIds:string[];roofBlockIds:string[];
  roofCenter:Vec3;roofHalfExtents:{x:number;z:number};yaw:number;
}
export interface BuildingEnvelope {
  id:string;kind:BuildingFace['kind'];center:Vec3;yaw:number;halfExtents:{x:number;z:number};height:number;
  roofId:string;roofBlockIds:string[];faceBlockIds:Record<BuildingSide,string[]>;
  roofCenter?:Vec3;roofHalfExtents?:{x:number;z:number};
}
export const BUILDING_SIDES:readonly BuildingSide[]=['west','east','south','north'];
export function envelopeFaces(b:BuildingEnvelope):BuildingFace[] {
  const c=Math.cos(b.yaw),s=Math.sin(b.yaw);
  const rotate=(x:number,z:number):Vec3=>({x:x*c+z*s,y:0,z:-x*s+z*c});
  return BUILDING_SIDES.map(side=>{
    const nx=side==='east'?1:side==='west'?-1:0,nz=side==='north'?1:side==='south'?-1:0;
    const normal=rotate(nx,nz),tangent=rotate(-nz,nx),offset=nx?b.halfExtents.x:b.halfExtents.z;
    return {id:`${b.id}:face:${side}`,buildingId:b.id,kind:b.kind,side,
      origin:{x:b.center.x+normal.x*offset,y:b.center.y,z:b.center.z+normal.z*offset},normal,tangent,
      width:2*(nx?b.halfExtents.z:b.halfExtents.x),height:b.height,minY:b.center.y,topY:b.center.y+b.height,
      roofId:b.roofId,supportingBlockIds:b.faceBlockIds[side],roofBlockIds:b.roofBlockIds,
      roofCenter:b.roofCenter??{...b.center,y:b.center.y+b.height},roofHalfExtents:{...(b.roofHalfExtents??b.halfExtents)},yaw:b.yaw};
  });
}
const cache=new Map<number,BuildingFace[]>();
const spatialCache=new Map<number,Map<string,BuildingFace[]>>();
export function buildingFaces(seed:number):BuildingFace[] {
  seed=getMap(seed).seed;const prior=cache.get(seed);if(prior)return prior;
  const faces:BuildingFace[]=[];
  const district=cityDistrict(seed);
  for(const b of district?.buildings??[]){
    const blocks=district!.blocks.filter(block=>block.buildingId===b.id);
    const authored=overhaulClimbFaces(b,blocks);
    if(authored){faces.push(...authored);continue;}
    const envelope:BuildingEnvelope={id:b.id,kind:'city',center:b.position,yaw:b.yaw,halfExtents:{x:b.width/2,z:b.depth/2},height:b.height-.3,roofCenter:{...b.roof.center},roofHalfExtents:{...b.roof.halfExtents},roofId:b.roof.id,
      roofBlockIds:blocks.filter(block=>block.part==='deck').map(block=>block.id),faceBlockIds:{west:[],east:[],south:[],north:[]}};
    // Admit only exact exterior planes, excluding internal posts and roof fixtures.
    for(const f of envelopeFaces(envelope))for(const block of blocks){
      if(block.part!=='wall'&&block.part!=='cell')continue;
      if(Math.abs(block.yaw-b.yaw)>1e-8)continue;
      const q=faceCoordinates(f,{x:block.position[0],y:block.position[1],z:block.position[2]});
      const halfNormal=f.side==='east'||f.side==='west'?block.halfExtents[0]:block.halfExtents[2];
      if(Math.abs(q.normal+halfNormal)<1e-6&&block.position[1]-block.halfExtents[1]<f.topY+1e-6)
        envelope.faceBlockIds[f.side].push(block.id);
    }
    faces.push(...envelopeFaces(envelope));
  }
  if(district)faces.push(...overhaulArchitectureFaces(district.blocks));
  for(const p of getMap(seed).props.filter(p=>p.kind==='workshop')){
    const admitted=generateChunk(seed,chunkAt(p.x),chunkAt(p.z)).props.find(q=>q.id===authoredPropId(seed,p));if(!admitted)continue;
    const id=authoredPropId(seed,p),s=admitted.scale,g=workshopGeometry(seed);
    faces.push(...envelopeFaces({id,kind:'workshop',center:{x:p.x,y:admitted.y,z:p.z},yaw:p.rotation,
      halfExtents:{x:g.wallHalfX*s,z:g.wallHalfZ*s},height:g.wallTop*s,
      roofCenter:{x:p.x,y:admitted.y+g.roofTop*s,z:p.z},roofHalfExtents:{x:g.roofHalfX*s,z:g.roofHalfZ*s},
      roofId:`${id}:roof`,roofBlockIds:[`${id}:mesh`],faceBlockIds:Object.fromEntries(BUILDING_SIDES.map(side=>[side,[`${id}:mesh`]])) as Record<BuildingSide,string[]>}));
  }
  const bins=new Map<string,BuildingFace[]>();
  for(const f of faces){
    const a=facePoint(f,-f.width/2,f.minY),b=facePoint(f,f.width/2,f.minY);
    for(let x=chunkAt(Math.min(a.x,b.x));x<=chunkAt(Math.max(a.x,b.x));x++)
      for(let z=chunkAt(Math.min(a.z,b.z));z<=chunkAt(Math.max(a.z,b.z));z++){
        const key=`${x},${z}`,list=bins.get(key)??[];list.push(f);bins.set(key,list);
      }
  }
  spatialCache.set(seed,bins);cache.set(seed,faces);return faces;
}
export function faceCoordinates(face:BuildingFace,p:Vec3):{tangent:number;normal:number;y:number} {
  const x=p.x-face.origin.x,z=p.z-face.origin.z;
  return {tangent:x*face.tangent.x+z*face.tangent.z,normal:x*face.normal.x+z*face.normal.z,y:p.y};
}
export function facePoint(face:BuildingFace,tangent:number,y:number):Vec3 {
  return {x:face.origin.x+face.tangent.x*tangent,y,z:face.origin.z+face.tangent.z*tangent};
}
export function faceDistance(face:BuildingFace,p:Vec3):number {
  const q=faceCoordinates(face,p);
  return Math.hypot(q.normal,Math.max(0,Math.abs(q.tangent)-face.width/2),Math.max(face.minY-p.y,p.y-face.topY,0));
}
export function faceTangentLimit(face:BuildingFace,radius:number,clearance=.08):number {
  return face.width/2-radius-clearance;
}
/** Local candidate only: caller must prove intact deck footprint and headroom. */
export function faceLanding(face:BuildingFace,tangent:number,radius:number,clearance=.08):Vec3|null {
  if(!Number.isFinite(tangent)||!Number.isFinite(radius)||!Number.isFinite(clearance)||radius<0||clearance<0)return null;
  const limit=faceTangentLimit(face,radius,clearance);if(limit<0||Math.abs(tangent)>limit)return null;
  const p=facePoint(face,tangent,face.roofCenter.y),inset=radius+clearance;
  p.x-=face.normal.x*inset;p.z-=face.normal.z*inset;
  const dx=p.x-face.roofCenter.x,dz=p.z-face.roofCenter.z,c=Math.cos(face.yaw),s=Math.sin(face.yaw);
  if(Math.abs(dx*c-dz*s)+inset>face.roofHalfExtents.x+1e-8||Math.abs(dx*s+dz*c)+inset>face.roofHalfExtents.z+1e-8)return null;
  return p;
}
/** Full rectangles, with deterministic ordering and no anchor-center exclusion. */
export function nearbyBuildingFaces(seed:number,p:Vec3,range:number,limit=16):BuildingFace[] {
  if(![p.x,p.y,p.z,range,limit].every(Number.isFinite)||range<0||limit<1)return [];
  seed=getMap(seed).seed;buildingFaces(seed);const bins=spatialCache.get(seed)!,candidates=new Set<BuildingFace>();
  for(let x=chunkAt(p.x-range);x<=chunkAt(p.x+range);x++)for(let z=chunkAt(p.z-range);z<=chunkAt(p.z+range);z++)
    for(const face of bins.get(`${x},${z}`)??[])candidates.add(face);
  return [...candidates].map(face=>({face,distance:faceDistance(face,p)})).filter(q=>q.distance<=range)
    .sort((a,b)=>a.distance-b.distance||a.face.id.localeCompare(b.face.id)).slice(0,limit).map(q=>q.face);
}

import RAPIER from '@dimforge/rapier3d-compat';
import {Matrix4,Vector3} from 'three';
import {buildingFaces,faceCoordinates,type BuildingFace} from '../../../shared/buildingSurfaces';
import {climbAnchors} from '../../../shared/traversal';
import type {ClimbState} from '../../../shared/types';
import {ownsBuildingContact} from '../world/buildingContacts';
import {overhaulRuinWorldSurfaces} from '../../../shared/overhaulRuinSurfaces';
import {overhaulCornerPlan} from '../../../shared/overhaulCornerClimb';

export function climbCornerFaces(seed:number,climb:ClimbState):readonly [BuildingFace,BuildingFace]|undefined {
  const corner=climb.corner;if(!corner||corner.from!==climb.anchor)return undefined;
  const faces=buildingFaces(seed),from=faces.find(f=>f.id===corner.from),to=faces.find(f=>f.id===corner.to);
  return from&&to&&overhaulCornerPlan(from,to,corner.side,corner.radius)?[from,to]:undefined;
}

export function climbFace(seed:number,climb:ClimbState,additionalFaces:readonly BuildingFace[]=[]):BuildingFace|undefined{
  const faces=[...buildingFaces(seed),...additionalFaces],direct=faces.find(f=>f.id===climb.anchor);if(direct)return direct;
  const anchor=climbAnchors(seed).find(a=>a.id===climb.anchor);
  return anchor?faces.find(f=>f.buildingId===anchor.propId&&f.normal.x*anchor.normal.x+f.normal.z*anchor.normal.z>.999):undefined;
}
export function createClimbingProbe(){return {offset:new Vector3(),origin:{x:0,y:0,z:0},direction:{x:0,y:0,z:0},normal:new Vector3(),heights:[0,0,0,0,0],casts:0,maxSurface:-Infinity};}
/** Mask admission is necessary, but a displayed paw must also have a current
 * owned physical footprint. Five real hits replace the infinite wall plane. */
export function probeClimbingContact(world:RAPIER.World,probe:ReturnType<typeof createClimbingProbe>,face:BuildingFace,corners:readonly Vector3[],matrix:Matrix4,paw:Vector3,target:Vector3,roof:boolean,scale:number):boolean{
  probe.casts=0;probe.maxSurface=-Infinity;
  if(corners.length!==8)return false;
  let minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity,minNormal=Infinity;
  for(const corner of corners){
    probe.offset.copy(corner).applyMatrix4(matrix).sub(paw);
    const a=roof?probe.offset.x:probe.offset.x*face.tangent.x+probe.offset.z*face.tangent.z;
    const b=roof?probe.offset.z:probe.offset.y;
    const n=roof?probe.offset.y:probe.offset.x*face.normal.x+probe.offset.z*face.normal.z;
    minA=Math.min(minA,a);maxA=Math.max(maxA,a);minB=Math.min(minB,b);maxB=Math.max(maxB,b);minNormal=Math.min(minNormal,n);
  }
  if(![minA,maxA,minB,maxB,minNormal].every(Number.isFinite))return false;
  const normal=roof?{x:0,y:1,z:0}:face.normal,depth=.45*scale+.02;
  probe.normal.set(normal.x,normal.y,normal.z);
  probe.direction.x=-normal.x;probe.direction.y=-normal.y;probe.direction.z=-normal.z;
  const ray=new RAPIER.Ray(probe.origin,probe.direction),ids=roof?face.roofBlockIds:face.supportingBlockIds;
  for(let i=0;i<5;i++){
    const a=i===0?(minA+maxA)/2:(i===1||i===2?minA:maxA),b=i===0?(minB+maxB)/2:(i===1||i===3?minB:maxB);
    const x=target.x+(roof?a:face.tangent.x*a)+normal.x*minNormal,
      y=target.y+(roof?0:b)+normal.y*minNormal,z=target.z+(roof?b:face.tangent.z*a)+normal.z*minNormal;
    if(roof){const dx=x-face.roofCenter.x,dz=z-face.roofCenter.z,c=Math.cos(face.yaw),s=Math.sin(face.yaw);
      if(Math.abs(dx*c-dz*s)>face.roofHalfExtents.x+.003||Math.abs(dx*s+dz*c)>face.roofHalfExtents.z+.003)return false;
    }else{const q=faceCoordinates(face,{x,y,z});if(Math.abs(q.tangent)>face.width/2+.003||y<face.minY-.003||y>face.topY+.003)return false;}
    probe.origin.x=x+normal.x*depth;probe.origin.y=y+normal.y*depth;probe.origin.z=z+normal.z*depth;
    probe.casts++;
    const hit=world.castRayAndGetNormal(ray,depth*2,false,RAPIER.QueryFilterFlags.ONLY_FIXED);
    if(!hit||hit.collider.isSensor()||!(ownsBuildingContact(world,ids,hit.collider)||ids.some(id=>overhaulRuinWorldSurfaces(world)?.collider(id)?.handle===hit.collider.handle))||hit.normal.x*normal.x+hit.normal.y*normal.y+hit.normal.z*normal.z<.95)return false;
    const adjustment=depth-hit.timeOfImpact;
    // A continuous contact patch may straddle owned cells, but it must not
    // bridge a hole, opposite wall, trim step or an unrelated fixed prop.
    if(Math.abs(adjustment)>.2*scale+.003)return false;
    probe.heights[i]=adjustment;
    probe.maxSurface=Math.max(probe.maxSurface,(probe.origin.x-normal.x*hit.timeOfImpact)*normal.x+(probe.origin.y-normal.y*hit.timeOfImpact)*normal.y+(probe.origin.z-normal.z*hit.timeOfImpact)*normal.z);
  }
  if(Math.max(...probe.heights)-Math.min(...probe.heights)>.002*scale)return false;
  const correction=Math.max(...probe.heights)+.004;target.x+=normal.x*correction;target.y+=normal.y*correction;target.z+=normal.z*correction;
  return true;
}
/** Final transformed mesh bounds measured against the admitted physical patch.
 * This is sampled patch clearance, not an unmeasured mesh/mesh overlap claim. */
export function climbingPatchClearance(probe:ReturnType<typeof createClimbingProbe>,corners:readonly Vector3[],matrix:Matrix4):number{
  let minimum=Infinity;for(const corner of corners){probe.offset.copy(corner).applyMatrix4(matrix);minimum=Math.min(minimum,probe.offset.dot(probe.normal)-probe.maxSurface);}
  return minimum;
}

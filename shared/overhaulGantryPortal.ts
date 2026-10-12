import type {BuildingFace,BuildingSide} from './buildingSurfaces';
import type {CityBlock,CityBuilding} from './cityDistrict';

/** The physical panel stays east of the x=0 road's largest 2.05m hull. */
export const OVERHAUL_GANTRY_PORTAL = {
  x:5,z:-16,width:5,halfThickness:.2,topY:8.62,minY:-.08,
  railGap:{minX:2.5,maxX:7.5},
} as const;

/** Preserve each authored rail cell ID while trimming its exact solid outside
 * the portal. The six existing segments never require a split or empty cell. */
export function overhaulPortalRailSpan(minX:number,maxX:number):[number,number] {
  const gap=OVERHAUL_GANTRY_PORTAL.railGap;
  if(maxX<=gap.minX||minX>=gap.maxX)return [minX,maxX];
  if(minX<gap.minX&&maxX<=gap.maxX)return [minX,gap.minX];
  if(minX>=gap.minX&&maxX>gap.maxX)return [gap.maxX,maxX];
  throw new Error('Portal requires a different rail cell partition');
}

/** Sparse gantries have authored physical portal faces, not solid envelope
 * walls. Ownership admits only bank cells whose exterior plane is exactly the
 * anchor plane; the authority must still prove each complete native paw patch. */
export function overhaulClimbFaces(building:CityBuilding,blocks:readonly CityBlock[]):BuildingFace[]|null {
  if(!building.id.endsWith(':overhaul:entry-gantry'))return null;
  const roofBlockIds=blocks.filter(b=>b.part==='deck').map(b=>b.id);
  return building.anchors.map(anchor=>{
    const n=anchor.normal,side:BuildingSide=n.x<-.5?'west':n.x>.5?'east':n.z<-.5?'south':'north';
    const supporting=blocks.filter(block=>{
      if(block.anchorId!==anchor.id||block.yaw!==building.yaw)return false;
      const normal=(block.position[0]-anchor.position.x)*n.x+(block.position[2]-anchor.position.z)*n.z;
      const extent=Math.abs(n.x)*block.halfExtents[0]+Math.abs(n.z)*block.halfExtents[2];
      return Math.abs(normal+extent)<1e-6;
    });
    const topY=Math.max(building.position.y,...supporting.map(b=>b.position[1]+b.halfExtents[1]));
    return {id:`${building.id}:face:${side}`,buildingId:building.id,kind:'city',side,
      origin:{...anchor.position},normal:{...n},tangent:{x:-n.z,y:0,z:n.x},width:anchor.width,
      height:topY-building.position.y,minY:building.position.y,topY,
      roofId:building.roof.id,roofBlockIds,supportingBlockIds:supporting.map(b=>b.id),
      roofCenter:{...building.roof.center},roofHalfExtents:{...building.roof.halfExtents},yaw:building.yaw};
  });
}

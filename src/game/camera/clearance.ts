import RAPIER from '@dimforge/rapier3d-compat';
import type {Vec3} from '../../../shared/types';
const cameraSphere=new RAPIER.Ball(.26),rotation={x:0,y:0,z:0,w:1};
/** Sweep from the safe actor-side focus to the actual interpolated camera.
 * Fractional TOI avoids tunneling during orbit, recoil and rapid mantles. */
export function cameraClearance(world:RAPIER.World,from:Vec3,to:Vec3):Vec3 {
  const delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},length=Math.hypot(delta.x,delta.y,delta.z);
  if(length<1e-6)return{...from};
  const hit=world.castShape(from,rotation,delta,cameraSphere,.015,1,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);
  const t=hit?Math.max(0,Math.min(1,hit.time_of_impact-.025/length)):1;
  return{x:from.x+delta.x*t,y:from.y+delta.y*t,z:from.z+delta.z*t};
}

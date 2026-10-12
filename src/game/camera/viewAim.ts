import {clamp} from '../../../shared/math';
import type {MechStance,Vec3} from '../../../shared/types';

/** Match Simulation.shoot: horizontal muzzle = root + direction * 1.3,
 * muzzle Y = root + stance height. No screen-space actor relocation. */
export function crosshairMuzzleAim(root:Vec3,stance:MechStance,target:Vec3,fallbackYaw:number,fallbackPitch:number){
  const dx=target.x-root.x,dz=target.z-root.z,horizontal=Math.hypot(dx,dz),dy=target.y-root.y-(stance==='upright'?1.65:.65);
  // A third-person camera may hit nearby cover between its boom and the
  // pilot. That obstruction cannot turn the muzzle around behind the pilot.
  const forwardDistance=-dx*Math.sin(fallbackYaw)-dz*Math.cos(fallbackYaw);
  if(![dx,dz,dy,horizontal,forwardDistance].every(Number.isFinite)||horizontal<=1.3||forwardDistance<=0)return {yaw:fallbackYaw,pitch:clamp(fallbackPitch,-.9,.75),reachable:false};
  const yaw=Math.atan2(-dx,-dz),error=(pitch:number)=>Math.tan(pitch)*(horizontal-1.3*Math.cos(pitch))-dy;
  let low=-.9,high=.75;
  const reachable=error(low)<=0&&error(high)>=0;
  if(!reachable)return {yaw,pitch:dy<0?low:high,reachable:false};
  // Strictly increasing for horizontal > 1.3: a bounded exact muzzle witness.
  for(let i=0;i<28;i++){const middle=(low+high)/2;if(error(middle)<0)low=middle;else high=middle;}
  return {yaw,pitch:(low+high)/2,reachable:true};
}

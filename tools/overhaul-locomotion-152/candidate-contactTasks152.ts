import {Vector3} from 'three';
/** A contact response clock is separate from the unchanged distance gait
 * clock. Its duration comes from the loaded source's actual swing interval. */
export interface Recovery152 {start:Vector3;velocity:Vector3;at:number;duration:number;}
export const angle152=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export function advanceHeading152(previous:number,target:number,elapsed:number,quarterTurnDuration:number):number{
 const delta=angle152(target-previous),step=Math.max(0,elapsed)*Math.PI/(2*quarterTurnDuration);
 return previous+Math.sign(delta)*Math.min(Math.abs(delta),step);
}
/** C1 endpoint interpolation; sourceArc vanishes with its derivative at both
 * response endpoints. The caller obtains that arc from real loaded clips. */
export function recoveryPoint152(recovery:Recovery152,goal:Vector3,goalVelocity:Vector3,time:number,sourceArc:Vector3):Vector3{
 const u=Math.max(0,Math.min(1,(time-recovery.at)/recovery.duration)),u2=u*u,u3=u2*u;
 return recovery.start.clone().multiplyScalar(2*u3-3*u2+1)
  .addScaledVector(recovery.velocity,(u3-2*u2+u)*recovery.duration)
  .addScaledVector(goal,-2*u3+3*u2)
  .addScaledVector(goalVelocity,(u3-u2)*recovery.duration)
  .addScaledVector(sourceArc,4*u*(1-u));
}

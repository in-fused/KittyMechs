import {WORLD_LIMIT} from './config';

/** Cosmetic backdrops must stay outside the square movement envelope, including
 * its corners and the furthest 18m camera arm. They provide no physical support. */
export const SCENERY_CLEARANCE=32;
export const MOUNTAIN_INNER_RADIUS=Math.SQRT2*WORLD_LIMIT+SCENERY_CLEARANCE;
export function scenicOcean(seed:number){
  if(seed!==7734)return null;
  const width=440,depth=850;
  return {x:-WORLD_LIMIT-SCENERY_CLEARANCE-width/2,y:-.3,z:0,width,depth};
}

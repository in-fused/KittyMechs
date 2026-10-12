/** All solid trees retain one rendered LOD. Distances change detail, never visibility. */
export type FoliageQuality = 'low'|'medium'|'high'|'ultra';
const TREE:Record<FoliageQuality,readonly [number,number]>={low:[16,35],medium:[28,58],high:[32,70],ultra:[36,80]};
const FERN:Record<FoliageQuality,readonly [number]>={low:[10],medium:[14],high:[17],ultra:[20]};
export function foliageLod(kind:'cedar'|'fern',distance:number,quality:FoliageQuality,previous=-1):number {
  const boundaries=kind==='cedar'?TREE[quality]:FERN[quality];
  const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
  if(previous<0||previous>boundaries.length)return boundaries.filter(limit=>d>limit).length;
  let lod=previous;
  while(lod<boundaries.length&&d>boundaries[lod]+4)lod++;
  while(lod>0&&d<boundaries[lod-1]-4)lod--;
  return lod;
}
/** Two source clumps share textures while avoiding repeated identical silhouettes. */
export const fernVariant=(x:number,z:number)=>Math.abs(Math.floor(x*17+z*31))%2;

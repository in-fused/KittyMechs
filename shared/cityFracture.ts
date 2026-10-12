import type {CityBlock} from './cityDistrict';
import type {Vec3} from './types';

export interface CityFracturePiece {
  id:number;center:number[];positions:number[];normals:number[];uv:number[];indices:number[];
  groups:{start:number;count:number;materialIndex:number}[];volume:number;
}
export interface CityFractureAsset {
  schema:number;template:string;seed:number;fragmentCount:number;contentSha256:string;
  pieces:CityFracturePiece[];
  shapes?:{post:CityFractureAsset;face:CityFractureAsset;slab:CityFractureAsset};
}
const orientedAssets=new WeakMap<CityFractureAsset,Map<string,CityFractureAsset>>();
/** Canonical dimensions determine the template and its basis for every peer.
 * Catalog coordinates are longest/middle/thinnest; permutation is an isometry,
 * with triangle winding corrected for an odd permutation. Source scale and yaw
 * are still applied exactly once by geometry and native-body construction. */
export function cityFractureAssetFor(block:CityBlock,asset:CityFractureAsset):CityFractureAsset {
  if(!asset.shapes)return asset;
  const axes=[0,1,2].sort((a,b)=>block.halfExtents[b]-block.halfExtents[a]||a-b);
  const [long,middle,thin]=axes.map(i=>block.halfExtents[i]);
  const kind=long/middle>=4?'post':middle/thin>=4?(axes[2]===1?'slab':'face'):null;
  if(!kind)return asset;
  const source=asset.shapes[kind],key=`${source.template}:${axes.join(',')}`;
  let cache=orientedAssets.get(asset);if(!cache){cache=new Map();orientedAssets.set(asset,cache);}
  const before=cache.get(key);if(before)return before;
  const odd=axes.reduce((n,a,i)=>n+axes.slice(i+1).filter(b=>a>b).length,0)%2===1;
  const orient=(values:number[])=>{const out=new Array<number>(values.length);for(let i=0;i<values.length;i+=3)for(let j=0;j<3;j++)out[i+axes[j]]=values[i+j];return out;};
  const pieces=source.pieces.map(piece=>{
    const indices=[...piece.indices];if(odd)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    return {...piece,center:orient(piece.center),positions:orient(piece.positions),normals:orient(piece.normals),indices};
  });
  const selected={...source,template:key,pieces};cache.set(key,selected);return selected;
}
/** Piece offsets belong to the original component, never the impact point. */
export function cityFractureCenter(block:CityBlock,piece:CityFracturePiece):Vec3 {
  const [x,y,z]=piece.center.map((v,i)=>v*block.halfExtents[i]*2),c=Math.cos(block.yaw),s=Math.sin(block.yaw);
  return {x:block.position[0]+x*c+z*s,y:block.position[1]+y,z:block.position[2]-x*s+z*c};
}
/** Same meter-scale, face-local coordinates as buildCityGeometry's six faces.
 * Interior cuts use their dominant owner-space normal for stable planar UVs. */
export function cityFractureTextureUV(position:Vec3,normal:Vec3,size:Vec3,unit:number):[number,number] {
  const x=position.x*size.x,y=position.y*size.y,z=position.z*size.z;
  const nx=Math.abs(normal.x/size.x),ny=Math.abs(normal.y/size.y),nz=Math.abs(normal.z/size.z);
  if(nx>=ny&&nx>=nz)return [(size.z/2+(normal.x>=0?-z:z))/unit,(y+size.y/2)/unit];
  if(ny>=nz)return [(x+size.x/2)/unit,(size.z/2+(normal.y>=0?-z:z))/unit];
  return [(size.x/2+(normal.z>=0?x:-x))/unit,(y+size.y/2)/unit];
}

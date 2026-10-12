import {BufferAttribute,BufferGeometry} from 'three';
import {cityFractureTextureUV,type CityFracturePiece} from '../../../shared/cityFracture';
import type {Vec3} from '../../../shared/types';

/** Bake only affine transforms of already admitted buffers. No runtime cuts.
 * Pre-scale normals/UVs once, so each animated instance uses uniform shrink. */
export function buildCityFractureGeometry(piece:CityFracturePiece,size:Vec3,unit:number):BufferGeometry {
  const positions:number[]=[],normals:number[]=[],uv:number[]=[],interior:number[]=[];
  for(let i=0;i<piece.indices.length;i++){
    const index=piece.indices[i],offset=index*3;
    const x=piece.positions[offset],y=piece.positions[offset+1],z=piece.positions[offset+2];
    positions.push(x*size.x,y*size.y,z*size.z);
    const normal={x:piece.normals[offset],y:piece.normals[offset+1],z:piece.normals[offset+2]},length=Math.hypot(normal.x/size.x,normal.y/size.y,normal.z/size.z);
    normals.push(normal.x/size.x/length,normal.y/size.y/length,normal.z/size.z/length);
    uv.push(...cityFractureTextureUV({x:x+piece.center[0],y:y+piece.center[1],z:z+piece.center[2]},normal,size,unit));
    interior.push(piece.groups.some(g=>g.materialIndex===1&&i>=g.start&&i<g.start+g.count)?1:0);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));
  geometry.setAttribute('normal',new BufferAttribute(new Float32Array(normals),3));
  geometry.setAttribute('uv',new BufferAttribute(new Float32Array(uv),2));
  geometry.setAttribute('fractureInterior',new BufferAttribute(new Float32Array(interior),1));
  geometry.setIndex(Array.from({length:piece.indices.length},(_,i)=>i));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

import type {Vec3} from './types';
import {chunkKeys,terrainMesh,terrainHeight,type PropDescriptor,propCollider} from './world';
/** Solid cover must stay visible regardless of a client's foliage setting. */
export const visibleProp=(prop:PropDescriptor,density:number)=>!!propCollider(prop)||prop.kind!=='fern'||Math.abs(Math.sin(prop.x*17+prop.z*11))<=density;
/** A bounded forward strip becomes visible before a fast pilot crosses a seam. */
export function renderChunkKeys(position:Vec3,velocity:Vec3,radius:number):string[]{
  const speed=Math.hypot(velocity.x,velocity.z),lead=speed>2?Math.min(24,speed*1.5):0;
  const x=position.x+(speed?velocity.x/speed*lead:0),z=position.z+(speed?velocity.z/speed*lead:0);
  return [...new Set([...chunkKeys(position.x,position.z,radius),...chunkKeys(x,z,radius)])].sort();
}
/** Worker-safe finite terrain normals; adjacent tile seams use identical samples. */
export function terrainRenderData(cx:number,cz:number,seed:number){
  const data=terrainMesh(cx,cz,32,seed),normals=new Float32Array(data.vertices.length),uv=new Float32Array(data.vertices.length/3*2),step=2,epsilon=.5;
  for(let z=0;z<=32;z++)for(let x=0;x<=32;x++){
    const i=(z*33+x)*3,px=data.vertices[i],pz=data.vertices[i+2];
    uv[i/3*2]=px/9;uv[i/3*2+1]=pz/9;
    // Use neighboring samples on the same mesh lattice, including outside the tile.
    const h=(dx:number,dz:number)=>terrainHeight(px+dx,pz+dz,seed);
    const nx=h(-step,0)-h(step,0),nz=h(0,-step)-h(0,step),ny=step*2;
    const length=Math.hypot(nx,ny,nz)||epsilon;normals[i]=nx/length;normals[i+1]=ny/length;normals[i+2]=nz/length;
  }
  return {...data,normals,uv};
}

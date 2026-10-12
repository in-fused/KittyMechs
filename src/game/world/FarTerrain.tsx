import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { chunkAt, terrainHeight } from '../../../shared/world';
import { getMap } from '../../../shared/maps';
import { useSurfaces } from '../rendering/materials';

/** Cheap terrain beneath distant authored content. Local detailed tile holes
 * prevent z-fighting and preserve exact streamed terrain at the pilot's feet. */
export function FarTerrain({seed,detailedKeys}:{seed:number;detailedKeys:string[]}){
  const maps=useSurfaces(),map=getMap(seed);
  const data=useMemo(()=>{
    const segments=128,step=8,origin=-512,vertices=new Float32Array((segments+1)**2*3),uv=new Float32Array((segments+1)**2*2);
    for(let z=0;z<=segments;z++)for(let x=0;x<=segments;x++){
      const index=z*(segments+1)+x,px=origin+x*step,pz=origin+z*step;
      vertices[index*3]=px;vertices[index*3+1]=terrainHeight(px,pz,seed);vertices[index*3+2]=pz;uv[index*2]=px/9;uv[index*2+1]=pz/9;
    }
    const full:number[]=[];for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;full.push(a,c,b,b,c,d);}
    const source=new BufferGeometry();source.setAttribute('position',new BufferAttribute(vertices,3));source.setIndex(full);source.computeVertexNormals();const normals=new Float32Array(source.getAttribute('normal').array);source.dispose();
    return {vertices,uv,normals,segments,step,origin};
  },[seed]);
  const geometry=useMemo(()=>{
    const {vertices,uv,normals,segments,step,origin}=data,holes=new Set(detailedKeys),indices:number[]=[];
    for(let z=0;z<segments;z++)for(let x=0;x<segments;x++){
      if(holes.has(`${chunkAt(origin+(x+.5)*step)},${chunkAt(origin+(z+.5)*step)}`))continue;
      const a=z*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);
    }
    const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(vertices,3));g.setAttribute('uv',new BufferAttribute(uv,2));g.setAttribute('normal',new BufferAttribute(normals,3));g.setIndex(indices);return g;
  },[data,detailedKeys]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={map.ground} map={maps.ground} normalMap={maps.groundNormal} normalScale={[.6,.6]} roughness={seed===7734?.5:.9}/></mesh>;
}

import {useEffect,useMemo} from 'react';
import {BufferAttribute,BufferGeometry} from 'three';
import {terrainHeight} from '../../../shared/world';
import {serviceApproaches} from '../../../shared/maps';
/** Routes lead to actual buildings; facade grips belong to their own current
 * mesh/cell geometry. Broad decorative strips must not bridge damage holes. */
export function ServiceClimb({seed}:{seed:number}){
  return <ServiceTrail seed={seed}/>;
}
function ServiceTrail({seed}:{seed:number}){
  const geometry=useMemo(()=>{
    const vertices:number[]=[],indices:number[]=[];
    for(const path of serviceApproaches(seed))for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),steps=Math.ceil(len),nx=-dz/len,nz=dx/len;
      for(let k=0;k<steps;k++)if(k%5<3)for(const side of [-1,1]){
        const offset=vertices.length/3;
        for(const [t,w] of [[k/steps,side*1.5-.04],[k/steps,side*1.5+.04],[(k+1)/steps,side*1.5-.04],[(k+1)/steps,side*1.5+.04]]){const x=a.x+dx*t+nx*w,z=a.z+dz*t+nz*w;vertices.push(x,terrainHeight(x,z,seed)+.035,z);}
        indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2);
      }
    }
    const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(vertices),3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[seed]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#90bba9" roughness={.8} polygonOffset polygonOffsetFactor={-2}/></mesh>;
}

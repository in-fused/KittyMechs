import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D } from 'three';
import { landmarkBlocks, type LandmarkBlock } from '../../../shared/world';

function BlockBatch({blocks,color,signal=false}:{blocks:LandmarkBlock[];color:string;signal?:boolean}){
  const ref=useRef<InstancedMesh>(null);
  const geometry=useMemo(()=>new BoxGeometry(2,2,2),[]);
  const material=useMemo(()=>new MeshStandardMaterial({color,roughness:signal?.35:.78,metalness:signal?.4:.3,emissive:signal?color:'#000000',emissiveIntensity:signal?1.3:0}),[color,signal]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  useEffect(()=>{
    const mesh=ref.current;if(!mesh)return;const object=new Object3D(),matrix=new Matrix4();
    blocks.forEach((b,i)=>{object.position.set(...b.position);object.scale.set(...b.halfExtents);object.rotation.set(0,b.yaw,0);object.updateMatrix();matrix.copy(object.matrix);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  },[blocks]);
  return <instancedMesh ref={ref} args={[geometry,material,blocks.length]} castShadow receiveShadow/>;
}
export function Landmarks({seed}:{seed:number}){
  const groups=useMemo(()=>{const all=landmarkBlocks(seed);return {concrete:all.filter(b=>b.material==='concrete'),steel:all.filter(b=>b.material==='steel'),signal:all.filter(b=>b.material==='signal')};},[seed]);
  return <>
    <BlockBatch blocks={groups.concrete} color={seed===1926?'#78634e':seed===4107?'#b9c6c8':'#667477'}/>
    <BlockBatch blocks={groups.steel} color={seed===1926?'#695b4c':seed===4107?'#70888f':'#486168'}/>
    <BlockBatch blocks={groups.signal} color={seed===1926?'#ffb351':'#8de5e2'} signal/>
  </>;
}

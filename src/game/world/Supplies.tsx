import {useEffect,useMemo,useRef} from 'react';
import {useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {InstancedMesh,Object3D,SRGBColorSpace} from 'three';
import {SUPPLIES,SUPPLY_COUNT} from '../../../shared/supplies';
import type {SupplyKind,SupplyState} from '../../../shared/types';
import {runtime} from '../runtime';
import {useGameStore} from '../../state/store';
const EMPTY_SUPPLIES:SupplyState[]=[];
export function Supplies(){
  const supplies=useGameStore(s=>s.hud?.supplies??EMPTY_SUPPLIES);
  return <>{(['repair','energy','coolant'] as SupplyKind[]).map(kind=><SupplyBatch key={kind} kind={kind} supplies={supplies.filter(p=>p.kind===kind)}/>)}</>;
}
/** Six small caches share three material/instance batches. Collision remains
 * ordinary pickup reach, and item presence comes entirely from room authority. */
function SupplyBatch({kind,supplies}:{kind:SupplyKind;supplies:SupplyState[]}){
  const body=useRef<InstancedMesh>(null),face=useRef<InstancedMesh>(null),rim=useRef<InstancedMesh>(null),object=useMemo(()=>new Object3D(),[]);
  const definition=SUPPLIES[kind],texture=useTexture(definition.texture);
  useEffect(()=>{texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;},[texture]);
  const size=kind==='repair'?[.58,1.05,.58]:kind==='energy'?[.38,1.45,.38]:[.56,.85,.36];
  useFrame(()=>{
    const snap=runtime.snapshot;if(!snap||!body.current||!face.current||!rim.current)return;
    const active=supplies.filter(p=>p.availableAt<=snap.time&&p.claimedBy===null).slice(0,SUPPLY_COUNT);body.current.count=face.current.count=rim.current.count=active.length;
    active.forEach((p,i)=>{
      const angle=snap.time*.25+p.born,hover=Math.sin(snap.time*1.2+p.born)*.035;
      object.position.set(p.position.x,p.position.y+.16+size[1]/2+hover,p.position.z);object.rotation.set(0,angle,0);object.scale.set(...size as [number,number,number]);object.updateMatrix();body.current!.setMatrixAt(i,object.matrix);
      const offset=size[2]/2+.015;object.position.set(p.position.x+Math.sin(angle)*offset,p.position.y+.16+size[1]*.6+hover,p.position.z+Math.cos(angle)*offset);object.scale.setScalar(kind==='energy'?.55:.65);object.updateMatrix();face.current!.setMatrixAt(i,object.matrix);
      object.position.set(p.position.x,p.position.y+.08,p.position.z);object.rotation.set(-Math.PI/2,0,0);object.scale.setScalar(.85);object.updateMatrix();rim.current!.setMatrixAt(i,object.matrix);
    });
    body.current.instanceMatrix.needsUpdate=true;face.current.instanceMatrix.needsUpdate=true;rim.current.instanceMatrix.needsUpdate=true;
  });
  return <><instancedMesh ref={body} args={[undefined,undefined,SUPPLY_COUNT]} count={0} frustumCulled={false} castShadow receiveShadow>{kind==='coolant'?<boxGeometry args={[1,1,1]}/>:<cylinderGeometry args={[.5,.5,1,kind==='repair'?6:12]}/>}<meshStandardMaterial color="#445057" metalness={.7} roughness={.38}/></instancedMesh><instancedMesh ref={face} args={[undefined,undefined,SUPPLY_COUNT]} count={0} frustumCulled={false}><planeGeometry args={[1,1]}/><meshStandardMaterial map={texture} emissiveMap={texture} emissive={definition.color} emissiveIntensity={.9} metalness={.25} roughness={.45}/></instancedMesh><instancedMesh ref={rim} args={[undefined,undefined,SUPPLY_COUNT]} count={0} frustumCulled={false}><ringGeometry args={[.82,1,24]}/><meshBasicMaterial color={definition.color} transparent opacity={.4} depthWrite={false} toneMapped={false} side={2}/></instancedMesh></>;
}

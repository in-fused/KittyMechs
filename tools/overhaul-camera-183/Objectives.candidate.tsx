import { useLayoutEffect,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import {encounterBlocks,objectiveDefinitions,optionalEncounterSupported} from '../../../shared/encounters';
import type {CityPresentation} from './cityPresentation';
import { useGameStore } from '../../state/store';
import { runtime } from '../runtime';
import { distance } from '../../../shared/math';
import {registerVisualOccluder058} from '../camera/visualOccluders058';
export function Objectives({presentation}:{presentation:CityPresentation}){
  const mode=useGameStore(s=>s.mode),seed=useGameStore(s=>s.seed);
  if(mode==='pvp'&&runtime.transport!=='training')return null;
  return <>{objectiveDefinitions(seed).map(o=><Beacon key={`${seed}-${o.id}`} id={o.id} position={[o.position.x,o.position.y,o.position.z]} name={o.name} optional={o.optional} seed={seed} presentation={presentation}/>)}</>;
}
function Beacon({id,name,position,optional,seed,presentation}:{id:string;name:string;position:[number,number,number];optional?:boolean;seed:number;presentation:CityPresentation}){
  const root=useRef<Group>(null),ring=useRef<Mesh>(null),label=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{if(root.current)return registerVisualOccluder058(`objective:${seed}:${id}`,root.current,runtime.generation);},[seed,id,optional]);
  useLayoutEffect(()=>presentation.register(state=>{
    if(!root.current||!optional)return;
    root.current.visible=optionalEncounterSupported(seed,id,state.structures);
    if(!root.current.visible&&label.current)label.current.style.display='none';
  }),[presentation,seed,id,optional]);
  useFrame((_state,dt)=>{
    const objective=runtime.snapshot?.objectives.find(o=>o.id===id);if(!objective||!root.current||!ring.current)return;
    root.current.visible=!optional||optionalEncounterSupported(seed,id,presentation.read()?.structures??[]);
    if(!root.current.visible){if(label.current)label.current.style.display='none';return;}
    ring.current.rotation.z+=dt*.3;
    const checkpoint=runtime.snapshot?.checkpoint?.objectiveId===id;
    const material=ring.current.material as MeshStandardMaterial;material.color.set(checkpoint?'#b4ffe4':objective.complete?'#88d9b4':objective.unlocked?'#eabc76':'#52616a');material.emissive.copy(material.color);material.emissiveIntensity=checkpoint?1:objective.unlocked?.65:.12;
    if(label.current){label.current.className=`beacon-label ${objective.complete?'complete':''} ${objective.unlocked?'':'locked'}`;label.current.textContent=checkpoint?'SQUAD CHECKPOINT · '+name:objective.complete?'✓ '+name:objective.unlocked?name:'◇ '+name;}
    const player=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);
    if(label.current&&player)label.current.style.display=distance(player.position,{...objective.position,y:objective.position.y+1})<10?'none':'block';
  });
  return <group ref={root} position={position}>
    {/* Objective navigation is a ground marking, leaving the nearby pilot's
        silhouette clear. Optional encounter hardware still represents its
        actual world geometry; no camera or environmental mesh is hidden. */}
    {optional&&encounterBlocks(seed,id).map((b,i)=><mesh key={i} position={[b.position[0]-position[0],b.position[1]-position[1],b.position[2]-position[2]]} castShadow><boxGeometry args={b.halfExtents.map(n=>n*2) as [number,number,number]}/><meshStandardMaterial color={b.material==='signal'?'#86dfff':'#afbcb8'} emissive={b.material==='signal'?'#4c9ab7':'#000000'} emissiveIntensity={.7} metalness={.7} roughness={.3}/></mesh>)}
    <mesh ref={ring} rotation={[-Math.PI/2,0,0]} position={[0,.035,0]}><ringGeometry args={[2.85,3.2,64]}/><meshStandardMaterial color="#eabc76" emissive="#eabc76" emissiveIntensity={.65} metalness={.2} roughness={.7} depthTest depthWrite={false}/></mesh>
    <Html center position={[0,4,0]} distanceFactor={10} zIndexRange={[2,0]} style={{pointerEvents:'none'}}><div ref={label} className="beacon-label">{name}</div></Html>
  </group>;
}

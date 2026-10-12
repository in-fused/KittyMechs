import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {Group,Mesh,Material,SkinnedMesh} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {ActorState} from '../../shared/types';
import {runtime} from '../../src/game/runtime';
import {sampleRenderActor,forgetRenderActor} from '../../src/game/entities/renderTimeline';
import {shareSkinPalettes042} from '../../src/game/entities/shareSkinPalettes042';
import {prepareWeightedVisualEnvelope007,weightedCameraProvider007} from '../../src/game/camera/weightedVisualEnvelope007';
import {registerCameraVisual,completeCameraVisual} from '../../src/game/camera/visualRegistry';
import {NativeOwner214,type Contract214,type Status214} from './nativeOwner214';

/** Proposed route receives the existing complete standard Actor as a prop.
 * No circular Actors import; one detailed clone retained across action gaps. */
export function NativeActor214({actor,contract,fallback,peerCompatible,onDiagnostic}:{actor:Pick<ActorState,'id'>;contract:Contract214;fallback:ReactNode;peerCompatible:(id:string)=>boolean;onDiagnostic?:(id:string,value:any|null)=>void}){
 const gltf=useGLTF(contract.publicURL+'?sha='+contract.sha256.slice(0,12));
 const root=useRef<Group>(null),body=useRef<Group>(null),cameraCleanup=useRef<(()=>void)|null>(null),cameraGeneration=useRef(-1);
 const [status,setStatus]=useState<Status214>('source');
 const prepared=useMemo(()=>{const model=clone(gltf.scene),materials=new Map<Material,Material>();const own=(m:Material)=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m)!;};model.traverse(o=>{if(o instanceof Mesh){o.castShadow=o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);}if(o instanceof SkinnedMesh)o.frustumCulled=false;});model.updateWorldMatrix(true,false);model.updateMatrixWorld(true);return {model,materials,skeletons:shareSkinPalettes042(model)};},[gltf]);
 const owner=useMemo(()=>new NativeOwner214(prepared.model,gltf.animations,contract,actor.id),[prepared,gltf.animations,contract,actor.id]);
 const envelope=useMemo(()=>prepareWeightedVisualEnvelope007(prepared.model),[prepared]);
 const currentStatus=useRef(status);
 useEffect(()=>{onDiagnostic?.(actor.id,owner.diagnostic);return ()=>onDiagnostic?.(actor.id,null);},[actor.id,owner,onDiagnostic]);
 useEffect(()=>()=>{cameraCleanup.current?.();cameraCleanup.current=null;owner.dispose();forgetRenderActor(actor.id);for(const m of prepared.materials.values())m.dispose();for(const s of prepared.skeletons)s.dispose();},[owner,prepared,actor.id]);
 useFrame((frame,dt)=>{
  const p=sampleRenderActor(actor.id,frame.clock.elapsedTime,dt);if(!p||!root.current||!body.current)return;
  owner.step(p,frame.clock.elapsedTime,dt,root.current,body.current,p.state.pair?peerCompatible(p.state.pair.other):true,runtime.generation);
  const next=owner.diagnostic.status as Status214;if(next!=='source')root.current.visible=false;
  if(currentStatus.current!==next){currentStatus.current=next;setStatus(next);}
  // Register only after a completed valid source frame. The existing fallback
  // owns its own camera envelope. Entry cleanup is identity-conditional.
  if(next!=='source'||!root.current.visible){cameraCleanup.current?.();cameraCleanup.current=null;}
  else if(status==='source'){
   if(!cameraCleanup.current||cameraGeneration.current!==runtime.generation){cameraCleanup.current?.();cameraCleanup.current=registerCameraVisual(actor.id,root.current,envelope,runtime.generation,weightedCameraProvider007(envelope));cameraGeneration.current=runtime.generation;}
   completeCameraVisual(actor.id,root.current,frame.clock.elapsedTime,runtime.generation);
  }
 },-1);
 return <><group ref={root}><group ref={body} rotation={[0,Math.PI,0]} scale={contract.scale}><primitive object={prepared.model} dispose={null}/></group></group>{status!=='source'&&fallback}</>;
}

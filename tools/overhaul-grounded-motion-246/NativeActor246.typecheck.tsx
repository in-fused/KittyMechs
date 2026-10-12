import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {useRapier} from '@react-three/rapier';
import {createGroundSupport067} from '../../src/game/entities/groundSupport067';
import {Group,Mesh,Material,SkinnedMesh} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {ActorState} from '../../shared/types';
import {runtime} from '../../src/game/runtime';
import {sampleRenderActor,forgetRenderActor} from '../../src/game/entities/renderTimeline';
import {shareSkinPalettes042} from '../../src/game/entities/shareSkinPalettes042';
import {prepareWeightedVisualEnvelope007,weightedCameraProvider007} from '../../src/game/camera/weightedVisualEnvelope007';
import {registerCameraVisual,completeCameraVisual,ownsCameraVisual222} from './visualRegistry246.typecheck';
import {NativeOwner218,type Contract214,type Status214} from './nativeOwner246';

export function NativeActor218({actor,contract,fallback,peerCompatible,onDiagnostic,onDispose}:{actor:Pick<ActorState,'id'>;contract:Contract214;fallback:ReactNode;peerCompatible:(id:string)=>boolean;onDiagnostic:(id:string,value:any|null)=>void;onDispose:()=>void}){
 const {world,rapier}=useRapier();
 const gltf=useGLTF(contract.publicURL+'?sha='+contract.sha256.slice(0,12)),root=useRef<Group>(null),body=useRef<Group>(null),fallbackRoot=useRef<Group>(null);
 const live=useRef<{model:ReturnType<typeof clone>;owner:NativeOwner218;contact:ReturnType<NativeOwner218['createContactObservation246']>;envelope:ReturnType<typeof prepareWeightedVisualEnvelope007>;materials:Map<Material,Material>;skeletons:ReturnType<typeof shareSkinPalettes042>}|null>(null);
 const [model,setModel]=useState<ReturnType<typeof clone>|null>(null),[view,setView]=useState<{status:Status214;present:boolean}>({status:'temporary-standard',present:true}),viewRef=useRef(view);
 const cameraCleanup=useRef<(()=>void)|null>(null),cameraGeneration=useRef(-1);
 useEffect(()=>{
  // Resource creation belongs to effect setup, not a reusable disposed memo.
  // StrictMode cleanup/setup creates fresh clone/material/skeleton/owner units.
  const next=clone(gltf.scene),materials=new Map<Material,Material>(),own=(m:Material)=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m)!;};
  next.traverse(o=>{if(o instanceof Mesh){o.castShadow=o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);}if(o instanceof SkinnedMesh)o.frustumCulled=false;});next.updateWorldMatrix(true,false);next.updateMatrixWorld(true);
  let owner:NativeOwner218|null=null;
  try{const skeletons=shareSkinPalettes042(next);owner=new NativeOwner218(next,gltf.animations,contract,actor.id);const contact=owner.createContactObservation246(createGroundSupport067(world,rapier,()=>runtime.generation));const envelope=prepareWeightedVisualEnvelope007(next),owned={model:next,materials,skeletons,owner,envelope,contact};
   live.current=owned;setModel(next);onDiagnostic(actor.id,owner.diagnostic);
   return ()=>{cameraCleanup.current?.();cameraCleanup.current=null;if(live.current===owned)live.current=null;onDiagnostic(actor.id,null);onDispose();owned.contact?.dispose();owned.owner.dispose();forgetRenderActor(actor.id);for(const m of materials.values())m.dispose();for(const s of skeletons)s.dispose();};
  }catch(e){owner?.dispose();for(const m of materials.values())m.dispose();const skeletons=new Set<SkinnedMesh['skeleton']>();next.traverse(o=>{if(o instanceof SkinnedMesh)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();throw e;}
 },[gltf,contract,actor.id,onDiagnostic,onDispose,world,rapier]);
 useFrame((frame,dt)=>{
  const owned=live.current,p=sampleRenderActor(actor.id,frame.clock.elapsedTime,dt);if(!owned||!root.current||!body.current)return;
  if(!p){owned.contact?.inactive('MISSING_SAMPLED_ACTOR');root.current.visible=false;if(fallbackRoot.current)fallbackRoot.current.visible=false;cameraCleanup.current?.();cameraCleanup.current=null;Object.assign(owned.owner.diagnostic,{status:'temporary-standard',actorPresent:false,currentReason:'MISSING_SAMPLED_ACTOR',sourceTasks:null});if(viewRef.current.present){viewRef.current={status:'temporary-standard',present:false};setView(viewRef.current);}return;}
  const confirmedTime=runtime.authority&&runtime.sim?runtime.sim.time:runtime.snapshot?.time??NaN;
  owned.owner.step(p,frame.clock.elapsedTime,dt,root.current,body.current,p.state.pair?peerCompatible(p.state.pair.other):true,runtime.generation,confirmedTime);
  owned.owner.diagnostic.actorPresent=true;
  const status=owned.owner.diagnostic.status as Status214,next={status,present:true};
  if(viewRef.current.status!==status||!viewRef.current.present){viewRef.current=next;setView(next);}
  root.current.visible=root.current.visible&&status==='source'&&view.status==='source'&&view.present;
  if(fallbackRoot.current)fallbackRoot.current.visible=status!=='source';
  owned.contact?.frame({camera:frame.camera,root:root.current,providerOwned:()=>!!root.current&&ownsCameraVisual222(actor.id,root.current,runtime.generation),clock:frame.clock.elapsedTime,time:p.time,generation:runtime.generation,life:p.state.jumpEpoch,reset:p.reset,visible:root.current.visible,diagnostic:owned.owner.diagnostic});
  if(status!=='source'||!root.current.visible){cameraCleanup.current?.();cameraCleanup.current=null;}
  else{if(!cameraCleanup.current||cameraGeneration.current!==runtime.generation||!ownsCameraVisual222(actor.id,root.current,runtime.generation)){cameraCleanup.current?.();cameraCleanup.current=registerCameraVisual(actor.id,root.current,owned.envelope,runtime.generation,weightedCameraProvider007(owned.envelope));cameraGeneration.current=runtime.generation;}completeCameraVisual(actor.id,root.current,frame.clock.elapsedTime,runtime.generation);}
 },-1);
 return <><group ref={root} name={`native222:${actor.id}:${contract.sha256}`} visible={false}><group ref={body} rotation={[0,Math.PI,0]} scale={contract.scale}>{model&&<primitive object={model} dispose={null}/>}</group></group><group ref={fallbackRoot}>{view.present&&view.status!=='source'&&fallback}</group></>;
}

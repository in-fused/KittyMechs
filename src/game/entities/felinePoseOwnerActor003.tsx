import {parseFelineNativePose003} from '../../../shared/felineNativePose003';
import {preserveFirstPoseFailure003} from './felinePoseOwnerEvidence003';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {useRapier} from '@react-three/rapier';
import {Group,SkinnedMesh,Skeleton,Vector3,Quaternion} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type RAPIER from '@dimforge/rapier3d-compat';
import {ACTOR_HEIGHT} from '../../../shared/config';
import type {ActorState} from '../../../shared/types';
import {runtime} from '../runtime';
import {sampleRenderActor,forgetRenderActor} from './renderTimeline';
import {prepareVisualEnvelope} from '../camera/visualEnvelope';
import {registerCameraVisual,completeCameraVisual} from '../camera/visualRegistry';
import {FelinePoseOwner} from './felinePoseOwner003';
import {FelineNativeSupport,type NativeHull} from './felinePoseOwnerNative003';
import {felinePoseOwnerDiagnostics,type FelinePoseCandidate,type FelinePoseClock} from './felinePoseOwnerManifest003';
/** Separate component means no mixer, strike, legacy lease IK, terrain lean,
 * pair fallback or look writer is instantiated for an enabled owned Pounce. */
export function FelinePoseOwnerActor({actor,candidate}:{actor:Pick<ActorState,'id'|'name'|'chassis'|'bot'|'role'>;candidate:FelinePoseCandidate}) {
  const {world}=useRapier(),gltf=useGLTF(candidate.privateAssetUrl),model=useMemo(()=>clone(gltf.scene),[gltf]),root=useRef<Group>(null);
  const binding=useRef<{generation:number;worldId:string;life:number;owner:FelinePoseOwner}|null>(null);
  const camera=useMemo(()=>{model.updateWorldMatrix(true,true);return prepareVisualEnvelope(model);},[model]);
  useEffect(()=>{if(!root.current)return;return registerCameraVisual(actor.id,root.current,camera,runtime.generation);},[actor.id,camera]);
  useEffect(()=>()=>{binding.current?.owner.dispose();binding.current=null;forgetRenderActor(actor.id);felinePoseOwnerDiagnostics.delete(actor.id);const skeletons=new Set<Skeleton>();model.traverse(o=>{if(o instanceof SkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());},[actor.id,model]);
  useFrame((frame,elapsed)=>{const shown=sampleRenderActor(actor.id,frame.clock.elapsedTime,elapsed),group=root.current;if(!shown||!group)return;
    // The cached presentation carrier is applied exactly once, at this root.
    group.position.set(shown.position.x,shown.position.y-ACTOR_HEIGHT,shown.position.z);group.rotation.set(0,shown.yaw,0);group.visible=shown.state.hp>0||!!shown.state.downed||shown.time-shown.state.diedAt<3;
    const latest=runtime.authority?runtime.sim?.actors.get(actor.id):runtime.snapshot?.actors.find(a=>a.id===actor.id),authorityTick=runtime.authority?runtime.sim?.tick:runtime.snapshot?.tick,authorityTime=runtime.authority?runtime.sim?.time:runtime.snapshot?.time;
    const sample=latest?parseFelineNativePose003(latest.nativePose,actor.id,latest.jumpEpoch,authorityTick??-1,authorityTime??-1):null;
    const clock:FelinePoseClock={generation:runtime.generation,nativeTick:authorityTick??-1,nativeTime:authorityTime??-1,renderTime:shown.time,frameTime:frame.clock.elapsedTime,authorityWorldId:sample?.worldId,life:sample?.life,nativeStepTick:sample?.nativeStepTick,clientSceneFrameTime:frame.clock.elapsedTime};
    let diagnostic=felinePoseOwnerDiagnostics.get(actor.id);if(!diagnostic){diagnostic={status:'UNQUALIFIED',reason:'PENDING_ACTUAL_BIND',frames:[]};felinePoseOwnerDiagnostics.set(actor.id,diagnostic);}
    if(!sample||sample.life!==shown.state.jumpEpoch){binding.current?.owner.dispose();binding.current=null;diagnostic.status='UNQUALIFIED';diagnostic.reason='NO_CURRENT_LIFE_MATCHED_AUTHORITY_NATIVE_SAMPLE';diagnostic.frames.push({clock,kind:'missing-or-invalid-authority-readback',accepted:false,raw:{authorityTick,authorityTime,presentationLife:shown.state.jumpEpoch,sample:latest?.nativePose??null}});if(diagnostic.frames.length>240)diagnostic.frames.splice(0,diagnostic.frames.length-240);completeCameraVisual(actor.id,group,frame.clock.elapsedTime,runtime.generation);return;}
    // Only a proven same authority world may use its actual collider for self
    // exclusion. Server/client handle numbers are never matched across worlds.
    const localCollider=runtime.authority&&runtime.sim?.world===world?world.getCollider(sample.hull.handle):undefined;
    const bodyRotation=new Quaternion(sample.hull.rotation.x,sample.hull.rotation.y,sample.hull.rotation.z,sample.hull.rotation.w).multiply(new Quaternion(sample.localRotation.x,sample.localRotation.y,sample.localRotation.z,sample.localRotation.w).invert());
    const hull:NativeHull={sample,localCollider:localCollider??undefined,queryPosition:new Vector3(shown.position.x,shown.position.y,shown.position.z).add(new Vector3(sample.localPosition.x,sample.localPosition.y,sample.localPosition.z).applyQuaternion(bodyRotation)),queryRotation:new Quaternion(sample.hull.rotation.x,sample.hull.rotation.y,sample.hull.rotation.z,sample.hull.rotation.w)};    if(binding.current?.generation!==runtime.generation||binding.current.worldId!==sample.worldId||binding.current.life!==sample.life){binding.current?.owner.dispose();binding.current=null;try {
      // Bind while detached so actual GLTF rest frames are compared before
      // the separate .8 scale and pi mount. Reattach the same live model.
      const parent=model.parent;parent?.remove(model);let owner:FelinePoseOwner;try{model.updateWorldMatrix(true,true);const native=new FelineNativeSupport(world,runtime.generation,hull);owner=new FelinePoseOwner(model,candidate.manifest,native);}finally{parent?.add(model);model.updateWorldMatrix(true,true);}binding.current={generation:runtime.generation,owner,worldId:sample.worldId,life:sample.life};diagnostic.frames.push({clock,kind:'actual-GLTF-rest-and-five-pad-binding',accepted:true,raw:owner.bindReceipt});
    }catch(error){diagnostic.status='UNQUALIFIED';diagnostic.reason=String(error);completeCameraVisual(actor.id,group,frame.clock.elapsedTime,runtime.generation);return;}}
    binding.current!.owner.native.setCurrent(hull);const s=shown.state,unsupported=s.hp<=0||s.downed?'DEATH_DOWNED_OWNER_UNQUALIFIED':shown.climb?'CLIMB_OWNER_UNQUALIFIED':s.pair?'PAIRED_OWNER_UNQUALIFIED':shown.strike?'STRIKE_OWNER_UNQUALIFIED':shown.time-s.hurtAt<.2?'REACTION_OWNER_UNQUALIFIED':null;
    const result=binding.current!.owner.step({clock,position:group.position.clone(),yaw:shown.yaw,dt:elapsed,reset:shown.reset,grounded:shown.grounded,upright:s.stance==='upright',unsupported});const failure=preserveFirstPoseFailure003(actor.id,clock,result);diagnostic.status=result.status;diagnostic.reason=result.reason;diagnostic.frames.push(...result.receipts,{clock,kind:'complete-owner-result-summary',accepted:result.status==='CANDIDATE_CURRENT',raw:{limbs:result.limbs,bodyAmount:result.bodyAmount,status:result.status,reason:result.reason,firstFailure:failure?{key:failure.key,durable:failure.durable,storageError:failure.storageError}:null,admission:'PENDING_PRIVATE_UNQUALIFIED'}});if(diagnostic.frames.length>240)diagnostic.frames.splice(0,diagnostic.frames.length-240);completeCameraVisual(actor.id,group,frame.clock.elapsedTime,runtime.generation);
  },-1);
  return <group ref={root}><group rotation={[0,Math.PI,0]} scale={.8}><primitive object={model} dispose={null}/></group></group>;
}

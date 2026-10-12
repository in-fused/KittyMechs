import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {useRapier} from '@react-three/rapier';
import {Bone,Group,Mesh,SkinnedMesh,Skeleton,Vector3} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type RAPIER from '@dimforge/rapier3d-compat';
import {ACTOR_HEIGHT} from '../../../shared/config';
import type {ActorState} from '../../../shared/types';
import {runtime} from '../runtime';
import {sampleRenderActor,forgetRenderActor} from './renderTimeline';
import {prepareVisualEnvelope} from '../camera/visualEnvelope';
import {registerCameraVisual,completeCameraVisual} from '../camera/visualRegistry';
import {FelinePoseOwner} from './felinePoseOwner';
import {FelineNativeSupport,type NativeHull} from './felinePoseOwnerNative';
import {felinePoseOwnerDiagnostics,type FelinePoseCandidate,type FelinePoseClock} from './felinePoseOwnerManifest';
/** Read-only compatibility boundary to the actual authority's current private
 * KCC owner. It allocates no substitute hull. Guest actor ownership has no
 * registry here and is explicitly unqualified, not guessed by proximity. */
function currentAuthorityHull(id:string,world:RAPIER.World):NativeHull|null {
  if(!runtime.authority||runtime.sim?.world!==world)return null;
  const actual=runtime.sim as unknown as {physics:Map<string,{collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController}>};
  const p=actual.physics.get(id);return p?.collider.isValid()&&p.collider.isEnabled()?p:null;
}
/** Separate component means no mixer, strike, legacy lease IK, terrain lean,
 * pair fallback or look writer is instantiated for an enabled owned Pounce. */
export function FelinePoseOwnerActor({actor,candidate}:{actor:Pick<ActorState,'id'|'name'|'chassis'|'bot'|'role'>;candidate:FelinePoseCandidate}) {
  const {world}=useRapier(),gltf=useGLTF(candidate.privateAssetUrl),model=useMemo(()=>clone(gltf.scene),[gltf]),root=useRef<Group>(null);
  const binding=useRef<{generation:number;owner:FelinePoseOwner;hull:RAPIER.Collider}|null>(null);
  const camera=useMemo(()=>{model.updateWorldMatrix(true,true);return prepareVisualEnvelope(model);},[model]);
  useEffect(()=>{if(!root.current)return;return registerCameraVisual(actor.id,root.current,camera,runtime.generation);},[actor.id,camera]);
  useEffect(()=>()=>{binding.current?.owner.dispose();binding.current=null;forgetRenderActor(actor.id);felinePoseOwnerDiagnostics.delete(actor.id);const skeletons=new Set<Skeleton>();model.traverse(o=>{if(o instanceof SkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());},[actor.id,model]);
  useFrame((frame,elapsed)=>{const shown=sampleRenderActor(actor.id,frame.clock.elapsedTime,elapsed),group=root.current;if(!shown||!group)return;
    // The cached presentation carrier is applied exactly once, at this root.
    group.position.set(shown.position.x,shown.position.y-ACTOR_HEIGHT,shown.position.z);group.rotation.set(0,shown.yaw,0);group.visible=shown.state.hp>0||!!shown.state.downed||shown.time-shown.state.diedAt<3;
    const clock:FelinePoseClock={generation:runtime.generation,nativeTick:runtime.sim?.tick??runtime.snapshot?.tick??-1,nativeTime:runtime.sim?.time??runtime.snapshot?.time??-1,renderTime:shown.time,frameTime:frame.clock.elapsedTime};
    let diagnostic=felinePoseOwnerDiagnostics.get(actor.id);if(!diagnostic){diagnostic={status:'UNQUALIFIED',reason:'PENDING_ACTUAL_BIND',frames:[]};felinePoseOwnerDiagnostics.set(actor.id,diagnostic);}
    const hull=currentAuthorityHull(actor.id,world);if(!hull){binding.current?.owner.dispose();binding.current=null;diagnostic.status='UNQUALIFIED';diagnostic.reason='NO_TRUSTED_CURRENT_GUEST_ACTOR_KCC_REGISTRY';completeCameraVisual(actor.id,group,frame.clock.elapsedTime,runtime.generation);return;}
    if(binding.current?.generation!==runtime.generation||binding.current.hull!==hull.collider){binding.current?.owner.dispose();binding.current=null;try {
      // Bind while detached so actual GLTF rest frames are compared before
      // the separate .8 scale and pi mount. Reattach the same live model.
      const parent=model.parent;parent?.remove(model);let owner:FelinePoseOwner;try{model.updateWorldMatrix(true,true);const native=new FelineNativeSupport(world,runtime.generation,hull);owner=new FelinePoseOwner(model,candidate.manifest,native);}finally{parent?.add(model);model.updateWorldMatrix(true,true);}binding.current={generation:runtime.generation,owner,hull:hull.collider};diagnostic.frames.push({clock,kind:'actual-GLTF-rest-and-five-pad-binding',accepted:true,raw:owner.bindReceipt});
    }catch(error){diagnostic.status='UNQUALIFIED';diagnostic.reason=String(error);completeCameraVisual(actor.id,group,frame.clock.elapsedTime,runtime.generation);return;}}
    const s=shown.state,unsupported=s.hp<=0||s.downed?'DEATH_DOWNED_OWNER_UNQUALIFIED':shown.climb?'CLIMB_OWNER_UNQUALIFIED':s.pair?'PAIRED_OWNER_UNQUALIFIED':shown.strike?'STRIKE_OWNER_UNQUALIFIED':shown.time-s.hurtAt<.2?'REACTION_OWNER_UNQUALIFIED':null;
    const result=binding.current!.owner.step({clock,position:group.position.clone(),yaw:shown.yaw,dt:elapsed,reset:shown.reset,grounded:shown.grounded,upright:s.stance==='upright',unsupported});diagnostic.status=result.status;diagnostic.reason=result.reason;diagnostic.frames.push(...result.receipts);if(diagnostic.frames.length>240)diagnostic.frames.splice(0,diagnostic.frames.length-240);completeCameraVisual(actor.id,group,frame.clock.elapsedTime,runtime.generation);
  },-1);
  return <group ref={root}><group rotation={[0,Math.PI,0]} scale={.8}><primitive object={model} dispose={null}/></group></group>;
}

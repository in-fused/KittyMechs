import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html,useGLTF} from '@react-three/drei';
import {Group,Mesh,Material,SkinnedMesh} from 'three';
import {shareSkinPalettes042} from './shareSkinPalettes042';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {ActorState} from '../../../shared/types';
import {runtime} from '../runtime';
import {prepareVisualEnvelope} from '../camera/visualEnvelope';
import {completeCameraVisual,registerCameraVisual} from '../camera/visualRegistry';
import {forgetRenderActor,sampleRenderActor} from './renderTimeline';
import {Identity57Runtime005,IDENTITY57_ASSET005} from './identity57Runtime005';
import {identity57Selected005,registerIdentity57Runtime005} from './identity57Runtime005Control';

/** Root-local source004 supported-action prototype; original GLB bytes intact. */
export function Identity57RuntimeActor005({actor}:{actor:Pick<ActorState,'id'|'name'|'chassis'|'bot'|'role'>}){
 const gltf=useGLTF(IDENTITY57_ASSET005),root=useRef<Group>(null),body=useRef<Group>(null),health=useRef<HTMLDivElement>(null),label=useRef<Group>(null);
 const prepared=useMemo(()=>{const model=clone(gltf.scene),materials=new Map<Material,Material>();
  const own=(m:Material)=>{let c=materials.get(m);if(!c){c=m.clone();materials.set(m,c);}return c;};
  model.traverse(o=>{if(o instanceof Mesh){o.castShadow=o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);}if(o instanceof SkinnedMesh)o.frustumCulled=false;});const skeletons=shareSkinPalettes042(model);return {model,materials,skeletons};
 },[gltf]);
 const owner=useMemo(()=>new Identity57Runtime005(prepared.model,gltf.animations,actor.id),[prepared,gltf.animations,actor.id]);
 const envelope=useMemo(()=>prepareVisualEnvelope(prepared.model),[prepared]);
 useEffect(()=>registerIdentity57Runtime005(actor.id,owner.diagnostic),[actor.id,owner]);
 useEffect(()=>{if(!root.current)return;return registerCameraVisual(actor.id,root.current,envelope,runtime.generation);},[actor.id,envelope]);
 useEffect(()=>()=>{owner.dispose();forgetRenderActor(actor.id);for(const m of prepared.materials.values())m.dispose();for(const s of prepared.skeletons)s.dispose();},[actor.id,owner,prepared]);
 useFrame((frame,dt)=>{const p=sampleRenderActor(actor.id,frame.clock.elapsedTime,dt);if(!p||!root.current||!body.current)return;
  const peer=p.state.pair?runtime.snapshot?.actors.find(a=>a.id===p.state.pair!.other):undefined;
  owner.step(p,frame.clock.elapsedTime,dt,root.current,body.current,!!peer&&identity57Selected005(peer));
  if(health.current)health.current.style.width=`${Math.max(0,p.state.hp/p.state.maxHp)*100}%`;if(label.current)label.current.position.y=2.0+owner.diagnostic.stance*1.0;
  completeCameraVisual(actor.id,root.current,frame.clock.elapsedTime,runtime.generation);
 },-1);
 return <group ref={root}><group ref={body} rotation={[0,Math.PI,0]} scale={.8}><primitive object={prepared.model} dispose={null}/></group>
  {actor.id!==runtime.localId&&<group ref={label} position={[0,2,0]}><Html center distanceFactor={12} zIndexRange={[2,0]} style={{pointerEvents:'none'}} occlude={false}><div className="actor-label friendly"><span>{actor.name}</span><div className="actor-hp"><div ref={health}/></div></div></Html></group>}
 </group>;
}

import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useRapier} from '@react-three/rapier';
import {Html,useGLTF} from '@react-three/drei';
import {Color,Group,Mesh,MeshBasicMaterial,MeshStandardMaterial,Skeleton,SkinnedMesh,type Material} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {MECHS} from '../../../shared/config';
import type {ActorState} from '../../../shared/types';
import {runtime} from '../runtime';
import {useGameStore} from '../../state/store';
import {dressMaterial,felineSurfaceProfile,useSurfaces} from '../rendering/materials';
import {actorModelPath} from '../rendering/modelPaths';
import {prepareVisualEnvelope} from '../camera/visualEnvelope';
import {completeCameraVisual,registerCameraVisual} from '../camera/visualRegistry';
import {forgetRenderActor,sampleRenderActor} from './renderTimeline';
import {PracticalFelineMotionOwner001} from './practicalFelineMotionOwner001';
import {registerPracticalMotion001} from './practicalFelineMotionControl001';

/** Uses the current legacy chassis asset as an explicit pending motion host.
 * Asset replacement and normal-play acceptance are separate later decisions. */
export function PracticalFelineMotionActor001({actor}:{actor:Pick<ActorState,'id'|'name'|'chassis'|'bot'|'role'>}){
  const {world}=useRapier(),gltf=useGLTF(actorModelPath(MECHS[actor.chassis].model)),pair=useGLTF(actorModelPath('Pounce_Quadruped')),maps=useSurfaces(),seed=useGameStore(s=>s.seed);
  const root=useRef<Group>(null),body=useRef<Group>(null),ring=useRef<Mesh>(null),anchor=useRef<Group>(null),health=useRef<HTMLDivElement>(null),label=useRef<HTMLDivElement>(null);
  const scale=MECHS[actor.chassis].scale;
  const prepared=useMemo(()=>{const model=clone(gltf.scene),skeletons=new Map<string,Skeleton>(),materials=new Map<Material,Material>();
    const material=(source:Material)=>{let m=materials.get(source);if(!m){m=dressMaterial(source,maps,seed,felineSurfaceProfile(source));materials.set(source,m);}return m;};
    model.traverse(o=>{if(o instanceof Mesh){o.castShadow=o.receiveShadow=true;o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);}if(o instanceof SkinnedMesh){o.frustumCulled=false;const key=o.skeleton.bones.map(b=>b.uuid).join(',');const shared=skeletons.get(key);if(shared)o.skeleton=shared;else skeletons.set(key,o.skeleton);}});
    const armor=[...materials.values()].filter((m):m is MeshStandardMaterial=>m instanceof MeshStandardMaterial).map(m=>({m,emissive:m.emissive.clone(),intensity:m.emissiveIntensity,optic:/Glow|Sensor/i.test(m.name)}));
    return {model,materials,skeletons,armor};
  },[gltf,maps,seed]);
  const owner=useMemo(()=>new PracticalFelineMotionOwner001(prepared.model,gltf.animations,pair.animations,world,actor.chassis,scale,actor.id,seed),[prepared,gltf.animations,pair.animations,world,actor.chassis,scale,actor.id,seed]);
  const envelope=useMemo(()=>prepareVisualEnvelope(prepared.model),[prepared]);
  const colors=useMemo(()=>({flash:new Color('#ff753c'),shield:new Color('#64deff'),ring:new Color(actor.id===runtime.localId?'#8ee6d5':'#a2bde9')}),[actor.id]);
  useEffect(()=>registerPracticalMotion001(actor.id,owner.diagnostic),[actor.id,owner]);
  useEffect(()=>{if(!root.current)return;return registerCameraVisual(actor.id,root.current,envelope,runtime.generation);},[actor.id,envelope]);
  useEffect(()=>()=>{owner.dispose();forgetRenderActor(actor.id);for(const m of prepared.materials.values())m.dispose();for(const skeleton of prepared.skeletons.values())skeleton.dispose();},[actor.id,owner,prepared]);
  useFrame((frame,dt)=>{const p=sampleRenderActor(actor.id,frame.clock.elapsedTime,dt);if(!p||!root.current||!body.current)return;owner.step(p,frame.clock.elapsedTime,dt,root.current,body.current);
    const s=p.state,t=p.time,flash=!useGameStore.getState().settings.reducedFlashes&&t>=s.hurtAt&&t-s.hurtAt<.12,shield=s.shieldUntil>t,disrupted=s.disruptedUntil>t&&s.hp>0;
    for(const {m,emissive,intensity,optic} of prepared.armor){m.emissive.copy(flash?colors.flash:optic&&(shield||disrupted)?colors.shield:emissive);m.emissiveIntensity=flash?1.2:optic&&disrupted?.35:optic&&shield?Math.max(2.1,intensity):s.hp<=0&&optic?.05:intensity;}
    if(ring.current){ring.current.visible=!p.climb;if(ring.current.material instanceof MeshBasicMaterial){ring.current.material.color.copy(shield?colors.shield:colors.ring);ring.current.material.opacity=shield?.8:.38;}}
    if(health.current)health.current.style.width=`${Math.max(0,s.hp/s.maxHp)*100}%`;if(label.current)label.current.style.opacity=s.hp>0||s.downed?'1':'0';if(anchor.current)anchor.current.position.y=3.1+owner.diagnostic.stance*.65;
    completeCameraVisual(actor.id,root.current,frame.clock.elapsedTime,runtime.generation);
  },-1);
  return <group ref={root}><group ref={body} rotation={[0,Math.PI,0]} scale={scale}><primitive object={prepared.model} dispose={null}/></group>
    <mesh ref={ring} rotation={[-Math.PI/2,0,0]} position={[0,.06,0]}><ringGeometry args={[1.35,1.4,32]}/><meshBasicMaterial color={colors.ring} transparent opacity={.38} depthWrite={false}/></mesh>
    {actor.id!==runtime.localId&&<group ref={anchor} position={[0,3.1,0]}><Html center distanceFactor={12} zIndexRange={[2,0]} style={{pointerEvents:'none'}} occlude={false}><div ref={label} className="actor-label friendly"><span>{actor.name}</span><div className="actor-hp"><div ref={health}/></div></div></Html></group>}
  </group>;
}

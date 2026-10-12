import {pairClipName} from '../../../shared/pairedCombat';
import {overhaulRuinWorldSurfaces} from '../../../shared/overhaulRuinSurfaces';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Html, useGLTF } from '@react-three/drei';
import { AnimationMixer, AnimationUtils, Bone, Color, Group, LoopOnce, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Skeleton, SkinnedMesh, Vector3, type Material } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ACTOR_HEIGHT, CLIMB_RETRACTION, MECHS, STANCE_TRANSITION, UPRIGHT, actorHullRadius } from '../../../shared/config';
import { clamp } from '../../../shared/math';
import type { ActorState } from '../../../shared/types';
import { runtime } from '../runtime';
import { useGameStore } from '../../state/store';
import { dressMaterial, felineSurfaceProfile, useSurfaces } from '../rendering/materials';
import { actorModelPath } from '../rendering/modelPaths';
import {prepareVisualEnvelope} from '../camera/visualEnvelope';
import {completeCameraVisual,registerCameraVisual} from '../camera/visualRegistry';
import {climbFace,climbCornerFaces,climbingPatchClearance,createClimbingProbe,probeClimbingContact} from './climbingContact';
import {overhaulCornerPawRequests,overhaulCornerHoldBlend} from '../../../shared/overhaulCornerClimb';
import {poweredVaultPose} from '../../../shared/buildingVault';
import { combatPose, COMBAT_ACTIONS, createQuadrupedTravel, quadrupedTravel, createTurnPose, createUprightMotion, displayedTravelSpeed, displayedYawRate, uprightMotion, turnPose, distancePhase, gaitWeights, landingCompression, pawSupport, QUAD_DUTIES, QUAD_STRIDES, signedAngle, stancePose, traversalClip, wallContact, wallCycle, wallPoseGap, WALL_CLING_PHASE, WALL_GAITS } from './felineMotion';
import { forgetRenderActor, sampleRenderActor } from './renderTimeline';
import {applyFelineStrikeMotion,bindFelineStrikeRig,createFelineStrikePose,restoreFelineStrikeRig,sampleFelineStrikeMotion} from './felineStrikeMotion';
import { applyPawIK, recordPawIKRequest, preparePawLease, capturePawLeasePose, pawRequestAdmitted, pawRequestWithinJointLimits, pawQueryContains, partialPawClearanceAllowed, retirePawLease, probeAuthoredPawFallback, clearPawAnchor, clearPawObstruction, createContactDiagnostic, createGroundSettle, createPawAnchor, createPawProbe, createAuthoredPose, captureAuthoredPose, restoreAuthoredPose, envelopePresent, forgetContactDiagnostic, groundContactAllowed, includeGroundSettle, PAW_PROFILES, pawReadyForCrouch, pawSole, plantedPawTarget, registerContactDiagnostic, resetGroundSettle, probeGroundPaw, settleCarrier, surfacePresent, type PawAnchor } from './pawContact';
const gaitKeys=['idle','walk','trot','gallop','air'] as const;

export function Actors(){
  const [roster,setRoster]=useState<Pick<ActorState,'id'|'name'|'chassis'|'bot'|'role'>[]>([]);const check=useRef(0),ids=useRef('');
  useFrame(state=>{if(state.clock.elapsedTime<check.current)return;check.current=state.clock.elapsedTime+.2;const actors=runtime.snapshot?.actors??[];const key=actors.map(a=>`${a.id}:${a.chassis}:${a.role??''}`).join(',');if(key!==ids.current){ids.current=key;setRoster(actors.map(({id,name,chassis,bot,role})=>({id,name,chassis,bot,role})));}});
  // A newly encountered rig can load without hiding the live physics owner
  // or suspending already rendered squadmates and their contact registries.
  return <>{roster.map(actor=><Suspense key={actor.id} fallback={null}><Actor actor={actor}/></Suspense>)}</>;
}
function Actor({actor}:{actor:Pick<ActorState,'id'|'name'|'chassis'|'bot'|'role'>}){
  const {world}=useRapier();
  const file=actor.bot?actor.role==='mortar'?'Sentinel_Mortar':actor.role==='anchor'?'Sentinel_Anchor':'Sentinel_Scout':MECHS[actor.chassis].model;
  // Deployment readiness and late actors share the same revisioned rig cache.
  const gltf=useGLTF(actorModelPath(file)),pairGltf=useGLTF(actorModelPath('Pounce_Quadruped')),maps=useSurfaces(),seed=useGameStore(s=>s.seed);
  const group=useRef<Group>(null),carrier=useRef<Group>(null),labelAnchor=useRef<Group>(null),ring=useRef<Mesh>(null),warning=useRef<Mesh>(null),health=useRef<HTMLDivElement>(null),label=useRef<HTMLDivElement>(null);
  const scale=actor.bot?actor.role==='anchor'?1.05:actor.role==='mortar'?.8:.65:MECHS[actor.chassis].scale;
  const model=useMemo(()=>{
    const scene=clone(gltf.scene),skeletons=new Map<string,Skeleton>(),materialCopies=new Map<Material,Material>();
    const materialFor=(original:Material)=>{let material=materialCopies.get(original);if(!material){material=dressMaterial(original,maps,seed,felineSurfaceProfile(original));materialCopies.set(original,material);}return material;};
    scene.traverse(obj=>{if(obj instanceof Mesh){obj.castShadow=true;obj.receiveShadow=true;obj.material=Array.isArray(obj.material)?obj.material.map(m=>materialFor(m)):materialFor(obj.material);if(obj instanceof SkinnedMesh)obj.frustumCulled=false;}
      if(obj instanceof SkinnedMesh){const key=obj.skeleton.bones.map(b=>b.uuid).join(',');const shared=skeletons.get(key);if(shared)obj.skeleton=shared;else skeletons.set(key,obj.skeleton);}
    });
    return scene;
  },[gltf,maps,seed]);
  const mixer=useMemo(()=>new AnimationMixer(model),[model]);
  const pairActions=useMemo(()=>new Map(pairGltf.animations.filter(c=>/Pair(?:Impact|Pin|Claw|Release|Escape)/.test(c.name)).map(clip=>[clip.name,mixer.clipAction(clip)])),[pairGltf.animations,mixer]);
  useEffect(()=>{pairActions.forEach(action=>{action.setEffectiveWeight(0).setLoop(LoopOnce,1).play();action.clampWhenFinished=true;action.paused=true;});},[pairActions]);
  const actions=useMemo(()=>['Idle','Walk','Trot','Gallop','Air','UprightIdle','UprightWalk','UprightAir','TransformUp','TransformDown','Grab','Cling','Climb','Mantle','TurnLeft','TurnRight','UprightWalkLong','UprightStride','UprightTurnLeft','UprightTurnRight'].map(name=>{const clip=gltf.animations.find(c=>c.name===`Feline${name}`);return clip?mixer.clipAction(clip):undefined;}),[gltf.animations,mixer]);
  const motionChassis=actor.bot?actor.role==='anchor'?'bastion':actor.role==='mortar'?'caracal':'lynx':actor.chassis;
  const strides=useMemo(()=>QUAD_STRIDES[motionChassis].map((stride,i)=>stride*scale/QUAD_DUTIES[motionChassis][i]),[scale,motionChassis]);
  const reactions=useMemo(()=>[false,true].map(up=>COMBAT_ACTIONS.map(name=>{const prefix=up?'FelineUpright':'Feline',source=gltf.animations.find(c=>c.name===prefix+name),reference=gltf.animations.find(c=>c.name===prefix+'CombatBase');if(!source||!reference)return undefined;const clip=source.clone();if(name!=='Death')AnimationUtils.makeClipAdditive(clip,0,reference,60);return mixer.clipAction(clip);})),[gltf.animations,mixer]);
  const combat=useMemo(()=>({timestamps:[-100,-100,-100,-100,-100],pose:{index:-1,elapsed:0,weight:0,death:false}}),[]);
  const motion=useMemo(()=>({weights:{idle:1,walk:0,trot:0,gallop:0,air:0},target:{idle:1,walk:0,trot:0,gallop:0,air:0},stance:{amount:0,transitionWeight:0,clipTime:0,up:false},climb:{index:10,phase:0,wall:0,roof:0},vault:{air:0,mantle:1,phase:0,wall:0,roof:0},climbWeight:0,turn:createTurnPose(),groundSettle:0,quadTravel:createQuadrupedTravel(),upright:createUprightMotion(),phase:0,uprightPhase:0,speed:0,travelSpeed:0,attitude:{pitch:0,roll:0},pitch:0,roll:0,lean:0,look:0,landing:0,grounded:true,verticalSpeed:0,yaw:0,axis:new Vector3(),rotation:new Quaternion(),inverse:new Quaternion(),flash:new Color('#ff753c'),shield:new Color('#64deff'),windup:new Color('#ffc06e'),ring:new Color(actor.id===runtime.localId?'#8ee6d5':actor.bot?'#e18058':'#a2bde9')}),[actor.id,actor.bot]);
  const strikeMotion=useMemo(()=>({rig:actor.bot?null:bindFelineStrikeRig(model),pose:createFelineStrikePose()}),[model,actor.bot]);
  const bones=useMemo(()=>{const head=model.getObjectByName('head'),tail=Array.from({length:5},(_,i)=>model.getObjectByName(`tail_${i}`));return {head:head instanceof Bone?head:undefined,tail:tail.filter((b):b is Bone=>b instanceof Bone)};},[model]);
  const contact=useMemo(()=>{
    model.updateWorldMatrix(true,true);
    const limbs=['FL','FR','HL','HR'].map(prefix=>{const upper=model.getObjectByName(`${prefix}_upper`),lower=model.getObjectByName(`${prefix}_lower`),paw=model.getObjectByName(`${prefix}_paw`);return upper instanceof Bone&&lower instanceof Bone&&paw instanceof Bone?{upper,lower,paw,corners:[] as Vector3[],ground:createPawAnchor(),up:new Vector3(0,1,0).applyQuaternion(paw.getWorldQuaternion(new Quaternion()).invert())}:undefined;}).filter((limb):limb is {upper:Bone;lower:Bone;paw:Bone;corners:Vector3[];ground:PawAnchor;up:Vector3}=>!!limb);
    // Cache the rigid paw mesh in its bone space. Its supporting sole changes
    // through mantle rotation; a fixed upright pad depth would cut into the roof.
    const point=new Vector3();for(const limb of limbs){const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
      model.traverse(object=>{if(!(object instanceof SkinnedMesh))return;const bone=object.skeleton.bones.indexOf(limb.paw);if(bone<0)return;const positions=object.geometry.attributes.position,indices=object.geometry.attributes.skinIndex;
        for(let v=0;v<positions.count;v++){if(indices.getX(v)!==bone)continue;point.set(positions.getX(v),positions.getY(v),positions.getZ(v)).applyMatrix4(object.bindMatrix).applyMatrix4(object.skeleton.boneInverses[bone]);min.min(point);max.max(point);}
      });if(Number.isFinite(min.x))for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])limb.corners.push(new Vector3(x,y,z));
    }
    return {limbs,pose:createAuthoredPose([...limbs.flatMap(l=>[l.upper,l.lower,l.paw]),...(bones.head?[bones.head]:[]),...bones.tail]),probe:createPawProbe(),climbingProbe:createClimbingProbe(),settle:createGroundSettle(),normal:new Vector3(),diagnostic:createContactDiagnostic(),hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()};
  },[model,actor.id,bones]);
  const cameraEnvelope=useMemo(()=>{if(actor.bot)return null;model.updateMatrixWorld(true);return prepareVisualEnvelope(model);},[model,actor.bot]);
  useEffect(()=>{if(!cameraEnvelope||!group.current)return;return registerCameraVisual(actor.id,group.current,cameraEnvelope,runtime.generation);},[actor.id,cameraEnvelope]);
  const armor=useMemo(()=>{const result:{m:MeshStandardMaterial;emissive:Color;intensity:number;optic:boolean}[]=[],seen=new Set<MeshStandardMaterial>();model.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&!seen.has(m)){seen.add(m);result.push({m,emissive:m.emissive.clone(),intensity:m.emissiveIntensity,optic:/Glow|Sensor/i.test(m.name)});}});return result;},[model]);
  useEffect(()=>{actions.forEach((action,i)=>{if(!action)return;action.setEffectiveWeight(i===0?1:0).play();if(i>0&&i<4||i===6)action.paused=true;if(i>=8){action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.paused=true;}});},[actions]);
  useEffect(()=>{reactions.flat().forEach(action=>{if(action){action.setEffectiveWeight(0).setLoop(LoopOnce,1).play();action.clampWhenFinished=true;action.paused=true;}});},[reactions]);
  useEffect(()=>()=>{forgetRenderActor(actor.id);mixer.stopAllAction();mixer.uncacheRoot(model);armor.forEach(({m})=>m.dispose());const skeletons=new Set<Skeleton>();model.traverse(o=>{if(o instanceof SkinnedMesh)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());},[actor.id,mixer,model,armor]);
  useEffect(()=>{registerContactDiagnostic(actor.id,contact.diagnostic);return()=>forgetContactDiagnostic(actor.id);},[actor.id,contact]);
  useFrame((frame,dt)=>{
    const elapsed=dt;
    const presented=sampleRenderActor(actor.id,frame.clock.elapsedTime,dt),root=group.current,body=carrier.current;if(!presented||!root||!body)return;
    const state=presented.state;
    dt=Math.min(dt,.05);
    const resetting=presented.reset;
    root.position.set(presented.position.x,presented.position.y-ACTOR_HEIGHT,presented.position.z);
    root.rotation.y=presented.yaw;root.rotation.z=0;
    const renderTime=presented.time;
    root.visible=state.hp>0||!!state.downed||renderTime-state.diedAt<3;
    const velocity=presented.velocity,blend=1-Math.exp(-dt*14);
    motion.speed+=(Math.hypot(velocity.x,velocity.z)-motion.speed)*blend;
    motion.travelSpeed+=(displayedTravelSpeed(presented.distance,elapsed)-motion.travelSpeed)*blend;
    const commandSpeed=motion.speed;
    const climbing=presented.climb,worldSeed=runtime.snapshot?.seed??seed;
    const face=climbing?climbFace(worldSeed,climbing,overhaulRuinWorldSurfaces(world)?.read()??[]):undefined;
    const cornerFaces=climbing?.corner?climbCornerFaces(worldSeed,climbing):undefined;
    const climbProgress=presented.climbProgress;
    const climbCycle=wallCycle(motionChassis,scale,climbProgress,climbing?.height??0,actor.bot?1:WALL_GAITS[motionChassis].depth);
    if(resetting){motion.climbWeight=0;motion.groundSettle=0;motion.pitch=0;motion.roll=0;motion.lean=0;motion.look=0;motion.landing=0;motion.phase=0;motion.uprightPhase=0;motion.speed=0;motion.travelSpeed=0;motion.yaw=presented.yaw;motion.grounded=presented.grounded;for(const key of gaitKeys)motion.weights[key]=key==='air'&&!presented.grounded||key==='idle'&&presented.grounded?1:0;}
    const retraction=clamp(1-(renderTime-state.climbDetachedAt)/CLIMB_RETRACTION,0,1);
    motion.climbWeight=climbing?1:Math.min(motion.climbWeight,retraction*retraction*(3-2*retraction));
    if(climbing)traversalClip(climbing,renderTime,climbCycle,motion.climb,climbProgress);
    const vault=climbing?.phase==='mantle'&&climbing.mantleStage!==null;
    if(vault)poweredVaultPose(climbing,renderTime,motion.vault);
    if(actions[4])actions[4].paused=!!vault;
    stancePose(actor.bot?'quadruped':state.stance??'quadruped',actor.bot?-100:state.stanceChangedAt??-100,renderTime,STANCE_TRANSITION,motion.stance);
    combat.timestamps[0]=state.pulseAt;combat.timestamps[1]=state.rocketAt;combat.timestamps[2]=state.abilityAt;combat.timestamps[3]=state.hurtAt;combat.timestamps[4]=state.diedAt;
    combatPose(combat.timestamps,state.hp>0,renderTime,combat.pose);
    const quadTravelAllowed=state.hp>0&&presented.grounded&&!climbing&&motion.climbWeight===0&&motion.stance.amount===0&&motion.stance.transitionWeight===0&&renderTime-state.stanceChangedAt>=STANCE_TRANSITION;
    quadrupedTravel(presented.position.x,presented.position.z,presented.yaw,elapsed,quadTravelAllowed,resetting,motion.quadTravel);
    const speed=quadTravelAllowed?(motion.quadTravel.active?motion.quadTravel.speed:0):commandSpeed;
    gaitWeights(speed,actor.bot?actor.role==='scout'?6.8:4.8:MECHS[actor.chassis].speed,presented.grounded,motion.target);
    // All adjacent gaits share one traveled-distance phase; they cannot drift
    // into opposing footfalls or continue walking through a network stall.
    const forward=-(velocity.x*Math.sin(presented.yaw)+velocity.z*Math.cos(presented.yaw));
    const locomotion=(1-motion.stance.transitionWeight)*(1-motion.climbWeight),quadruped=(1-motion.stance.amount)*locomotion,upright=motion.stance.amount*locomotion;
    turnPose(motionChassis,presented.angularDistance,motion.travelSpeed,actor.bot?actor.role==='scout'?6.8:4.8:MECHS[actor.chassis].speed,dt,
      state.hp>0&&presented.grounded&&!climbing&&motion.climbWeight===0&&motion.stance.amount===0&&motion.stance.transitionWeight===0&&renderTime-state.stanceChangedAt>=STANCE_TRANSITION,
      resetting,motion.turn,elapsed);
    const turnWeight=actions[14]&&actions[15]?motion.turn.weight:0;
    uprightMotion(motionChassis,presented.distance,presented.angularDistance,motion.travelSpeed,MECHS[actor.chassis].speed*UPRIGHT[actor.chassis].speed,scale,forward<-.3?-1:1,dt,
      state.hp>0&&presented.grounded&&!climbing&&motion.climbWeight===0&&motion.stance.amount===1&&motion.stance.transitionWeight===0&&renderTime-state.stanceChangedAt>=STANCE_TRANSITION,resetting,motion.upright,elapsed);
    motion.uprightPhase=motion.upright.phase;
    for(let i=0;i<5;i++)motion.weights[gaitKeys[i]]+=(motion.target[gaitKeys[i]]-motion.weights[gaitKeys[i]])*blend;
    const movingWeight=motion.weights.walk+motion.weights.trot+motion.weights.gallop;
    // Stopping translation must not pin a still-raised foot while its actual
    // gait pose fades to idle. Every contact pass uses this same support truth.
    const stationary=quadTravelAllowed?movingWeight<.001:speed<=.06;
    const supportStride=(strides[0]*motion.weights.walk+strides[1]*motion.weights.trot+strides[2]*motion.weights.gallop)/Math.max(.001,movingWeight);
    if(presented.grounded&&!climbing)motion.phase=distancePhase(motion.phase,presented.distance,Math.max(strides[0],supportStride),forward<-.3?-1:1);
    for(let i=0;i<5;i++){const action=actions[i];if(action){action.setEffectiveWeight(motion.weights[gaitKeys[i]]*quadruped*(1-turnWeight));if(i>0&&i<4)action.time=motion.phase*action.getClip().duration;}}
    const uprightWeight=upright*(1-motion.weights.air),uprightTurn=motion.upright.turn;
    actions[5]?.setEffectiveWeight(uprightWeight*motion.upright.idle*(1-uprightTurn.weight));
    actions[6]?.setEffectiveWeight(0);
    for(let i=16;i<20;i++){const action=actions[i];if(!action)continue;action.enabled=true;
      action.time=(i<18?motion.upright.phase:uprightTurn.phase)*action.getClip().duration;
      action.setEffectiveWeight(uprightWeight*(i===16?motion.upright.walk*(1-uprightTurn.weight):i===17?motion.upright.stride*(1-uprightTurn.weight):uprightTurn.weight*(i===18?uprightTurn.left:1-uprightTurn.left)));
    }
    actions[7]?.setEffectiveWeight(upright*motion.weights.air);
    for(let i=14;i<16;i++){const action=actions[i];if(action){action.enabled=true;action.time=motion.turn.phase*action.getClip().duration;action.setEffectiveWeight(quadruped*turnWeight*(i===14?motion.turn.left:1-motion.turn.left));}}
    for(let i=8;i<10;i++){const action=actions[i];if(action){action.enabled=true;action.time=Math.min(action.getClip().duration-.00001,motion.stance.clipTime/STANCE_TRANSITION*action.getClip().duration);action.setEffectiveWeight((motion.stance.up?i===8:i===9)?motion.stance.transitionWeight*(1-motion.climbWeight):0);}}
    // Anticipate the roof by folding chest and pelvis toward the ledge while the
    // full authoritative hull rises clear; foreclaws can remain on the edge.
    const ledge=climbing&&climbing.phase!=='grab'&&climbing.phase!=='mantle'?clamp((root.position.y-(climbing.top-1.5))/1.62,0,1):0;
    const supportBlend=climbing&&(climbing.phase==='cling'||climbing.phase==='climb')?clamp((renderTime-climbing.startedAt)/.16,0,1):1;
    const supportEase=supportBlend*supportBlend*(3-2*supportBlend),holdBlend=climbing?.phase==='cling'&&climbProgress*climbing.height<.15?1:supportEase;
    for(let i=10;i<14;i++){const action=actions[i];if(!action)continue;action.enabled=true;
      let weight=i===motion.climb.index?1:0,phase=motion.climb.phase;
      if(climbing&&(climbing.phase==='cling'||climbing.phase==='climb')&&(i===11||i===12)){weight=i===motion.climb.index?holdBlend:1-holdBlend;phase=i===12?climbCycle:WALL_CLING_PHASE;}
      if(climbing?.corner&&(i===11||i===12)){const cornerHold=overhaulCornerHoldBlend(climbing.corner,renderTime);weight=weight*(1-cornerHold)+(i===11?cornerHold:0);}
      if(vault){weight=i===13?motion.vault.mantle:0;phase=motion.vault.phase;}
      if(weight>0)action.time=Math.min(action.getClip().duration-.00001,phase*action.getClip().duration);if(i===13&&ledge>0)action.time=0;
      action.setEffectiveWeight(i===13&&ledge>0?motion.climbWeight*ledge:weight*motion.climbWeight*(1-ledge));
    }
    if(vault&&actions[4]){actions[4].enabled=true;actions[4].time=Math.min(actions[4].getClip().duration-.00001,climbProgress*actions[4].getClip().duration);actions[4].setEffectiveWeight(motion.climbWeight*motion.vault.air);}
    const dead=combat.pose.death;
    if(dead)actions.forEach(action=>action?.setEffectiveWeight(0));
    for(let stance=0;stance<2;stance++)for(let i=0;i<5;i++){const action=reactions[stance][i];if(!action)continue;action.enabled=true;
      const selected=i===combat.pose.index,stanceWeight=stance===0?1-motion.stance.amount:motion.stance.amount;
      action.time=Math.min(action.getClip().duration-.000001,combat.pose.elapsed);
      // Traversal and transformation own contact. Recoil resumes after them;
      // death always replaces locomotion, rather than spinning the carrier.
      action.setEffectiveWeight(selected?combat.pose.weight*stanceWeight*(dead?1:1-motion.climbWeight)*(dead?1:1-motion.stance.transitionWeight):0);
    }
    const pair=state.pair,pairedClip=pair&&pair.life===state.jumpEpoch&&state.hp>0?pairActions.get(pairClipName(pair,renderTime)):undefined;
    pairActions.forEach(action=>action?.setEffectiveWeight(0));
    if(pairedClip&&pair){
      actions.forEach(action=>action?.setEffectiveWeight(0));reactions.flat().forEach(action=>action?.setEffectiveWeight(0));
      const claw=pairedClip.getClip().name.includes('PairClaw'),elapsed=Math.max(0,renderTime-(claw?pair.comboAt:pair.phaseAt)),duration=pairedClip.getClip().duration;
      pairedClip.enabled=true;pairedClip.time=claw?Math.min(duration-.00001,elapsed/.24*duration):pair.phase==='pin'?elapsed%duration:Math.min(duration-.00001,elapsed/Math.max(.001,pair.endsAt-pair.phaseAt)*duration);pairedClip.setEffectiveWeight(1);
    }
    sampleFelineStrikeMotion(motionChassis,presented.strike,renderTime,{life:state.jumpEpoch,interrupted:state.hp<=0||!!climbing||motion.stance.transitionWeight>0||!!pairedClip},strikeMotion.pose);
    if(strikeMotion.rig)restoreFelineStrikeRig(strikeMotion.rig);
    restoreAuthoredPose(contact.pose);
    mixer.update(dt);
    captureAuthoredPose(contact.pose);
    if(strikeMotion.rig)applyFelineStrikeMotion(strikeMotion.rig,strikeMotion.pose);
    if(presented.grounded&&!motion.grounded)motion.landing=landingCompression(motion.verticalSpeed);
    motion.grounded=presented.grounded;motion.verticalSpeed=velocity.y;motion.landing*=Math.exp(-dt*11);
    const yawDelta=presented.yaw-motion.yaw,yawRate=displayedYawRate(yawDelta,elapsed);motion.yaw=presented.yaw;
    const strafe=quadTravelAllowed?(motion.quadTravel.active?motion.quadTravel.strafe:0):velocity.x*Math.cos(presented.yaw)-velocity.z*Math.sin(presented.yaw);
    const leanBefore=motion.lean,leanTarget=clamp(-strafe*.018-yawRate*speed*.009,-.13,.13);
    motion.lean+=(leanTarget-motion.lean)*blend;
    motion.look+=(clamp(signedAngle(state.aimYaw-presented.yaw),-.65,.65)-motion.look)*blend;
    const profile=PAW_PROFILES[motionChassis];
    const groundContact=!pairedClip&&!state.groundedOnRubble&&groundContactAllowed(state.hp>0&&!dead,presented.grounded,!!climbing,motion.climbWeight,renderTime,state.stanceChangedAt,STANCE_TRANSITION,state.climbDetachedAt,CLIMB_RETRACTION);
    const metadata=contact.diagnostic;metadata.frameClock=frame.clock.elapsedTime;metadata.renderTime=renderTime;metadata.grounded=presented.grounded;metadata.alive=state.hp>0;metadata.stance=state.stance;metadata.stanceAmount=motion.stance.amount;metadata.transitionWeight=motion.stance.transitionWeight;metadata.climbing=!!climbing;metadata.climbWeight=motion.climbWeight;metadata.contactAllowed=groundContact;metadata.resetting=resetting;metadata.position.x=root.position.x;metadata.position.y=root.position.y;metadata.position.z=root.position.z;
    metadata.renderElapsed=elapsed;metadata.cosmeticDt=dt;metadata.yawDelta=signedAngle(yawDelta);metadata.yawRate=yawRate;metadata.reactionSpeed=speed;metadata.reactionStrafe=strafe;metadata.bodyLeanBefore=leanBefore;metadata.bodyLeanTarget=leanTarget;metadata.bodyLean=motion.lean;
    // These scalars describe the pose actually sampled on this completed frame,
    // rather than inferring a guest's animation from the newest authority packet.
    metadata.strikeId=strikeMotion.pose.actionId;metadata.strikeLife=strikeMotion.pose.life;metadata.strikeKind=strikeMotion.pose.actionId!==null?presented.strike!.kind:null;metadata.strikeStage=strikeMotion.pose.actionId!==null?presented.strike!.stage:null;metadata.strikeWeight=strikeMotion.pose.weight;metadata.strikeBodyPitch=strikeMotion.pose.bodyPitch;metadata.strikeBodyRoll=strikeMotion.pose.bodyRoll;
    metadata.pair=pair?{id:pair.id,phase:pair.phase,role:pair.role,clip:pairedClip?.getClip().name??null,time:pairedClip?.time??0,weight:pairedClip?.getEffectiveWeight()??0,yaw:root.rotation.y}:null;
    contact.diagnostic.probes=0;
    if(climbing){if(!metadata.climb)metadata.climb={...climbing,normal:{...climbing.normal},contact:{...climbing.contact}};
      else {const normal=metadata.climb.normal,point=metadata.climb.contact;Object.assign(metadata.climb,climbing);metadata.climb.normal=normal;metadata.climb.contact=point;Object.assign(normal,climbing.normal);Object.assign(point,climbing.contact);}
    }else metadata.climb=null;
    for(const d of contact.diagnostic.paws){d.support=0;d.weight=0;d.planted=false;d.valid=false;d.slip=0;d.soleError=0;d.reach=0;d.requestedReach=0;d.ikClamped=false;d.plannedReach=0;d.authoredReach=0;d.ikApplied=false;d.ikRejected=false;d.leaseRetired=false;d.releasePose=false;d.authoredFallback=false;d.legacyRawFallback=false;d.partialClearance=false;d.fallbackCasts=0;d.casts=0;d.surface=null;d.clearance=0;}
    if(!groundContact||resetting)for(const limb of contact.limbs)clearPawAnchor(limb.ground);
    // Use only actual admitted support normals. A missing roof/obstacle has no
    // analytic fallback; body lean stays within the existing collision margin.
    contact.normal.set(0,0,0);let normalWeight=0;
    if(groundContact&&!resetting)for(const limb of contact.limbs){if(motion.stance.amount>.06&&limb.upper.name.startsWith('F'))continue;if(envelopePresent(limb.ground.surface)){contact.normal.add(limb.ground.surface.normal);normalWeight++;}}
    if(normalWeight===(motion.stance.amount>.06?2:4)){contact.normal.normalize();const sx=Math.sin(presented.yaw),cz=Math.cos(presented.yaw);motion.attitude.pitch=clamp(Math.atan2(contact.normal.x*sx+contact.normal.z*cz,contact.normal.y),-.2,.2);motion.attitude.roll=clamp(Math.atan2(contact.normal.x*cz-contact.normal.z*sx,contact.normal.y),-.18,.18);}else{motion.attitude.pitch=0;motion.attitude.roll=0;}
    const settle=1-Math.exp(-dt*profile.settle);
    motion.pitch+=(motion.attitude.pitch-motion.pitch)*settle;motion.roll+=(motion.attitude.roll-motion.roll)*settle;
    body.rotation.set(dead||pairedClip?0:motion.pitch*(1-motion.stance.amount*.55)*(1-motion.climbWeight)+strikeMotion.pose.bodyPitch,Math.PI,dead||pairedClip?0:(motion.roll+motion.lean)*(1-motion.stance.amount*.4)*(1-motion.climbWeight)+strikeMotion.pose.bodyRoll);body.scale.setScalar(scale);
    // Probe before IK, with the prior bounded settle and no landing crouch.
    // This receipt distinguishes KCC slope clearance from an authored swing.
    body.position.y=groundContact&&!resetting?motion.groundSettle:0;
    model.updateWorldMatrix(true,true);resetGroundSettle(contact.settle);
    if(groundContact)for(let i=0;i<contact.limbs.length;i++){
      const limb=contact.limbs[i],ground=limb.ground,probe=contact.probe,d=contact.diagnostic.paws[i];
      if(motion.stance.amount>.06&&limb.upper.name.startsWith('F')){clearPawAnchor(ground);continue;}
      limb.paw.getWorldPosition(contact.paw);surfacePresent(ground.surface);
      const support=pawSupport(motionChassis,limb.upper.name.slice(0,2),motion.stance.amount>.06?motion.uprightPhase:motion.phase,motion.weights,motion.stance.amount>.06,motion.turn,stationary,motion.upright);
      limb.upper.getWorldPosition(contact.hip);limb.lower.getWorldPosition(contact.knee);
      preparePawLease(ground,contact.paw,contact.hip,pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,ground.surface.normal,probe),contact.hip.distanceTo(contact.knee)+contact.knee.distanceTo(contact.paw),support,dt,scale,profile);
      d.casts=probeGroundPaw(world,probe,ground,limb.corners,limb.paw.matrixWorld,contact.paw,root.position.y,scale,profile,frame.clock.elapsedTime,dt,support);
      contact.diagnostic.probes+=d.casts;
      includeGroundSettle(contact.settle,ground,contact.paw,pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,probe.up.set(0,1,0),probe),support);
    }
    motion.groundSettle=settleCarrier(contact.settle,motion.groundSettle,scale,groundContact&&!resetting&&motion.weights.air<.05,motion.stance.amount>.06?2:4,dt,.3+profile.settle*.01);
    contact.diagnostic.carrierSettle=motion.groundSettle;contact.diagnostic.clearance=Number.isFinite(contact.settle.clearance)?contact.settle.clearance:0;
    // Crouch the carrier and bend rigid legs back onto support. Scaling the
    // skeleton's Y axis changed segment lengths during landing IK rotations.
    let landingSupported=groundContact&&!resetting&&contact.limbs.length===4;
    for(const limb of contact.limbs){if(motion.stance.amount>.06&&limb.upper.name.startsWith('F'))continue;const support=pawSupport(motionChassis,limb.upper.name.slice(0,2),motion.stance.amount>.06?motion.uprightPhase:motion.phase,motion.weights,motion.stance.amount>.06,motion.turn,stationary,motion.upright);if(!pawReadyForCrouch(limb.ground,support))landingSupported=false;}
    // Air clears anchors. Never lower the carrier before every applicable paw
    // has reacquired full support, or as one begins an authored swing/replant.
    body.position.y=motion.groundSettle+(landingSupported?-motion.landing*.12*scale:0);
    // Mixer restores these tracks each frame. Add tracking in each bone parent's space.
    model.updateWorldMatrix(true,true);
    if(groundContact||climbing){
      // Move only feet close to stance height. Swinging paws retain their authored lift.
      for(let limbIndex=0;limbIndex<contact.limbs.length;limbIndex++){
        const limb=contact.limbs[limbIndex],diagnostic=contact.diagnostic.paws[limbIndex];
        const front=limb.upper.name.startsWith('F');
        if(!climbing&&motion.stance.amount>.06&&front){clearPawAnchor(limb.ground);continue;}
        limb.upper.getWorldPosition(contact.hip);limb.lower.getWorldPosition(contact.knee);limb.paw.getWorldPosition(contact.paw);
        limb.paw.getWorldQuaternion(contact.pawRotation);
        contact.target.copy(contact.paw);
        if(climbing){
          const wallSupport=(climbing.gripMask&(1<<limbIndex))!==0,roofSupport=(climbing.roofMask&(1<<limbIndex))!==0;
          if(!face||!wallSupport&&!roofSupport)continue;
          const pawFace=cornerFaces&&climbing.corner?.pawFaces?cornerFaces[climbing.corner.pawFaces[limbIndex]]:face;
          let pad=0,roofPad=0;for(const corner of limb.corners){contact.from.copy(corner).applyMatrix4(limb.paw.matrixWorld).sub(contact.paw);pad=Math.max(pad,-contact.from.x*climbing.normal.x-contact.from.z*climbing.normal.z);roofPad=Math.max(roofPad,-contact.from.y);}
          pad+=.004;roofPad+=.004;
          const planeDistance=(contact.paw.x-climbing.contact.x)*climbing.normal.x+(contact.paw.z-climbing.contact.z)*climbing.normal.z;
          const bodyDistance=(root.position.x-climbing.contact.x)*climbing.normal.x+(root.position.z-climbing.contact.z)*climbing.normal.z;
          // Authored swing retracts from the face; only support paws are projected.
          if(climbing.phase!=='mantle'&&wallPoseGap(planeDistance-pad,bodyDistance,actorHullRadius(actor)+.09)>.045*scale)continue;
          // Release the facade as the hull crosses the roof edge. Continuing to
          // pin a paw to the old wall after crossing would pull a leg backwards.
          const wallWeight=wallSupport&&!vault?(climbing.phase==='mantle'?motion.climb.wall*clamp((bodyDistance-.45)/(scale*1.4),0,1):motion.climb.wall):0;
          wallContact(contact.paw,climbing.contact,climbing.normal,pad,wallWeight,contact.target);
          if(cornerFaces&&climbing.corner?.pawFaces){
            const offsets=limb.corners.map(point=>point.clone().applyMatrix4(limb.paw.matrixWorld).sub(contact.paw)),request=overhaulCornerPawRequests(cornerFaces,contact.paw,offsets).find(q=>q.index===climbing.corner!.pawFaces![limbIndex]);
            if(!request)continue;contact.target.set(request.target.x,request.target.y,request.target.z);
          }
          if(roofSupport){
            const roofWeight=(front?1:clamp((climbProgress-.2)/.45,0,1))*(vault?motion.vault.roof:1);
            contact.target.y+=(climbing.top+roofPad-contact.target.y)*roofWeight;
          }else contact.target.y+=clamp(climbing.contact.y-(root.position.y+1.7*scale*(actor.bot?1:WALL_GAITS[actor.chassis].depth)),-.28*scale,.2*scale)*motion.climb.wall;
          const supported=probeClimbingContact(world,contact.climbingProbe,pawFace,limb.corners,limb.paw.matrixWorld,contact.paw,contact.target,roofSupport,scale);
          diagnostic.casts=contact.climbingProbe.casts;contact.diagnostic.probes+=diagnostic.casts;
          if(!supported)continue;
          const reach=contact.hip.distanceTo(contact.knee)+contact.knee.distanceTo(contact.paw);
          if(contact.hip.distanceTo(contact.target)>reach*.98)continue;
          diagnostic.valid=true;diagnostic.support=1;diagnostic.weight=roofSupport?(vault?motion.vault.roof:1):wallWeight;diagnostic.planted=diagnostic.weight>.001;
          diagnostic.surface=roofSupport?'roof':'wall';
        }else{
          const support=pawSupport(motionChassis,limb.upper.name.slice(0,2),motion.stance.amount>.06?motion.uprightPhase:motion.phase,motion.weights,motion.stance.amount>.06,motion.turn,stationary,motion.upright);
          const ground=limb.ground,probe=contact.probe;
          // Validate cached handles every frame, including stationary plants.
          surfacePresent(ground.surface);
          // Paw orientation follows a bounded support normal, while preserving
          // the authored bone twist and the original joint segment lengths.
          if(ground.surface.valid&&ground.weight>0){
            probe.up.copy(limb.up).applyQuaternion(contact.pawRotation).normalize();
            probe.rotation.setFromUnitVectors(probe.up,ground.surface.normal);
            const angle=probe.rotation.angleTo(contact.rotation.identity());
            if(angle>.26){contact.rotation.copy(probe.rotation);probe.rotation.identity().slerp(contact.rotation,.26/angle);}
            contact.rotation.identity().slerp(probe.rotation,ground.weight);contact.pawRotation.premultiply(contact.rotation);
            limb.paw.parent!.getWorldQuaternion(contact.parent).invert();limb.paw.quaternion.copy(contact.parent.multiply(contact.pawRotation));limb.paw.updateWorldMatrix(false,false);
          }
          const sole=pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,ground.surface.normal,probe);
          if(ground.planted&&ground.surface.valid&&!ground.releasing)ground.position.y=ground.surface.height-(ground.surface.normal.x*(ground.position.x-ground.surface.x)+ground.surface.normal.z*(ground.position.z-ground.surface.z))/ground.surface.normal.y+sole;
          plantedPawTarget(ground,contact.paw,contact.hip,sole,contact.hip.distanceTo(contact.knee)+contact.knee.distanceTo(contact.paw),support,dt,scale,profile,contact.target);
          clearPawObstruction(ground.surface,contact.paw,sole,pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,probe.up.set(0,1,0),probe),contact.target);
          diagnostic.support=support;diagnostic.weight=ground.weight;diagnostic.planted=ground.planted&&!ground.releasing;diagnostic.valid=ground.surface.valid;
        }
        const upperLength=contact.hip.distanceTo(contact.knee),lowerLength=contact.knee.distanceTo(contact.paw);
        if(!climbing){
          const ground=limb.ground,probe=contact.probe;
          diagnostic.authoredReach=contact.hip.distanceTo(contact.paw)/(upperLength+lowerLength);
          diagnostic.plannedReach=contact.hip.distanceTo(contact.target)/(upperLength+lowerLength);
          if(!pawRequestAdmitted(contact.hip,contact.target,upperLength,lowerLength)||!pawQueryContains(ground.surface,limb.corners,limb.paw.matrixWorld,contact.paw,contact.target,probe)){
            diagnostic.leaseRetired=ground.planted||ground.releasing;retirePawLease(ground);
            // Reconstruct from the authored paw, after retiring all contact
            // contribution. Its actual rotated footprint needs a fresh receipt.
            diagnostic.authoredFallback=true;
            diagnostic.fallbackCasts=probeAuthoredPawFallback(world,probe,ground,limb.corners,limb.paw.matrixWorld,contact.paw,root.position.y,scale,profile,frame.clock.elapsedTime);
            diagnostic.casts+=diagnostic.fallbackCasts;contact.diagnostic.probes+=diagnostic.fallbackCasts;
            contact.target.copy(contact.paw);
            clearPawObstruction(ground.surface,contact.paw,pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,ground.surface.normal,probe),pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,probe.up.set(0,1,0),probe),contact.target);
            // Preserve realizable baseline floor correction on inherited asset
            // reserve deficits. This is not a qualified plant or carried pose.
            diagnostic.legacyRawFallback=contact.hip.distanceTo(contact.target)>=(upperLength+lowerLength)*.98;
          }
          diagnostic.weight=ground.weight;diagnostic.planted=ground.planted&&!ground.releasing;diagnostic.valid=ground.surface.valid;diagnostic.releasePose=ground.releasing;
        }
        recordPawIKRequest(contact.hip,contact.target,upperLength,lowerLength,diagnostic);
        if(!climbing&&diagnostic.authoredFallback&&!limb.ground.planted&&!limb.ground.releasing&&limb.ground.weight===0)diagnostic.partialClearance=pawRequestWithinJointLimits(contact.hip,contact.target,upperLength,lowerLength)&&partialPawClearanceAllowed(limb.ground.surface,limb.corners,limb.paw.matrixWorld,contact.paw,contact.target,contact.probe,diagnostic.fallbackCasts,pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,contact.probe.up.set(0,1,0),contact.probe));
        if(!climbing&&(!(diagnostic.authoredFallback?pawRequestWithinJointLimits(contact.hip,contact.target,upperLength,lowerLength):pawRequestAdmitted(contact.hip,contact.target,upperLength,lowerLength))||!diagnostic.partialClearance&&!pawQueryContains(limb.ground.surface,limb.corners,limb.paw.matrixWorld,contact.paw,contact.target,contact.probe))){diagnostic.ikRejected=true;diagnostic.reach=contact.hip.distanceTo(contact.paw)/(upperLength+lowerLength);continue;}
        diagnostic.ikApplied=true;
        if(!climbing)capturePawLeasePose(limb.ground,contact.hip,contact.target,upperLength,lowerLength);
        applyPawIK(limb.upper,limb.lower,limb.paw,contact);
        if(climbing){limb.paw.getWorldPosition(contact.paw);diagnostic.reach=contact.hip.distanceTo(contact.paw)/(upperLength+lowerLength);diagnostic.clearance=climbingPatchClearance(contact.climbingProbe,limb.corners,limb.paw.matrixWorld);}
        if(!climbing){limb.paw.getWorldPosition(contact.paw);const ground=limb.ground;diagnostic.slip=ground.weight>.001?Math.hypot(contact.paw.x-ground.position.x,contact.paw.z-ground.position.z):0;diagnostic.reach=contact.hip.distanceTo(contact.paw)/(upperLength+lowerLength);diagnostic.soleError=ground.surface.valid?contact.paw.y-pawSole(limb.corners,limb.paw.matrixWorld,contact.paw,ground.surface.normal,contact.probe)-ground.surface.height:0;}
      }
    }
    const track=(bone:Bone,amount:number,vertical=true)=>{if(!bone.parent)return;bone.parent.getWorldQuaternion(motion.inverse).invert();if(vertical)motion.axis.set(0,1,0);else motion.axis.set(Math.cos(root.rotation.y),0,-Math.sin(root.rotation.y));motion.axis.applyQuaternion(motion.inverse);motion.rotation.setFromAxisAngle(motion.axis,amount);bone.quaternion.premultiply(motion.rotation);};
    if(bones.head&&!dead&&!pairedClip){track(bones.head,motion.look*(1-motion.climbWeight));track(bones.head,clamp(state.aimPitch,-.22,.24)*(1-motion.climbWeight),false);}
    const tailYaw=-yawRate*.022-motion.lean*.16;metadata.terrainRoll=motion.roll;metadata.bodyRoll=body.rotation.z;metadata.tailYaw=dead?0:tailYaw;
    if(!dead&&!pairedClip)for(let i=0;i<bones.tail.length;i++)track(bones.tail[i],tailYaw*(1-i*.12));
    const flash=!useGameStore.getState().settings.reducedFlashes&&renderTime>=state.hurtAt&&renderTime-state.hurtAt<.12;
    const shield=state.shieldUntil>renderTime,windup=actor.bot&&state.windupUntil>renderTime&&state.hp>0;
    const disrupted=state.disruptedUntil>renderTime&&state.hp>0;
    armor.forEach(({m,emissive,intensity,optic})=>{m.emissive.copy(flash?motion.flash:optic&&disrupted?motion.shield:optic&&windup?motion.windup:optic&&shield?motion.shield:emissive);m.emissiveIntensity=flash?1.2:optic&&disrupted?.35:optic&&(windup||shield)?Math.max(2.1,intensity):dead&&optic?.05:intensity;});
    if(ring.current?.material instanceof MeshBasicMaterial){ring.current.material.color.copy(shield?motion.shield:motion.ring);ring.current.material.opacity=shield?.8:.38;}
    if(ring.current)ring.current.visible=!climbing;
    if(warning.current){warning.current.visible=windup;const radius=1+clamp(state.windupUntil-renderTime,0,1)*.65;warning.current.scale.setScalar(radius);}
    if(health.current)health.current.style.width=`${state.hp/state.maxHp*100}%`;
    if(label.current)label.current.style.opacity=state.hp>0?'1':'0';
    if(labelAnchor.current)labelAnchor.current.position.y=actor.bot?2.8:3.1+motion.stance.amount*.65;
    // Pose publication follows Physics/Session and precedes camera composition.
    completeCameraVisual(actor.id,root,frame.clock.elapsedTime,runtime.generation);
  },-1);
  return <group ref={group}>
    <group ref={carrier} rotation={[0,Math.PI,0]} scale={scale}><primitive object={model} dispose={null}/></group>
    <mesh ref={ring} rotation={[-Math.PI/2,0,0]} position={[0,.06,0]}><ringGeometry args={[1.35,1.4,32]}/><meshBasicMaterial color={motion.ring} transparent opacity={.38} depthWrite={false}/></mesh>
    <mesh ref={warning} visible={false} rotation={[-Math.PI/2,0,0]} position={[0,.08,0]}><ringGeometry args={[1.55,1.68,40]}/><meshBasicMaterial color="#ffba64" transparent opacity={.8} depthWrite={false}/></mesh>
    {actor.id!==runtime.localId&&<group ref={labelAnchor} position={[0,actor.bot?2.8:3.1,0]}><Html center distanceFactor={12} zIndexRange={[2,0]} style={{pointerEvents:'none'}} occlude={false}><div ref={label} className={`actor-label ${actor.bot?'hostile':'friendly'}`}><span>{actor.name}</span><div className="actor-hp"><div ref={health}/></div></div></Html></group>}
  </group>;
}

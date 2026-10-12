import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { clamp, segmentCylinder } from '../../../shared/math';
import { ACTOR_HEIGHT, actorHullRadius, actorCollisionHeight, STANCE_TRANSITION } from '../../../shared/config';
import { runtime,cameraDiagnostics } from '../runtime';
import { controls } from '../input';
import { useGameStore } from '../../state/store';
import {cameraClearance} from './clearance';
import {sampleRenderActor} from '../entities/renderTimeline';
import {cameraContainsVisual,cameraPose,createCameraFraming,fitCameraDistance,LEGACY_CAMERA_COMPOSITION} from './framing';
import {advanceFelineComposition034} from './felineFraming034';
import {cameraVisual} from './visualRegistry';
import {advancePairCamera,advancePairCameraDistance,cameraPairOther,createPairCamera,resetPairCamera} from './pairFraming';
import {crosshairMuzzleAim} from './viewAim';
import {publicFelineSelected008} from '../entities/publicFelinePrototype008';
import {identity57Selected005} from '../entities/identity57Runtime005Control';
import {createThirdPersonSight058,resolveThirdPersonSight058} from './thirdPersonSight058';
import {createObstructionOrbit071,resolveObstructionOrbit071} from './obstructionOrbit071';
export function CameraRig(){
  const {camera}=useThree(),{world}=useRapier();
  const probe=useRef(new RAPIER.Ball(.245)),diagnose=new URLSearchParams(location.search).get('debug')==='1';
  const smoothTarget=useRef(new Vector3(-8,2,12)),position=useRef(new Vector3()),first=useRef(true);
  const sight=useMemo(createThirdPersonSight058,[]),orbitForward=useRef(new Vector3()),orbitRight=useRef(new Vector3()),orbitUp=useRef(new Vector3());
  const obstruction=useMemo(createObstructionOrbit071,[]);
  const framing=useMemo(createCameraFraming,[]),look=useRef(new Vector3()),fitDistance=useRef(0),hadVisual=useRef(false);
  const pairCamera=useMemo(createPairCamera,[]),pairFocus=useRef(new Vector3()),pairCorners=useRef<Vector3[]>([]);
  const composition=useRef({...LEGACY_CAMERA_COMPOSITION});
  useFrame((frame,dt)=>{
    const presented=sampleRenderActor(runtime.localId,frame.clock.elapsedTime,dt);if(!presented)return;const actor=presented.state,bodyPosition=presented.position;
    const settings=useGameStore.getState().settings;
    const phase=clamp((presented.time-(actor.stanceChangedAt??-100))/STANCE_TRANSITION,0,1),ease=phase*phase*(3-2*phase),stance=actor.stance==='upright'?ease:1-ease;
    const visual=cameraVisual(runtime.localId,frame.clock.elapsedTime,runtime.generation);
    const prototype=publicFelineSelected008(actor)||identity57Selected005(actor);
    // The retained prototype has a measured smaller body than the legacy rig.
    // Its current rendered vertical envelope owns presentation focus only;
    // physical occupancy, aim rays and player yaw remain authoritative.
    const height=prototype&&visual&&!visual.bounds.isEmpty()?(visual.bounds.min.y+visual.bounds.max.y)/2:bodyPosition.y+.9+stance;
    const target=new Vector3(bodyPosition.x,height,bodyPosition.z);
    const resetting=first.current||presented.reset;
    if(resetting){smoothTarget.current.copy(target);hadVisual.current=false;first.current=false;resetPairCamera(pairCamera);}else smoothTarget.current.lerp(target,1-Math.exp(-dt*14));
    const focus=cameraClearance(world,target,smoothTarget.current);smoothTarget.current.set(focus.x,focus.y,focus.z);
    if(camera instanceof PerspectiveCamera){const speed=Math.hypot(actor.velocity.x,actor.velocity.z);const fov=controls.aiming?52:59+Math.min(speed,20)*.25;camera.fov+=(fov-camera.fov)*(1-Math.exp(-dt*5));camera.updateProjectionMatrix();}
    const preferred=(prototype?(settings.felineCameraDistance??6):settings.cameraDistance)*(controls.aiming?.75:1),yaw=controls.yaw,pitch=controls.pitch;
    advanceFelineComposition034(composition.current,visual?visual.bounds.max.y-visual.bounds.min.y:0,preferred,prototype,dt,resetting);
    composition.current.bodyOrbit=prototype;
    const fit=camera instanceof PerspectiveCamera&&visual?fitCameraDistance(framing,smoothTarget.current,visual.corners,yaw,pitch,preferred,camera.fov,camera.aspect,18,composition.current):null;
    const required=fit?.distance??preferred,snap=resetting,fitSnap=resetting||!!visual&&!hadVisual.current;
    const localFitProbes=fit?.probes??0;
    fitDistance.current=fitSnap?required:Math.max(required,fitDistance.current+(required-fitDistance.current)*(1-Math.exp(-dt*3)));
    hadVisual.current=!!visual;
    const other=cameraPairOther(actor,runtime.snapshot?.actors??[]),otherView=other?sampleRenderActor(other.id,frame.clock.elapsedTime,dt):null;
    const otherVisual=otherView?cameraVisual(otherView.state.id,frame.clock.elapsedTime,runtime.generation):null;
    const otherPrototype=!!otherView&&(publicFelineSelected008(otherView.state)||identity57Selected005(otherView.state));
    const otherHeight=otherView?(otherPrototype&&otherVisual&&!otherVisual.bounds.isEmpty()?(otherVisual.bounds.min.y+otherVisual.bounds.max.y)/2:otherView.position.y+.9+(otherView.state.stance==='upright'?1:0)):0;
    const otherFocus=otherView?{x:otherView.position.x,y:otherHeight,z:otherView.position.z}:null;
    advancePairCamera(pairCamera,target,otherFocus,otherView?actor.pair!.id:'',yaw,pitch,controls.aiming,dt);
    pairFocus.current.set(smoothTarget.current.x+pairCamera.offset.x,smoothTarget.current.y+pairCamera.offset.y,smoothTarget.current.z+pairCamera.offset.z);
    const safeFocus=cameraClearance(world,target,pairFocus.current);pairFocus.current.set(safeFocus.x,safeFocus.y,safeFocus.z);
    pairCorners.current.length=0;if(visual&&otherVisual)pairCorners.current.push(...visual.corners,...otherVisual.corners);
    const pairFit=pairCamera.active&&camera instanceof PerspectiveCamera&&pairCorners.current.length?fitCameraDistance(framing,pairFocus.current,pairCorners.current,yaw+pairCamera.yaw,pitch,fitDistance.current,camera.fov,camera.aspect,Math.min(22,fitDistance.current+4),composition.current):null;
    const extra=advancePairCameraDistance(pairCamera,controls.aiming?0:(pairFit?.distance??fitDistance.current)-fitDistance.current,dt);
    cameraPose(pairFocus.current,yaw+pairCamera.yaw,pitch,fitDistance.current+extra,position.current,look.current,composition.current);
    const time=presented.time,damage=time>=actor.hurtAt&&time-actor.hurtAt<.25,fire=time-actor.fireAt<.06;
    if(!settings.reducedFlashes&&(damage||fire)){const amount=damage?.12:.025;position.current.x+=Math.sin(time*113)*amount;position.current.y+=Math.cos(time*97)*amount;}
    if(snap)camera.position.copy(position.current);else camera.position.lerp(position.current,1-Math.exp(-dt*16));
    const safe=cameraClearance(world,pairFocus.current,camera.position);camera.position.set(safe.x,safe.y,safe.z);
    camera.lookAt(look.current);
    const viewCorners=pairCamera.active&&otherVisual?pairCorners.current:visual?.corners;
    let actualFit=camera instanceof PerspectiveCamera&&!!viewCorners&&cameraContainsVisual(camera,viewCorners,framing.point),trackingCorrected=false;
    if(prototype&&camera instanceof PerspectiveCamera&&viewCorners&&visual){
      const orbitYaw=yaw+pairCamera.yaw,sine=Math.sin(pitch),cosine=Math.cos(pitch),sx=Math.sin(orbitYaw),cz=Math.cos(orbitYaw);
      orbitForward.current.set(-sx*cosine,sine,-cz*cosine);orbitRight.current.set(cz,0,-sx);orbitUp.current.set(sx*sine,cosine,cz*sine);
      const result=resolveThirdPersonSight058(sight,{camera,desired:position.current,forward:orbitForward.current,right:orbitRight.current,up:orbitUp.current,corners:viewCorners,anchors:visual.anchors,width:clamp(Math.hypot(visual.bounds.max.x-visual.bounds.min.x,visual.bounds.max.z-visual.bounds.min.z)/2,1,3),height:clamp(visual.bounds.max.y-visual.bounds.min.y,1,3),generation:runtime.generation,
        clearance:to=>cameraClearance(world,pairFocus.current,to),nativeEmpty:at=>!world.intersectionWithShape(at,{x:0,y:0,z:0,w:1},probe.current,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC),
        nativeSight:(from,to)=>{const delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},length=Math.hypot(delta.x,delta.y,delta.z);return length>.01&&!world.castRay(new RAPIER.Ray(from,{x:delta.x/length,y:delta.y/length,z:delta.z/length}),length-.01,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);}});
      actualFit=result.contained;trackingCorrected=result.corrected;
      const obstructionResult=resolveObstructionOrbit071(obstruction,{camera,focus:pairFocus.current,desired:position.current,corners:viewCorners,anchors:visual.anchors,normalAdmitted:!result.constrained,dt,reset:resetting,generation:runtime.generation,life:actor.jumpEpoch,height:visual.bounds.max.y-visual.bounds.min.y,
        clearance:(from,to)=>cameraClearance(world,from,to),nativeEmpty:at=>!world.intersectionWithShape(at,{x:0,y:0,z:0,w:1},probe.current,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC),
        nativeSight:(from,to)=>{const delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},length=Math.hypot(delta.x,delta.y,delta.z);return length>.01&&!world.castRay(new RAPIER.Ray(from,{x:delta.x/length,y:delta.y/length,z:delta.z/length}),length-.01,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);}});
      actualFit=obstructionResult.contained;
      if(diagnose)Object.assign(cameraDiagnostics,{obstructionOrbit:{...obstructionResult,frameClock:frame.clock.elapsedTime,contract:'BOUNDED_OBSTRUCTION_ORBIT_ACTUAL_ENVELOPE_AND_ANCHOR_WITNESSES'}});
      if(diagnose){const usingOrbit=obstructionResult.active||obstructionResult.returning||result.constrained;Object.assign(cameraDiagnostics,{bodySight:{...result,contained:actualFit,anchorsClear:usingOrbit?obstructionResult.anchorsClear:result.anchorsClear,constrained:usingOrbit?obstructionResult.constrained:result.constrained,normalCandidates:result.candidates,orbitCandidates:obstructionResult.candidates,frameClock:frame.clock.elapsedTime,owner:runtime.localId,contract:'NATIVE_SAFE_PROJECTED_BODY_ANCHOR_WITNESSES_NOT_SKIN_VISIBILITY'}});}
    }else{obstruction.active=false;obstruction.clearTime=0;}
    if(diagnose){Object.assign(cameraDiagnostics.position,camera.position);Object.assign(cameraDiagnostics.focus,safeFocus);cameraDiagnostics.frameClock=frame.clock.elapsedTime;cameraDiagnostics.visualFrameClock=visual?.frameClock??-1;cameraDiagnostics.preferredDistance=preferred;cameraDiagnostics.fitDistance=fitDistance.current+extra;cameraDiagnostics.fitProbes=localFitProbes;cameraDiagnostics.visualCorners=visual?.corners.length??0;cameraDiagnostics.fitAvailable=actualFit;cameraDiagnostics.snapped=snap||trackingCorrected;cameraDiagnostics.clear=!world.intersectionWithShape(camera.position,{x:0,y:0,z:0,w:1},probe.current,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);if(!cameraDiagnostics.clear)cameraDiagnostics.violations++;}
    // Resolve the crosshair against cover and actor hit volumes, then aim from the muzzle.
    const view=camera.getWorldDirection(new Vector3()),cover=world.castRay(new RAPIER.Ray(camera.position,view),180,true,RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);
    let aimDistance=cover?.timeOfImpact??180;const end=camera.position.clone().addScaledVector(view,180);
    for(const other of runtime.snapshot!.actors){if(other.id===actor.id||other.hp<=0)continue;const view=sampleRenderActor(other.id,frame.clock.elapsedTime,dt);if(!view||view.state.hp<=0)continue;const half=actorCollisionHeight(view.state,view.time)/2;const fraction=segmentCylinder(camera.position,end,{...view.position,y:view.position.y+half-ACTOR_HEIGHT},actorHullRadius(view.state),half);if(fraction!==null)aimDistance=Math.min(aimDistance,fraction*180);}
    const aim=camera.position.clone().addScaledVector(view,aimDistance),shot=crosshairMuzzleAim(bodyPosition,actor.stance,aim,yaw+pairCamera.yaw,pitch);
    controls.shotYaw=shot.yaw;controls.shotPitch=shot.pitch;
    // Observe the actual center ray, after fit/clearance/lookAt. This is neither
    // the player's look pitch nor the muzzle pitch sent for weapon targeting.
    if(diagnose)controls.cameraRay={frameClock:frame.clock.elapsedTime,yaw:Math.atan2(-view.x,-view.z),pitch:Math.atan2(view.y,Math.hypot(view.x,view.z)),targetDistance:aimDistance,reachable:shot.reachable};
    if(diagnose)Object.assign(cameraDiagnostics,{movementYaw:controls.yaw,lookYaw:controls.yaw,lookPitch:controls.pitch,pairFraming:{id:other?.pair?.id??null,active:pairCamera.active,yawBias:pairCamera.yaw,focusOffset:{...pairCamera.offset},distanceExtra:extra,bothVisuals:!!visual&&!!otherVisual,fitted:!!pairFit?.fitted,lookHold:pairCamera.lookHold,aimYaw:shot.yaw,aimPitch:shot.pitch,aimReachable:shot.reachable}});
  });return null;
}

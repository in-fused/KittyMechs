import {ShaderStartup232,MountedScene232,createGate232,admitBody232,retainedAdmission232,type Gate232} from '../../shaderStartup232';
import {deploymentBlocks211,readinessTransition211,observeReadiness211,type DeploymentReady211} from './rendering/deploymentReadiness211';
import { Component, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { Environment, useGLTF, useProgress } from '@react-three/drei';

import { Physics } from '@react-three/rapier';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

import { ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, HemisphereLight } from 'three';

import { QUALITY, useGameStore } from '../state/store';

import { getMap } from '../../../../shared/maps';

import { Session } from './Session';

import { World } from './world/World';

import { Actors } from './entities/Actors';

import { CameraRig } from './camera/CameraRig';

import { CombatEffects } from './effects/CombatEffects';

import { Weather } from './effects/Weather';

import { runtime } from './runtime';

import { useMemo } from 'react';

import { emptyWeather, weatherAt } from '../../../../shared/weather';

import { WeatherSky } from './effects/WeatherSky';

import { MECHS } from '../../../../shared/config';

import { actorModelPath } from './rendering/modelPaths';

import { leaveGame } from './network';

import {hasCompletedCameraVisual044} from './camera/visualRegistry';

import {IDENTITY57_ASSET_URL121 as IDENTITY57_ASSET_URL034} from './entities/identity57Runtime121Asset';

import {publicFelineSelected008} from './entities/publicFelinePrototype008';

import {identity57Selected005} from './entities/identity57Runtime005Control';

import {readRendererIdentity} from './rendering/rendererReport';

import {renderPixelRatio059} from './rendering/renderPixelBudget059';

import {closeClientReport092,createClientReport092,sampleClientReport092} from './rendering/clientReport092';



// Private binding defaults to the exact retained57 individual loader key.
const selectedPounceURL220 = IDENTITY57_ASSET_URL034;

class CanvasBoundary extends Component<{children:ReactNode},{error:string|null}> {

  state={error:null};

  static getDerivedStateFromError(error:Error){return {error:error.message};}

  render(){return this.state.error?<div className="fatal-error"><h2>Unable to deploy</h2><p>{this.state.error}</p><button onClick={()=>location.reload()}>Reload game</button></div>:this.props.children;}

}

export function GameCanvas(){

  const quality=useGameStore(s=>s.settings.quality),q=QUALITY[quality];

  const phase=useGameStore(s=>s.phase),paused=phase==='paused'&&runtime.transport==='training';

  const shaderGate232=useRef(createGate232()).current;

  const [sceneReady,setSceneReady]=useState<DeploymentReady211>(()=>({localId:runtime.localId,generation:runtime.generation,ready:false}));

  return <CanvasBoundary><Canvas shadows={q.shadows} dpr={[1,q.dpr]} camera={{position:[-8,6,24],fov:62,near:.1,far:850}} gl={{antialias:quality!=='low',powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping}} onCreated={({gl})=>{gl.domElement.setAttribute('aria-label','KittyMech 3D battlefield');gl.toneMappingExposure=1.1;}}>

    <RenderResolutionBudget059/>

    {quality==='low'&&!q.post&&<ShaderStartup232 key={`${runtime.localId}:${runtime.generation}:${quality}`} gate={shaderGate232} quality={quality}/>}

    <Suspense fallback={null}>

      <DeploymentAssets>

      <Lighting/><WeatherSky/>

      <Physics paused={runtime.authority||paused} gravity={[0,-22,0]} timeStep={1/60} interpolate={false} updateLoop="follow" updatePriority={-2}>

        <Session/><World/><Actors/><CameraRig/><CombatEffects/><Weather/>

      </Physics>

      {q.post&&<EffectComposer multisampling={0}><Bloom intensity={.24} luminanceThreshold={1.2} mipmapBlur/><Vignette eskil={false} offset={.16} darkness={.4}/></EffectComposer>}

      <PerformanceProbe/>

      {quality==='low'&&!q.post&&<MountedScene232 gate={shaderGate232}/>}

      <SceneReady onReady={setSceneReady} shaderGate={quality==='low'&&!q.post?shaderGate232:undefined}/>

      </DeploymentAssets>

    </Suspense>

  </Canvas><LoadingOverlay sceneReady={sceneReady}/></CanvasBoundary>;

}

/** A resize/quality effect owns resolution only; native world and context stay mounted. */

function RenderResolutionBudget059(){

  const quality=useGameStore(s=>s.settings.quality),width=useThree(s=>s.size.width),height=useThree(s=>s.size.height),setDpr=useThree(s=>s.setDpr),actualDpr=useThree(s=>s.viewport.dpr);

  useEffect(()=>{

    const desired=renderPixelRatio059(quality==='low',width,height,window.devicePixelRatio,QUALITY[quality].dpr);

    // Canvas configuration can reassert its legacy DPR during a parent update.

    if(actualDpr!==desired)setDpr(desired);

  },[quality,width,height,setDpr,actualDpr]);

  return null;

}

/** A parent prerequisite resolves before React descends into World/Session.

 * Capture initial public selection once: later toggles/fallback keep their own

 * actor boundaries and cannot suspend or remount the native world here. */

function DeploymentAssets({children}:{children:ReactNode}){

  const chassis=useGameStore(s=>s.chassis);

  const [initialPublicPounce]=useState(()=>{

    const actor={id:runtime.localId,bot:false,chassis:useGameStore.getState().chassis};

    return !identity57Selected005(actor)&&publicFelineSelected008(actor);

  });

  // Start the selected detailed rig before the fallback hook can suspend.
  // preload and the later useGLTF consume the same individual cache key.
  if(initialPublicPounce)useGLTF.preload(selectedPounceURL220);

  // Retain the standard/fallback rig prerequisite and its original cache key.

  useGLTF(actorModelPath(MECHS[chassis].model));

  return initialPublicPounce?<PublicPounceAssets>{children}</PublicPounceAssets>:<>{children}</>;

}

function PublicPounceAssets({children}:{children:ReactNode}){

  useGLTF(selectedPounceURL220);

  return <>{children}</>;

}

function SceneReady({onReady,shaderGate}:{onReady:(ready:DeploymentReady211)=>void;shaderGate?:Gate232}){
  const {scene,camera,gl}=useThree();
  const sent=useRef<DeploymentReady211|null>(null),shaderEpoch=useRef<number|null>(null);
  useFrame(()=>{const next=readinessTransition211(sent.current,runtime.localId,runtime.generation,hasCompletedCameraVisual044(runtime.localId,runtime.generation)&&(!shaderGate||(sent.current?.ready&&sent.current.localId===runtime.localId&&sent.current.generation===runtime.generation&&retainedAdmission232(shaderGate,shaderEpoch.current))||admitBody232(shaderGate,scene,camera,gl)));if(next.ready&&shaderGate?.admitted)shaderEpoch.current=shaderGate.epoch;if(next!==sent.current){sent.current=next;onReady(next);}});
  return null;
}

/** .62 gives ~32% extinction at the authored effective far distance. The

 * curve deliberately keeps city depth readable while fronts change density. */

function fogDensity(far:number,visibility:number){

  const density=.62/(far*visibility);

  return Number.isFinite(density)&&density>0?density:.62/235;

}

function Lighting(){

  const seed=useGameStore(s=>s.seed),quality=useGameStore(s=>s.settings.quality),q=QUALITY[quality],map=getMap(seed),{scene}=useThree();

  const sun=useRef<DirectionalLight>(null),ambient=useRef<HemisphereLight>(null),weather=useMemo(emptyWeather,[]),fogOwner=useRef<FogExp2|null>(null);

  useLayoutEffect(()=>{

    const previousBackground=scene.background,previousFog=scene.fog;

    const background=new Color(map.sky),fog=new FogExp2(map.fog,fogDensity(map.fogFar,1));

    scene.background=background;scene.fog=fog;fogOwner.current=fog;

    return()=>{if(scene.background===background)scene.background=previousBackground;if(scene.fog===fog)scene.fog=previousFog;if(fogOwner.current===fog)fogOwner.current=null;};

  },[scene,map]);

  useFrame(()=>{const actor=runtime.snapshot?.actors.find(a=>a.id===runtime.localId);if(!actor||!sun.current)return;const w=weatherAt(seed,runtime.snapshot!.time,useGameStore.getState().settings.reducedFlashes,weather);sun.current.intensity=map.sunIntensity*w.sunlight+w.lightning;sun.current.position.set(actor.position.x-28,actor.position.y+50,actor.position.z-24);sun.current.target.position.set(actor.position.x,actor.position.y,actor.position.z);sun.current.target.updateMatrixWorld();if(ambient.current)ambient.current.intensity=.4+w.sunlight*.2+w.lightning*.15;const fog=fogOwner.current;if(fog&&scene.fog===fog)fog.density=fogDensity(map.fogFar,w.visibility);});

  return <>

    <Environment files="/assets/art/coastal-overcast.hdr" environmentIntensity={.65}/>

    <hemisphereLight ref={ambient} args={[map.sky,'#35454a',.55]}/>

    <directionalLight ref={sun} position={[-28,50,-24]} intensity={map.sunIntensity} color={map.sun} castShadow={q.shadows} shadow-mapSize={[q.shadowSize,q.shadowSize]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-near={1} shadow-camera-far={160} shadow-bias={-.0002} shadow-normalBias={.08}/>

  </>;

}

function LoadingOverlay({sceneReady}:{sceneReady:DeploymentReady211}){
  const {active,progress,item,loaded,total,errors}=useProgress(),localId=runtime.localId,generation=runtime.generation;
  useEffect(()=>{observeReadiness211(sceneReady,localId,generation,{active,progress,item,loaded,total,errors});},[sceneReady,localId,generation,active,progress,item,loaded,total,errors]);
  return deploymentBlocks211(sceneReady,localId,generation)?<div className="loading-overlay"><span className="eyebrow">ESTABLISHING NEURAL LINK</span><h2>Preparing your mech</h2><div className="load-track"><i style={{width:`${progress}%`}}/></div><p>Loading the district and your mech…</p><button className="quiet" onClick={leaveGame}>Cancel deployment</button></div>:null;
}

function PerformanceProbe(){

  const last=useRef(0),frames=useRef(0),total=useRef(0);const {gl}=useThree();

  const reporting=useMemo(createClientReport092,[]);

  useEffect(()=>()=>closeClientReport092(reporting),[reporting]);

  useEffect(()=>{

    const admit=()=>useGameStore.setState({rendererReport:{...useGameStore.getState().rendererReport,...readRendererIdentity(gl.getContext()),active:true,sampledAt:null}});

    const lost=()=>useGameStore.setState({rendererReport:{...useGameStore.getState().rendererReport,active:false,sampledAt:null}});

    admit();gl.domElement.addEventListener('webglcontextlost',lost);gl.domElement.addEventListener('webglcontextrestored',admit);

    gl.info.autoReset=false;return()=>{gl.info.autoReset=true;gl.domElement.removeEventListener('webglcontextlost',lost);gl.domElement.removeEventListener('webglcontextrestored',admit);lost();};

  },[gl]);

  // Read all passes from the completed frame before resetting counters for the next one.

  useFrame((state,dt)=>{frames.current++;total.current+=dt;if(state.clock.elapsedTime-last.current>=1){last.current=state.clock.elapsedTime;const context=gl.getContext();useGameStore.setState({performance:{...useGameStore.getState().performance,fps:Math.round(frames.current/total.current),calls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,bodies:runtime.sim?.world.bodies.len()??0},rendererReport:{...useGameStore.getState().rendererReport,bufferWidth:context.drawingBufferWidth,bufferHeight:context.drawingBufferHeight,sampledAt:performance.now()}});frames.current=0;total.current=0;}

    if(reporting.enabled&&reporting.sequence<20){const current=useGameStore.getState();sampleClientReport092(reporting,performance.now(),{renderer:current.rendererReport.renderer,bufferWidth:current.rendererReport.bufferWidth,bufferHeight:current.rendererReport.bufferHeight,quality:current.settings.quality,prototype:current.settings.felinePrototype,phaseAtEnd:current.phase});}gl.info.reset();},-100);return null;

}


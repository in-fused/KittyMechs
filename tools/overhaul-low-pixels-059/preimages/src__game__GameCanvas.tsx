import { Component, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF, useProgress } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, HemisphereLight } from 'three';
import { QUALITY, useGameStore } from '../state/store';
import { getMap } from '../../shared/maps';
import { Session } from './Session';
import { World } from './world/World';
import { Actors } from './entities/Actors';
import { CameraRig } from './camera/CameraRig';
import { CombatEffects } from './effects/CombatEffects';
import { Weather } from './effects/Weather';
import { runtime } from './runtime';
import { useMemo } from 'react';
import { emptyWeather, weatherAt } from '../../shared/weather';
import { WeatherSky } from './effects/WeatherSky';
import { MECHS } from '../../shared/config';
import { actorModelPath } from './rendering/modelPaths';
import { leaveGame } from './network';
import {hasCompletedCameraVisual044} from './camera/visualRegistry';
import {IDENTITY57_ASSET_URL034} from './entities/identity57Runtime034Asset';
import {publicFelineSelected008} from './entities/publicFelinePrototype008';
import {identity57Selected005} from './entities/identity57Runtime005Control';
import {readRendererIdentity} from './rendering/rendererReport';

class CanvasBoundary extends Component<{children:ReactNode},{error:string|null}> {
  state={error:null};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  render(){return this.state.error?<div className="fatal-error"><h2>Unable to deploy</h2><p>{this.state.error}</p><button onClick={()=>location.reload()}>Reload game</button></div>:this.props.children;}
}
export function GameCanvas(){
  const quality=useGameStore(s=>s.settings.quality),q=QUALITY[quality];
  const phase=useGameStore(s=>s.phase),paused=phase==='paused'&&runtime.transport==='training';
  const [sceneReady,setSceneReady]=useState(false);
  return <CanvasBoundary><Canvas shadows={q.shadows} dpr={[1,q.dpr]} camera={{position:[-8,6,24],fov:62,near:.1,far:850}} gl={{antialias:quality!=='low',powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping}} onCreated={({gl})=>{gl.domElement.setAttribute('aria-label','KittyMech 3D battlefield');gl.toneMappingExposure=1.1;}}>
    <Suspense fallback={null}>
      <DeploymentAssets>
      <Lighting/><WeatherSky/>
      <Physics paused={runtime.authority||paused} gravity={[0,-22,0]} timeStep={1/60} interpolate={false} updateLoop="follow" updatePriority={-2}>
        <Session/><World/><Actors/><CameraRig/><CombatEffects/><Weather/>
      </Physics>
      {q.post&&<EffectComposer multisampling={0}><Bloom intensity={.24} luminanceThreshold={1.2} mipmapBlur/><Vignette eskil={false} offset={.16} darkness={.4}/></EffectComposer>}
      <PerformanceProbe/>
      <SceneReady onReady={setSceneReady}/>
      </DeploymentAssets>
    </Suspense>
  </Canvas><LoadingOverlay sceneReady={sceneReady}/></CanvasBoundary>;
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
  // Retain the standard/fallback rig prerequisite and its original cache key.
  useGLTF(actorModelPath(MECHS[chassis].model));
  return initialPublicPounce?<PublicPounceAssets>{children}</PublicPounceAssets>:<>{children}</>;
}
function PublicPounceAssets({children}:{children:ReactNode}){
  useGLTF(IDENTITY57_ASSET_URL034);
  return <>{children}</>;
}
function SceneReady({onReady}:{onReady:(ready:boolean)=>void}){const sent=useRef(false);useFrame(()=>{if(!sent.current&&hasCompletedCameraVisual044(runtime.localId,runtime.generation)){sent.current=true;onReady(true);}});return null;}
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
function LoadingOverlay({sceneReady}:{sceneReady:boolean}){const {active,progress,item}=useProgress(),settled=useRef(false);useEffect(()=>{if(sceneReady&&!active)settled.current=true;},[sceneReady,active]);return (!sceneReady||active)&&!settled.current?<div className="loading-overlay"><span className="eyebrow">ESTABLISHING NEURAL LINK</span><h2>Preparing your mech</h2><div className="load-track"><i style={{width:`${progress}%`}}/></div><p>{Math.round(progress)}% · {item.split('/').pop()}</p><button className="quiet" onClick={leaveGame}>Cancel deployment</button></div>:null;}
function PerformanceProbe(){
  const last=useRef(0),frames=useRef(0),total=useRef(0);const {gl}=useThree();
  useEffect(()=>{
    const admit=()=>useGameStore.setState({rendererReport:{...useGameStore.getState().rendererReport,...readRendererIdentity(gl.getContext()),active:true,sampledAt:null}});
    const lost=()=>useGameStore.setState({rendererReport:{...useGameStore.getState().rendererReport,active:false,sampledAt:null}});
    admit();gl.domElement.addEventListener('webglcontextlost',lost);gl.domElement.addEventListener('webglcontextrestored',admit);
    gl.info.autoReset=false;return()=>{gl.info.autoReset=true;gl.domElement.removeEventListener('webglcontextlost',lost);gl.domElement.removeEventListener('webglcontextrestored',admit);lost();};
  },[gl]);
  // Read all passes from the completed frame before resetting counters for the next one.
  useFrame((state,dt)=>{frames.current++;total.current+=dt;if(state.clock.elapsedTime-last.current>=1){last.current=state.clock.elapsedTime;const context=gl.getContext();useGameStore.setState({performance:{...useGameStore.getState().performance,fps:Math.round(frames.current/total.current),calls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,bodies:runtime.sim?.world.bodies.len()??0},rendererReport:{...useGameStore.getState().rendererReport,bufferWidth:context.drawingBufferWidth,bufferHeight:context.drawingBufferHeight,sampledAt:performance.now()}});frames.current=0;total.current=0;}gl.info.reset();},-100);return null;
}

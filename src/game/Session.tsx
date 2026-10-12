import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBeforePhysicsStep, useRapier } from '@react-three/rapier';
import type { Simulation } from '../../shared/simulation';
import { runtime } from './runtime';
import { hostSnapshot,retireFailedArena } from './network';
import {advanceSessionAuthority,createSessionAuthority,publishSessionAuthority,releaseSessionAuthority} from './sessionAuthority';
import { useGameStore } from '../state/store';
import { markJumpSent, readInput, useInput } from './input';
import { audio } from './audio';
import {advanceLocalPhysics043,recordLocalTiming043,resetLocalTiming043} from './localAuthorityTiming043';
import {createCameraVisualStartup044} from './camera/visualRegistry';
import {releaseTrainingSession145} from './trainingSession145';
export function Session(){
  const {world,rapier,step}=useRapier();const updateAt=useRef(0),sendAt=useRef(0),eventId=useRef(0);
  const timing=useRef({simulationMs:0,stages:{} as Record<string,number>});
  const generation=useRef(runtime.generation);
  const visualStarted=useRef(createCameraVisualStartup044(runtime.localId,generation.current));
  useInput();
  // Physics ownership must retire before the provider's passive world cleanup,
  // including render-error unmounts that do not go through leaveGame.
  useLayoutEffect(()=>{
    const clearRay:NonNullable<typeof runtime.clearRay>=(from,to)=>{const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,length=Math.hypot(dx,dy,dz);if(length<.1)return true;const hit=world.castRay(new rapier.Ray(from,{x:dx/length,y:dy/length,z:dz/length}),length,true,rapier.QueryFilterFlags.EXCLUDE_KINEMATIC|rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);return !hit||hit.timeOfImpact>=length-.3;};
    runtime.clearRay=clearRay;let owned:Simulation|null=null,disposeAuthority:(()=>void)|null=null;
    if(runtime.authority){
      const state=useGameStore.getState();
      const room=runtime.transport==='training'?`TRAINING-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`:runtime.localId;
      const authority=createSessionAuthority(world,rapier,{seed:runtime.seed,mode:runtime.transport==='training'?'training':state.mode,room},(sim,error)=>{if(generation.current===runtime.generation)retireFailedArena(sim,error);});
      if(authority){const sim=authority.sim;owned=sim;disposeAuthority=authority.dispose;runtime.sim=sim;
        resetLocalTiming043(generation.current);
        if(import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1')sim.onStepTiming=(stage,duration)=>{timing.current.stages[stage]=(timing.current.stages[stage]??0)+duration;};
        try{sim.addActor(runtime.localId,state.name,state.chassis);runtime.onSimReady?.(sim);publishSessionAuthority(sim,hostSnapshot,retireFailedArena);}catch(error){retireFailedArena(sim,error);}
      }
    }
    return()=>{
      if(owned&&disposeAuthority)releaseSessionAuthority(owned,generation.current,disposeAuthority);
      releaseTrainingSession145(generation.current);
      if(runtime.clearRay===clearRay)runtime.clearRay=null;
    };
  },[world,rapier]);
  useBeforePhysicsStep(()=>{
    if(generation.current!==runtime.generation||!runtime.authority||!runtime.sim)return;
    if(useGameStore.getState().phase==='paused'&&runtime.transport==='training')return;
    const sim=runtime.sim;
    const at=performance.now();
    advanceSessionAuthority(sim,runtime.localId,runtime.input,()=>markJumpSent(runtime.input),retireFailedArena);
    timing.current.simulationMs+=performance.now()-at;
  });
  // The provider's automatic loop is paused for local authority. Its public
  // step retains all before/after hooks, fixed ticks and guarded native ownership.
  useFrame((_,delta)=>{
    if(generation.current!==runtime.generation||!runtime.authority||!runtime.sim)return;
    // Allow concurrent GLTF/Suspense work to commit before expensive native
    // Solo ticks occupy each frame. Once a real local owner has completed its
    // first visual frame, readiness remains latched through later rig switches.
    if(!visualStarted.current())return;
    const sim=runtime.sim,tick=sim.tick,paused=runtime.transport==='training'&&useGameStore.getState().phase==='paused';
    timing.current={simulationMs:0,stages:{}};
    const at=performance.now(),admission=advanceLocalPhysics043(delta,paused,step),physicsMs=performance.now()-at;
    recordLocalTiming043({...admission,generation:generation.current,tick:sim.tick,steps:sim.tick-tick,physicsMs,simulationMs:timing.current.simulationMs,providerOtherMs:Math.max(0,physicsMs-timing.current.simulationMs),stages:timing.current.stages});
  },-2);
  // Physics (-2) commits first, then publish before city survival (-1.25),
  // actor poses (-1) and camera (0). Input still precedes this frame's aim.
  useFrame(state=>{
    if(generation.current!==runtime.generation)return;
    const time=state.clock.elapsedTime;
    const input=readInput();
    if(time>=sendAt.current){if(runtime.sendInput?.(input))markJumpSent(input);sendAt.current=time+1/30;}
    if(runtime.authority&&runtime.sim&&time>=updateAt.current){if(publishSessionAuthority(runtime.sim,hostSnapshot,retireFailedArena))updateAt.current=time+1/20;else return;}
    const snap=runtime.snapshot;
    if(!snap)return;
    for(const event of snap.events)if(event.id>eventId.current){audio.event(event,runtime.localId);eventId.current=Math.max(eventId.current,event.id);}
    if(snap.phase==='extracted'&&useGameStore.getState().phase!=='results'){document.exitPointerLock?.();useGameStore.setState({phase:'results',hud:snap});}
  },-1.5);
  // DOM consumers update at 10 Hz; transforms stay outside React.
  useEffect(()=>{const timer=setInterval(()=>{if(runtime.snapshot)useGameStore.setState({hud:runtime.snapshot});},100);return()=>clearInterval(timer);},[]);
  return null;
}

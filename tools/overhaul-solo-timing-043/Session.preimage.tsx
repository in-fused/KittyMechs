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
export function Session(){
  const {world,rapier}=useRapier();const updateAt=useRef(0),sendAt=useRef(0),eventId=useRef(0);
  const generation=useRef(runtime.generation);
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
        try{sim.addActor(runtime.localId,state.name,state.chassis);runtime.onSimReady?.(sim);publishSessionAuthority(sim,hostSnapshot,retireFailedArena);}catch(error){retireFailedArena(sim,error);}
      }
    }
    return()=>{
      if(owned&&disposeAuthority)releaseSessionAuthority(owned,generation.current,disposeAuthority);
      if(runtime.clearRay===clearRay)runtime.clearRay=null;
    };
  },[world,rapier]);
  useBeforePhysicsStep(()=>{
    if(generation.current!==runtime.generation||!runtime.authority||!runtime.sim)return;
    if(useGameStore.getState().phase==='paused'&&runtime.transport==='training')return;
    const sim=runtime.sim;
    advanceSessionAuthority(sim,runtime.localId,runtime.input,()=>markJumpSent(runtime.input),retireFailedArena);
  });
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

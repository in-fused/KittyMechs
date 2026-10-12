import type RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../../shared/simulation';
import type {GameSnapshot,InputState,Mode} from '../../shared/types';
import {guardOwnedWorldStep} from './physicsGuard';
import {runtime,resetRuntime} from './runtime';

type Failure=(owner:Simulation|null,error:unknown)=>void;
/** Install ownership protection before construction can create partial physics.
 * Failed worlds stay guarded until the Physics provider retires them. */
export function createSessionAuthority(world:RAPIER.World,rapier:typeof RAPIER,options:{seed:number;mode:Mode;room:string;experimentalPhysicalRubble?:boolean},onFailure:Failure):{sim:Simulation;dispose:()=>void}|null {
  let sim:Simulation|null=null,failed=false;
  const health={get physicsFailed(){return failed||sim?.physicsFailed===true;},latchPhysicsFailure(error:unknown){failed=true;sim?.latchPhysicsFailure(error);}};
  const release=guardOwnedWorldStep(world,health,error=>onFailure(sim,error));
  try{sim=new Simulation(world,options.seed,options.mode,options.room,rapier,{experimentalPhysicalRubble:options.experimentalPhysicalRubble===true});}catch(error){health.latchPhysicsFailure(error);onFailure(null,error);console.error('Arena initialization failed',error);return null;}
  const owner=sim;
  return{sim:owner,dispose:()=>{try{owner.dispose();}catch(error){health.latchPhysicsFailure(error);console.error('Arena ownership cleanup failed',error);}release();}};
}

export function advanceSessionAuthority(sim:Simulation,id:string,input:InputState,markSent:()=>void,onFailure:Failure):boolean {
  try{sim.setInput(id,input);markSent();sim.step(1/60,false);return true;}catch(error){sim.latchPhysicsFailure(error);onFailure(sim,error);return false;}
}

export function publishSessionAuthority(sim:Simulation,publish:(state:GameSnapshot)=>void,onFailure:Failure):boolean {
  try{publish(sim.snapshot());return true;}catch(error){sim.latchPhysicsFailure(error);onFailure(sim,error);return false;}
}

/** A direct scene unmount may not have gone through leaveGame. Fence the captured
 * owner and its transport before native disposal, without touching a later match. */
export function releaseSessionAuthority(sim:Simulation,generation:number,dispose:()=>void):void {
  if(runtime.generation===generation&&runtime.sim===sim)resetRuntime();
  dispose();
}

/** Fence native presentation reads and publication to this scene's captured arena.
 * A late failure poisons its captured owner; it may retire only the current arena. */
export function presentSessionCityAuthority(sim:Simulation,generation:number,context:{world:RAPIER.World;seed:number},presentation:Pick<import('./world/cityPresentation').CityPresentation,'push'|'present'>,onFailure:Failure):boolean {
  const current=()=>runtime.generation===generation&&runtime.sim===sim&&sim.world===context.world&&sim.seed===context.seed;
  if(!current())return false;
  try{
    const tick=sim.tick,time=sim.time,structures=sim.structures,cover=[...sim.cover.values()],rubble=sim.rubble;
    if(!current())return false;
    presentation.push(tick,time,structures,cover,rubble,sim.events,sim.experimentalPhysicalRubble);
    if(!current())return false;
    presentation.present(time);
    return current();
  }catch(error){sim.latchPhysicsFailure(error);if(current())onFailure(sim,error);return false;}
}

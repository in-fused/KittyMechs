import RAPIER from '@dimforge/rapier3d-compat';
import {Simulation} from '../../shared/simulation';
import {parseInput} from '../../shared/protocol';
import {guardOwnedWorldStep} from './physicsGuard';
import type {TrainingOptions145} from './trainingWorkerProtocol145';

/** DOM/runtime-free owner of one complete, ordinary training native world. */
export function createTrainingAuthority145(options:TrainingOptions145){
 const world=new RAPIER.World({x:0,y:-22,z:0});let sim:Simulation|null=null,failed=false,closed=false;
 const health={get physicsFailed(){return failed||sim?.physicsFailed===true;},latchPhysicsFailure(error:unknown){failed=true;sim?.latchPhysicsFailure(error);}};
 const release=guardOwnedWorldStep(world,health,error=>health.latchPhysicsFailure(error));
 function close(){if(closed)return;closed=true;const errors:unknown[]=[];for(const action of [()=>sim?.dispose(),release,()=>world.free()])try{action();}catch(error){errors.push(error);}if(errors.length)throw new AggregateError(errors,'Training worker native cleanup failed');}
 try{sim=new Simulation(world,options.seed,'training',options.room,RAPIER);sim.addActor(options.id,options.name,options.chassis);}catch(error){health.latchPhysicsFailure(error);try{close();}catch(cleanup){throw new AggregateError([error,cleanup],'Training worker construction/cleanup failed');}throw error;}
 const owner=sim;
 const guarded=<T>(action:()=>T):T=>{if(closed)throw Error('Training worker owner closed');try{return action();}catch(error){health.latchPhysicsFailure(error);throw error;}};
 return {sim:owner,input:(value:unknown)=>guarded(()=>{const input=parseInput(value);if(!input)throw Error('Invalid training worker input envelope');owner.setInput(options.id,input);}),step:()=>guarded(()=>owner.step(1/60)),snapshot:()=>guarded(()=>owner.snapshot()),close};
}

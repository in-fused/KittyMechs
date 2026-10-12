import {useGameStore} from '../state/store';
import {acceptSnapshot,runtime,resetRuntime} from './runtime';
import {createTrainingWorkerClient145} from './trainingWorkerClient145';
import {createCameraVisualStartup044} from './camera/visualRegistry';
import type {TrainingMetrics145} from './trainingWorkerProtocol145';
let active:{generation:number;close:()=>void}|null=null;
let diagnostic:{generation:number;status:string;visualReady:boolean;metrics:TrainingMetrics145|null;receivedWall:number}|null=null;
export function readTrainingWorker145(){return {mainAuthority:runtime.authority,mainSimulation:runtime.sim!==null,transport:runtime.transport,currentGeneration:runtime.generation,session:diagnostic?structuredClone(diagnostic):null};}
export function releaseTrainingSession145(generation:number){if(active?.generation===generation){if(runtime.generation===generation)resetRuntime();else active.close();}}
export function deployTrainingWorker145(onFailure:(error:unknown)=>void){
 const generation=runtime.generation,state=useGameStore.getState(),current=()=>runtime.generation===generation;
 let client:ReturnType<typeof createTrainingWorkerClient145>|undefined,worker:Worker|undefined,unsubscribe:(()=>void)|undefined,closed=false,visualReady=false,visualTimer:ReturnType<typeof setTimeout>|undefined;
 const started=createCameraVisualStartup044(runtime.localId,generation);
 function close(){if(closed)return;closed=true;if(diagnostic?.generation===generation)diagnostic.status='closed';const errors:unknown[]=[];for(const action of [()=>unsubscribe?.(),()=>window.removeEventListener('blur',blur),()=>{if(visualTimer!==undefined)clearTimeout(visualTimer);},()=>client?client.close():worker?.terminate()])try{action();}catch(error){errors.push(error);}if(active?.close===close)active=null;if(errors.length)throw new AggregateError(errors,'Training worker session cleanup failed');}
 const syncPause=()=>client?.pause(!visualReady||useGameStore.getState().phase!=='playing');
 function waitVisual(deadline:number){if(!current()||closed)return;if(started()){visualReady=true;if(diagnostic?.generation===generation){diagnostic.visualReady=true;diagnostic.status='running';}syncPause();return;}if(performance.now()>=deadline){try{close();}finally{onFailure(Error('Solo training visual owner did not initialize within20 seconds'));}return;}visualTimer=setTimeout(()=>waitVisual(deadline),50);}
 const blur=()=>{if(current()&&!closed&&useGameStore.getState().phase==='playing'){runtime.resetInput?.();useGameStore.setState({phase:'paused'});}};
 runtime.authority=false;runtime.sim=null;runtime.close=close;active={generation,close};
 diagnostic={generation,status:'initializing',visualReady:false,metrics:null,receivedWall:0};
 if(import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1')(window as Window&{__kittyTrainingWorker145?:typeof readTrainingWorker145}).__kittyTrainingWorker145=readTrainingWorker145;
 useGameStore.setState({phase:'loading',playerId:'local',connection:'Loading solo training…',invite:'',error:null,hud:null});
 try{worker=new Worker(new URL('./training.worker.ts',import.meta.url),{type:'module'});
  client=createTrainingWorkerClient145(worker,generation,{seed:runtime.seed,room:`TRAINING-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,id:runtime.localId,name:state.name,chassis:state.chassis},{current:()=>current()&&!closed,admit:acceptSnapshot,ready:()=>{if(current()&&!closed){if(diagnostic?.generation===generation)diagnostic.status='awaiting-visual';useGameStore.setState({phase:'playing',connection:'Solo training'});waitVisual(performance.now()+20000);}},metrics:m=>{if(diagnostic?.generation===generation){diagnostic.metrics=structuredClone(m);diagnostic.receivedWall=Date.now();}},failure:error=>{if(current()&&!closed){try{close();}finally{onFailure(error);}}}});
  if(closed){client.close();return;}
  runtime.sendInput=input=>client?.input(input)??false;
  unsubscribe=useGameStore.subscribe((next,previous)=>{if(current()&&!closed&&next.phase!==previous.phase)syncPause();});
  window.addEventListener('blur',blur);
 }catch(error){try{close();}finally{if(current())onFailure(error);}}
}

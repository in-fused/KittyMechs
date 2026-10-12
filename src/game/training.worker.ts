import RAPIER from '@dimforge/rapier3d-compat';
import {CHASSIS} from '../../shared/config';
import {INPUT_PROTOCOL_VERSION} from '../../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../../shared/layout';
import {createTrainingAuthority145} from './trainingAuthority145';
import {TrainingClock145,type TrainingRequest145,type TrainingReply145} from './trainingWorkerProtocol145';
let generation:number|null=null,closed=false,initializing=false,paused=true,owner:ReturnType<typeof createTrainingAuthority145>|null=null,timer:ReturnType<typeof setTimeout>|undefined,clock:TrainingClock145|null=null;
let completedTicks=0,totalStepMs=0,maxStepMs=0;const frames:{tick:number;time:number;stepMs:number}[]=[];
function metrics(){return {nativeTick:owner!.sim.tick,nativeTime:owner!.sim.time,actors:owner!.sim.actors.size,paused,workerWall:Date.now(),completedTicks,totalStepMs,maxStepMs,frames:frames.map(f=>({...f}))};}
const send=(message:TrainingReply145)=>self.postMessage(message);
function cleanup(){if(closed)return;closed=true;if(timer!==undefined)clearTimeout(timer);const owned=owner;owner=null;clock=null;owned?.close();}
function fail(error:unknown){const captured=generation;let message=String(error);try{cleanup();}catch(cleanupError){message+='; '+String(cleanupError);}if(captured!==null)send({kind:'failure',generation:captured,message});self.close();}
function pump(){if(closed||!owner||!clock||generation===null)return;try{const native=owner;clock.pump(performance.now(),()=>{const tick=native.sim.tick,at=performance.now();native.step();const stepMs=performance.now()-at;if(native.sim.tick!==tick){completedTicks++;totalStepMs+=stepMs;maxStepMs=Math.max(maxStepMs,stepMs);frames.push({tick:native.sim.tick,time:native.sim.time,stepMs});if(frames.length>240)frames.shift();}if(native.sim.tick%3===0)send({kind:'snapshot',generation:generation!,state:native.snapshot(),metrics:metrics()});});timer=setTimeout(pump,clock.wait());}catch(error){fail(error);}}
self.onmessage=async(event:MessageEvent<TrainingRequest145>)=>{
 const message=event.data;if(closed||!message||!Number.isSafeInteger(message.generation)||message.generation<0)return;
 if(message.kind==='start'){
  if(initializing||generation!==null){fail(Error('Duplicate training worker start'));return;}generation=message.generation;initializing=true;
  try{const o=message.options;if(message.inputVersion!==INPUT_PROTOCOL_VERSION||message.layoutVersion!==WORLD_LAYOUT_VERSION||!o||![7734,1926,4107].includes(o.seed)||typeof o.id!=='string'||!o.id.length||typeof o.room!=='string'||!o.room.length||o.room.length>64||typeof o.name!=='string'||!CHASSIS.includes(o.chassis))throw Error('Invalid training worker startup contract');
   await RAPIER.init();if(closed||generation!==message.generation)return;
   owner=createTrainingAuthority145(o);clock=new TrainingClock145(performance.now());clock.setPaused(paused,performance.now());send({kind:'ready',generation,state:owner.snapshot(),metrics:metrics()});pump();
  }catch(error){if(!closed)fail(error);}return;
 }
 if(message.generation!==generation)return;
 try{if(message.kind==='stop'){cleanup();self.close();}else if(message.kind==='pause'){paused=message.paused;clock?.setPaused(paused,performance.now());}else if(message.kind==='input'){if(!owner)throw Error('Input before native training readiness');owner.input(message.input);}}
 catch(error){fail(error);}
};

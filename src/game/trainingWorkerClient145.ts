import {INPUT_PROTOCOL_VERSION} from '../../shared/inputProtocol';
import {WORLD_LAYOUT_VERSION} from '../../shared/layout';
import type {GameSnapshot,InputState} from '../../shared/types';
import type {TrainingMetrics145,TrainingOptions145,TrainingReply145,TrainingRequest145} from './trainingWorkerProtocol145';
export interface WorkerPort145 {postMessage(message:TrainingRequest145):void;terminate():void;onmessage:((event:MessageEvent<TrainingReply145>)=>void)|null;onerror:((event:ErrorEvent)=>void)|null;onmessageerror:((event:MessageEvent)=>void)|null;}
export function createTrainingWorkerClient145(port:WorkerPort145,generation:number,options:TrainingOptions145,callbacks:{current:()=>boolean;admit:(state:GameSnapshot)=>boolean;ready:()=>void;failure:(error:unknown)=>void;metrics?:(metrics:TrainingMetrics145)=>void}){
 let closed=false,ready=false;const current=()=>!closed&&callbacks.current();
 function close(){if(closed)return;closed=true;clearTimeout(deadline);port.onmessage=port.onerror=port.onmessageerror=null;try{port.postMessage({kind:'stop',generation});}finally{port.terminate();}}
 function fail(error:unknown){if(!current())return;try{close();}finally{callbacks.failure(error);}}
 const deadline=setTimeout(()=>fail(Error('Solo training worker did not initialize within20 seconds')),20000);
 port.onmessage=event=>{if(!current()||event.data?.generation!==generation)return;try{const m=event.data;if(m.kind==='failure'){fail(Error(m.message));return;}if(m.kind!=='ready'&&m.kind!=='snapshot')throw Error('Invalid training worker reply');if(m.state.inputVersion!==INPUT_PROTOCOL_VERSION||m.state.worldLayoutVersion!==WORLD_LAYOUT_VERSION||m.state.mode!=='training'||m.state.room!==options.room||m.state.seed!==options.seed||!m.state.actors.some(a=>a.id===options.id))throw Error('Training worker snapshot identity mismatch');if(!ready&&m.kind!=='ready')throw Error('Training snapshot before readiness');if(!callbacks.admit(m.state))throw Error('Training worker snapshot failed admission');if(m.metrics)callbacks.metrics?.(m.metrics);if(!ready){ready=true;clearTimeout(deadline);callbacks.ready();}}catch(error){fail(error);}};
 port.onerror=event=>fail(Error(event.message||'Solo training worker failed'));port.onmessageerror=()=>fail(Error('Solo training worker message could not be decoded'));
 function post(message:TrainingRequest145){if(!current())return false;try{port.postMessage(message);return true;}catch(error){fail(error);return false;}}
 post({kind:'start',generation,options,inputVersion:INPUT_PROTOCOL_VERSION,layoutVersion:WORLD_LAYOUT_VERSION});
 return {close,input:(input:InputState)=>ready&&post({kind:'input',generation,input}),pause:(paused:boolean)=>post({kind:'pause',generation,paused})};
}

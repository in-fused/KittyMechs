import type { Simulation } from '../../shared/simulation';
import { emptyInput, type GameSnapshot, type InputState,type Vec3 } from '../../shared/types';
import { audio } from './audio';
import {admitStructuralSnapshot} from './snapshotAdmission';
import {beginNetworkReceipt,noteNetworkAdmission} from './networkReceipt';
export const cameraDiagnostics={position:{x:0,y:0,z:0},focus:{x:0,y:0,z:0},clear:true,violations:0,frameClock:0,visualFrameClock:-1,preferredDistance:0,fitDistance:0,fitProbes:0,visualCorners:0,fitAvailable:false,snapped:false};
export const runtime:{generation:number;admitInputSnapshot:((state:GameSnapshot)=>boolean)|null;resetInput:(()=>void)|null;reconcileInput:(()=>void)|null;snapshot:GameSnapshot|null;previous:GameSnapshot|null;receivedAt:number;input:InputState;sim:Simulation|null;localId:string;authority:boolean;transport:'training'|'peer-host'|'peer-guest'|'websocket';sendInput:((input:InputState)=>boolean)|null;broadcast:((state:GameSnapshot)=>void)|null;onSimReady:((sim:Simulation)=>void)|null;close:(()=>void)|null;clearRay:((from:Vec3,to:Vec3)=>boolean)|null;paused:boolean;seed:number}={generation:0,admitInputSnapshot:null,resetInput:null,reconcileInput:null,snapshot:null,previous:null,receivedAt:0,input:emptyInput(),sim:null,localId:'local',authority:true,transport:'training',sendInput:null,broadcast:null,onSimReady:null,close:null,clearRay:null,paused:false,seed:7734};
export function acceptSnapshot(state:GameSnapshot):boolean {const admitted=admitStructuralSnapshot(state,runtime.snapshot);if(!admitted){noteNetworkAdmission('schema',state?.tick,state?.time,performance.now());return false;}if(runtime.admitInputSnapshot&&!runtime.admitInputSnapshot(admitted)){noteNetworkAdmission('local-ack',state.tick,state.time,performance.now());return false;}runtime.previous=runtime.snapshot;runtime.snapshot=admitted;runtime.receivedAt=performance.now();noteNetworkAdmission('admitted',admitted.tick,admitted.time,runtime.receivedAt);runtime.reconcileInput?.();return true;}
export function resetRuntime():unknown[]{
  beginNetworkReceipt(false);
  const resetInput=runtime.resetInput,close=runtime.close,sim=runtime.sim;
  // Invalidate every publication/callback path before fallible native cleanup.
  runtime.generation++;runtime.resetInput=null;runtime.reconcileInput=null;runtime.close=null;runtime.sim=null;runtime.snapshot=null;runtime.previous=null;runtime.input=emptyInput();runtime.sendInput=null;runtime.broadcast=null;runtime.onSimReady=null;runtime.clearRay=null;runtime.authority=true;runtime.paused=false;runtime.localId='local';cameraDiagnostics.violations=0;cameraDiagnostics.clear=true;cameraDiagnostics.frameClock=cameraDiagnostics.preferredDistance=cameraDiagnostics.fitDistance=cameraDiagnostics.fitProbes=cameraDiagnostics.visualCorners=0;cameraDiagnostics.visualFrameClock=-1;cameraDiagnostics.fitAvailable=cameraDiagnostics.snapped=false;
  const errors:unknown[]=[];
  for(const cleanup of [resetInput,close,()=>{try{sim?.dispose();}catch(error){sim?.latchPhysicsFailure(error);throw error;}},()=>audio.resetRound()])try{cleanup?.();}catch(error){errors.push(error);}
  if(errors.length)console.error('Arena cleanup failed',...errors);
  return errors;
}

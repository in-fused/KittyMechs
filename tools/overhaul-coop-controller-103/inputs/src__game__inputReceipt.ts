import type {InputState} from '../../shared/types';
export interface AimObservation {lookPitch:number;lookYaw:number;cameraRay:{frameClock:number;yaw:number;pitch:number;targetDistance:number;reachable:boolean}|null;}
export interface SentInputReceipt {input:InputState;at:number;source:'frame'|'reset'|'authority';generation:number;localId:string;aim?:AimObservation;}
export function createInputReceipt(){return {enabled:false,history:[] as SentInputReceipt[],strikeHistory:[] as SentInputReceipt[]};}
const detach=(row:SentInputReceipt):SentInputReceipt=>({...row,input:{...row.input,...(row.input.stanceRequest?{stanceRequest:{...row.input.stanceRequest}}:{})},...(row.aim?{aim:{...row.aim,cameraRay:row.aim.cameraRay?{...row.aim.cameraRay}:null}}:{})});
export function recordSentInput(store:ReturnType<typeof createInputReceipt>,input:InputState,at:number,source:SentInputReceipt['source'],generation:number,localId:string,aim?:AimObservation){
  if(!store.enabled)return;
  if(store.history.length===32)store.history.shift();
  // readInput mutates the same object on the next frame. Preserve the actual
  // successful send, including blur cancellation, before that mutation.
  const row=detach({input,at,source,generation,localId,aim});store.history.push(row);
  // Preserve the first actual send for each life/action across frame-ring eviction.
  if(input.strike&&!store.strikeHistory.some(r=>r.generation===generation&&r.localId===localId&&r.input.strikeEpoch===input.strikeEpoch&&r.input.strikeId===input.strikeId)){
    if(store.strikeHistory.length===16)store.strikeHistory.shift();store.strikeHistory.push(detach(row));
  }
}
export function readSentInputs(store:ReturnType<typeof createInputReceipt>){return store.history.map(detach);}
export function readSentStrikes(store:ReturnType<typeof createInputReceipt>){return store.strikeHistory.map(detach);}

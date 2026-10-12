/** Bound render-thread catch-up, keeping Rapier's existing fixed 1/60 accumulator.
 * Overloaded offline games advance more slowly than wall time; no native tick,
 * actor, input or collision query is skipped within the admitted interval. */
export const LOCAL_FRAME_CAP043=2/60;
export function advanceLocalPhysics043(delta:number,paused:boolean,step:(delta:number)=>void){
  if(!Number.isFinite(delta))throw Error('Invalid local physics frame delta');
  const wallDelta=Math.max(0,delta),admitted=paused?0:Math.min(wallDelta,LOCAL_FRAME_CAP043);
  if(!paused&&admitted>0)step(admitted);
  return {wallDelta,admitted,droppedWallTime:paused?0:wallDelta-admitted,paused};
}
type Frame043=ReturnType<typeof advanceLocalPhysics043>&{generation:number;tick:number;steps:number;physicsMs:number;simulationMs:number;providerOtherMs:number;stages:Record<string,number>};
const frames:Frame043[]=[];
let generation=-1,totalFrames=0,droppedWallTime=0;
export function resetLocalTiming043(nextGeneration:number){generation=nextGeneration;frames.length=0;totalFrames=0;droppedWallTime=0;}
export function recordLocalTiming043(frame:Frame043){if(frame.generation!==generation)return;totalFrames++;droppedWallTime+=frame.droppedWallTime;frames.push({...frame,stages:{...frame.stages}});if(frames.length>240)frames.shift();}
export function readLocalTiming043(){return {generation,totalFrames,droppedWallTime,capacity:240,intervalMeaning:'physicsMs includes local simulation and provider native world stepping; providerOtherMs is their difference, including provider bookkeeping',frames:frames.map(frame=>({...frame,stages:{...frame.stages}}))};}

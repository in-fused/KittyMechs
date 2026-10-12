export interface DeploymentReady211 {localId:string;generation:number;ready:boolean}
export function readinessTransition211(previous:DeploymentReady211|null,localId:string,generation:number,visualCompleted:boolean):DeploymentReady211{
  const ready=localId.length>0&&Number.isInteger(generation)&&generation>=0&&visualCompleted;
  return previous?.localId===localId&&previous.generation===generation&&previous.ready===ready?previous:{localId,generation,ready};
}
/** A remote NPC's global loading activity cannot revoke a completed local
 * deployment. A previous player/generation cannot qualify a new deployment. */
export function deploymentBlocks211(state:DeploymentReady211,localId:string,generation:number){return !state.ready||state.localId!==localId||state.generation!==generation;}
interface ReadinessObservation211 {at:number;localId:string;generation:number;scene:DeploymentReady211;blocked:boolean;manager:{active:boolean;progress:number;item:string;loaded:number;total:number;errors:string[]}}
declare global {interface Window {__deploymentReadiness211?:{scope:string;rows:ReadinessObservation211[]}}}
/** Private candidate observation only; no input, native or loading mutation. */
export function observeReadiness211(scene:DeploymentReady211,localId:string,generation:number,manager:ReadinessObservation211['manager']){
  const owner=window.__deploymentReadiness211??(window.__deploymentReadiness211={scope:'LOCAL_VISUAL_READINESS_NOT_GAMEPLAY_OR_PERFORMANCE_ACCEPTANCE',rows:[]});
  owner.rows.push({at:performance.now(),localId,generation,scene:{...scene},blocked:deploymentBlocks211(scene,localId,generation),manager:{...manager,errors:[...manager.errors]}});
  if(owner.rows.length>240)owner.rows.shift();
}

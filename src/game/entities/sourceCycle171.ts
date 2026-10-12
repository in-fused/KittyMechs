import type {AnimationAction} from 'three';
import {validateAuthoredGait123,type AuthoredGait123} from './authoredFootfalls123';
import {sourceCyclePhase164} from './sourceCoordination164';

/** The distance phase is a canonical hind event. Sample the actual exported
 * key interval, never phase*full duration and never a free-running gait clock. */
export function sourceGaitTime171(name:string,gait:AuthoredGait123,phase:number):number{
 validateAuthoredGait123(name,gait);
 if(!Number.isFinite(phase)||phase<0||phase>=1)throw Error('171_INVALID_CANONICAL_DISTANCE_PHASE:'+name);
 const start=Math.fround(gait.cycleStart!),end=Math.fround(gait.cycleEnd!);
 return start+sourceCyclePhase164(phase,gait)*(end-start);
}
export function sampleSourceGait171(name:string,action:AnimationAction,gait:AuthoredGait123,phase:number):void{
 const time=sourceGaitTime171(name,gait,phase);
 if(Math.fround(gait.cycleEnd!)>action.getClip().duration)throw Error('171_AUTHORED_CYCLE_EXCEEDS_LOADED_CLIP:'+name);
 action.enabled=true;action.paused=true;action.time=time;
}
/** Final positive weights are authoritative, including arbitrarily small fade
 * contributors and reaction/air/traversal residuals. This changes no weights,
 * phase, distance integration or non-gait action time. Call BEFORE mixer update. */
export function synchronizeSourceCycles171(actions:Iterable<readonly[string,AnimationAction]>,catalog:Record<string,{measuredGait?:AuthoredGait123}|undefined>,phase:number):void{
 for(const [name,action] of actions){const gait=catalog[name]?.measuredGait;if(action.getEffectiveWeight()>0&&gait?.sourceOffsets)sampleSourceGait171(name,action,gait,phase);}
}

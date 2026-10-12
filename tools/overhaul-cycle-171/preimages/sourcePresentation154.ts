import type {AnimationAction,Bone} from 'three';
import {Vector3} from 'three';
import type {ActorState} from '../../../shared/types';
import {STANCE_TRANSITION} from '../../../shared/config';
import {selectedGaits143} from './locomotionTasks143';
import {selectedFootfalls123,type AuthoredGait123} from './authoredFootfalls123';
import {sourceCyclePhase164} from './sourceCoordination164';

export const SOURCE_POLICY154='CONTACT_UNQUALIFIED_SOURCE_PRESENTATION' as const;
export type SourceStatus154='source'|'temporary-standard'|'fatal-binding';
/** Only named, expected missing action capabilities are recoverable. Asset or
 * unexpected execution failures never enter this classifier. */
export function unsupportedSourceAction154(state:ActorState,time:number,peerSelected:boolean):string|null{
 const movingR=time-state.stanceChangedAt<STANCE_TRANSITION,up=state.stance==='upright';
 if(state.climb)return 'UNSUPPORTED_SURFACE_ALIGNED_CLIMB';
 const pair=state.pair?.life===state.jumpEpoch?state.pair:null;
 if(pair&&(pair.style!=='quadruped'||pair.opponent!=='pounce'||!peerSelected||movingR))return 'UNSUPPORTED_PAIR_RIG_OR_STANCE';
 if((state.downed||state.hp<=0)&&(up||movingR))return 'MISSING_ACTUAL_UPRIGHT_DOWN_DEATH';
 if(state.strike&&!pair&&(up||movingR||state.strike.kind!=='pounce'))return 'UNSUPPORTED_UNPAIRED_STRIKE';
 return null;
}
export type SourceCatalog154=Record<string,{measuredGait?:AuthoredGait123}|undefined>;
/** Exactly one distance integration and one source clip clock owner. No IK,
 * body correction, support query or contact diagnostic is produced here. */
export function advanceSourceTravel154(actions:Iterable<readonly[string,AnimationAction]>,catalog:SourceCatalog154,speed:number,topSpeed:number,stance:number,phase:number,signedDistance:number):number{
 const selected=selectedGaits143(speed,topSpeed,stance),map=new Map(actions);let stride=0;
 for(const c of selected){const gait=catalog[c.name]?.measuredGait;if(!gait||!map.has(c.name))throw Error('154_MISSING_ACTUAL_SELECTED_GAIT:'+c.name);stride+=gait.nativeDistancePerCycle*c.weight;}
 if(!Number.isFinite(stride)||stride<=0||!Number.isFinite(signedDistance))throw Error('154_INVALID_ACTUAL_TRAVEL');
 phase=((phase+signedDistance/stride)%1+1)%1;
 for(const c of selected){const g=catalog[c.name]!.measuredGait!,a=map.get(c.name)!;a.enabled=true;a.paused=true;a.time=Math.fround(g.cycleStart!)+sourceCyclePhase164(phase,g)*(Math.fround(g.cycleEnd!)-Math.fround(g.cycleStart!));a.setEffectiveWeight(c.weight);}
 return phase;
}
export function sourcePose154(actions:Iterable<readonly[string,AnimationAction]>,catalog:SourceCatalog154,phase:number,limbs:readonly {upper:Bone;lower:Bone;paw:Bone}[],status:SourceStatus154='source'){
 const selected=[...actions].filter(([,a])=>a.getEffectiveWeight()>0),point=new Vector3();
 return {policy:SOURCE_POLICY154,status,phase,contactQualified:false as const,clips:selected.map(([name,a])=>({name,time:a.time,weight:a.getEffectiveWeight()})),footfalls:selectedFootfalls123(selected,catalog),markerProvenance:'CURRENT_SOURCE_FK_JOINT_PIVOTS_NO_SKIN_OR_CONTACT_CERTIFICATE' as const,paws:limbs.map(l=>({limb:l.upper.name.slice(0,2),upper:l.upper.getWorldPosition(point).toArray(),lower:l.lower.getWorldPosition(point).toArray(),paw:l.paw.getWorldPosition(point).toArray()}))};
}

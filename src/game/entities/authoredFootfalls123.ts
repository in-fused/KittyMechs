import type {AnimationAction} from 'three';
export const FOOT_LIMBS123=['FL','FR','HL','HR'] as const;
export type FootLimb123=typeof FOOT_LIMBS123[number];
export interface AuthoredGait123 {nativeDistancePerCycle:number;cycleStart?:number;cycleEnd?:number;sourceDuty?:number;sourceOffsets?:Record<FootLimb123,number>;unloadedLimbs?:readonly string[];}
export interface FootfallContributor123 {name:string;weight:number;phase:number|null;gait:AuthoredGait123|null;}
export const AUTHORED_GAITS123=['FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride'] as const;

export function validateAuthoredGait123(name:string,gait:AuthoredGait123|undefined):void{
 if(!gait||!Number.isFinite(gait.nativeDistancePerCycle)||gait.nativeDistancePerCycle<=0||gait.cycleStart===undefined||gait.cycleEnd===undefined||!Number.isFinite(gait.cycleStart)||!Number.isFinite(gait.cycleEnd)||gait.cycleStart<0||gait.cycleEnd<=gait.cycleStart||gait.sourceDuty===undefined||!Number.isFinite(gait.sourceDuty)||gait.sourceDuty<=0||gait.sourceDuty>=1||!gait.sourceOffsets||FOOT_LIMBS123.some(n=>!Number.isFinite(gait.sourceOffsets![n])||gait.sourceOffsets![n]<0||gait.sourceOffsets![n]>=1))throw new Error('123_INVALID_AUTHORED_FOOTFALL:'+name);
 const unloaded=gait.unloadedLimbs;
 if(!unloaded||new Set(unloaded).size!==unloaded.length||unloaded.some(n=>!FOOT_LIMBS123.includes(n as FootLimb123)))throw new Error('123_INVALID_UNLOADED_LIMBS:'+name);
 const upright=name==='FelineUprightWalkLong'||name==='FelineUprightStride';
 if(upright?(unloaded.length!==2||!unloaded.includes('FL')||!unloaded.includes('FR')):unloaded.length!==0)throw new Error('123_AUTHORED_LOAD_CONTRACT:'+name);
}

/** Read actual mixer-selected time/weight; no dominant-clip or stance guess.
 * Unknown positive whole-body actions own their source pose without foot IK.
 * The previously validated neutral additive Arc106 is the sole exemption. */
export function selectedFootfalls123(actions:Iterable<readonly [string,AnimationAction]>,catalog:Record<string,{measuredGait?:AuthoredGait123}|undefined>):FootfallContributor123[]{
 const contributors:FootfallContributor123[]=[];
 for(const [name,action] of actions){
  const weight=action.getEffectiveWeight();if(weight===0)continue;
  if(!Number.isFinite(weight)||weight<0)throw new Error('123_INVALID_SELECTED_WEIGHT:'+name);
  if(name==='FelineTransitionArc106')continue;
  const gait=catalog[name]?.measuredGait;
  if(!gait?.sourceOffsets){contributors.push({name,weight,phase:null,gait:null});continue;}
  validateAuthoredGait123(name,gait);
  const start=Math.fround(gait.cycleStart!),end=Math.fround(gait.cycleEnd!),phase=(action.time-start)/(end-start);
  if(!Number.isFinite(phase)||action.time<start||action.time>end)throw new Error('123_SELECTED_GAIT_OUTSIDE_AUTHORED_CYCLE:'+name);
  contributors.push({name,weight,phase,gait});
 }
 return contributors;
}

export function authoredFootPolicy123(limb:FootLimb123,contributors:readonly FootfallContributor123[]):'stance'|'swing'|'unloaded'|'source-only'{
 let present=false,swing=false,unloaded=false,unknown=false;
 for(const c of contributors){
  if(c.weight===0)continue;present=true;
  if(!Number.isFinite(c.weight)||c.weight<0||c.phase===null||!c.gait){unknown=true;continue;}
  if(c.gait.unloadedLimbs?.includes(limb)){unloaded=true;continue;}
  const offset=c.gait.sourceOffsets?.[limb],duty=c.gait.sourceDuty;
  if(offset===undefined||duty===undefined||!Number.isFinite(c.phase)){unknown=true;continue;}
  const phase=((c.phase+offset)%1+1)%1;
  if(phase>=duty)swing=true;
 }
 return unloaded?'unloaded':unknown||!present?'source-only':swing?'swing':'stance';
}

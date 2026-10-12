import {AnimationClip,AnimationUtils} from 'three';

export interface MovingRecoilContract050 {sourceModelSHA256:string;clips:Record<string,{duration:number;sourceTimeOrigin:number;sourceTimeEnd:number;sourceClockSpan:number;channels:number;targets:string[];idleReference:string;referenceQuaternionXYZW:number[]}>}
export const MOVING_RECOIL_NAMES050=['FelinePulseMoving048','FelineMissileMoving048','FelineUprightPulseMoving048','FelineUprightMissileMoving048'] as const;

/** Actual authored terminal-head rotations, converted relative to actual034
 * stance Idle by Three, then mixed by the existing sole skeletal owner. */
export function prepareMovingRecoil050(clips:AnimationClip[],references:AnimationClip[],contract:MovingRecoilContract050){
 const result:AnimationClip[]=[],errors:string[]=[];
 for(const name of MOVING_RECOIL_NAMES050){
  const source=clips.find(c=>c.name===name),record=contract.clips[name],reference=references.find(c=>c.name===record?.idleReference);
  const track=source?.tracks[0],idle=reference?.tracks.find(t=>t.name==='head.quaternion');
  if(!source||!record||!reference||source.tracks.length!==1||record.channels!==1||record.targets.join(',')!=='head.quaternion'||track?.name!=='head.quaternion'||track.ValueTypeName!=='quaternion'||!idle||idle.ValueTypeName!=='quaternion'||!Number.isFinite(source.duration)||!Number.isFinite(record.sourceTimeOrigin)||!Number.isFinite(record.sourceTimeEnd)||!Number.isFinite(record.duration)||!Number.isFinite(record.sourceClockSpan)||record.duration<=0||Math.abs(record.sourceTimeEnd-record.sourceTimeOrigin-record.duration)>1e-6||Math.abs(source.duration-record.sourceTimeEnd)>1e-6||Math.abs(record.sourceClockSpan-record.duration)>1e-6||Math.abs(track.times[0]-record.sourceTimeOrigin)>1e-6||Math.abs(track.times[track.times.length-1]-record.sourceTimeEnd)>1e-6){errors.push(name+':ACTUAL_EXPORT_TRACK_CONTRACT');continue;}
  const referenceValues=record.referenceQuaternionXYZW;
  const distance=(values:ArrayLike<number>,offset=0)=>Math.min(...[1,-1].map(sign=>Math.max(...referenceValues.map((value,i)=>Math.abs(values[offset+i]-sign*value)))));
  if(referenceValues.length!==4||distance(idle.values)>=1e-5||distance(track.values)>=1e-5||distance(track.values,track.values.length-4)>=1e-5||Array.from(track.values).some(v=>!Number.isFinite(v))){errors.push(name+':ACTUAL_IDLE_REFERENCE_BASIS');continue;}
  let motion=0;for(let i=0;i<track.values.length;i+=4)motion=Math.max(motion,distance(track.values,i));
  if(motion<=.035){errors.push(name+':NONCONSTANT_AUTHORED_RECOIL_REQUIRED');continue;}
  const mapped=track.clone();mapped.shift(-record.sourceTimeOrigin);
  const additive=new AnimationClip(source.name,record.duration,[mapped]);AnimationUtils.makeClipAdditive(additive,0,reference,60);result.push(additive);
 }
 if(clips.length!==MOVING_RECOIL_NAMES050.length)errors.push('050:EXACT_FOUR_SOURCE_CLIPS_REQUIRED');
 return {clips:result,errors};
}

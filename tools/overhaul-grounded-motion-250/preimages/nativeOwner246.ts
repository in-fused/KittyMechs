import {Bone,Group,Object3D,Vector3,type AnimationClip} from 'three';
import {ACTOR_HEIGHT,MECHS,STANCE_TRANSITION} from '../../shared/config';
import {pairClipName} from '../../shared/pairedCombat';
import type {RenderActorFrame} from '../../src/game/entities/renderTimeline';
import {selectedGaits143} from '../../src/game/entities/locomotionTasks143';
import {validateAuthoredGait123} from '../../src/game/entities/authoredFootfalls123';
import {unsupportedSourceAction154} from '../../src/game/entities/sourcePresentation154';
import {refreshSkinPose098} from '../../src/game/entities/movingRFfeet067';
import {SourceTask202} from '../overhaul-anatomy-motion-202/sourceTask202';
import {sourceGaitTime171} from '../../src/game/entities/sourceCycle171';
import {nativeBasis218} from '../overhaul-native-integration-222/nativeBasis218';
import {observeContact246} from '../overhaul-grounded-motion-246/contactObservation246';
import type {GroundSupport067} from '../../src/game/entities/groundSupport067';

export type Status214='source'|'temporary-standard'|'fatal-binding'|'disposed';
type Item214={name:string;weight:number};
export interface Contract214 {
 publicURL:string;sha256:string;scale:number;expectedPrimitives:4;
 bones:{name:string;parent:string;position:number[];quaternion:number[];scale:number[]}[];
 clips:Record<string,{duration:number;tracks:{name:string;keys:number;first:number;last:number;interpolation?:number}[];measuredGait?:any}>;
}
const wrap214=(n:number)=>n-Math.floor(n);
const ordinary214=new Set(['FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride','FelineTransitionArc106']);
const recoverable214=/^Error: 202_(SOURCE_TASK_UNREACHABLE|SOURCE_POLE_DEGENERATE|FORE_ELBOW_WRONG_HEMISPHERE)/;
/** Private integration proposal: exclusive source-task/complete-action owners.
 * Source plane calibration is not native support or planted material contact. */
export class NativeOwner218 {
 createContactObservation246(support:GroundSupport067){return this.task?observeContact246(this.model,this.task.soles,support,this.diagnostic):null;}
 readonly diagnostic:any;
 private task:SourceTask202|null=null;
 private completeClips=new Map<string,AnimationClip>();
 private rest=new Map<Bone,{p:Vector3;q:Bone['quaternion'];s:Vector3}>();
 private phase=0;private life=-1;private generation=-1;private yaw:number|null=null;
 private previous:Vector3|null=null;private idleTime=0;private travelWeight=0;private previousItems:Item214[]=[];
 private grounded=true;private landingAt=-Infinity;private blockedKey:string|null=null;private lastSpeed=0;private turnPhase=0;
 constructor(readonly model:Object3D,clips:AnimationClip[],readonly contract:Contract214,actor:string){
  this.diagnostic={actor,assetSHA256:contract.sha256,status:'source' as Status214,mode:'initial',generation:-1,life:-1,frameClock:0,renderTime:0,phase:0,stance:0,visualYaw:0,contactQualified:false,policy:'PHASE_CONDITIONED_SOURCE_TASKS_NOT_NATIVE_CONTACT',firstFailure:null,fatal:null,currentReason:null,browserClipContract:{expected:45,loaded:clips.length,passed:false},sourceTasks:null,activeClips:[],placement:null,costMs:0,maxCostMs:0};
  try{
   const actual=new Map(clips.map(c=>[c.name,c]));
   if(clips.length!==45||actual.size!==45||Object.keys(contract.clips).length!==45||contract.bones.length!==61||contract.expectedPrimitives!==4||contract.scale!==.8)throw Error('214_61_45_4_SCALE_CONTRACT');
   let primitives=0;model.traverse((o:any)=>{if(o.isSkinnedMesh)primitives+=Array.isArray(o.material)?o.geometry.groups.length:1;});if(primitives!==4)throw Error('214_ACTUAL_PRIMITIVE_COUNT');
   for(const b of contract.bones){const bone=model.getObjectByName(b.name);if(!(bone instanceof Bone)||bone.parent?.name!==b.parent||bone.position.toArray().some((v,i)=>v!==b.position[i])||bone.quaternion.toArray().some((v,i)=>v!==b.quaternion[i])||bone.scale.toArray().some((v,i)=>v!==b.scale[i]))throw Error('214_ACTUAL_REST_PARENT:'+b.name);this.rest.set(bone,{p:bone.position.clone(),q:bone.quaternion.clone(),s:bone.scale.clone()});}
   model.traverse(o=>{if(o instanceof Bone&&!this.rest.has(o))throw Error('214_UNDECLARED_BONE:'+o.name);});
   for(const [name,c] of Object.entries(contract.clips)){
    const clip=actual.get(name);if(!clip||clip.duration!==c.duration||clip.tracks.length!==c.tracks.length)throw Error('214_ACTUAL_CLIP_CONTRACT:'+name);
    for(let i=0;i<c.tracks.length;i++){const a=clip.tracks[i],b=c.tracks[i];if(a.name!==b.name||a.times.length!==b.keys||a.times[0]!==b.first||a.times.at(-1)!==b.last||(b.interpolation!==undefined&&a.getInterpolation()!==b.interpolation)||!Array.from(a.times).every(Number.isFinite)||!Array.from(a.values).every(Number.isFinite))throw Error('214_ACTUAL_TRACK_CONTRACT:'+name+':'+a.name);}
    if(c.measuredGait)validateAuthoredGait123(name,c.measuredGait);
    if(!ordinary214.has(name))this.completeClips.set(name,clip);
   }
   if(this.completeClips.size!==39)throw Error('214_COMPLETE39');
   this.task=new SourceTask202(model,clips,contract.clips);this.diagnostic.browserClipContract.passed=true;
  }catch(e){this.fail(e,0,'binding',true);}
 }
 private fail(e:unknown,time:number,mode:string,fatal:boolean){
  const observation={reason:String(e),time,mode,operands:(e as any)?.operands??null};
  this.diagnostic.firstFailure??=observation;this.diagnostic.currentReason=observation.reason;
  this.diagnostic.status=fatal?'fatal-binding':'temporary-standard';if(fatal)this.diagnostic.fatal??=observation;
  this.diagnostic.sourceTasks=null;this.diagnostic.activeClips=[];
 }
 private reset(generation:number,life:number,yaw:number){this.phase=this.turnPhase=0;this.lastSpeed=0;this.yaw=yaw;this.previous=null;this.travelWeight=0;this.previousItems=[];this.landingAt=-Infinity;this.idleTime=0;this.blockedKey=null;this.generation=generation;this.life=life;}
 private complete(name:string,fraction:number,time?:number){
  const clip=this.completeClips.get(name);if(!clip)throw Error('214_MISSING_COMPLETE_ACTION:'+name);
  const clock=Math.max(0,Math.min(clip.duration,time??fraction*clip.duration));
  // Exact already-qualified private complete graph copies ALL61 transforms.
  // A second mixer bound to the procedural model would skip unchanged values
  // via PropertyMixer.apply(), allowing prior task transforms to leak.
  // SourceTask's paused graph update(0) honors its explicit endpoint clock;
  // Three AnimationAction._updateTime returns assigned time at deltaTime0.
  this.task!.completeAction202(name,clock);
  this.diagnostic.activeClips=[{name,time:clock,weight:1}];this.diagnostic.sourceTasks=null;
 }
 step(p:RenderActorFrame,frameClock:number,dt:number,root:Group,body:Group,peerCompatible:boolean,generation:number,confirmedTime:number){
  if(this.diagnostic.status==='disposed'||this.diagnostic.fatal)return;
  const start=performance.now(),s=p.state,t=p.time,reset=p.reset||generation!==this.generation||s.jumpEpoch!==this.life;
  if(reset)this.reset(generation,s.jumpEpoch,p.yaw);
  const n=s.nativePose,basis=nativeBasis218(p,confirmedTime),offset=basis.offset;
  Object.assign(this.diagnostic,{frameClock,renderTime:t,generation,life:s.jumpEpoch,nativeTick:n?.tick??null,placement:{offsetY:offset,...basis,globalMountCorrection:0,sourcePlaneIsAuthorityGround:false}});
  if(!Number.isFinite(offset)||Math.abs(offset)>10){this.fail(Error('214_INVALID_NATIVE_BASIS'),t,'basis',true);root.visible=false;return;}
  root.position.set(p.position.x,p.position.y+offset,p.position.z);root.rotation.set(0,p.yaw,0);
  const age=Math.max(0,t-s.stanceChangedAt),u=Math.min(1,age/STANCE_TRANSITION),stance=s.stance==='upright'?u:1-u,up=s.stance==='upright',speed=dt>0?p.distance/dt:0;
  const reason=unsupportedSourceAction154({...s,climb:p.climb,strike:p.strike},t,peerCompatible);
  if(reason){this.fail(Error(reason),t,'unsupported-action',false);root.visible=false;this.previous=null;this.grounded=p.grounded;return;}
  let complete:{name:string;fraction:number;time?:number}|null=null,mode='ordinary';
  const pair=s.pair&&s.pair.life===s.jumpEpoch?s.pair:null;
  if(s.downed){mode='down';complete={name:'FelineDown',fraction:(t-s.downed.at)/this.contract.clips.FelineDown.duration};}
  else if(s.hp<=0){mode='death';complete={name:'FelineDeath',fraction:(t-s.diedAt)/this.contract.clips.FelineDeath.duration};}
  else if(pair){mode='pair';const name=pairClipName(pair,t),at=Math.max(0,t-(name.includes('Claw')?pair.comboAt:pair.phaseAt));complete={name,fraction:name.includes('Claw')?at/.24:pair.phase==='pin'?wrap214(at/this.contract.clips[name].duration):at/Math.max(.001,pair.endsAt-pair.phaseAt)};}
  else if(!p.grounded){mode='air';complete={name:up?'FelineUprightAir':'FelineAir',fraction:p.velocity.y<0?.8:.35};}
  else if(p.strike){mode='strike';complete={name:p.strike.stage==='flight'?'FelineRearLaunch':'FelineLandingRecovery',fraction:(t-p.strike.stageAt)/Math.max(.001,p.strike.endsAt-p.strike.stageAt)};}
  else{
   if(!this.grounded)this.landingAt=t;
   const landingAge=t-this.landingAt;
   if(landingAge>=0&&landingAge<(up?.18:this.contract.clips.FelineLandingRecovery.duration)){
    // No upright landing semantic exists. Complete standard rig owns it.
    if(up){this.fail(Error('214_UPRIGHT_LANDING_COMPLETE_STANDARD'),t,'landing',false);root.visible=false;this.grounded=true;return;}
    mode='landing';complete={name:'FelineLandingRecovery',fraction:landingAge/this.contract.clips.FelineLandingRecovery.duration};
   }
   if(speed<=.08||mode==='landing')for(const [at,suffix] of [[s.pulseAt,'Pulse'],[s.rocketAt,'Missile'],[s.hurtAt,'Hit']] as const){const name=(up?'FelineUpright':'Feline')+suffix,duration=this.contract.clips[name].duration;if(at>=0&&t>=at&&t-at<duration){mode='reaction';complete={name,fraction:(t-at)/duration};break;}}
   if(!complete&&age>=STANCE_TRANSITION&&speed<=.08&&Math.abs(p.angularDistance)>.0001){this.turnPhase=wrap214(this.turnPhase+Math.abs(p.angularDistance)/(Math.PI/2));mode='turn';complete={name:(up?'FelineUpright':'Feline')+(p.angularDistance>0?'TurnLeft':'TurnRight'),fraction:this.turnPhase};}
  }
  this.grounded=p.grounded;
  // Camera/weapon/native facing remain authority facing. Only ordinary art has
  // the retained actual Turn clip's yaw-rate budget. Complete actions snap to
  // native facing: this cross-owner discontinuity is explicit, not qualified.
  if(complete)this.yaw=p.yaw;
  else{const delta=Math.atan2(Math.sin(p.yaw-this.yaw!),Math.cos(p.yaw-this.yaw!)),turn=this.contract.clips[delta>=0?'FelineTurnLeft':'FelineTurnRight'].duration,limit=(Math.PI/2)/turn*Math.max(0,dt);this.yaw!+=Math.max(-limit,Math.min(limit,delta));}
  body.position.set(0,0,0);body.rotation.set(0,Math.PI+this.yaw!-p.yaw,0);body.scale.setScalar(this.contract.scale);root.updateWorldMatrix(true,true);refreshSkinPose098(this.model);
  const dx=this.previous?p.position.x-this.previous.x:0,dz=this.previous?p.position.z-this.previous.z:0,projection=-dx*Math.sin(this.yaw!)-dz*Math.cos(this.yaw!);
  if(!this.previous)this.previous=new Vector3();this.previous.set(p.position.x,p.position.y,p.position.z);
  const items=selectedGaits143(speed,MECHS.pounce.speed,stance),stride=items.reduce((v,x)=>v+x.weight*this.contract.clips[x.name].measuredGait.nativeDistancePerCycle,0);
  if(!complete&&p.distance>0&&stride>0)this.phase=wrap214(this.phase+(projection<0?-p.distance:p.distance)/stride);
  this.idleTime+=Math.max(0,dt);
  // Advance accepted control clocks/blends before a rejected-pose retry check.
  // Zero-distance idle/stop evolution can recover; exactly unchanged desired
  // source input remains blocked without re-executing the failed chain solve.
  const moving=speed>.08;if(!complete&&moving)this.lastSpeed=speed;
  const sourceItems=moving?items:this.previousItems.length?selectedGaits143(this.lastSpeed,MECHS.pounce.speed,stance):[];
  const recovery=sourceItems.reduce((v,x)=>{const g=this.contract.clips[x.name].measuredGait;return v+x.weight*(g.cycleEnd-g.cycleStart)*(1-g.sourceDuty);},0);
  if(!complete){this.travelWeight=Math.max(0,Math.min(1,this.travelWeight+(moving?1:-1)*(recovery>0?dt/recovery:1)));if(moving)this.previousItems=items;}
  const clocks=Object.fromEntries(['FelineIdle','FelineUprightIdle'].map(name=>{const c=this.contract.clips[name],first=Math.min(...c.tracks.map(a=>a.first)),last=Math.max(...c.tracks.map(a=>a.last));return [name,first+wrap214(this.idleTime/(last-first))*(last-first)];}));
  const desiredInputs={mode,phase:this.phase,stance,life:s.jumpEpoch,generation,sourceItems,travelWeight:this.travelWeight,idleClocks:clocks,bodyFrame:body.matrixWorld.toArray(),complete};
  Object.assign(this.diagnostic,{frameClock,renderTime:t,generation,life:s.jumpEpoch,nativeTick:n?.tick??null,stance,speed,phase:this.phase,visualYaw:this.yaw,mode,desiredInputs,placement:{offsetY:offset,...basis,nativeShape:n?.shape??null,globalMountCorrection:0,sourcePlaneIsAuthorityGround:false}});
  const retryKey=JSON.stringify(desiredInputs);
  if(this.blockedKey===retryKey){root.visible=false;return;}
  this.diagnostic.status='source';this.diagnostic.currentReason=null;
  try{
   if(complete)this.complete(complete.name,complete.fraction,complete.time);
   else{
    this.diagnostic.sourceTasks=this.task!.step(sourceItems,this.phase,stance,this.travelWeight,clocks);
    this.diagnostic.activeClips=this.diagnostic.sourceTasks.positive.map((a:any)=>({...a,time:this.contract.clips[a.name].measuredGait?sourceGaitTime171(a.name,this.contract.clips[a.name].measuredGait,this.phase):clocks[a.name]}));
   }
   if([...this.rest.keys()].some(b=>![...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()].every(Number.isFinite)||Math.abs(b.quaternion.length()-1)>2e-5))throw Error('214_NONFINITE_FINAL_POSE');
   refreshSkinPose098(this.model);this.blockedKey=null;root.visible=s.hp>0||!!s.downed||t-s.diedAt<3;
  }catch(e){const recoverable=recoverable214.test(String(e));this.fail(e,t,mode,!recoverable);if(recoverable)this.blockedKey=retryKey;root.visible=false;}
  this.diagnostic.costMs=performance.now()-start;this.diagnostic.maxCostMs=Math.max(this.diagnostic.maxCostMs,this.diagnostic.costMs);
 }
 dispose(){if(this.diagnostic.status==='disposed')return;this.completeClips.clear();this.task=null;this.diagnostic.status='disposed';this.diagnostic.sourceTasks=null;}
}

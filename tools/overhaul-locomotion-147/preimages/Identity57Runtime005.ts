import {AnimationMixer,AnimationAction,AnimationClip,AnimationUtils,Bone,Group,LoopOnce,Object3D} from 'three';
import {ACTOR_HEIGHT,MECHS,STANCE_TRANSITION} from '../../../shared/config';
import {pairClipName} from '../../../shared/pairedCombat';
import type {RenderActorFrame} from './renderTimeline';
import manifest from './identity57Runtime005Manifest.json';
import {MovingRFeet067,type FootDiagnostic067} from './movingRFfeet067';
import type {GroundSupport067} from './groundSupport067';
import {Vector3} from 'three';
import {AUTHORED_GAITS123,selectedFootfalls123,validateAuthoredGait123,type AuthoredGait123} from './authoredFootfalls123';
import {LocomotionTasks143,selectedGaits143} from './locomotionTasks143';

export type ClipRecord={duration:number;channels:number;targets:string[];sampleInterval?:{start:number;end:number};measuredGait?:AuthoredGait123};
/** Gait clocks use the exported Float32 key interval; older manifests use the full clip. */
export function gaitCycleTime005(duration:number,phase:number,gait?:ClipRecord['measuredGait']):number{
 const start=gait?.cycleStart,end=gait?.cycleEnd;
 if(start===undefined&&end===undefined)return Math.max(0,Math.min(duration,phase*duration));
 if(start===undefined||end===undefined||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw new Error('INVALID_MEASURED_GAIT_CYCLE');
 const first=Math.fround(start),last=Math.fround(end);
 if(first<0||last<=first||last>duration)throw new Error('INVALID_MEASURED_GAIT_CYCLE');
 return first+Math.max(0,Math.min(1,phase))*(last-first);
}
export interface Identity57AssetContract005 {publicURL:string;sha256:string;scale:number;jointNames:string[];jointParents:Record<string,string|null>;clips:Record<string,ClipRecord|undefined>;browserLoaderValidationRequired?:boolean;}
const defaultAsset:Identity57AssetContract005=manifest;
const required=['FelineIdle','FelineWalk','FelineTrot','FelineGallop','FelineTurnLeft','FelineTurnRight','FelineTransformUp','FelineTransformDown','FelineUprightIdle','FelineUprightWalkLong','FelineUprightStride','FelineUprightTurnLeft','FelineUprightTurnRight','FelineAir','FelineUprightAir','FelineLandingRecovery','FelineRearLaunch','FelinePulse','FelineUprightPulse','FelineMissile','FelineUprightMissile','FelineHit','FelineUprightHit','FelineDown','FelineDeath',...['Impact','Pin','Claw','Release','Escape'].flatMap(beat=>['Attacker','Victim'].map(role=>'FelinePair'+beat+role))];
export const IDENTITY57_ASSET005=manifest.publicURL+'?sha='+manifest.sha256.slice(0,12);
export interface Identity57Diagnostic005 {
 actor:string;candidate:'PENDING_SUPPORTED_ACTION_OBSERVATION';assetSHA256:string;frameClock:number;renderTime:number;nativeTick:number|null;
 mode:string;stance:number;speed:number;phase:number;supportedState:boolean;unsupportedStates:string[];missingClips:string[];missingBones:string[];
 firstFailure:{reason:string;time:number;mode:string;requestedState:string}|null;activeClips:{name:string;time:number;weight:number}[];
 browserClipContract128:{required:boolean;expected:number;loaded:number;passed:boolean};
 queryCount:number;contactPolicy:'NO_VISUAL_IK_OR_CONTACT_CERTIFICATE'|'CURRENT_FIXED_SCENE_VISUAL_IK_NO_NATIVE_PAD_CERTIFICATE';feet?:FootDiagnostic067;pivot:{offsetY:number;basis:string};lastOwnerMs:number;maxOwnerMs:number;
}
/** One pose owner samples source motion then solves supported limbs in-frame. */
export class Identity57Runtime005 {
 readonly diagnostic:Identity57Diagnostic005;
 private catalog:Record<string,ClipRecord|undefined>;
 private motion106=false;private mixer:AnimationMixer;private actions=new Map<string,AnimationAction>();private life=-1;private phase=0;private turnPhase=0;
 private authoredFootfalls=false;
 private lastGrounded=true;private landingAt=-Infinity;private lastTime=0;
 private feet:MovingRFeet067|LocomotionTasks143|null=null;private rootPoint=new Vector3();private previousTravel:Vector3|null=null;
 constructor(private model:Object3D,clips:AnimationClip[],actor:string,private asset:Identity57AssetContract005=defaultAsset,support?:GroundSupport067){
  this.catalog=asset.clips;const catalog=this.catalog;
  this.authoredFootfalls=Object.values(catalog).some(c=>c?.measuredGait?.sourceOffsets!==undefined);
  if(this.authoredFootfalls)for(const name of AUTHORED_GAITS123)validateAuthoredGait123(name,catalog[name]?.measuredGait);
  this.mixer=new AnimationMixer(model);const actual=new Map(clips.map(c=>[c.name,c]));const missingClips:string[]=[],missingBones:string[]=[];
  this.motion106=!!catalog.FelineTransitionBase106||!!catalog.FelineTransitionArc106;
  const browserRequired=asset.browserLoaderValidationRequired===true,catalogNames=Object.keys(catalog).filter(name=>catalog[name]!==undefined);
  if(browserRequired){
   if(catalogNames.length!==45||clips.length!==45||actual.size!==clips.length)missingClips.push('BROWSER_DECODED_45_CLIP_NAME_COUNT_CONTRACT');
   for(const clip of clips)if(!catalog[clip.name])missingClips.push(clip.name+':UNDECLARED_BROWSER_DECODED_CLIP');
  }
  const checkedNames=[...new Set([...required,...(this.motion106?['FelineTransitionBase106','FelineTransitionArc106']:[]),...(browserRequired?catalogNames:[])])];
  for(const name of checkedNames){const c=actual.get(name),contract=catalog[name];
   if(!c||!contract){missingClips.push(name);continue;}
   const tracks=c.tracks.map(t=>t.name).sort(),expected=contract.targets.map(t=>t.replace(/\.translation$/,'.position').replace(/\.rotation$/,'.quaternion')).sort();
   if(c.duration!==contract.duration||c.tracks.length!==contract.channels||(browserRequired&&expected.length!==contract.channels)||tracks.some((t,i)=>t!==expected[i]))missingClips.push(name+':ACTUAL_EXPORT_TRACK_CONTRACT');
   try{gaitCycleTime005(c.duration,0,contract.measuredGait);}catch{missingClips.push(name+':INVALID_MEASURED_GAIT_CYCLE');}
  }
  for(const name of asset.jointNames){const b=model.getObjectByName(name);if(!(b instanceof Bone)||b.parent?.name!==asset.jointParents[name])missingBones.push(name+':ACTUAL_EXPORT_PARENT');}
  const reference106=clips.find(c=>c.name==='FelineTransitionBase106'),arc106=clips.find(c=>c.name==='FelineTransitionArc106');let additive106:AnimationClip|undefined;if(this.motion106){const interval=catalog.FelineTransitionArc106?.sampleInterval,reference=catalog.FelineTransitionBase106?.sampleInterval;if(!reference106||!arc106||!interval||!reference||!Number.isFinite(interval.start)||!Number.isFinite(interval.end)||interval.start<0||interval.end<=interval.start||interval.end>arc106.duration||reference.start<0||reference.end>reference106.duration||reference.end<=reference.start)throw new Error('106_REQUIRES_ACTUAL_AUTHORED_ARC_REFERENCE_AND_INTERVALS');additive106=arc106.clone();AnimationUtils.makeClipAdditive(additive106,reference.start*60,reference106,60);}
  for(const c of clips){const a=this.mixer.clipAction(c===arc106&&additive106?additive106:c).setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;a.setEffectiveWeight(0);this.actions.set(c.name,a);}
  this.diagnostic={actor,candidate:'PENDING_SUPPORTED_ACTION_OBSERVATION',assetSHA256:asset.sha256,frameClock:0,renderTime:0,nativeTick:null,mode:'initial',stance:0,speed:0,phase:0,supportedState:true,
   browserClipContract128:{required:browserRequired,expected:browserRequired?45:checkedNames.length,loaded:clips.length,passed:browserRequired&&missingClips.length===0},
   unsupportedStates:['wall/grab/climb/corner/mantle surface alignment','upright down/death','upright/cross-stance/Scout paired roles','upright or dive unpaired strike','arbitrary canceled-R causal foot replanning'],missingClips,missingBones,firstFailure:null,activeClips:[],queryCount:0,contactPolicy:'NO_VISUAL_IK_OR_CONTACT_CERTIFICATE',pivot:{offsetY:-ACTOR_HEIGHT,basis:'ACTOR_BODY_CENTER_CONTRACT'},lastOwnerMs:0,maxOwnerMs:0};
  if(support){this.feet=this.authoredFootfalls?new LocomotionTasks143(model,support,[...this.actions.values()].map(a=>a.getClip()),1):new MovingRFeet067(model,support);this.diagnostic.feet=this.feet.diagnostic;this.diagnostic.contactPolicy='CURRENT_FIXED_SCENE_VISUAL_IK_NO_NATIVE_PAD_CERTIFICATE';}
 }
 private failure(reason:string,time:number,requestedState:string){this.diagnostic.supportedState=false;this.diagnostic.mode='unsupported';if(!this.diagnostic.firstFailure)this.diagnostic.firstFailure={reason,time,mode:'unsupported',requestedState};}
 private set(name:string,weight:number,phase:number,time?:number){if(weight<=0)return;const a=this.actions.get(name);if(!a){this.failure('MISSING_SELECTED_ACTION',this.lastTime,name);return;}a.enabled=true;a.time=Math.max(0,Math.min(a.getClip().duration,time??phase*a.getClip().duration));a.setEffectiveWeight(weight);}
 private gait(name:string,distance:number){const stride=this.catalog[name]?.measuredGait?.nativeDistancePerCycle;if(!stride){this.failure('MISSING_MEASURED_GAIT',this.lastTime,name);return;}this.phase=((this.phase+distance/stride)%1+1)%1;const a=this.actions.get(name);this.set(name,1,this.phase,a?gaitCycleTime005(a.getClip().duration,this.phase,this.catalog[name]?.measuredGait):undefined);}
 private travelTasks143(speed:number,stance:number,distance:number):void{
  const selected=selectedGaits143(speed,MECHS.pounce.speed,stance);let stride=0;
  for(const c of selected){const g=this.catalog[c.name]?.measuredGait;if(!g){this.failure('143_MISSING_ACTUAL_GAIT',this.lastTime,c.name);return;}stride+=g.nativeDistancePerCycle*c.weight;}
  this.phase=((this.phase+distance/stride)%1+1)%1;
  for(const c of selected){const a=this.actions.get(c.name)!,g=this.catalog[c.name]!.measuredGait;this.set(c.name,c.weight,this.phase,gaitCycleTime005(a.getClip().duration,this.phase,g));}
 }
 step(p:RenderActorFrame,frameClock:number,dt:number,root:Group,body:Group,peerSelected:boolean){
  const catalog=this.catalog;
  const started=performance.now(),s=p.state,t=p.time;this.lastTime=t;
  // ActorState is a body-center frame. The actual native hull's lower boundary
  // provides its visual floor offset when present; raw contact frame is irrelevant.
  const n=s.nativePose,nativePivot=!!n&&n.actorId===s.id&&n.life===s.jumpEpoch,offset=nativePivot?n!.hull.position.y-s.position.y-n!.shape.halfHeight-n!.shape.borderRadius:-ACTOR_HEIGHT;
  root.position.set(p.position.x,p.position.y+offset,p.position.z);root.rotation.set(0,p.yaw,0);root.visible=s.hp>0||!!s.downed||t-s.diedAt<3;
  // Measured export head points +Z. Actual shared direction(yaw=0) is -Z;
  // this separately derived mount maps the source forward to authority forward.
  body.position.set(0,0,0);body.rotation.set(0,Math.PI,0);body.scale.setScalar(this.asset.scale);
  const age=Math.max(0,t-s.stanceChangedAt),u=Math.min(1,age/STANCE_TRANSITION),amount=s.stance==='upright'?u:1-u;
  const movingR=age<STANCE_TRANSITION,up=s.stance==='upright',speed=dt>0?Math.min(30,p.distance/dt):0;
  Object.assign(this.diagnostic,{frameClock,renderTime:t,nativeTick:n?.tick??null,stance:amount,speed,phase:this.phase,pivot:{offsetY:offset,basis:nativePivot?'REPLICATED_HULL_LOWER_BOUNDARY':'ACTOR_BODY_CENTER_CONTRACT'}});
  if(p.reset||s.jumpEpoch!==this.life){this.phase=this.turnPhase=0;this.landingAt=-Infinity;this.lastGrounded=p.grounded;this.previousTravel=null;}this.life=s.jumpEpoch;
  // Keep measured distance magnitude, but play the source sweep backwards when
  // the displayed carrier travels against its authored forward (-Z) heading.
  const forwardTravel=this.previousTravel?-(p.position.x-this.previousTravel.x)*Math.sin(p.yaw)-(p.position.z-this.previousTravel.z)*Math.cos(p.yaw):0;
  const gaitDistance=forwardTravel<0?-p.distance:p.distance;
  if(!this.previousTravel)this.previousTravel=new Vector3();this.previousTravel.set(p.position.x,p.position.y,p.position.z);
  if(this.diagnostic.firstFailure)return;
  if(this.diagnostic.missingClips.length||this.diagnostic.missingBones.length){this.failure('ACTUAL_EXPORT_BINDING_INCOMPLETE',t,'initial-binding');return;}
  if(!Number.isFinite(offset)||Math.abs(offset)>10){this.failure('NONFINITE_OR_INVALID_ACTUAL_PIVOT',t,'pivot');return;}
  if(p.climb){this.failure('UNSUPPORTED_SURFACE_ALIGNED_CLIMB',t,p.climb.phase);return;}
  const pair=s.pair&&s.pair.life===s.jumpEpoch?s.pair:null;
  if(pair&&(pair.style!=='quadruped'||pair.opponent!=='pounce'||!peerSelected||movingR)){this.failure('UNSUPPORTED_PAIR_RIG_OR_STANCE',t,pair.style+':'+pair.opponent);return;}
  if((s.downed||s.hp<=0)&&(up||movingR)){this.failure('MISSING_ACTUAL_UPRIGHT_DOWN_DEATH',t,s.downed?'upright-down':'upright-death');return;}
  if(p.strike&&!pair&&(up||movingR||p.strike.kind!=='pounce')){this.failure('UNSUPPORTED_UNPAIRED_STRIKE',t,p.strike.kind);return;}
  for(const a of this.actions.values())a.setEffectiveWeight(0);
  let mode='quad',gaitName:string|undefined;
  if(s.downed){mode='down';this.set('FelineDown',1,Math.min(1,(t-s.downed.at)/(catalog.FelineDown?.duration??1)));}
  else if(s.hp<=0){mode='death';this.set('FelineDeath',1,Math.min(1,(t-s.diedAt)/(catalog.FelineDeath?.duration??1)));}
  else if(pair){mode='pair';const name=pairClipName(pair,t),claw=name.includes('Claw'),at=Math.max(0,t-(claw?pair.comboAt:pair.phaseAt));this.set(name,1,claw?at/.24:pair.phase==='pin'?(at/(catalog[name]?.duration??1))%1:at/Math.max(.001,pair.endsAt-pair.phaseAt));}
  else if(movingR&&this.motion106){
   mode='transform';
   // One owner and one continuously integrated distance phase. R never replaces
   // the whole live gait with a rest-to-rest clip or resets the entry/exit pose.
   const quad=speed>MECHS.pounce.speed*.7?'FelineGallop':speed>MECHS.pounce.speed*.3?'FelineTrot':'FelineWalk',upright=speed>2?'FelineUprightStride':'FelineUprightWalkLong';
   const q=catalog[quad]?.measuredGait,upr=catalog[upright]?.measuredGait;
   if(!q||!upr){this.failure('106_MISSING_ACTUAL_GAIT_MEASUREMENTS',t,'moving-R');return;}
   if(speed>.08&&this.authoredFootfalls){this.travelTasks143(speed,amount,gaitDistance);}
   else if(speed>.08){const stride=q.nativeDistancePerCycle*(1-amount)+upr.nativeDistancePerCycle*amount;this.phase=((this.phase+gaitDistance/stride)%1+1)%1;
    const qa=this.actions.get(quad),ua=this.actions.get(upright);this.set(quad,1-amount,this.phase,qa?gaitCycleTime005(qa.getClip().duration,this.phase,q):undefined);this.set(upright,amount,this.phase,ua?gaitCycleTime005(ua.getClip().duration,this.phase,upr):undefined);
   }else{this.set('FelineIdle',1-amount,(t/(catalog.FelineIdle?.duration??1))%1);this.set('FelineUprightIdle',amount,(t/(catalog.FelineUprightIdle?.duration??1))%1);}
   const arc=this.actions.get('FelineTransitionArc106');if(!arc){this.failure('106_AUTHORED_ADDITIVE_ARC_MISSING',t,'moving-R');return;}
   const record=catalog.FelineTransitionArc106,at=record!.sampleInterval!.start,end=record!.sampleInterval!.end;
   this.set('FelineTransitionArc106',1,0,at+(end-at)*(up?u:1-u));
   // Source live gait owns swing; the existing foot solver may only admit its
   // genuine support phase with existing release/error/contact constraints.
   gaitName=speed>.08?(amount>.5?upright:quad):undefined;
  }
  else if(movingR){mode='transform';const name=amount>.5?'FelineUprightStride':'FelineGallop',stride=catalog[name]?.measuredGait?.nativeDistancePerCycle;if(stride)this.phase=((this.phase+gaitDistance/stride)%1+1)%1;this.set(up?'FelineTransformUp':'FelineTransformDown',1,u);}
  else if(!p.grounded){mode='air';this.set(up?'FelineUprightAir':'FelineAir',1,Math.min(1,Math.max(0,p.velocity.y<0?.8:.35)));}
  else if(p.strike){mode='strike';const name=p.strike.stage==='flight'?'FelineRearLaunch':'FelineLandingRecovery';this.set(name,1,(t-p.strike.stageAt)/Math.max(.001,p.strike.endsAt-p.strike.stageAt));}
  else {
   if(!this.lastGrounded)this.landingAt=t;
   const landingAge=t-this.landingAt;
   // No upright landing action exists: an explicit .18s presentation blend
   // joins actual upright Air endpoint to actual upright Idle, without IK.
   if(up&&landingAge>=0&&landingAge<.18){mode='landing';const u=landingAge/.18;this.set('FelineUprightAir',1-u,1);this.set('FelineUprightIdle',u,0);}
   else if(!up&&landingAge>=0&&landingAge<(catalog.FelineLandingRecovery?.duration??0)){mode='landing';this.set('FelineLandingRecovery',1,landingAge/(catalog.FelineLandingRecovery?.duration??1));}
   else if(speed>.08){mode=up?'upright':'quad';gaitName=up?(speed>2?'FelineUprightStride':'FelineUprightWalkLong'):(speed>MECHS.pounce.speed*.7?'FelineGallop':speed>MECHS.pounce.speed*.3?'FelineTrot':'FelineWalk');if(this.authoredFootfalls)this.travelTasks143(speed,up?1:0,gaitDistance);else this.gait(gaitName,gaitDistance);}
   else if(Math.abs(p.angularDistance)>.0001){mode='turn';this.turnPhase=(this.turnPhase+Math.abs(p.angularDistance)/(Math.PI/2))%1;this.set((up?'FelineUpright':'Feline')+(p.angularDistance>0?'TurnLeft':'TurnRight'),1,this.turnPhase);}
   else {mode=up?'upright':'quad';const name=up?'FelineUprightIdle':'FelineIdle';this.set(name,1,(t/(catalog[name]?.duration??1))%1);}
   // These authored reactions own the entire rig. Repeated firing/hits must
   // not replace travel with stationary feet (.333s Pulse, .16s fire interval).
   // Moving recoil remains limited to ordinary muzzle/projectile presentation;
   // no unverified upper-body/additive conversion is introduced here.
   if(speed<=.08||mode==='landing')for(const [at,suffix] of [[s.pulseAt,'Pulse'],[s.rocketAt,'Missile'],[s.hurtAt,'Hit']] as const){const name=(up?'FelineUpright':'Feline')+suffix,duration=catalog[name]?.duration??0;if(at>=0&&t>=at&&t-at<duration){for(const a of this.actions.values())a.setEffectiveWeight(0);this.set(name,1,(t-at)/duration);mode='reaction';break;}}
  }
  this.lastGrounded=p.grounded;this.feet?.restoreSource();this.mixer.update(0);this.model.updateWorldMatrix(true,true);
  const footfalls=this.authoredFootfalls?selectedFootfalls123(this.actions,catalog):undefined;
  const footFrame={time:t,frameClock,life:s.jumpEpoch,reset:p.reset,grounded:p.grounded,eligible:['quad','upright','turn','transform'].includes(mode),stance:amount,phase:this.phase,footfalls,gait:gaitName?{name:gaitName,duty:catalog[gaitName]?.measuredGait?.sourceDuty}:undefined,rootPosition:this.rootPoint.copy(root.position),rootYaw:p.yaw};
  if(this.feet instanceof LocomotionTasks143){
   footFrame.eligible=footFrame.eligible&&!!footfalls?.length&&footfalls.every(c=>!!c.gait);
   this.feet.step(footFrame,body,[...this.actions].filter(([,a])=>a.getEffectiveWeight()>0).map(([name,a])=>({name,time:a.time,weight:a.getEffectiveWeight(),additive:name==='FelineTransitionArc106'})));
   if(this.feet.diagnostic.firstFailure143)this.failure(this.feet.diagnostic.firstFailure143,t,'143-body-paw-tasks');
  }else this.feet?.step(footFrame);
  if(this.feet)this.diagnostic.queryCount=this.feet.diagnostic.queries;
  this.diagnostic.mode=mode;this.diagnostic.supportedState=!this.diagnostic.firstFailure;this.diagnostic.phase=this.phase;
  this.diagnostic.activeClips=[...this.actions].filter(([,a])=>a.getEffectiveWeight()>.001).map(([name,a])=>({name,time:a.time,weight:a.getEffectiveWeight()}));
  const ms=performance.now()-started;this.diagnostic.lastOwnerMs=ms;this.diagnostic.maxOwnerMs=Math.max(this.diagnostic.maxOwnerMs,ms);
 }
 dispose(){if(this.feet instanceof LocomotionTasks143)this.feet.dispose();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);}
}

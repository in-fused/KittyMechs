import RAPIER from '@dimforge/rapier3d-compat';
import {AnimationAction,AnimationClip,AnimationMixer,AnimationUtils,Bone,Group,LoopOnce,Object3D,Quaternion,SkinnedMesh,Vector3} from 'three';
import {ACTOR_HEIGHT,MECHS,STANCE_TRANSITION,UPRIGHT} from '../../../shared/config';
import {pairClipName} from '../../../shared/pairedCombat';
import {poweredVaultPose} from '../../../shared/buildingVault';
import {overhaulCornerHoldBlend} from '../../../shared/overhaulCornerClimb';
import type {Chassis} from '../../../shared/types';
import {combatPose,COMBAT_ACTIONS,createTurnPose,createUprightMotion,displayedTravelSpeed,displayedYawRate,distancePhase,gaitWeights,landingCompression,pawSupport,QUAD_DUTIES,QUAD_STRIDES,signedAngle,stancePose,traversalClip,turnPose,uprightMotion,wallCycle} from './felineMotion';
import type {RenderActorFrame} from './renderTimeline';
import {applyFelineStrikeMotion,bindFelineStrikeRig,createFelineStrikePose,restoreFelineStrikeRig,sampleFelineStrikeMotion} from './felineStrikeMotion';
import {PracticalPawContact001,type VisualContact001} from './practicalFelineContact001';
import {climbCornerFaces} from './climbingContact';

const BASE=['Idle','Walk','Trot','Gallop','Air','UprightIdle','UprightWalk','UprightAir','TransformUp','TransformDown','Grab','Cling','Climb','Mantle','TurnLeft','TurnRight','UprightWalkLong','UprightStride','UprightTurnLeft','UprightTurnRight'] as const;
type Mode='quad'|'upright'|'transform'|'air'|'landing'|'grab'|'cling'|'climb'|'corner'|'mantle'|'pair'|'strike'|'reaction'|'down'|'death';
interface Rest {bone:Bone;position:Vector3;rotation:Quaternion;scale:Vector3;}
interface Limb {name:string;contact:PracticalPawContact001;upperLength:number;lowerLength:number;}
export interface PracticalMotionDiagnostic001 {
  actor:string;frameClock:number;renderTime:number;mode:Mode;stance:number;speed:number;phase:number;queryCount:number;activeClips:{name:string;time:number;weight:number}[];
  limbs:{name:string;upperLength:number;lowerLength:number;contact:VisualContact001}[];
  missingClips:string[];missingBones:string[];transitions:{from:Mode;to:Mode;time:number}[];
  firstFailure:{reason:string;time:number;mode:Mode;limb:string|null;requestedTarget:number[]|null}|null;
  candidate:'PENDING_NORMAL_PLAY';surfaceContract:'SPARSE_VISUAL_CONTACT';
}

/** One writer: reset actual bind locals, evaluate clips, articulate core/strike,
 * acquire or release visual contacts, then look/tail. Carrier is never solved. */
export class PracticalFelineMotionOwner001 {
  readonly diagnostic:PracticalMotionDiagnostic001;
  private mixer:AnimationMixer;private base:(AnimationAction|undefined)[];private hind:(AnimationAction|undefined)[];private reactions:(AnimationAction|undefined)[][];private pairs=new Map<string,AnimationAction>();
  private rest:Rest[]=[];private limbs:Limb[]=[];private head:Bone|undefined;private pelvis:Bone|undefined;private spine:Bone|undefined;private tail:Bone[]=[];
  private strikeRig:ReturnType<typeof bindFelineStrikeRig>|null=null;private strike=createFelineStrikePose();
  private weights={idle:1,walk:0,trot:0,gallop:0,air:0};private target={idle:1,walk:0,trot:0,gallop:0,air:0};
  private stance={amount:0,transitionWeight:0,clipTime:0,up:false};private turn=createTurnPose();private upright=createUprightMotion();private climbPose={index:10,phase:0,wall:0,roof:0};private vault={air:0,mantle:1,phase:0,wall:0,roof:0};private combat={index:-1,elapsed:0,weight:0,death:false};
  private phase=0;private speed=0;private previousSpeed=0;private lean=0;private pitch=0;private look=0;private landing=0;private verticalSpeed=0;private grounded=true;private life=-1;private mode:Mode='quad';private actionKey='';
  private cornerKey='';private cornerFaces:ReturnType<typeof climbCornerFaces>;
  private axis=new Vector3();private rotation=new Quaternion();private parent=new Quaternion();private normal=new Vector3();private worldUp=new Vector3(0,1,0);private side=new Vector3();private forwardAxis=new Vector3();
  constructor(private model:Object3D,clips:AnimationClip[],pairClips:AnimationClip[],world:RAPIER.World,private chassis:Chassis,private scale:number,actor:string,private seed:number){
    this.mixer=new AnimationMixer(model);
    const missingClips:string[]=[],missingBones:string[]=[];
    const isHind=(trackName:string)=>/(?:HL|HR)_(?:upper|lower|paw)(?:[.\]])/.test(trackName);
    const action=(name:string,index:number)=>{let clip=clips.find(c=>c.name===name);if(!clip){missingClips.push(name);return undefined;}if(index===8||index===9){const source=clip;clip=new AnimationClip('Motion001Core'+name,source.duration,source.tracks.filter(t=>!isHind(t.name)).map(t=>t.clone()));}const a=this.mixer.clipAction(clip);a.setEffectiveWeight(0).play();a.paused=true;return a;};
    this.base=BASE.map((name,i)=>action('Feline'+name,i));
    // Explicit candidate choreography: moving R retains actual gait/turn leg
    // tracks while its own transform exclusively owns core and fore guards.
    this.hind=BASE.map((name,i)=>{if(![0,1,2,3,5,8,9,14,15,16,17,18,19].includes(i))return undefined;const source=clips.find(c=>c.name==='Feline'+name);if(!source)return undefined;const tracks=source.tracks.filter(t=>isHind(t.name)).map(t=>t.clone());if(!tracks.length){missingClips.push('hind tracks:'+source.name);return undefined;}const clip=new AnimationClip('Motion001Hind'+source.name,source.duration,tracks),a=this.mixer.clipAction(clip);a.setEffectiveWeight(0).play();a.paused=true;return a;});
    this.reactions=[false,true].map(up=>COMBAT_ACTIONS.map(name=>{const prefix=up?'FelineUpright':'Feline',source=clips.find(c=>c.name===prefix+name),reference=clips.find(c=>c.name===prefix+'CombatBase');if(!source||!reference){missingClips.push(prefix+name);return undefined;}const clip=source.clone();if(name!=='Death')AnimationUtils.makeClipAdditive(clip,0,reference,60);const a=this.mixer.clipAction(clip);a.setEffectiveWeight(0).setLoop(LoopOnce,1).play();a.paused=true;a.clampWhenFinished=true;return a;}));
    for(const clip of pairClips.filter(c=>/Pair(?:Impact|Pin|Claw|Release|Escape)/.test(c.name))){const a=this.mixer.clipAction(clip);a.setEffectiveWeight(0).setLoop(LoopOnce,1).play();a.paused=true;a.clampWhenFinished=true;this.pairs.set(clip.name,a);}
    model.traverse(o=>{if(o instanceof Bone)this.rest.push({bone:o,position:o.position.clone(),rotation:o.quaternion.clone(),scale:o.scale.clone()});});
    const bone=(name:string)=>{const b=model.getObjectByName(name);if(b instanceof Bone)return b;missingBones.push(name);return undefined;};
    this.head=bone('head');this.pelvis=bone('pelvis');this.spine=bone('spine');for(let i=0;i<5;i++){const b=bone('tail_'+i);if(b)this.tail.push(b);}
    model.updateWorldMatrix(true,true);
    for(const name of ['FL','FR','HL','HR']){const upper=bone(name+'_upper'),lower=bone(name+'_lower'),paw=bone(name+'_paw');if(!upper||!lower||!paw)continue;if(lower.parent!==upper||paw.parent!==lower){missingBones.push(name+': requires a distinct articulated chain adapter');continue;}
      // Actual rest-chain lengths, not future asset proportions or assumed axes.
      const p=new Vector3(),q=new Vector3(),r=new Vector3();upper.getWorldPosition(p);lower.getWorldPosition(q);paw.getWorldPosition(r);
      const corners=this.bindPawBounds(paw),contact=new PracticalPawContact001(world,upper,lower,paw,corners,scale);
      this.limbs.push({name,contact,upperLength:p.distanceTo(q)*scale,lowerLength:q.distanceTo(r)*scale});
    }
    try{this.strikeRig=bindFelineStrikeRig(model);}catch{missingBones.push('complete strike rig');}
    this.diagnostic={actor,frameClock:0,renderTime:0,mode:'quad',stance:0,speed:0,phase:0,queryCount:0,activeClips:[],limbs:this.limbs.map(l=>({name:l.name,upperLength:l.upperLength,lowerLength:l.lowerLength,contact:l.contact.diagnostic})),missingClips,missingBones,transitions:[],firstFailure:null,candidate:'PENDING_NORMAL_PLAY',surfaceContract:'SPARSE_VISUAL_CONTACT'};
  }
  private bindPawBounds(paw:Bone):Vector3[]{
    const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),p=new Vector3();let count=0;
    this.model.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const joint=o.skeleton.bones.indexOf(paw);if(joint<0)return;const pos=o.geometry.attributes.position,idx=o.geometry.attributes.skinIndex,weight=o.geometry.attributes.skinWeight;if(!idx||!weight)return;
      for(let i=0;i<pos.count;i++){let influence=0;for(let k=0;k<4;k++)if(idx.getComponent(i,k)===joint)influence+=weight.getComponent(i,k);if(influence<=.001)continue;
        p.fromBufferAttribute(pos,i).applyMatrix4(o.bindMatrix).applyMatrix4(o.skeleton.boneInverses[joint]);min.min(p);max.max(p);count++;
      }
    });
    // These are once-bound conservative weighted paw bounds, not five pads or
    // a full surface coverage/clearance proof. A missing mesh gives no IK lease.
    if(!count)return [];const result:Vector3[]=[];for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])result.push(new Vector3(x,y,z));return result;
  }
  private set(index:number,weight:number,phase:number){const a=this.base[index];if(!a)return;a.enabled=true;a.time=Math.max(0,Math.min(a.getClip().duration-.000001,phase*a.getClip().duration));a.setEffectiveWeight(Math.max(0,weight));}
  private setHind(index:number,weight:number,phase:number){const a=this.hind[index];if(!a)return;a.enabled=true;a.time=Math.max(0,Math.min(a.getClip().duration-.000001,phase*a.getClip().duration));a.setEffectiveWeight(Math.max(0,weight));}
  private track(bone:Bone|undefined,axis:Vector3,amount:number){if(!bone?.parent||!amount)return;bone.parent.getWorldQuaternion(this.parent).invert();this.axis.copy(axis).applyQuaternion(this.parent);this.rotation.setFromAxisAngle(this.axis,amount);bone.quaternion.premultiply(this.rotation);bone.updateWorldMatrix(false,true);}
  private failure(reason:string,time:number,limb:string|null=null,target:number[]|null=null){if(!this.diagnostic.firstFailure)this.diagnostic.firstFailure={reason,time,mode:this.mode,limb,requestedTarget:target};}
  step(p:RenderActorFrame,frameClock:number,elapsed:number,root:Group,body:Group){
    const s=p.state,t=p.time,dt=Math.max(0,Math.min(elapsed,.05)),blend=1-Math.exp(-dt*14),reset=p.reset||this.life!==s.jumpEpoch;
    this.life=s.jumpEpoch;const down=!!s.downed,dead=s.hp<=0&&!down,climb=p.climb,pair=s.pair&&s.pair.life===s.jumpEpoch&&s.hp>0?s.pair:null;
    root.position.set(p.position.x,p.position.y-ACTOR_HEIGHT,p.position.z);root.rotation.set(0,p.yaw,0);root.visible=s.hp>0||down||t-s.diedAt<3;
    body.position.set(0,0,0);body.rotation.set(0,Math.PI,0);body.scale.setScalar(this.scale);
    if(this.strikeRig)restoreFelineStrikeRig(this.strikeRig);
    for(const r of this.rest){r.bone.position.copy(r.position);r.bone.quaternion.copy(r.rotation);r.bone.scale.copy(r.scale);}
    if(reset){this.phase=0;this.speed=this.previousSpeed=0;this.lean=this.pitch=this.look=this.landing=0;this.grounded=p.grounded;for(const l of this.limbs)l.contact.reset();}
    const speed=displayedTravelSpeed(p.distance,elapsed);this.speed+=(speed-this.speed)*blend;
    const forward=-(p.velocity.x*Math.sin(p.yaw)+p.velocity.z*Math.cos(p.yaw)),direction=forward<-.3?-1:1;
    stancePose(s.stance,s.stanceChangedAt,t,STANCE_TRANSITION,this.stance);
    const a=this.stance.amount,transition=this.stance.transitionWeight,ground=p.grounded&&!climb&&!pair&&!dead&&!down;
    gaitWeights(this.speed,MECHS[this.chassis].speed,p.grounded,this.target);for(const key of ['idle','walk','trot','gallop','air'] as const)this.weights[key]+=(this.target[key]-this.weights[key])*blend;
    const moving=this.weights.walk+this.weights.trot+this.weights.gallop,strides=QUAD_STRIDES[this.chassis],duties=QUAD_DUTIES[this.chassis];
    const stride=(strides[0]/duties[0]*this.weights.walk+strides[1]/duties[1]*this.weights.trot+strides[2]/duties[2]*this.weights.gallop)*this.scale/Math.max(.001,moving);
    if(ground)this.phase=distancePhase(this.phase,p.distance,Math.max(strides[0]*this.scale,stride),direction);
    turnPose(this.chassis,p.angularDistance,this.speed,MECHS[this.chassis].speed,dt,ground&&a<.5,reset,this.turn,elapsed);
    uprightMotion(this.chassis,p.distance,p.angularDistance,this.speed,MECHS[this.chassis].speed*UPRIGHT[this.chassis].speed,this.scale,direction,dt,ground&&a>.001,reset,this.upright,elapsed);
    for(const action of [...this.base,...this.hind])action?.setEffectiveWeight(0);for(const action of this.reactions.flat())action?.setEffectiveWeight(0);for(const action of this.pairs.values())action.setEffectiveWeight(0);
    const quad=(1-a)*(1-transition),up=a*(1-transition),turn=this.turn;
    for(let i=0;i<5;i++)this.set(i,this.weights[(['idle','walk','trot','gallop','air'] as const)[i]]*quad*(1-turn.weight),i===0?t/3%1:i===4?t/1.2%1:this.phase);
    this.set(14,quad*turn.weight*turn.left,turn.phase);this.set(15,quad*turn.weight*(1-turn.left),turn.phase);
    this.set(5,up*(1-this.weights.air)*this.upright.idle*(1-this.upright.turn.weight),t/3%1);this.set(7,up*this.weights.air,t/1.2%1);
    this.set(16,up*(1-this.weights.air)*this.upright.walk*(1-this.upright.turn.weight),this.upright.phase);this.set(17,up*(1-this.weights.air)*this.upright.stride*(1-this.upright.turn.weight),this.upright.phase);
    this.set(18,up*this.upright.turn.weight*this.upright.turn.left,this.upright.turn.phase);this.set(19,up*this.upright.turn.weight*(1-this.upright.turn.left),this.upright.turn.phase);
    this.set(this.stance.up?8:9,transition,this.stance.clipTime/STANCE_TRANSITION);
    if(transition>0){const stepGain=ground?Math.min(1,this.speed/.35+Math.abs(displayedYawRate(p.angularDistance,elapsed))/.4):0,walkR=transition*stepGain,holdR=transition*(1-stepGain);
      this.setHind(this.stance.up?8:9,holdR,this.stance.clipTime/STANCE_TRANSITION);
      for(let i=0;i<4;i++)this.setHind(i,walkR*(1-a)*this.weights[(['idle','walk','trot','gallop'] as const)[i]]*(1-turn.weight),i===0?0:this.phase);
      this.setHind(14,walkR*(1-a)*turn.weight*turn.left,turn.phase);this.setHind(15,walkR*(1-a)*turn.weight*(1-turn.left),turn.phase);
      this.setHind(5,walkR*a*this.upright.idle*(1-this.upright.turn.weight),0);this.setHind(16,walkR*a*this.upright.walk*(1-this.upright.turn.weight),this.upright.phase);this.setHind(17,walkR*a*this.upright.stride*(1-this.upright.turn.weight),this.upright.phase);
      this.setHind(18,walkR*a*this.upright.turn.weight*this.upright.turn.left,this.upright.turn.phase);this.setHind(19,walkR*a*this.upright.turn.weight*(1-this.upright.turn.left),this.upright.turn.phase);
    }
    let mode:Mode=dead?'death':down?'down':pair?'pair':climb?climb.corner?'corner':climb.phase:transition>0?'transform':!p.grounded?'air':a>.5?'upright':'quad';
    if(climb&&!dead&&!down&&!pair){for(const action of [...this.base,...this.hind])action?.setEffectiveWeight(0);const cycle=wallCycle(this.chassis,this.scale,p.climbProgress,climb.height);traversalClip(climb,t,cycle,this.climbPose,p.climbProgress);
      if(climb.phase==='mantle'&&climb.mantleStage!==null){poweredVaultPose(climb,t,this.vault);this.set(13,this.vault.mantle,this.vault.phase);this.set(4,this.vault.air,p.climbProgress);}
      else if(climb.corner){const hold=overhaulCornerHoldBlend(climb.corner,t);this.set(this.climbPose.index,1-hold,this.climbPose.phase);this.set(11,hold,0);}
      else this.set(this.climbPose.index,1,this.climbPose.phase);
    }
    combatPose([s.pulseAt,s.rocketAt,s.abilityAt,s.hurtAt,s.diedAt],s.hp>0||down,t,this.combat);
    if(dead)for(const action of [...this.base,...this.hind])action?.setEffectiveWeight(0);
    if(!pair&&!down&&(!climb||dead)){for(let form=0;form<2;form++){const action=this.reactions[form][this.combat.index];if(!action)continue;action.enabled=true;action.time=Math.min(action.getClip().duration-.000001,this.combat.elapsed);action.setEffectiveWeight(this.combat.weight*(form?a:1-a));}if(this.combat.weight>0&&!dead)mode='reaction';}
    if(pair){const name=pairClipName(pair,t),action=this.pairs.get(name);for(const a of [...this.base,...this.hind])a?.setEffectiveWeight(0);for(const a of this.reactions.flat())a?.setEffectiveWeight(0);
      if(action){const claw=name.includes('PairClaw'),at=Math.max(0,t-(claw?pair.comboAt:pair.phaseAt)),duration=action.getClip().duration;action.enabled=true;action.time=claw?Math.min(duration-.000001,at/.24*duration):pair.phase==='pin'?at%duration:Math.min(duration-.000001,at/Math.max(.001,pair.endsAt-pair.phaseAt)*duration);action.setEffectiveWeight(1);}else this.failure('MISSING_ACTUAL_PAIR_CLIP:'+name,t);
    }
    if(down){for(const action of [...this.base,...this.hind])action?.setEffectiveWeight(0);this.set(0,1,0);}
    sampleFelineStrikeMotion(this.chassis,p.strike,t,{life:s.jumpEpoch,interrupted:dead||down||!!climb||!!pair||transition>0},this.strike);if(this.strike.weight>0)mode='strike';
    this.mixer.update(0);if(this.strikeRig)applyFelineStrikeMotion(this.strikeRig,this.strike);
    // Explicit new down choreography on the current rig: guarded curled core,
    // not a death clip or carrier height/pose alteration.
    const worldUp=this.worldUp,side=this.side.set(Math.cos(p.yaw),0,-Math.sin(p.yaw));
    if(down){this.track(this.pelvis,side,.32);this.track(this.spine,side,-.16);this.track(this.head,side,.22);}
    if(p.grounded&&!this.grounded){this.landing=landingCompression(this.verticalSpeed);if(mode==='quad'||mode==='upright')mode='landing';}this.grounded=p.grounded;this.verticalSpeed=p.velocity.y;this.landing*=Math.exp(-dt*11);
    const acceleration=elapsed>0?(this.speed-this.previousSpeed)/elapsed:0;this.previousSpeed=this.speed;const yawRate=displayedYawRate(p.angularDistance,elapsed);
    this.lean+=(Math.max(-.1,Math.min(.1,-yawRate*this.speed*.008))-this.lean)*blend;this.pitch+=(Math.max(-.06,Math.min(.06,-acceleration*.003))-this.pitch)*blend;
    if(!dead&&!down&&!pair&&!climb){this.track(this.pelvis,side,this.pitch+this.landing*.035);this.track(this.spine,this.forwardAxis.set(Math.sin(p.yaw),0,Math.cos(p.yaw)),this.lean);}
    root.updateWorldMatrix(true,true);
    const key=`${s.jumpEpoch}:${climb?.anchor??''}:${climb?.phase??''}:${pair?.id??''}:${p.strike?.id??''}:${dead}:${down}`;const interrupted=key!==this.actionKey;this.actionKey=key;
    const cornerKey=climb?.corner?`${climb.corner.from}:${climb.corner.to}:${climb.corner.side}:${climb.corner.radius}`:'';if(cornerKey!==this.cornerKey){this.cornerKey=cornerKey;this.cornerFaces=climb?.corner?climbCornerFaces(this.seed,climb):undefined;}
    let queries=0;
    for(let i=0;i<this.limbs.length;i++){const l=this.limbs[i],fore=l.name.startsWith('F');let support=0;let normal:Vector3|null=null;let enabled=ground;
      if(ground){const q=pawSupport(this.chassis,l.name,this.phase,this.weights,false,this.turn,moving<.001),u=pawSupport(this.chassis,l.name,this.phase,this.weights,true,undefined,this.speed<.06,this.upright);support=q*(1-a)+u*a;if(fore&&a>.2)support=0;}
      if(climb&&!dead&&!down&&!pair){const roof=(climb.roofMask&(1<<i))!==0,grip=(climb.gripMask&(1<<i))!==0;enabled=roof||grip;support=enabled?1:0;if(!roof){const face=climb.corner?.pawFaces&&this.cornerFaces?this.cornerFaces[climb.corner.pawFaces[i]]:undefined,n=face?.normal??climb.normal;normal=this.normal.set(n.x,n.y,n.z).normalize();}}
      enabled=enabled&&!pair&&!dead&&!down&&this.strike.weight<.01;
      const d=l.contact.step(frameClock,dt,support,normal,enabled,reset||interrupted,this.speed);queries+=d.queryCount;
      if(d.reason==='UNREACHABLE_AUTHORED_RELEASE')this.failure(d.reason,t,l.name,l.contact.requestedTarget());
    }
    if(!dead&&!down&&!pair){this.look+=(Math.max(-.65,Math.min(.65,signedAngle(s.aimYaw-p.yaw)))-this.look)*blend;this.track(this.head,worldUp,this.look*(climb?.phase==='mantle'?.25:1));this.track(this.head,side,Math.max(-.22,Math.min(.24,s.aimPitch)));for(let i=0;i<this.tail.length;i++)this.track(this.tail[i],worldUp,(-yawRate*.022-this.lean*.16)*(1-i*.12));}
    root.updateWorldMatrix(true,true);
    if(mode!==this.mode){this.diagnostic.transitions.push({from:this.mode,to:mode,time:t});if(this.diagnostic.transitions.length>32)this.diagnostic.transitions.shift();this.mode=mode;}
    Object.assign(this.diagnostic,{frameClock,renderTime:t,mode,stance:a,speed:this.speed,phase:this.phase,queryCount:queries});
    this.diagnostic.activeClips=[];for(const action of [...this.base,...this.hind,...this.reactions.flat(),...this.pairs.values()])if(action&&action.getEffectiveWeight()>.001)this.diagnostic.activeClips.push({name:action.getClip().name,time:action.time,weight:action.getEffectiveWeight()});
  }
  dispose(){for(const l of this.limbs)l.contact.reset();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);}
}

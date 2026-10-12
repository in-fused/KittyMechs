import {Bone,Object3D,Quaternion,Vector3,type AnimationAction} from 'three';
import {authoredFootPolicy123,selectedFootfalls123,type FootLimb123} from './authoredFootfalls123';
import type {SourceCatalog154} from './sourcePresentation154';
import type {GroundHit067,GroundSupport067} from './groundSupport067';
import {SkinSole164,type MaterialPoint188} from './sourceCoordination164';
import {applyPawIK,pawRequestAdmitted,type PawIK} from './pawContact';
const names=['FL','FR','HL','HR'] as const,up=new Vector3(0,1,0),origin=new Vector3();
const smooth=(x:number)=>x*x*(3-2*x),wrapped=(x:number)=>Math.atan2(Math.sin(x*Math.PI*2),Math.cos(x*Math.PI*2))/(Math.PI*2);
type Limb189={name:FootLimb123;bones:[Bone,Bone,Bone];source:Quaternion[];last:Quaternion[];start:Quaternion[];point:MaterialPoint188|null;hit:GroundHit067|null;anchor:Vector3;rotation:Quaternion;progress:number;state:'source'|'touch'|'constrained'|'recovery';previousSource:Vector3|null;previousHip:Vector3|null;previousCorrection:number;blocked:boolean;reason:string|null};
const ik=():PawIK=>({hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()});
export interface PhaseFoot189 {limb:FootLimb123;role:string;state:string;pointID:string|null;lease:GroundHit067['lease']|null;gap:number|null;samePointTangentialError:number|null;reach:number|null;correctionWeight:number;phaseAdvance:number;recoveryPhase:number;releaseReason:string|null;sourcePhase:{name:string;phase:number|null;weight:number}[];}
/** One visual pose owner. A persistent material point and complete-pad plane
 * minimum have separate contracts. Unloaded recovery blends fixed-length
 * local rotations, never asks planted IK to reach an authored straight limb. */
export class PhaseSourceFeet189{
 private limbs:Limb189[];private c=ik();private life=-1;private clocks=new Map<string,{phase:number;weight:number}>();private stance=0;private heading:number|null=null;
 readonly diagnostic={policy:'PHASE_OWNED_MATERIAL_POINT189',contactQualified:false,feet:[] as PhaseFoot189[],lastOwnerMs:0,maxOwnerMs:0,firstFailure:null as {limb:FootLimb123;reason:string;gap:number|null;tangential:number|null;reach:number|null}|null};
 constructor(private model:Object3D,private soles:SkinSole164){this.limbs=names.map(name=>{const bones=[name+'_upper',name+'_lower',name+'_paw'].map(n=>model.getObjectByName(n));if(!bones.every(b=>b instanceof Bone))throw Error('189_MISSING_SOURCE_CHAIN:'+name);return {name,bones:bones as [Bone,Bone,Bone],source:bones.map(()=>new Quaternion()),last:bones.map(()=>new Quaternion()),start:bones.map(()=>new Quaternion()),point:null,hit:null,anchor:new Vector3(),rotation:new Quaternion(),progress:0,state:'source',previousSource:null,previousHip:null,previousCorrection:0,blocked:false,reason:null};});}
 reset(){for(const l of this.limbs){l.point=null;l.hit=null;l.state='source';l.progress=0;l.previousSource=l.previousHip=null;l.blocked=false;l.reason=null;}this.clocks.clear();this.heading=null;this.diagnostic.feet=[];}
 private release(l:Limb189,reason:string){if(l.state==='source'||l.state==='recovery')return;l.bones.forEach((_,i)=>l.start[i].copy(l.last[i]));l.state='recovery';l.progress=0;l.hit=null;l.reason=reason;l.blocked=true;}
 update(actions:Iterable<readonly[string,AnimationAction]>,catalog:SourceCatalog154,support:GroundSupport067|undefined,frame:{life:number;reset:boolean;eligible:boolean;stance:number;heading:number;probeHeight:number;margin:number}){
  const started=performance.now();if(frame.reset||this.life!==frame.life){this.reset();this.life=frame.life;}
  const selected=[...actions].filter(([,a])=>a.getEffectiveWeight()>0),contributors=selectedFootfalls123(selected,catalog),travel=contributors.filter(c=>!c.name.endsWith('Idle')),idle=contributors.length>0&&!travel.length;
  let phaseAdvance=0;const next=new Map<string,{phase:number;weight:number}>();
  for(const [name,a] of selected){const gait=catalog[name]?.measuredGait,c=contributors.find(c=>c.name===name),phase=c?.phase??a.time/a.getClip().duration,weight=a.getEffectiveWeight(),previous=this.clocks.get(name);if(previous)phaseAdvance=Math.max(phaseAdvance,Math.abs(wrapped(phase-previous.phase)),Math.abs(weight-previous.weight));else if(this.clocks.size)phaseAdvance=Math.max(phaseAdvance,weight);next.set(name,{phase,weight});}
  for(const [name,c] of this.clocks)if(!next.has(name))phaseAdvance=Math.max(phaseAdvance,c.weight);
  phaseAdvance=Math.max(phaseAdvance,Math.abs(frame.stance-this.stance),this.heading===null?0:Math.abs(Math.atan2(Math.sin(frame.heading-this.heading),Math.cos(frame.heading-this.heading)))/(Math.PI/2));this.clocks=next;this.stance=frame.stance;this.heading=frame.heading;
  const recoveryPhase=travel.filter(c=>c.gait).reduce((n,c)=>Math.min(n,1-c.gait!.sourceDuty!),1),rows:PhaseFoot189[]=[];this.soles.beginPose();
  for(const l of this.limbs){const [upper,lower,paw]=l.bones,c=this.c;l.bones.forEach((b,i)=>l.source[i].copy(b.quaternion));upper.getWorldPosition(c.hip);lower.getWorldPosition(c.knee);paw.getWorldPosition(c.paw);const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),source=c.paw.clone(),sourceRotation=paw.getWorldQuaternion(new Quaternion());
   const role=l.name.startsWith('F')&&frame.stance>0?'unloaded':idle?'stance':authoredFootPolicy123(l.name,travel),geometryAdvance=l.previousSource?source.distanceTo(l.previousSource)/(a+b):0,advance=Math.max(phaseAdvance,geometryAdvance),row:PhaseFoot189={limb:l.name,role,state:l.state,pointID:l.point?l.point.meshUUID+':'+l.point.vertexIndex:null,lease:null,gap:null,samePointTangentialError:null,reach:null,correctionWeight:0,phaseAdvance:advance,recoveryPhase,releaseReason:l.reason,sourcePhase:contributors.map(c=>({name:c.name,phase:c.phase,weight:c.weight}))};
   if(role!=='stance')l.blocked=false;
   if(l.hit&&l.point){const material=this.soles.sampleMaterialPoint188(l.point),desired=source.clone().add(l.anchor.clone().sub(material)),futureHip=c.hip.clone();if(l.previousHip)futureHip.add(c.hip.clone().sub(l.previousHip));
    if(!frame.eligible||role!=='stance'||!support?.validate(l.hit.lease)||!pawRequestAdmitted(c.hip,desired,a,b)||!pawRequestAdmitted(futureHip,desired,a,b))this.release(l,!frame.eligible?'ACTION_UNLOADED':role!=='stance'?'AUTHORED_UNLOADED_OR_SWING':!support?.validate(l.hit.lease)?'CURRENT_SUPPORT_RETIRED':'OBSERVED_GEOMETRY_EARLY_RELEASE');
   }
   if(frame.eligible&&support&&frame.margin>0&&role==='stance'&&!l.blocked&&l.state==='source'){
    const pad=this.soles.minimum(l.name,origin,up),hit=support.probe(pad.world,frame.probeHeight,frame.probeHeight*2);if(hit&&support.validate(hit.lease)){const minimum=this.soles.minimum(l.name,hit.point,hit.normal),handle=this.soles.selectMaterialPoint188(l.name,hit.point,hit.normal),point=this.soles.sampleMaterialPoint188(handle);c.target.copy(source).addScaledVector(hit.normal,-minimum.gap);
     if(Math.abs(minimum.gap)<=frame.margin&&pawRequestAdmitted(c.hip,c.target,a,b)){l.point=handle;l.hit=hit;l.anchor.copy(point).addScaledVector(hit.normal,-minimum.gap);l.rotation.copy(sourceRotation);l.progress=0;l.state='touch';l.reason=null;row.pointID=handle.meshUUID+':'+handle.vertexIndex;}
    }
   }
   if(l.hit&&l.point){
    l.progress=Math.min(1,l.progress+advance/recoveryPhase);const weight=smooth(l.progress),material=this.soles.sampleMaterialPoint188(l.point);c.target.copy(source).addScaledVector(l.anchor.clone().sub(material),weight);c.pawRotation.copy(sourceRotation).slerp(l.rotation,weight);
    if(pawRequestAdmitted(c.hip,c.target,a,b)){applyPawIK(upper,lower,paw,c);this.soles.beginPose(false);const point=this.soles.sampleMaterialPoint188(l.point);row.samePointTangentialError=point.clone().sub(l.anchor).projectOnPlane(l.hit.normal).length();row.gap=this.soles.minimum(l.name,l.hit.point,l.hit.normal).gap;row.reach=c.hip.distanceTo(paw.getWorldPosition(c.paw))/(a+b);row.lease={...l.hit.lease};row.correctionWeight=weight;l.state=l.progress===1?'constrained':'touch';
     if(l.progress===1&&(row.samePointTangentialError>2e-5||Math.abs(row.gap)>2e-5)){this.diagnostic.firstFailure??={limb:l.name,reason:'FINAL_MATERIAL_OR_COMPLETE_PAD_CONSTRAINT_UNMET',gap:row.gap,tangential:row.samePointTangentialError,reach:row.reach};l.bones.forEach((bone,i)=>l.last[i].copy(bone.quaternion));this.release(l,'FINAL_MATERIAL_OR_COMPLETE_PAD_CONSTRAINT_UNMET');row.lease=null;}
    }else this.release(l,'CURRENT_PLANT_REQUEST_UNREACHABLE');
   }
   if(l.state==='recovery'){
    l.progress=Math.min(1,l.progress+advance/recoveryPhase);const u=smooth(l.progress);l.bones.forEach((bone,i)=>bone.quaternion.copy(l.start[i]).slerp(l.source[i],u));upper.updateWorldMatrix(false,true);this.soles.beginPose(false);row.lease=null;row.correctionWeight=1-u;row.gap=null;row.samePointTangentialError=null;if(l.progress===1){l.state='source';l.point=null;l.reason=null;}
   }
   l.bones.forEach((bone,i)=>l.last[i].copy(bone.quaternion));l.previousSource??=new Vector3();l.previousSource.copy(source);l.previousHip??=new Vector3();l.previousHip.copy(c.hip);row.state=l.state;row.releaseReason=l.reason;rows.push(row);
  }
  this.diagnostic.feet=rows;this.diagnostic.lastOwnerMs=performance.now()-started;this.diagnostic.maxOwnerMs=Math.max(this.diagnostic.maxOwnerMs,this.diagnostic.lastOwnerMs);
 }
}

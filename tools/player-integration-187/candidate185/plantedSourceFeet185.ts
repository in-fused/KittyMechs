import {Bone,Object3D,Quaternion,Vector3,type AnimationAction} from 'three';
import {authoredFootPolicy123,selectedFootfalls123,type FootLimb123} from './authoredFootfalls123';
import type {SourceCatalog154} from './sourcePresentation154';
import type {GroundHit067,GroundSupport067} from './groundSupport067';
import {SkinSole164} from './sourceCoordination164';
import {applyPawIK,pawRequestAdmitted,type PawIK} from './pawContact';

const names=['FL','FR','HL','HR'] as const,up=new Vector3(0,1,0),zero=new Vector3();
type Limb185={name:FootLimb123;upper:Bone;lower:Bone;paw:Bone;anchor:Vector3;skinAnchor:Vector3;rotation:Quaternion;lease:GroundHit067|null;weight:number;release:Vector3;hip:Vector3|null;blocked:boolean};
const workspace=():PawIK=>({hip:new Vector3(),knee:new Vector3(),paw:new Vector3(),target:new Vector3(),joint:new Vector3(),axis:new Vector3(),pole:new Vector3(),from:new Vector3(),to:new Vector3(),rotation:new Quaternion(),parent:new Quaternion(),world:new Quaternion(),pawRotation:new Quaternion()});

/** A visual correction owner, never an authoritative force/contact certificate.
 * Targets are derived from current complete weighted pad geometry and a current
 * fixed-scene lease. Source swing owns recovery; no body translation is solved. */
export class PlantedSourceFeet185{
 private limbs:Limb185[];private c=workspace();private source=new Vector3();private sourceRotation=new Quaternion();private life=-1;
 readonly diagnostic={policy:'CURRENT_SKIN_PAD_LEASE_CORRECTION185',contactQualified:false,feet:[] as {limb:FootLimb123;role:string;state:string;weight:number;gap:number|null;skinSlip:number|null;requestedReach:number|null;reason:string|null;lease:GroundHit067['lease']|null}[]};
 constructor(private model:Object3D,private soles:SkinSole164){this.limbs=names.map(name=>{const upper=model.getObjectByName(name+'_upper'),lower=model.getObjectByName(name+'_lower'),paw=model.getObjectByName(name+'_paw');if(!(upper instanceof Bone)||!(lower instanceof Bone)||!(paw instanceof Bone))throw Error('185_MISSING_ACTUAL_CHAIN:'+name);return {name,upper,lower,paw,anchor:new Vector3(),skinAnchor:new Vector3(),rotation:new Quaternion(),lease:null,weight:0,release:new Vector3(),hip:null,blocked:false};});}
 clear(){for(const l of this.limbs){l.lease=null;l.weight=0;l.release.set(0,0,0);l.hip=null;l.blocked=false;}this.diagnostic.feet=[];}
 update(actions:Iterable<readonly[string,AnimationAction]>,catalog:SourceCatalog154,support:GroundSupport067|undefined,frame:{dt:number;life:number;reset:boolean;eligible:boolean;stance:number;probeHeight:number;margin:number}){
  if(frame.reset||frame.life!==this.life){this.clear();this.life=frame.life;}
  if(!frame.eligible||!support||!Number.isFinite(frame.margin)||frame.margin<=0){this.clear();return;}
  const selected=[...actions],contributors=selectedFootfalls123(selected,catalog),travel=contributors.filter(c=>!c.name.endsWith('Idle')),idle=contributors.length>0&&travel.length===0;
  const durations=travel.filter(c=>c.gait).map(c=>(Math.fround(c.gait!.cycleEnd!)-Math.fround(c.gait!.cycleStart!))*(1-c.gait!.sourceDuty!));
  // Recovery/acquisition follows the shortest actual contributing recovery time.
  const idleDurations=selected.filter(([,a])=>a.getEffectiveWeight()>0).map(([,a])=>a.getClip().duration);
  const recovery=durations.length?Math.min(...durations):idleDurations.length?Math.min(...idleDurations):0;
  const step=frame.dt>0&&recovery>0?frame.dt/recovery:1;
  const rows:typeof this.diagnostic.feet=[];this.soles.beginPose();
  for(const l of this.limbs){
   const c=this.c;l.upper.getWorldPosition(c.hip);l.lower.getWorldPosition(c.knee);l.paw.getWorldPosition(c.paw);this.source.copy(c.paw);l.paw.getWorldQuaternion(this.sourceRotation);c.pawRotation.copy(this.sourceRotation);
   const a=c.hip.distanceTo(c.knee),b=c.knee.distanceTo(c.paw),role=l.name.startsWith('F')&&frame.stance>0?'unloaded':idle?'stance':authoredFootPolicy123(l.name,travel);
   const row={limb:l.name,role,state:'source',weight:0,gap:null as number|null,skinSlip:null as number|null,requestedReach:null as number|null,reason:null as string|null,lease:null as GroundHit067['lease']|null};
   if(role!=='stance')l.blocked=false;
   if(l.lease){
    const velocity=l.hip&&frame.dt>0?new Vector3().subVectors(c.hip,l.hip).divideScalar(frame.dt):zero;
    const future=new Vector3().copy(c.hip).addScaledVector(velocity,recovery),admitted=pawRequestAdmitted(c.hip,l.anchor,a,b)&&pawRequestAdmitted(future,l.anchor,a,b);
    if(role!=='stance'||!support.validate(l.lease.lease)||!admitted){l.release.copy(l.anchor).sub(this.source).multiplyScalar(l.weight);l.lease=null;l.blocked=role==='stance';row.reason=role!=='stance'?'AUTHORED_RELEASE':!admitted?'OBSERVED_REACH_TREND_RELEASE':'CURRENT_SUPPORT_RETIRED';}
   }
   if(!l.lease&&l.weight===0&&role==='stance'&&!l.blocked){
    const sole=this.soles.minimum(l.name,zero,up),hit=support.probe(sole.world,frame.probeHeight,frame.probeHeight*2);
    if(hit&&support.validate(hit.lease)){
     const pad=this.soles.minimum(l.name,hit.point,hit.normal);row.gap=pad.gap;c.target.copy(this.source).addScaledVector(hit.normal,-pad.gap);
     if(Math.abs(pad.gap)<=frame.margin&&pawRequestAdmitted(c.hip,c.target,a,b)){l.anchor.copy(c.target);l.skinAnchor.copy(pad.world).addScaledVector(hit.normal,-pad.gap);l.rotation.copy(this.sourceRotation);l.lease=hit;l.release.set(0,0,0);}else row.reason='CURRENT_SKIN_PAD_NOT_NEAR_REACHABLE_SUPPORT';
    }else row.reason='UNKNOWN_CURRENT_FOOT_SUPPORT';
   }
   if(l.lease){l.weight=Math.min(1,l.weight+step);c.target.copy(this.source).lerp(l.anchor,l.weight);c.pawRotation.copy(this.sourceRotation).slerp(l.rotation,l.weight);row.state=l.weight===1?'constrained':'touch';row.lease={...l.lease.lease};}
   else if(l.weight>0){const before=l.weight;l.weight=Math.max(0,l.weight-step);if(before>0)l.release.multiplyScalar(l.weight/before);c.target.copy(this.source).add(l.release);c.pawRotation.copy(this.sourceRotation).slerp(l.rotation,l.weight);row.state='recovery';}
   else c.target.copy(this.source);
   l.hip??=new Vector3();l.hip.copy(c.hip);row.weight=l.weight;row.requestedReach=c.hip.distanceTo(c.target)/(a+b);
   if(l.weight>0){
    if(pawRequestAdmitted(c.hip,c.target,a,b)){
     applyPawIK(l.upper,l.lower,l.paw,c);this.soles.beginPose();
     if(l.lease){const pad=this.soles.minimum(l.name,l.lease.point,l.lease.normal);row.gap=pad.gap;const expected=l.skinAnchor;row.skinSlip=pad.world.clone().sub(expected).projectOnPlane(l.lease.normal).length();
      // A lease or solved pivot alone never publishes a planted foot. Keep
      // skin residuals even when they reject the provisional visual constraint.
      if(l.weight===1&&(Math.abs(pad.gap)>2e-5||row.skinSlip>2e-5)){row.reason='FINAL_WEIGHTED_PAD_CONSTRAINT_UNMET';l.release.copy(c.target).sub(this.source);l.lease=null;l.blocked=true;row.state='unqualified-correction';}
     }
    }else{row.reason='CURRENT_TASK_UNREACHABLE_SOURCE_RETAINED';l.lease=null;l.weight=0;l.release.set(0,0,0);l.blocked=true;row.state='source';}
   }
   rows.push(row);
  }
  this.diagnostic.feet=rows;
 }
}

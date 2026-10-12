import {Bone,Object3D,Quaternion,Vector3} from 'three';
import type {GroundHit067,GroundSupport067} from '../../src/game/entities/groundSupport067';
import {SkinSole250,type MaterialPoint250} from './skinSole250';
export type GroundContext250={support:GroundSupport067|null;frameClock:number;time:number;dt:number;generation:number;life:number;reset:boolean;grounded:boolean;basisKnown:boolean;shape:any};
type Chain250={limb:any;bones:Bone[];lengths:number[]};
type Saved250={q:Quaternion[];authored:Quaternion[]};
type Foot250={state:'source'|'touch'|'plant'|'release';point?:MaterialPoint250;anchor?:Vector3;hit?:GroundHit067;rotation?:Quaternion;third?:Vector3;progress:number;delta?:Quaternion[];last?:Saved250;reason:string|null;hip?:Vector3;phase?:number;gate:boolean};
const smooth=(t:number)=>t*t*(3-2*t),arc=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin((a-b)*2*Math.PI),Math.cos((a-b)*2*Math.PI)))/(2*Math.PI);
const worldUp=new Vector3(0,1,0);
/** The ordinary source composer owns these tasks. Leases are visual current
 * fixed-client geometry, not native ground force, balance or contact approval. */
export class GroundedFeet250{
 private frame:GroundContext250|null=null;private identity='';private feet=new Map<string,Foot250>();private bodyDelta=new Map<Bone,Quaternion>();private lastPhase:number|null=null;
 constructor(private model:Object3D,private chains:Chain250[],private soles:SkinSole250,private solve:(chain:Chain250,target:Vector3,rotation:Quaternion,third:Vector3,pole:Vector3,operands:any)=>void,private rotate:(bone:Bone,rotation:Quaternion)=>void,private catalog:any){for(const c of chains)this.feet.set(c.limb,{state:'source',progress:0,reason:null,gate:true});}
 context(frame:GroundContext250){this.frame=frame;const identity=frame.generation+':'+frame.life;if(identity!==this.identity||frame.reset){this.cancel('LIFECYCLE_RESET');this.identity=identity;}}
 cancel(reason:string){for(const s of this.feet.values()){s.state='source';s.point=s.anchor=s.hit=s.rotation=s.third=undefined;s.delta=undefined;s.last=undefined;s.reason=reason;s.gate=true;s.progress=0;}this.bodyDelta.clear();this.lastPhase=null;}
 private release(s:Foot250,authored:Quaternion[],reason:string){
  if(s.state==='source'||s.state==='release')return;
  s.state='release';s.progress=0;s.reason=reason;s.delta=s.last?.q.map((q,i)=>q.clone().multiply(authored[i].clone().invert()));s.hit=undefined;s.gate=false;
 }
 private request(chain:Chain250,target:Vector3,third:Vector3){
  const hip=chain.bones[0].getWorldPosition(new Vector3()),scale=chain.bones[0].getWorldScale(new Vector3()).x,l1=chain.lengths[0]*scale,l2=chain.lengths[1]*scale,distance=target.clone().sub(third).distanceTo(hip),minimum=Math.abs(l1-l2)+1e-6*scale,maximum=l1+l2-1e-6*scale;
  return {limb:chain.limb,hip:hip.toArray(),target:target.toArray(),third:third.toArray(),minimum,maximum,distance,admitted:distance>minimum&&distance<maximum};
 }
 apply(source:any){
  const f=this.frame,start=performance.now(),out:any={policy:'CURRENT_CLIENT_LEASE_SAME_MATERIAL_ORDINARY_TASK',contactQualified:false,feet:[],load:[],costMs:0};
  if(!f){out.reason='NO_GROUNDED_CONTEXT';return out;}
  const phaseAdvance=this.lastPhase===null?0:arc(source.phase,this.lastPhase);this.lastPhase=source.phase;
  const positive=source.positive??[],total=positive.reduce((a:number,v:any)=>a+v.weight,0);
  let swingPhase=0,swingSeconds=0;for(const p of positive){const c=this.catalog[p.name],g=c?.measuredGait;if(g){swingPhase+=p.weight*(1-g.sourceDuty)/total;swingSeconds+=p.weight*(g.cycleEnd-g.cycleStart)*(1-g.sourceDuty)/total;}else if(c){const span=Math.max(...c.tracks.map((t:any)=>t.last))-Math.min(...c.tracks.map((t:any)=>t.first));swingSeconds+=p.weight*span/total;}}
  const progress=swingPhase>0&&phaseAdvance>0?phaseAdvance/swingPhase:swingSeconds>0?Math.max(0,f.dt)/swingSeconds:0;
  const supported=!!f.support&&f.grounded&&f.basisKnown&&Number.isFinite(f.shape?.halfHeight)&&f.shape.halfHeight>0&&Number.isFinite(f.shape?.borderRadius)&&f.shape.borderRadius>0;
  if(supported)f.support!.begin(f.frameClock,f.time,f.life);
  this.soles.beginPose(false);
  const authored=new Map<string,{q:Quaternion[];target:Vector3;rotation:Quaternion;third:Vector3;pole:Vector3}>();
  for(const c of this.chains){const paw=c.bones.at(-1)!,hock=c.bones.at(-2)!,s=this.feet.get(c.limb)!,semantic=source.feet.find((v:any)=>v.limb===c.limb);authored.set(c.limb,{q:c.bones.map(b=>b.quaternion.clone()),target:paw.getWorldPosition(new Vector3()),rotation:paw.getWorldQuaternion(new Quaternion()),third:c.bones.length===4?paw.getWorldPosition(new Vector3()).sub(hock.getWorldPosition(new Vector3())):new Vector3(),pole:c.bones[1].getWorldPosition(new Vector3())});
   const a=authored.get(c.limb)!;const loaded=semantic?.sourceLoaded===true&&semantic?.roles?.every((r:any)=>r.role==='stance')&&!(c.limb.startsWith('F')&&source.stance>0);
   if(!loaded){s.gate=true;this.release(s,a.q,'AUTHORED_UNLOAD_OR_RECOVERY');}
   else if(!supported)this.release(s,a.q,'NO_CURRENT_GROUNDED_BASIS_OR_SUPPORT');
   else if(s.hit&&!f.support!.validate(s.hit.lease))this.release(s,a.q,'LEASE_RETIRED_OR_CHANGED');
   if(s.state==='release'){s.progress=Math.min(1,s.progress+progress);if(s.progress===1){s.state='source';s.point=s.anchor=s.rotation=s.third=undefined;s.delta=undefined;s.gate=true;}continue;}
   if(s.state==='source'&&loaded&&supported&&s.gate){
    const low=this.soles.minimum(c.limb,new Vector3(),worldUp),hit=f.support!.probe(low.world,f.shape.halfHeight+f.shape.borderRadius,2*(f.shape.halfHeight+f.shape.borderRadius));
    if(hit&&f.support!.validate(hit.lease)){const minimum=this.soles.minimum(c.limb,hit.point,hit.normal);
     // A lifted paw is not a touchdown. Native border is the unchanged contact
     // acquisition search envelope, never an enlarged chain reach or body drop.
     if(Math.abs(minimum.gap)<=f.shape.borderRadius){const point=this.soles.selectMaterialPoint250(c.limb,hit.point,hit.normal),current=this.soles.sampleMaterialPoint250(point),anchor=current.clone().addScaledVector(hit.normal,-minimum.gap),target=a.target.clone().add(anchor.clone().sub(current)),request=this.request(c,target,a.third);
      if(request.admitted){Object.assign(s,{state:'touch',point,anchor,hit,rotation:a.rotation.clone(),third:a.third.clone(),progress:0,reason:'CURRENT_FIXED_SUPPORT_TOUCH',hip:c.bones[0].getWorldPosition(new Vector3()),phase:source.phase});}
     }
    }
   }
   if((s.state==='touch'||s.state==='plant')&&s.point&&s.anchor){
    const material=this.soles.sampleMaterialPoint250(s.point),target=a.target.clone().add(s.anchor.clone().sub(material)),request=this.request(c,target,s.third!),hip=c.bones[0].getWorldPosition(new Vector3()),travel=s.hip?hip.clone().sub(s.hip):new Vector3(),future=this.request(c,target.clone().sub(travel),s.third!);
    if(!request.admitted||!future.admitted){this.release(s,a.q,'OBSERVED_TRAVEL_YAW_WORKSPACE_EXIT');(s as any).failedRequest={current:request,observedStepProjection:future,anchor:s.anchor.toArray(),material:material.toArray(),phase:source.phase,roles:semantic.roles};}
    else if(s.state==='touch'){s.progress=Math.min(1,s.progress+progress);if(s.progress===1)s.state='plant';}
    s.hip=hip;
   }
  }
  // Geometric load response: rotate actual pelvis/scapular carriers toward
  // the current support lever, with no root/local-translation/scale change.
  // Retained source recovery duration/phase controls the response, not a new
  // body oscillation or global mount constant.
  const bodyBefore=new Map<Bone,Quaternion>(),desired=new Map<Bone,Quaternion>();
  for(const c of this.chains){const s=this.feet.get(c.limb)!,a=authored.get(c.limb)!;if(!s.anchor||!s.hit||!['touch','plant'].includes(s.state))continue;
   const carrier=this.model.getObjectByName(c.limb.startsWith('F')?c.limb+'_scapula202':'pelvis');if(!(carrier instanceof Bone))continue;
   const origin=carrier.getWorldPosition(new Vector3()),from=a.target.clone().sub(origin),to=s.anchor.clone().sub(origin);if(!from.lengthSq()||!to.lengthSq())continue;
   const delta=new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),weight=smooth(s.progress);delta.slerp(new Quaternion(),1-weight);
   const existing=desired.get(carrier);if(existing)existing.slerp(delta,.5);else desired.set(carrier,delta);
  }
  for(const name of ['pelvis','FL_scapula202','FR_scapula202']){const b=this.model.getObjectByName(name);if(!(b instanceof Bone))continue;bodyBefore.set(b,b.quaternion.clone());const want=desired.get(b)??new Quaternion(),delta=this.bodyDelta.get(b)??new Quaternion();delta.slerp(want,Math.min(1,progress));this.bodyDelta.set(b,delta);const world=delta.clone().multiply(b.getWorldQuaternion(new Quaternion()));this.rotate(b,world);out.load.push({bone:name,delta:delta.toArray(),currentSupportLevers:desired.has(b)});}
  this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);
  // A load pose must not make even an unleased authored endpoint impossible.
  const rejected=this.chains.map(c=>{const a=authored.get(c.limb)!,s=this.feet.get(c.limb)!;const target=s.point&&s.anchor&&['touch','plant'].includes(s.state)?c.bones.at(-1)!.getWorldPosition(new Vector3()).add(s.anchor.clone().sub(this.soles.sampleMaterialPoint250(s.point))):a.target;return this.request(c,target,s.third&&['touch','plant'].includes(s.state)?s.third:a.third);}).find(r=>!r.admitted);
  if(rejected){for(const [b,q] of bodyBefore)b.quaternion.copy(q);this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);out.loadRejected=rejected;}
  for(const c of this.chains){const s=this.feet.get(c.limb)!,a=authored.get(c.limb)!,semantic=source.feet.find((v:any)=>v.limb===c.limb),row:any={limb:c.limb,state:s.state,sourceLoaded:semantic.sourceLoaded,roles:semantic.roles,reason:s.reason,weight:['touch','plant'].includes(s.state)?smooth(s.progress):0,materialPoint:s.point?{...s.point}:null,lease:s.hit?{...s.hit.lease}:null,anchor:s.anchor?.toArray()??null,contactQualified:false,fulfilled:false};out.feet.push(row);
   if(s.state==='release'&&s.delta){for(let j=0;j<c.bones.length;j++)c.bones[j].quaternion.copy(s.delta[j].clone().slerp(new Quaternion(),smooth(s.progress)).multiply(a.q[j]));this.model.updateWorldMatrix(true,true);}
   else{
    const current=s.point?this.soles.sampleMaterialPoint250(s.point):null,weight=['touch','plant'].includes(s.state)?smooth(s.progress):0,wanted=current&&s.anchor?current.clone().lerp(s.anchor,weight):null,target=wanted?c.bones.at(-1)!.getWorldPosition(new Vector3()):a.target.clone();if(current&&wanted)target.add(wanted.clone().sub(current));
    const rotation=a.rotation.clone();if(s.rotation&&weight>0)rotation.slerp(s.rotation,weight);const third=s.third&&weight>0?a.third.clone().lerp(s.third,weight):a.third;
    try{
     const request=this.request(c,target,third);row.request=request;if(!request.admitted)throw Object.assign(Error('250_CURRENT_PLANT_UNREACHABLE'),{operands:request});
     for(let pass=0;pass<(wanted?3:1);pass++){this.solve(c,target,rotation,third,a.pole,row);this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);if(!wanted)break;const error=this.soles.sampleMaterialPoint250(s.point!).sub(wanted);row.iterationError=error.length();if(error.length()<=2e-5)break;target.sub(error);}
     if(s.point&&s.anchor&&s.hit){const point=this.soles.sampleMaterialPoint250(s.point),error=point.clone().sub(s.anchor),normal=this.soles.minimum(c.limb,s.hit.point,s.hit.normal);row.samePointWorld=point.toArray();row.samePointError=error.length();row.normalGap=normal.gap;row.samePointTangentialError=error.addScaledVector(s.hit.normal,-error.dot(s.hit.normal)).length();row.fulfilled=s.state==='plant'&&row.samePointError<=2e-5&&normal.gap>=-2e-5;
      if(s.state==='plant'&&!row.fulfilled){this.release(s,a.q,'FINAL_SAME_POINT_OR_COMPLETE_PAD_CONSTRAINT_FAILED');row.state=s.state;row.failedConstraint={samePointError:row.samePointError,normalGap:normal.gap};for(let j=0;j<c.bones.length;j++)c.bones[j].quaternion.copy(s.last?.q[j]??a.q[j]);this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);}
     }
    }catch(error){row.failure=String(error);row.failureOperands=(error as any).operands??row.request;this.release(s,a.q,'CURRENT_SOLVE_REJECTED');row.state=s.state;for(let j=0;j<c.bones.length;j++)c.bones[j].quaternion.copy(s.last?.q[j]??a.q[j]);this.model.updateWorldMatrix(true,true);this.soles.beginPose(false);}
   }
   s.last={q:c.bones.map(b=>b.quaternion.clone()),authored:a.q};row.finalState=s.state;row.recoveryProgress=s.state==='release'?s.progress:null;if((s as any).failedRequest)row.preRelease=(s as any).failedRequest;
  }
  out.costMs=performance.now()-start;return out;
 }
}

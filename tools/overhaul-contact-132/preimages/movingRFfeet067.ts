import {Bone,Object3D,Quaternion,SkinnedMesh,Vector3} from 'three';
import type {GroundHit067,GroundSupport067} from './groundSupport067';
import {authoredFootPolicy123,type FootfallContributor123} from './authoredFootfalls123';

/** Current ancestors/bones first; then Three's attached-skin inverse cache.
 * updateWorldMatrix alone does not dispatch SkinnedMesh.updateMatrixWorld.
 * bindMatrix and skeleton inverse binds are never authored/rebound here. */
export function refreshSkinPose098(model:Object3D):void{
 model.updateWorldMatrix(true,true);
 model.updateMatrixWorld(true);
}

const limbs=['FL','FR','HL','HR'] as const;
type Limb067=typeof limbs[number];
type Mode067='free'|'touch'|'stance'|'swing'|'release'|'recovery'|'unloaded';
const up=new Vector3(0,1,0),ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
type SkinWitness093={mesh:SkinnedMesh;index:number;rest:Vector3};
type Foot067={name:Limb067;bones:Bone[];restPositions:Vector3[];lengths:number[];soleLocal:Vector3;restOffset:Vector3;vertices:number;witnesses:SkinWitness093[];sourcePoint:Vector3;taskPoint:Vector3|null;effectiveWeight:number;mode:Mode067;hit:GroundHit067|null;start:Vector3;startVelocity:Vector3;target:Vector3;normal:Vector3;at:number;duration:number;influence:number;last:Vector3|null;velocity:Vector3;reason:string|null};
export interface FootDiagnostic067 {policy:'CURRENT_FIXED_SCENE_VISUAL_IK_NO_NATIVE_PAD_CERTIFICATE';geometry:'WEIGHTED_FOOT_LOWEST_POINT_INCLUDES_TOES_CLAWS';available:boolean;reason:string|null;queries:number;travelPhase:number;frameClock:number;presentationTime:number;life:number;generation:number;feet:FootRow093[];}
interface FootRow093 {limb:Limb067;mode:Mode067;reason:string|null;weightedVertices:number;influence:number;effectiveWeight:number;sourceMarker:number[];sourceError:number|null;marker:number[];target:number[]|null;error:number|null;taskTarget:number[]|null;taskError:number|null;sourceLengths:number[];jointLengths:number[];ankleReach:number;translationLengthError:number;support:{worldKey:string;generation:number;life:number;ownerKey:string;colliderHandle:number;shapePoseKey:string}|null;skinWitness:{provenance:'CURRENT_FINAL_BONE_BIND_SKIN_SUBSET';fullFootEnvelope:false;points:{mesh:string;geometry:string;vertex:number;position:number[];supportNormalGap:number|null}[]};}
export interface FootFrame067 {time:number;frameClock:number;life:number;reset:boolean;grounded:boolean;eligible:boolean;stance:number;phase:number;footfalls?:readonly FootfallContributor123[];gait?:{name:string;duty:number|undefined};rootPosition:Vector3;rootYaw:number;}

/** One owner calls restoreSource before its mixer, then this solver afterwards.
 * Only local joint rotations change. Bone translations/scale and the native
 * body remain source/authority owned. Fixed support anchors are world points. */
export class MovingRFeet067 {
 readonly diagnostic:FootDiagnostic067={policy:'CURRENT_FIXED_SCENE_VISUAL_IK_NO_NATIVE_PAD_CERTIFICATE',geometry:'WEIGHTED_FOOT_LOWEST_POINT_INCLUDES_TOES_CLAWS',available:false,reason:null,queries:0,travelPhase:0,frameClock:0,presentationTime:0,life:-1,generation:-1,feet:[]};
 private feet:Foot067[]=[];private baseline=new Map<Bone,Quaternion>();
 private previousRoot:Vector3|null=null;private previousTime=NaN;private previousYaw=0;private life=-1;private generation=-1;private gaitOwner:string|undefined;
 private vectors:Vector3[]=[];private quaternions:Quaternion[]=[];private vi=0;private qi=0;
 private v(source?:Vector3){const v=this.vectors[this.vi]??(this.vectors[this.vi]=new Vector3());this.vi++;return source?v.copy(source):v.set(0,0,0);}
 private q(source?:Quaternion){const q=this.quaternions[this.qi]??(this.quaternions[this.qi]=new Quaternion());this.qi++;return source?q.copy(source):q.identity();}
 constructor(private model:Object3D,private support:GroundSupport067){
  refreshSkinPose098(model);
  // Derive conservative bottom markers from real foot-family skin weights.
  // No source-local sole coordinate or material interpretation is invented.
  const inverseModel=model.matrixWorld.clone().invert();
  for(const name of limbs){
   const names=[name+'_upper',name+'_lower',...(name.startsWith('H')?[name+'_hock']:[]),name+'_paw'];
   const bones=names.map(n=>model.getObjectByName(n));if(bones.some(b=>!(b instanceof Bone))){this.diagnostic.reason='ACTUAL_CHAIN_MISSING';return;}
   const chain=bones as Bone[],paw=chain.at(-1)!,family=new Set<string>();paw.traverse(o=>{if(o instanceof Bone)family.add(o.name);});
   const vertices:Vector3[]=[],ownedVertices:{point:Vector3;witness:SkinWitness093}[]=[];
   model.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const p=o.geometry.getAttribute('position'),indices=o.geometry.getAttribute('skinIndex'),weights=o.geometry.getAttribute('skinWeight');if(!p||!indices||!weights)return;
    for(let i=0;i<p.count;i++){let owned=0;for(let j=0;j<4;j++){const k=j===0?indices.getX(i):j===1?indices.getY(i):j===2?indices.getZ(i):indices.getW(i),w=j===0?weights.getX(i):j===1?weights.getY(i):j===2?weights.getZ(i):weights.getW(i);if(family.has(o.skeleton.bones[k]?.name))owned+=w;}
     if(owned>.99){const rest=new Vector3().fromBufferAttribute(p,i),v=rest.clone();o.applyBoneTransform(i,v);o.localToWorld(v);vertices.push(v);ownedVertices.push({point:v,witness:{mesh:o,index:i,rest}});}
    }
   });
   if(vertices.length<4){this.diagnostic.reason='ACTUAL_WEIGHTED_FOOT_GEOMETRY_UNAVAILABLE';return;}
   let minY=Infinity;for(const v of vertices)minY=Math.min(minY,v.y);
   const sole=new Vector3();let low=0;for(const v of vertices)if(v.y<=minY+.002){sole.add(v);low++;}sole.multiplyScalar(1/low);sole.y=minY;
   // Five extreme points of the existing lowest band, cached once. This is a
   // bounded actual-skin subset, not a complete articulated foot envelope.
   const band=ownedVertices.filter(v=>v.point.y<=minY+.002),selected=new Set<SkinWitness093>();
   for(const axis of ['x','z','y'] as const){let first=band[0],last=band[0];for(const v of band){if(v.point[axis]<first.point[axis])first=v;if(v.point[axis]>last.point[axis])last=v;}selected.add(first.witness);if(axis!=='y')selected.add(last.witness);}
   const restOffset=paw.getWorldPosition(new Vector3()).applyMatrix4(inverseModel).sub(chain[0].getWorldPosition(new Vector3()).applyMatrix4(inverseModel));restOffset.y=0;
   this.feet.push({name,bones:chain,restPositions:chain.map(b=>b.position.clone()),lengths:chain.slice(1).map(b=>b.position.length()),soleLocal:paw.worldToLocal(sole.clone()),restOffset,vertices:vertices.length,witnesses:[...selected],sourcePoint:new Vector3(),taskPoint:null,effectiveWeight:0,mode:'free',hit:null,start:new Vector3(),startVelocity:new Vector3(),target:new Vector3(),normal:up.clone(),at:0,duration:.15,influence:0,last:null,velocity:new Vector3(),reason:null});
  }
  this.diagnostic.available=this.feet.length===4;
 }
 /** Mixer cache can skip a repeated source value; restore its previous value
  * explicitly so last frame's IK cannot become this frame's authored baseline. */
 restoreSource(){for(const [bone,q] of this.baseline)bone.quaternion.copy(q);}
 private captureSource(){for(const f of this.feet)for(const b of f.bones){let q=this.baseline.get(b);if(!q){q=new Quaternion();this.baseline.set(b,q);}q.copy(b.quaternion);}}
 private marker(f:Foot067){return f.bones.at(-1)!.localToWorld(this.v(f.soleLocal));}
 private skinWitness(f:Foot067):FootRow093['skinWitness']{
  return {provenance:'CURRENT_FINAL_BONE_BIND_SKIN_SUBSET',fullFootEnvelope:false,points:f.witnesses.map(w=>{
   // Three's applyBoneTransform uses final bone.matrixWorld * inverseBind,
   // with the same-frame bind pair refreshed AFTER all solves below. This
   // matches skinning inputs without claiming a captured GPU palette/readback.
   const point=this.v(w.rest);w.mesh.applyBoneTransform(w.index,point);w.mesh.localToWorld(point);
   return {mesh:w.mesh.uuid,geometry:w.mesh.geometry.uuid,vertex:w.index,position:point.toArray(),supportNormalGap:f.hit?this.v(point).sub(f.hit.point).dot(f.hit.normal):null};
  })};
 }
 private reset(reason:string){for(const f of this.feet){f.mode='free';f.hit=null;f.influence=0;f.last=null;f.taskPoint=null;f.effectiveWeight=0;f.velocity.set(0,0,0);f.reason=reason;}this.previousRoot=null;}
 private worldRotation(bone:Bone,q:Quaternion){const parent=bone.parent!.getWorldQuaternion(this.q()).invert();bone.quaternion.copy(parent.multiply(q));bone.updateWorldMatrix(false,true);}
 private aim(bone:Bone,child:Bone,target:Vector3){const origin=bone.getWorldPosition(this.v()),a=child.getWorldPosition(this.v()).sub(origin),b=this.v(target).sub(origin);if(a.lengthSq()<1e-12||b.lengthSq()<1e-12)return false;const q=this.q().setFromUnitVectors(a.normalize(),b.normalize()).multiply(bone.getWorldQuaternion(this.q()));this.worldRotation(bone,q);return true;}
 private ankle(f:Foot067,sole:Vector3,normal:Vector3,pawQ:Quaternion){const scale=f.bones.at(-1)!.getWorldScale(this.v());const q=this.q().setFromUnitVectors(up,normal).multiply(pawQ);return {point:this.v(sole).sub(this.v(f.soleLocal).multiply(scale).applyQuaternion(q)),q};}
 private reachable(f:Foot067,point:Vector3,third:Vector3,scale:number,margin=0){const hip=f.bones[0].getWorldPosition(this.v()),end=f.bones.length===4?this.v(point).sub(third):point,l1=f.lengths[0]*scale,l2=f.lengths[1]*scale,r=hip.distanceTo(end);return r>Math.abs(l1-l2)+1e-5&&r<l1+l2-1e-5-margin;}
 private solve(f:Foot067,sole:Vector3,normal:Vector3,weight:number,release=false){
  // Blend the endpoint task BEFORE solving. Never blend solved joint angles:
  // that would destroy the world constraint and can cross the support plane.
  f.effectiveWeight=Math.max(0,Math.min(1,weight));
  const commanded=this.v(f.sourcePoint).lerp(sole,f.effectiveWeight);
  if(release)commanded.addScaledVector(normal,this.v(f.sourcePoint).sub(commanded).dot(normal));
  if(f.hit){const clearance=this.v(commanded).sub(f.hit.point).dot(normal);if(clearance<0)commanded.addScaledVector(normal,-clearance);}
  if(!f.taskPoint)f.taskPoint=new Vector3();f.taskPoint.copy(commanded);
  const chain=f.bones,paw=chain.at(-1)!,pawQ=paw.getWorldQuaternion(this.q()),target=this.ankle(f,commanded,normal,pawQ),scale=paw.getWorldScale(this.v()).x;
  const hip=chain[0].getWorldPosition(this.v()),pole=chain[1].getWorldPosition(this.v()),third=chain.length===4?paw.getWorldPosition(this.v()).sub(chain[2].getWorldPosition(this.v())):this.v();
  if(!this.reachable(f,target.point,third,scale))return false;
  const end=chain.length===4?this.v(target.point).sub(third):target.point,d=this.v(end).sub(hip),r=d.length(),l1=f.lengths[0]*scale,l2=f.lengths[1]*scale;d.divideScalar(r);
  const bend=pole.sub(hip).addScaledVector(d,-pole.dot(d));
  if(bend.lengthSq()<1e-10)return false;
  const along=(l1*l1-l2*l2+r*r)/(2*r),height=Math.sqrt(Math.max(0,l1*l1-along*along)),knee=this.v(hip).addScaledVector(d,along).addScaledVector(bend.normalize(),height);
  this.aim(chain[0],chain[1],knee);this.aim(chain[1],chain[2],end);if(chain.length===4)this.aim(chain[2],paw,target.point);this.worldRotation(paw,target.q);
  this.model.updateWorldMatrix(true,true);
  const residual=this.marker(f).distanceTo(commanded);
  if(!Number.isFinite(residual)||residual>1e-4){for(const b of chain)b.quaternion.copy(this.baseline.get(b)!);this.model.updateWorldMatrix(true,true);return false;}
  return true;
 }
 private recover(f:Foot067,dt:number,control:number,reason:string){
  f.mode='release';f.reason=reason;f.influence=Math.max(0,f.influence-dt/.12);
  if(f.last&&f.influence>0&&control>0){if(!this.solve(f,f.last,f.normal,ease(f.influence)*control,true)){f.influence=0;f.reason=reason+':TRANSFER_UNREACHABLE';}}
  if(f.influence===0||control===0){f.hit=null;f.effectiveWeight=0;f.mode=control<.02?'unloaded':'free';}
 }
 private startSwing(f:Foot067,time:number,velocity:Vector3,speed:number){
  const hip=f.bones[0].getWorldPosition(this.v()),worldScale=this.model.getWorldScale(this.v()),offset=this.v(f.restOffset).multiply(worldScale).applyQuaternion(this.model.getWorldQuaternion(this.q()));
  f.duration=Math.max(.07,Math.min(.22,.48/Math.max(.2,speed)));
  const candidate=this.v(hip).add(offset).addScaledVector(velocity,f.duration);candidate.y=this.marker(f).y;
  if(speed>.08)candidate.addScaledVector(this.v(velocity).normalize(),.16);
  const hit=this.support.probe(candidate,.25,.70);if(!hit)return false;
  f.start.copy(f.last??this.marker(f));f.startVelocity.copy(f.velocity);if(f.startVelocity.length()>12)f.startVelocity.setLength(12);f.target.copy(hit.point);f.normal.copy(hit.normal);f.hit=hit;f.at=time;f.mode='swing';f.reason=null;return true;
 }
 step(frame:FootFrame067){
  this.vi=this.qi=0;
  this.captureSource();this.support.begin(frame.frameClock,frame.time,frame.life);
  const generation=this.support.diagnostic.generation;
  if(frame.reset||frame.life!==this.life||generation!==this.generation)this.reset('CARRIER_RESET');
  const ownerChanged=frame.gait?.name!==this.gaitOwner;this.gaitOwner=frame.gait?.name;
  this.life=frame.life;this.generation=generation;Object.assign(this.diagnostic,{frameClock:frame.frameClock,presentationTime:frame.time,life:frame.life,generation});
  if(!frame.eligible||!frame.grounded||!this.diagnostic.available){const reason=!this.diagnostic.available?(this.diagnostic.reason??'GEOMETRY_UNAVAILABLE'):!frame.grounded?'AIRBORNE':'SOURCE_ACTION_ONLY';this.reset(reason);this.previousTime=frame.time;this.diagnostic.feet=[];this.diagnostic.reason=reason;this.diagnostic.queries=this.support.diagnostic.queries;return;}
  const elapsed=Number.isFinite(this.previousTime)?Math.max(0,Math.min(.08,frame.time-this.previousTime)):0,dt=elapsed;
  const delta=this.previousRoot?this.v(frame.rootPosition).sub(this.previousRoot):this.v();delta.y=0;const velocity=dt>0?this.v(delta).divideScalar(dt):this.v(),speed=velocity.length(),turn=this.previousRoot?Math.abs(Math.atan2(Math.sin(frame.rootYaw-this.previousYaw),Math.cos(frame.rootYaw-this.previousYaw))):0,moving=delta.lengthSq()>1e-8||turn>.0002;
  if(!this.previousRoot)this.previousRoot=new Vector3();this.previousRoot.copy(frame.rootPosition);this.previousTime=frame.time;this.previousYaw=frame.rootYaw;this.diagnostic.travelPhase=frame.phase;
  for(const f of this.feet){
   const marker=this.marker(f),control=f.name.startsWith('F')?1-ease((frame.stance-.10)/.45):1;
   f.sourcePoint.copy(marker);f.taskPoint=null;f.effectiveWeight=0;
   if(f.hit&&!this.support.validate(f.hit.lease)){f.hit=null;f.mode='release';f.reason='SUPPORT_RETIRED_OR_CHANGED';}
   // Keep a reachable plant across speed bands; only the new authored lift,
   // source action handoff, or actual lease/reach failure retires it.
   if(ownerChanged&&f.mode==='swing'){f.hit=null;f.mode='free';f.influence=0;}
   if(frame.footfalls){
    const policy=authoredFootPolicy123(f.name,frame.footfalls);
    if(policy!=='stance'){
     // Any positive authored swing/unload owns this limb immediately. No
     // release solve may keep steering the new source recovery/ready pose.
     f.hit=null;f.influence=0;f.effectiveWeight=0;f.mode=policy==='unloaded'?'unloaded':policy==='swing'?'swing':'free';f.reason='AUTHORED_123_'+policy.toUpperCase();
    }else{
     if(!f.hit){const hit=this.support.probe(marker,.25,.70);if(hit&&marker.distanceTo(hit.point)<.03){f.hit=hit;f.target.copy(hit.point);f.normal.copy(hit.normal);}}
     f.mode=f.hit?'touch':'free';f.reason=f.hit?null:'AUTHORED_STANCE_SUPPORT_UNAVAILABLE';
     if(f.hit){f.influence=Math.min(1,f.influence+dt/.12);if(!this.solve(f,f.target,f.normal,ease(f.influence))){this.recover(f,dt,1,'AUTHORED_STANCE_UNREACHABLE_RELEASE');}else if(f.effectiveWeight===1&&this.marker(f).distanceTo(f.target)<=1e-4)f.mode='stance';}
    }
    const final=this.marker(f);if(f.last&&dt>0)f.velocity.copy(final).sub(f.last).divideScalar(dt);else f.velocity.set(0,0,0);if(!f.last)f.last=new Vector3();f.last.copy(final);
    continue;
   }
   if(frame.gait){
    // The 058E authored curve is the ordinary footfall owner. Lease only its
    // declared stance; release keeps source lift, then full source swing.
    // Offset provenance: gait058E/graft_verify.py's per-clip source evaluator.
    const offsets=frame.gait.name.includes('Upright')?{FL:0,FR:.5,HL:0,HR:.5}:frame.gait.name==='FelineWalk'?{FL:0,FR:.5,HL:.75,HR:.25}:{FL:0,FR:.5,HL:.5,HR:0};
    const phase=(frame.phase+offsets[f.name])%1,duty=frame.gait.duty;
    if(control<.02||duty===undefined||phase>=duty){
     if(f.influence>0)this.recover(f,dt,control,'AUTHORED_GAIT_RELEASE');
     else{f.hit=null;f.mode=control<.02?'unloaded':'swing';f.reason='AUTHORED_GAIT_RELEASE';}
    }else{
     if(!f.hit){const hit=this.support.probe(marker,.25,.70);if(hit&&marker.distanceTo(hit.point)<.03){f.hit=hit;f.target.copy(hit.point);f.normal.copy(hit.normal);}}
     f.mode=f.hit?'touch':'free';f.reason=f.hit?null:'AUTHORED_STANCE_SUPPORT_UNAVAILABLE';
     if(f.hit){f.influence=Math.min(1,f.influence+dt/.12);if(!this.solve(f,f.target,f.normal,ease(f.influence)*control)){this.recover(f,dt,control,'AUTHORED_STANCE_UNREACHABLE_RELEASE');}else if(f.effectiveWeight===1&&this.marker(f).distanceTo(f.target)<=1e-4)f.mode='stance';}
    }
    const final=this.marker(f);if(f.last&&dt>0)f.velocity.copy(final).sub(f.last).divideScalar(dt);else f.velocity.set(0,0,0);if(!f.last)f.last=new Vector3();f.last.copy(final);
    continue;
   }
   if(control<1){
    // Authored R front lift owns vertical motion. A reserved former support
    // can guide horizontal release, but this is never reported as planted.
    if(f.hit&&f.influence>0){f.mode='release';f.reason='SOURCE_FRONT_UNLOAD';if(!this.solve(f,f.target,f.normal,ease(f.influence)*control,true))this.recover(f,dt,control,'SOURCE_FRONT_RELEASE_UNREACHABLE');}
    else{f.mode='unloaded';f.reason='SOURCE_FRONT_UNLOAD';f.influence=0;}
    if(control===0){f.hit=null;f.influence=0;f.effectiveWeight=0;f.mode='unloaded';}
   }
   else{
    if(f.mode==='release')this.recover(f,dt,control,f.reason??'SOURCE_RELEASE');
    if(f.mode==='free'||f.mode==='recovery'||f.mode==='unloaded'){
     const seed=this.support.probe(f.last??marker,.25,.70);
     if(seed&&marker.distanceTo(seed.point)<.03){f.hit=seed;f.target.copy(seed.point);f.normal.copy(seed.normal);f.mode='touch';f.influence=0;f.reason=null;}
     else if(!this.startSwing(f,frame.time,velocity,speed))this.recover(f,dt,control,'NO_FIXED_REACHABLE_SUPPORT');
    }
    const paw=f.bones.at(-1)!,scale=paw.getWorldScale(this.v()).x,third=f.bones.length===4?paw.getWorldPosition(this.v()).sub(f.bones[2].getWorldPosition(this.v())):this.v(),q=paw.getWorldQuaternion(this.q());
    if(f.mode==='stance'&&f.hit){
     const offsets=frame.stance>.4?{FL:0,FR:.5,HL:0,HR:.5}:{FL:0,FR:.5,HL:.75,HR:.25},phase=(frame.phase+offsets[f.name])%1;
     const reachable=this.reachable(f,this.ankle(f,f.target,f.normal,q).point,third,scale,.06);
     if(!reachable||moving&&phase>.64){if(!this.startSwing(f,frame.time,velocity,speed))this.recover(f,dt,control,'STEP_SUPPORT_UNAVAILABLE');}
    }
    if((f.mode==='stance'||f.mode==='touch'||f.mode==='swing')&&f.hit){
     let target=this.v(f.target);
     if(f.mode==='swing'){
      const t=Math.max(0,Math.min(1,(frame.time-f.at)/f.duration)),t2=t*t,t3=t2*t;
      target=this.v(f.start).multiplyScalar(2*t3-3*t2+1).addScaledVector(f.startVelocity,(t3-2*t2+t)*f.duration).addScaledVector(f.target,-2*t3+3*t2).addScaledVector(f.normal,.12*Math.sin(Math.PI*t)**2);
      if(t>=1){f.mode='touch';target.copy(f.target);}
     }
     f.influence=Math.min(1,f.influence+dt/.12);
     if(!this.solve(f,target,f.normal,ease(f.influence)*control))this.recover(f,dt,control,'FIXED_CHAIN_UNREACHABLE_RELEASE');
     else if(f.mode!=='swing')f.mode=f.effectiveWeight===1&&this.marker(f).distanceTo(f.target)<=1e-4?'stance':'touch';
    }
   }
   const final=this.marker(f);if(f.last&&dt>0)f.velocity.copy(final).sub(f.last).divideScalar(dt);else f.velocity.set(0,0,0);if(!f.last)f.last=new Vector3();f.last.copy(final);
  }
  this.diagnostic.queries=this.support.diagnostic.queries;this.diagnostic.reason=this.support.diagnostic.lastReason;
  // All four final poses (including a failed solve's source restoration) must
  // precede the inverse-cache refresh and every stored skin witness position.
  refreshSkinPose098(this.model);
  this.diagnostic.feet=this.feet.map(f=>({limb:f.name,mode:f.mode,reason:f.reason,weightedVertices:f.vertices,influence:f.influence,effectiveWeight:f.effectiveWeight,sourceMarker:f.sourcePoint.toArray(),sourceError:f.hit?f.sourcePoint.distanceTo(f.target):null,marker:this.marker(f).toArray(),target:f.hit?f.target.toArray():null,error:f.hit?this.marker(f).distanceTo(f.target):null,taskTarget:f.taskPoint?.toArray()??null,taskError:f.taskPoint?this.marker(f).distanceTo(f.taskPoint):null,sourceLengths:f.lengths.slice(),jointLengths:f.bones.slice(1).map(b=>b.position.length()),ankleReach:f.bones[0].getWorldPosition(this.v()).distanceTo(f.bones.at(-1)!.getWorldPosition(this.v())),translationLengthError:Math.max(...f.bones.slice(1).map((b,i)=>Math.abs(b.position.length()-f.lengths[i]))),support:f.hit?{...f.hit.lease}:null,skinWitness:this.skinWitness(f)}));
 }
}

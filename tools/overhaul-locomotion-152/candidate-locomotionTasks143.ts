import {AnimationClip,AnimationMixer,Bone,LoopOnce,Object3D,Quaternion,SkinnedMesh,Vector3,type AnimationAction} from 'three';
import {authoredFootPolicy123,type AuthoredGait123,type FootfallContributor123,type FootLimb123} from '../../src/game/entities/authoredFootfalls123';
import {refreshSkinPose098,type FootDiagnostic067,type FootFrame067} from '../../src/game/entities/movingRFfeet067';
import type {GroundHit067,GroundSupport067} from '../../src/game/entities/groundSupport067';
import {advanceHeading152,angle152,recoveryPoint152,type Recovery152} from './candidate-contactTasks152';

const limbs=['FL','FR','HL','HR'] as const,up=new Vector3(0,1,0);
const wrap=(p:number)=>p-Math.floor(p);
export interface SelectedTask143 {name:string;time:number;weight:number;additive?:boolean;}
export interface ReachTask143 {hip:Vector3;end:Vector3;minimum:number;maximum:number;}
/** Exact intersection of fixed-chain reach spheres with vertical body travel.
 * A near-folded chain can yield two disjoint intervals; retain both rather
 * than waive its inner limit. No cross-frame cache, clamping of limb targets,
 * bone scaling or global aesthetic body-drop coefficient. */
export function solveBodyLoad143(tasks:readonly ReachTask143[],desired:number):number|null{
 if(!Number.isFinite(desired))return null;
 let intervals:[number,number][]=[[-Infinity,Infinity]];
 for(const t of tasks){
  const x=t.hip.x-t.end.x,z=t.hip.z-t.end.z,y=t.hip.y-t.end.y,h2=x*x+z*z;
  if(![x,y,z,t.minimum,t.maximum].every(Number.isFinite)||t.minimum<0||t.maximum<=t.minimum||h2>=t.maximum*t.maximum)return null;
  const outer=Math.sqrt(t.maximum*t.maximum-h2),inner2=t.minimum*t.minimum-h2;
  const allowed:[number,number][]=inner2>0?[[-y-outer,-y-Math.sqrt(inner2)],[-y+Math.sqrt(inner2),-y+outer]]:[[-y-outer,-y+outer]];
  const next:[number,number][]=[];
  for(const a of intervals)for(const b of allowed){const lo=Math.max(a[0],b[0]),hi=Math.min(a[1],b[1]);if(lo<=hi)next.push([lo,hi]);}
  if(!next.length)return null;intervals=next;
 }
 let best:number|null=null;
 for(const [lo,hi] of intervals){const n=Math.max(lo,Math.min(hi,desired));if(best===null||Math.abs(n-desired)<Math.abs(best-desired))best=n;}
 return best;
}

/** Retained OFF source conventions measured in packet141. These distances are
 * unchanged author intent, NOT fitted contact certificates. Actual clocks are
 * read from the loaded tracks and must match the measured export. */
export function offGaits143(clips:readonly AnimationClip[],scale:number):Record<string,{measuredGait:AuthoredGait123}>{
 if(scale!==.8)throw Error('143_OFF_UNMEASURED_SCALE');
 const records=[
  ['FelineWalk',.7,.72,[0,.5,.75,.25],Math.fround(1/60),Math.fround(70/60)],
  ['FelineTrot',.55,1.1,[0,.5,.5,0],Math.fround(1/60),Math.fround(42/60)],
  ['FelineGallop',.44,1.66,[0,.08,.46,.54],Math.fround(1/60),Math.fround(31/60)],
  ['FelineUprightWalkLong',.70,1.15,[0,0,0,.5],0,Math.fround(1.2)],
  ['FelineUprightStride',.57,1.48,[0,0,0,.5],0,Math.fround(.9)],
 ] as const;
 const catalog:Record<string,{measuredGait:AuthoredGait123}>={};
 for(const [name,duty,stride,offsets,start,end] of records){
  const clip=clips.find(c=>c.name===name);if(!clip||clip.tracks.length!==75)throw Error('143_OFF_ACTUAL_CLIP_CONTRACT:'+name);
  const first=Math.min(...clip.tracks.map(t=>t.times[0])),last=Math.max(...clip.tracks.map(t=>t.times[t.times.length-1]));
  if(first!==start||last!==end)throw Error('143_OFF_ACTUAL_KEY_CLOCK:'+name);
  catalog[name]={measuredGait:{nativeDistancePerCycle:scale*stride/duty,sourceDuty:duty,sourceOffsets:Object.fromEntries(limbs.map((l,i)=>[l,wrap(-offsets[i])])) as Record<FootLimb123,number>,cycleStart:first,cycleEnd:last,unloadedLimbs:name.includes('Upright')?['FL','FR']:[]}};
 }
 return catalog;
}

/** Smooth adjacent source bands, using the same thresholds as existing OFF
 * gaitWeights. Pure selection; caller integrates the actual distance once. */
export function selectedGaits143(speed:number,topSpeed:number,stance:number):{name:string;weight:number}[]{
 const s=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},r=Math.max(0,speed)/topSpeed;
 const q=r<.16?[1,0,0]:r<.52?[1-s((r-.16)/.36),s((r-.16)/.36),0]:[0,1-s((r-.52)/.36),s((r-.52)/.36)];
 const u=s((speed-1.6)/.8);
 return [...['FelineWalk','FelineTrot','FelineGallop'].map((name,i)=>({name,weight:q[i]*(1-stance)})),{name:'FelineUprightWalkLong',weight:(1-u)*stance},{name:'FelineUprightStride',weight:u*stance}].filter(c=>c.weight>0);
}

type Witness143={mesh:SkinnedMesh;vertex:number;rest:Vector3};
type Foot143={name:FootLimb123;bones:Bone[];positions:Vector3[];scales:Vector3[];lengths:number[];sole:Vector3;vertices:number;witnesses:Witness143[];source:Vector3;task:Vector3;hit:GroundHit067|null;policy:ReturnType<typeof authoredFootPolicy123>;reason:string|null;last:Vector3|null;velocity:Vector3;lastHip:Vector3|null;lastSourceTask:Vector3|null;recovery:Recovery152|null;responseTarget:Vector3|null;};
export interface BodyDiagnostic143 {offset:number;desired:number;constraints:number;provenance:'CURRENT_FIXED_SUPPORT_AND_UNCHANGED_CHAIN_REACH';}
export type LocomotionDiagnostic143=FootDiagnostic067&{bodyTask143:BodyDiagnostic143;firstFailure143:string|null;currentFailure152:string|null;rejection152:unknown;bodyHeading152:{native:number;visual:number;lag:number;quarterTurnDuration:number;};taskProvenance143:'WEIGHTED_ACTUAL_CLIP_ENDPOINTS_BEFORE_FIXED_CHAIN_SOLVE';};

/** Separate sampling graph contains transforms only, never a second rendered
 * body or copied geometry. Each selected source contributes an actual endpoint
 * in current mount space. This removes nonlinear joint-crossfade endpoints. */
class SourceTasks143 {
 readonly graph:Object3D;private mount=new Object3D();private mixer:AnimationMixer;private actions=new Map<string,AnimationAction>();
 private arcs=new Map<string,Vector3[]>();
 constructor(model:Object3D,clips:readonly AnimationClip[]){
  const copy=(o:Object3D):Object3D=>{const n=o instanceof Bone?new Bone():new Object3D();n.name=o.name;n.position.copy(o.position);n.quaternion.copy(o.quaternion);n.scale.copy(o.scale);for(const c of o.children)n.add(copy(c));return n;};
  this.graph=copy(model);this.mount.matrixAutoUpdate=false;this.mount.add(this.graph);this.mixer=new AnimationMixer(this.graph);
  for(const c of clips){const a=this.mixer.clipAction(c).setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;a.setEffectiveWeight(0);this.actions.set(c.name,a);}
 }
 sample(model:Object3D,selected:readonly SelectedTask143[],feet:readonly Foot143[]):void{
  if(model.parent)this.mount.matrix.copy(model.parent.matrixWorld);else this.mount.matrix.identity();
  for(const f of feet)f.task.set(0,0,0);
  const bases=selected.filter(c=>!c.additive&&c.weight>0),sum=bases.reduce((v,c)=>v+c.weight,0);
  if(!sum)throw Error('143_NO_SOURCE_ENDPOINT_CONTRIBUTOR');
  for(const c of bases){
   for(const a of this.actions.values())a.setEffectiveWeight(0);
   for(const row of [c,...selected.filter(a=>a.additive&&a.weight>0)]){const a=this.actions.get(row.name);if(!a)throw Error('143_MISSING_ENDPOINT_ACTION:'+row.name);a.time=row.time;a.setEffectiveWeight(row.additive?row.weight:1);}
   this.mixer.update(0);this.mount.updateMatrixWorld(true);
   for(const f of feet){const paw=this.graph.getObjectByName(f.name+'_paw');if(!paw)throw Error('143_MISSING_ENDPOINT_BONE:'+f.name);f.task.addScaledVector(paw.localToWorld(f.sole.clone()),c.weight/sum);}
  }
 }
 /** Constructor topology is reused. Cache only 17 actual source positions per
  * clip/limb; no geometry copying or per-frame full-vertex sampling. */
 arc(model:Object3D,foot:Foot143,contributors:readonly FootfallContributor123[],progress:number):Vector3{
  const result=new Vector3();let weight=0;
  for(const c of contributors){const g=c.gait;if(!g||c.weight<=0||g.unloadedLimbs?.includes(foot.name))continue;
   const key=c.name+':'+foot.name;let samples=this.arcs.get(key);
   if(!samples){
    samples=[];for(const a of this.actions.values())a.setEffectiveWeight(0);const action=this.actions.get(c.name)!;action.setEffectiveWeight(1);
    for(let i=0;i<=16;i++){const p=wrap(g.sourceDuty!+(1-g.sourceDuty!)*i/16-g.sourceOffsets![foot.name]);action.time=g.cycleStart!+p*(g.cycleEnd!-g.cycleStart!);this.mixer.update(0);this.mount.updateMatrixWorld(true);const paw=this.graph.getObjectByName(foot.name+'_paw')!;samples.push(this.graph.worldToLocal(paw.localToWorld(foot.sole.clone())));}
    const start=samples[0],end=samples[16],v0=samples[1].clone().sub(start).multiplyScalar(16),v1=end.clone().sub(samples[15]).multiplyScalar(16);
    samples=samples.map((p,i)=>p.clone().sub(recoveryPoint152({start,velocity:v0,at:0,duration:1},end,v1,i/16,new Vector3())));this.arcs.set(key,samples);
   }
   const x=Math.max(0,Math.min(16,progress*16)),i=Math.min(15,Math.floor(x)),v=samples[i].clone().lerp(samples[i+1],x-i);result.addScaledVector(v,c.weight);weight+=c.weight;
  }
  if(weight)result.multiplyScalar(1/weight);const origin=model.localToWorld(new Vector3());return model.localToWorld(result).sub(origin);
 }
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.graph);}
}

/** Sole geometry is inspected once. At most five actual skin vertices per
 * paw are sampled after the final solve; no full-vertex per-frame work. */
export class LocomotionTasks143 {
 readonly diagnostic:LocomotionDiagnostic143={policy:'CURRENT_FIXED_SCENE_VISUAL_IK_NO_NATIVE_PAD_CERTIFICATE',geometry:'WEIGHTED_FOOT_LOWEST_POINT_INCLUDES_TOES_CLAWS',available:false,reason:null,queries:0,travelPhase:0,frameClock:0,presentationTime:0,life:-1,generation:-1,feet:[],bodyTask143:{offset:0,desired:0,constraints:0,provenance:'CURRENT_FIXED_SUPPORT_AND_UNCHANGED_CHAIN_REACH'},firstFailure143:null,currentFailure152:null,rejection152:null,bodyHeading152:{native:0,visual:0,lag:0,quarterTurnDuration:0},taskProvenance143:'WEIGHTED_ACTUAL_CLIP_ENDPOINTS_BEFORE_FIXED_CHAIN_SOLVE'};
 private feet:Foot143[]=[];private baseline=new Map<Bone,Quaternion>();private source:SourceTasks143;private life=-1;private generation=-1;
 private visualYaw=NaN;private lastTime=NaN;private lastLoad=0;private quarterTurnDuration:number;private previousRoot:Vector3|null=null;
 constructor(private model:Object3D,private support:GroundSupport067,clips:readonly AnimationClip[],private reserve:number){
  if(!(reserve>0&&reserve<=1))throw Error('143_INVALID_RIG_REACH_RESERVE');
  refreshSkinPose098(model);this.source=new SourceTasks143(model,clips);this.quarterTurnDuration=clips.find(c=>c.name==='FelineTurnLeft')?.duration??0;if(!(this.quarterTurnDuration>0))throw Error('152_ACTUAL_QUARTER_TURN_SOURCE_REQUIRED');
  for(const name of limbs){
   const hock=model.getObjectByName(name+'_hock'),chain=[name+'_upper',name+'_lower',...(hock?[name+'_hock']:[]),name+'_paw'].map(n=>model.getObjectByName(n));
   if(chain.some(b=>!(b instanceof Bone))||chain.slice(1).some((b,i)=>b!.parent!==chain[i])){this.diagnostic.reason='143_ACTUAL_CHAIN_CONTRACT';return;}
   const bones=chain as Bone[],paw=bones.at(-1)!,family=new Set<string>();paw.traverse(o=>{if(o instanceof Bone)family.add(o.name);});
   const vertices:{point:Vector3;w:Witness143}[]=[];
   model.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const p=o.geometry.getAttribute('position'),si=o.geometry.getAttribute('skinIndex'),sw=o.geometry.getAttribute('skinWeight');if(!p||!si||!sw)return;
    for(let i=0;i<p.count;i++){let owned=0;for(let k=0;k<4;k++)if(family.has(o.skeleton.bones[si.getComponent(i,k)]?.name))owned+=sw.getComponent(i,k);if(owned>.99){const rest=new Vector3().fromBufferAttribute(p,i),point=rest.clone();o.applyBoneTransform(i,point);o.localToWorld(point);vertices.push({point,w:{mesh:o,vertex:i,rest}});}}
   });
   if(vertices.length<4){this.diagnostic.reason='143_ACTUAL_SOLE_GEOMETRY_UNAVAILABLE';return;}
   const minY=Math.min(...vertices.map(v=>v.point.y)),band=vertices.filter(v=>v.point.y<=minY+.002),sole=new Vector3();for(const v of band)sole.add(v.point);sole.multiplyScalar(1/band.length);sole.y=minY;
   const witnesses=new Set<Witness143>();for(const axis of ['x','z','y'] as const){let lo=band[0],hi=band[0];for(const v of band){if(v.point[axis]<lo.point[axis])lo=v;if(v.point[axis]>hi.point[axis])hi=v;}witnesses.add(lo.w);if(axis!=='y')witnesses.add(hi.w);}
   this.feet.push({name,bones,positions:bones.map(b=>b.position.clone()),scales:bones.map(b=>b.scale.clone()),lengths:bones.slice(1).map(b=>b.position.length()),sole:paw.worldToLocal(sole),vertices:vertices.length,witnesses:[...witnesses],source:new Vector3(),task:new Vector3(),hit:null,policy:'source-only',reason:null,last:null,velocity:new Vector3(),lastHip:null,lastSourceTask:null,recovery:null,responseTarget:null});
  }
  this.diagnostic.available=this.feet.length===4;
 }
 restoreSource(){for(const [b,q] of this.baseline)b.quaternion.copy(q);}
 private clear(){for(const f of this.feet){f.hit=null;f.reason=null;f.recovery=null;f.responseTarget=null;f.last=null;f.lastHip=null;f.lastSourceTask=null;f.velocity.set(0,0,0);}this.diagnostic.feet=[];}
 private capture(){for(const f of this.feet)for(const b of f.bones){let q=this.baseline.get(b);if(!q){q=new Quaternion();this.baseline.set(b,q);}q.copy(b.quaternion);}}
 private marker(f:Foot143){return f.bones.at(-1)!.localToWorld(f.sole.clone());}
 private currentSkinSole(f:Foot143):Vector3{
  const points=f.witnesses.map(w=>{const p=w.rest.clone();w.mesh.applyBoneTransform(w.vertex,p);return w.mesh.localToWorld(p);});
  const low=Math.min(...points.map(p=>p.y)),band=points.filter(p=>p.y<=low+.002),center=new Vector3();for(const p of band)center.add(p);center.multiplyScalar(1/band.length);center.y=low;return center;
 }
 private worldRotation(b:Bone,q:Quaternion){b.quaternion.copy(b.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);}
 private aim(b:Bone,child:Bone,point:Vector3){const origin=b.getWorldPosition(new Vector3()),a=child.getWorldPosition(new Vector3()).sub(origin),d=point.clone().sub(origin);if(a.lengthSq()<1e-12||d.lengthSq()<1e-12)return false;this.worldRotation(b,new Quaternion().setFromUnitVectors(a.normalize(),d.normalize()).multiply(b.getWorldQuaternion(new Quaternion())));return true;}
 private request(f:Foot143,target:Vector3,normal:Vector3,contact=true){
  const paw=f.bones.at(-1)!,q=new Quaternion().setFromUnitVectors(up,normal).multiply(paw.getWorldQuaternion(new Quaternion())),scale=paw.getWorldScale(new Vector3());
  const ankle=target.clone().sub(f.sole.clone().multiply(scale).applyQuaternion(q)),third=f.bones.length===4?paw.getWorldPosition(new Vector3()).sub(f.bones[2].getWorldPosition(new Vector3())):new Vector3();
  const l1=f.lengths[0]*scale.x,l2=f.lengths[1]*scale.x;
  const epsilon=this.reserve<1?.0001:1e-5;
  return {hip:f.bones[0].getWorldPosition(new Vector3()),end:ankle.clone().sub(third),ankle,q,minimum:Math.abs(l1-l2)+epsilon,maximum:Math.min(l1+l2-epsilon,(l1+l2)*(contact?this.reserve:1)-epsilon),l1,l2};
 }
 private solve(f:Foot143,target:Vector3,normal:Vector3):boolean{
  const r=this.request(f,target,normal,!!f.hit),delta=r.end.clone().sub(r.hip),distance=delta.length();if(distance<=r.minimum||distance>=r.maximum)return false;
  const axis=delta.divideScalar(distance),pole=f.bones[1].getWorldPosition(new Vector3()).sub(r.hip);pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-10)return false;
  const along=(r.l1*r.l1-r.l2*r.l2+distance*distance)/(2*distance),knee=r.hip.clone().addScaledVector(axis,along).addScaledVector(pole.normalize(),Math.sqrt(Math.max(0,r.l1*r.l1-along*along)));
  if(!this.aim(f.bones[0],f.bones[1],knee)||!this.aim(f.bones[1],f.bones[2],r.end))return false;
  if(f.bones.length===4&&!this.aim(f.bones[2],f.bones[3],r.ankle))return false;this.worldRotation(f.bones.at(-1)!,r.q);return this.marker(f).distanceTo(target)<=1e-4;
 }
 private reject152(frame:FootFrame067,reason:string,selected:readonly SelectedTask143[],branch:string):void{
  const d=this.diagnostic;d.currentFailure152=reason;d.firstFailure143??=reason;
  if(!d.rejection152)d.rejection152={reason,branch,time:frame.time,frameClock:frame.frameClock,life:frame.life,phase:frame.phase,rootPosition:frame.rootPosition.toArray(),nativeYaw:frame.rootYaw,visualYaw:this.visualYaw,contributors:selected.map(c=>({...c})),footfalls:frame.footfalls?.map(c=>({...c,gait:c.gait?{...c.gait,sourceOffsets:{...c.gait.sourceOffsets}}:null})),feet:this.feet.map(f=>{const target=f.hit?.point??f.responseTarget??f.task,r=this.request(f,target,f.hit?.normal??up,!!f.hit);return {limb:f.name,sourcePolicy:f.policy,contactEvent:f.reason,hip:r.hip.toArray(),endpoint:r.end.toArray(),target:target.toArray(),lastMarker:f.last?.toArray(),lastVelocity:f.velocity.toArray(),anchor:f.hit?.point.toArray(),support:f.hit?{...f.hit.lease}:null,minimum:r.minimum,maximum:r.maximum,bodyMinimum:r.minimum+2e-5,bodyMaximum:r.maximum-2e-5,horizontalSquared:(r.hip.x-r.end.x)**2+(r.hip.z-r.end.z)**2};})};
 }
 step(frame:FootFrame067,mount:Object3D,selected:readonly SelectedTask143[]):void{
  this.capture();this.support.begin(frame.frameClock,frame.time,frame.life);const d=this.diagnostic,generation=this.support.diagnostic.generation;
  const reset=frame.reset||frame.life!==this.life||generation!==this.generation;
  if(reset){this.clear();this.visualYaw=frame.rootYaw;this.lastLoad=0;this.lastTime=frame.time;this.previousRoot=null;}this.life=frame.life;this.generation=generation;
  const elapsed=Number.isFinite(this.lastTime)?Math.max(0,frame.time-this.lastTime):0;this.lastTime=frame.time;
  const travelSpeed=this.previousRoot&&elapsed>0?Math.hypot(frame.rootPosition.x-this.previousRoot.x,frame.rootPosition.z-this.previousRoot.z)/elapsed:0;this.previousRoot=frame.rootPosition.clone();
  if(!Number.isFinite(this.visualYaw))this.visualYaw=frame.rootYaw;
  Object.assign(d,{frameClock:frame.frameClock,presentationTime:frame.time,travelPhase:frame.phase,life:frame.life,generation,reason:null,currentFailure152:null});d.bodyTask143.offset=d.bodyTask143.desired=d.bodyTask143.constraints=0;
  const oldPosition=mount.position.clone(),oldRotation=mount.quaternion.clone(),parentRotation=mount.parent?.getWorldQuaternion(new Quaternion())??new Quaternion();
  const setYaw=(yaw:number)=>{const correction=new Quaternion().setFromAxisAngle(up,angle152(yaw-frame.rootYaw));mount.quaternion.copy(parentRotation.clone().invert().multiply(correction).multiply(parentRotation).multiply(oldRotation));this.model.updateWorldMatrix(true,true);};
  const desiredYaw=advanceHeading152(this.visualYaw,frame.rootYaw,elapsed,this.quarterTurnDuration);
  const retained=(yaw:number)=>{setYaw(yaw);const tasks=this.feet.filter(f=>f.hit&&authoredFootPolicy123(f.name,frame.footfalls??[])==='stance'&&this.support.validate(f.hit!.lease)).map(f=>this.request(f,f.hit!.point,f.hit!.normal));return solveBodyLoad143(tasks.map(t=>({...t,minimum:t.minimum+2e-5,maximum:t.maximum-2e-5})),this.lastLoad)!==null;};
  // The closest reachable body orientation, inside a continuous source-turn
  // rate, is selected BEFORE the weighted endpoint graph is sampled.
  if(retained(desiredYaw))this.visualYaw=desiredYaw;
  else if(retained(this.visualYaw)){let lo=0,hi=1;const start=this.visualYaw,delta=angle152(desiredYaw-start);for(let i=0;i<10;i++){const m=(lo+hi)/2;if(retained(start+delta*m))lo=m;else hi=m;}this.visualYaw=start+delta*lo;}
  setYaw(this.visualYaw);Object.assign(d.bodyHeading152,{native:frame.rootYaw,visual:this.visualYaw,lag:angle152(frame.rootYaw-this.visualYaw),quarterTurnDuration:this.quarterTurnDuration});
  if(!frame.eligible||!frame.grounded){this.clear();d.reason='SOURCE_ACTION_ONLY_CONTACT_UNQUALIFIED';d.queries=this.support.diagnostic.queries;return;}
  if(!d.available){this.reject152(frame,d.reason??'152_GEOMETRY_UNAVAILABLE',selected,'GEOMETRY_ADMISSION');return;}
  for(const f of this.feet)for(let i=0;i<f.bones.length;i++)if(f.bones[i].position.distanceTo(f.positions[i])>2e-5||f.bones[i].scale.distanceTo(f.scales[i])>2e-5){this.reject152(frame,'152_SOURCE_LOCAL_TRANSLATION_OR_SCALE_CHANGED',selected,'SOURCE_ADMISSION');this.clear();return;}
  refreshSkinPose098(this.model);for(const f of this.feet){const skin=this.currentSkinSole(f);f.sole.copy(f.bones.at(-1)!.worldToLocal(skin.clone()));f.source.copy(skin);}
  this.source.sample(this.model,selected,this.feet);
  const beginRecovery=(f:Foot143,reason:string)=>{
   if(!f.recovery&&f.last){const durations=(frame.footfalls??[]).filter(c=>c.weight>0&&c.gait).map(c=>(1-c.gait!.sourceDuty!)*(travelSpeed>0?c.gait!.nativeDistancePerCycle/travelSpeed:c.gait!.cycleEnd!-c.gait!.cycleStart!));if(!durations.length)throw Error('152_RECOVERY_REQUIRES_ACTUAL_SOURCE_SWING_CLOCK');f.recovery={start:f.last.clone(),velocity:f.velocity.clone(),at:frame.time-elapsed,duration:Math.min(...durations)};}
   f.hit=null;f.reason=reason;
  };
  for(const f of this.feet){
   f.policy=authoredFootPolicy123(f.name,frame.footfalls??[]);f.reason=null;f.responseTarget=null;
   if(f.hit){
    const r=this.request(f,f.hit.point,f.hit.normal),hip=r.hip.clone().addScaledVector(up,this.lastLoad),observed=f.lastHip?hip.distanceTo(f.lastHip):0,margin=r.maximum-hip.distanceTo(r.end);
    if(f.policy!=='stance')beginRecovery(f,'152_AUTHORED_'+f.policy.toUpperCase()+'_RELEASE');
    else if(!this.support.validate(f.hit.lease))beginRecovery(f,'152_CURRENT_SUPPORT_RETIRED_RELEASE');
    else if(margin<=observed)beginRecovery(f,'152_OBSERVED_WORKSPACE_BUDGET_RELEASE');
   }
   if(f.recovery){const u=Math.max(0,Math.min(1,(frame.time-f.recovery.at)/f.recovery.duration)),goalVelocity=f.lastSourceTask&&elapsed>0?f.task.clone().sub(f.lastSourceTask).divideScalar(elapsed):new Vector3(),arc=this.source.arc(this.model,f,frame.footfalls??[],u);f.responseTarget=recoveryPoint152(f.recovery,f.task,goalVelocity,frame.time,arc);f.reason??='152_CONTINUOUS_SOURCE_ARC_RECOVERY';if(u===1){f.recovery=null;f.responseTarget=null;}}
  }
  const candidates=new Map<Foot143,GroundHit067>(),constraints:ReachTask143[]=[];let desired=0,total=0;
  for(const f of this.feet){
   if(f.recovery&&f.responseTarget){constraints.push(this.request(f,f.responseTarget,up,false));continue;}
   if(f.policy!=='stance'){constraints.push(this.request(f,f.task,up,false));continue;}
   const hit=f.hit??this.support.probe(f.task,.25,.70);if(!hit){f.reason='152_CURRENT_SUPPORT_UNAVAILABLE';continue;}
   candidates.set(f,hit);constraints.push(this.request(f,hit.point,hit.normal));desired+=hit.point.y-f.task.y;total++;
  }
  desired=total?desired/total:0;d.bodyTask143.desired=desired;d.bodyTask143.constraints=constraints.length;
  const load=solveBodyLoad143(constraints.map(t=>({...t,minimum:t.minimum+2e-5,maximum:t.maximum-2e-5})),desired);
  if(load===null){this.reject152(frame,'152_NO_COMMON_BODY_TASK',selected,'BODY_REACH_INTERSECTION');this.restoreSource();mount.position.copy(oldPosition);this.clear();d.reason=d.currentFailure152;refreshSkinPose098(this.model);return;}
  const localUp=up.clone().applyQuaternion(parentRotation.clone().invert());mount.position.addScaledVector(localUp,load);this.model.updateWorldMatrix(true,true);d.bodyTask143.offset=load;this.lastLoad=load;
  for(const f of this.feet){
   // Body load moves the hip, not the world-space recovery/source floor task.
   const candidate=candidates.get(f),translated=f.task.clone();
   if(candidate&&!f.hit&&!f.recovery&&translated.distanceTo(candidate.point)<.03)f.hit=candidate;
   const target=f.hit?.point??f.responseTarget??translated,normal=f.hit?.normal??up;f.responseTarget=target.clone();
   if(!this.solve(f,target,normal)){this.reject152(frame,'152_FIXED_CHAIN_TASK_UNREACHABLE:'+f.name,selected,'FINAL_FIXED_CHAIN_SOLVE');this.restoreSource();mount.position.copy(oldPosition);refreshSkinPose098(this.model);d.reason=d.currentFailure152;d.bodyTask143.offset=0;this.clear();return;}
  }
  refreshSkinPose098(this.model);
  d.feet=this.feet.map(f=>{
   const marker=this.marker(f),paw=f.bones.at(-1)!,hip=f.bones[0].getWorldPosition(new Vector3()),points=f.bones.map(b=>b.getWorldPosition(new Vector3())),target=f.responseTarget!;
   const row={limb:f.name,mode:f.hit?'stance' as const:f.recovery?'recovery' as const:f.policy==='unloaded'?'unloaded' as const:f.policy==='swing'?'swing' as const:'free' as const,reason:f.reason,weightedVertices:f.vertices,influence:f.hit?1:0,effectiveWeight:1,sourceMarker:f.source.toArray(),sourceError:f.hit?f.source.distanceTo(f.hit.point):null,marker:marker.toArray(),target:f.hit?.point.toArray()??null,error:f.hit?marker.distanceTo(f.hit.point):null,taskTarget:target.toArray(),taskError:marker.distanceTo(target),sourceLengths:f.lengths.slice(),jointLengths:points.slice(1).map((p,i)=>p.distanceTo(points[i])),ankleReach:hip.distanceTo(paw.getWorldPosition(new Vector3())),translationLengthError:Math.max(...f.bones.map((b,i)=>b.position.distanceTo(f.positions[i]))),support:f.hit?.lease??null,skinWitness:{provenance:'CURRENT_FINAL_BONE_BIND_SKIN_SUBSET' as const,fullFootEnvelope:false as const,points:f.witnesses.map(w=>{const p=w.rest.clone();w.mesh.applyBoneTransform(w.vertex,p);w.mesh.localToWorld(p);return {mesh:w.mesh.uuid,geometry:w.mesh.geometry.uuid,vertex:w.vertex,position:p.toArray(),supportNormalGap:f.hit?p.clone().sub(f.hit.point).dot(f.hit.normal):null};})}};
   f.velocity=f.last&&elapsed>0?marker.clone().sub(f.last).divideScalar(elapsed):new Vector3();f.last=marker;f.lastHip=hip;f.lastSourceTask=f.task.clone();return row;
  });d.queries=this.support.diagnostic.queries;
 }
 dispose(){this.source.dispose();}
}

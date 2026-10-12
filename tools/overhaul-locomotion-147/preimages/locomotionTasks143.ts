import {AnimationClip,AnimationMixer,Bone,LoopOnce,Object3D,Quaternion,SkinnedMesh,Vector3,type AnimationAction} from 'three';
import {authoredFootPolicy123,type AuthoredGait123,type FootfallContributor123,type FootLimb123} from './authoredFootfalls123';
import {refreshSkinPose098,type FootDiagnostic067,type FootFrame067} from './movingRFfeet067';
import type {GroundHit067,GroundSupport067} from './groundSupport067';

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
type Foot143={name:FootLimb123;bones:Bone[];positions:Vector3[];scales:Vector3[];lengths:number[];sole:Vector3;vertices:number;witnesses:Witness143[];source:Vector3;task:Vector3;hit:GroundHit067|null;policy:ReturnType<typeof authoredFootPolicy123>;reason:string|null;};
export interface BodyDiagnostic143 {offset:number;desired:number;constraints:number;provenance:'CURRENT_FIXED_SUPPORT_AND_UNCHANGED_CHAIN_REACH';}
export type LocomotionDiagnostic143=FootDiagnostic067&{bodyTask143:BodyDiagnostic143;firstFailure143:string|null;taskProvenance143:'WEIGHTED_ACTUAL_CLIP_ENDPOINTS_BEFORE_FIXED_CHAIN_SOLVE';};

/** Separate sampling graph contains transforms only, never a second rendered
 * body or copied geometry. Each selected source contributes an actual endpoint
 * in current mount space. This removes nonlinear joint-crossfade endpoints. */
class SourceTasks143 {
 readonly graph:Object3D;private mount=new Object3D();private mixer:AnimationMixer;private actions=new Map<string,AnimationAction>();
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
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.graph);}
}

/** Sole geometry is inspected once. At most five actual skin vertices per
 * paw are sampled after the final solve; no full-vertex per-frame work. */
export class LocomotionTasks143 {
 readonly diagnostic:LocomotionDiagnostic143={policy:'CURRENT_FIXED_SCENE_VISUAL_IK_NO_NATIVE_PAD_CERTIFICATE',geometry:'WEIGHTED_FOOT_LOWEST_POINT_INCLUDES_TOES_CLAWS',available:false,reason:null,queries:0,travelPhase:0,frameClock:0,presentationTime:0,life:-1,generation:-1,feet:[],bodyTask143:{offset:0,desired:0,constraints:0,provenance:'CURRENT_FIXED_SUPPORT_AND_UNCHANGED_CHAIN_REACH'},firstFailure143:null,taskProvenance143:'WEIGHTED_ACTUAL_CLIP_ENDPOINTS_BEFORE_FIXED_CHAIN_SOLVE'};
 private feet:Foot143[]=[];private baseline=new Map<Bone,Quaternion>();private source:SourceTasks143;private life=-1;private generation=-1;
 constructor(private model:Object3D,private support:GroundSupport067,clips:readonly AnimationClip[],private reserve:number){
  if(!(reserve>0&&reserve<=1))throw Error('143_INVALID_RIG_REACH_RESERVE');
  refreshSkinPose098(model);this.source=new SourceTasks143(model,clips);
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
   this.feet.push({name,bones,positions:bones.map(b=>b.position.clone()),scales:bones.map(b=>b.scale.clone()),lengths:bones.slice(1).map(b=>b.position.length()),sole:paw.worldToLocal(sole),vertices:vertices.length,witnesses:[...witnesses],source:new Vector3(),task:new Vector3(),hit:null,policy:'source-only',reason:null});
  }
  this.diagnostic.available=this.feet.length===4;
 }
 restoreSource(){for(const [b,q] of this.baseline)b.quaternion.copy(q);}
 private clear(){for(const f of this.feet){f.hit=null;f.reason=null;}this.diagnostic.feet=[];}
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
 step(frame:FootFrame067,mount:Object3D,selected:readonly SelectedTask143[]):void{
  this.capture();this.support.begin(frame.frameClock,frame.time,frame.life);const d=this.diagnostic,generation=this.support.diagnostic.generation;
  if(frame.reset||frame.life!==this.life||generation!==this.generation)this.clear();this.life=frame.life;this.generation=generation;
  Object.assign(d,{frameClock:frame.frameClock,presentationTime:frame.time,travelPhase:frame.phase,life:frame.life,generation,reason:null});d.bodyTask143.offset=d.bodyTask143.desired=d.bodyTask143.constraints=0;
  if(!frame.eligible||!frame.grounded){this.clear();d.reason='SOURCE_ACTION_ONLY';d.queries=this.support.diagnostic.queries;return;}
  if(!d.available){d.firstFailure143??=d.reason??'143_GEOMETRY_UNAVAILABLE';return;}
  for(const f of this.feet)for(let i=0;i<f.bones.length;i++)if(f.bones[i].position.distanceTo(f.positions[i])>2e-5||f.bones[i].scale.distanceTo(f.scales[i])>2e-5){d.firstFailure143??='143_SOURCE_LOCAL_TRANSLATION_OR_SCALE_CHANGED';this.clear();return;}
  refreshSkinPose098(this.model);for(const f of this.feet){const skin=this.currentSkinSole(f);f.sole.copy(f.bones.at(-1)!.worldToLocal(skin.clone()));f.source.copy(skin);}
  this.source.sample(this.model,selected,this.feet);
  const constraints:ReachTask143[]=[],candidates=new Map<Foot143,GroundHit067>();let desired=0,total=0;
  for(const f of this.feet){
   f.policy=authoredFootPolicy123(f.name,frame.footfalls??[]);f.reason=null;
   if(f.policy!=='stance'){f.hit=null;continue;}
   if(f.hit&&!this.support.validate(f.hit.lease))f.hit=null;
   const hit=f.hit??this.support.probe(f.task,.25,.70);if(!hit){f.reason='143_CURRENT_SUPPORT_UNAVAILABLE';continue;}
   candidates.set(f,hit);constraints.push(this.request(f,hit.point,hit.normal));
   desired+=(hit.point.y-f.task.y);total++;
  }
  desired=total?desired/total:0;d.bodyTask143.desired=desired;d.bodyTask143.constraints=constraints.length;
  // Move into the INTERIOR of the unchanged limits by only floating-point
  // safety (2e-5). It does not enlarge any admitted workspace.
  const load=solveBodyLoad143(constraints.map(t=>({...t,minimum:t.minimum+2e-5,maximum:t.maximum-2e-5})),desired);
  const oldPosition=mount.position.clone();
  if(load===null){d.firstFailure143??='143_NO_COMMON_BODY_LOAD_FOR_FIXED_CHAINS';this.clear();d.reason=d.firstFailure143;return;}
  // Native root and carrier are never translated. This is the existing visual
  // mount's declared constraint-derived body task, expressed in parent space.
  const localUp=mount.parent?up.clone().applyQuaternion(mount.parent.getWorldQuaternion(new Quaternion()).invert()):up;
  mount.position.addScaledVector(localUp,load);this.model.updateWorldMatrix(true,true);d.bodyTask143.offset=load;
  let failure:string|null=null;
  for(const f of this.feet){
   const candidate=candidates.get(f),translated=f.task.clone().addScaledVector(up,load);
   if(candidate&&!f.hit&&translated.distanceTo(candidate.point)<.03)f.hit=candidate;
   const target=f.hit?.point??translated,normal=f.hit?.normal??up;
   if(!this.solve(f,target,normal)){failure='143_FIXED_CHAIN_TASK_UNREACHABLE:'+f.name;break;}
  }
  if(failure){this.restoreSource();mount.position.copy(oldPosition);refreshSkinPose098(this.model);d.firstFailure143??=failure;d.reason=failure;d.bodyTask143.offset=0;this.clear();return;}
  refreshSkinPose098(this.model);
  d.feet=this.feet.map(f=>{
   const marker=this.marker(f),paw=f.bones.at(-1)!,hip=f.bones[0].getWorldPosition(new Vector3()),points=f.bones.map(b=>b.getWorldPosition(new Vector3()));
   return {limb:f.name,mode:f.hit?'stance':f.policy==='unloaded'?'unloaded':f.policy==='swing'?'swing':'free',reason:f.reason,weightedVertices:f.vertices,influence:f.hit?1:0,effectiveWeight:1,sourceMarker:f.source.toArray(),sourceError:f.hit?f.source.distanceTo(f.hit.point):null,marker:marker.toArray(),target:f.hit?.point.toArray()??null,error:f.hit?marker.distanceTo(f.hit.point):null,taskTarget:f.hit?.point.toArray()??f.task.clone().addScaledVector(up,load).toArray(),taskError:marker.distanceTo(f.hit?.point??f.task.clone().addScaledVector(up,load)),sourceLengths:f.lengths.slice(),jointLengths:points.slice(1).map((p,i)=>p.distanceTo(points[i])),ankleReach:hip.distanceTo(paw.getWorldPosition(new Vector3())),translationLengthError:Math.max(...f.bones.map((b,i)=>b.position.distanceTo(f.positions[i]))),support:f.hit?.lease??null,skinWitness:{provenance:'CURRENT_FINAL_BONE_BIND_SKIN_SUBSET',fullFootEnvelope:false,points:f.witnesses.map(w=>{const p=w.rest.clone();w.mesh.applyBoneTransform(w.vertex,p);w.mesh.localToWorld(p);return {mesh:w.mesh.uuid,geometry:w.mesh.geometry.uuid,vertex:w.vertex,position:p.toArray(),supportNormalGap:f.hit?p.clone().sub(f.hit.point).dot(f.hit.normal):null};})}};
  });d.queries=this.support.diagnostic.queries;
 }
 dispose(){this.source.dispose();}
}

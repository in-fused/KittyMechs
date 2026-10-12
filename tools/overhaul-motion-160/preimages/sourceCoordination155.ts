import {Bone,Object3D,SkinnedMesh,Vector3,type AnimationAction,type AnimationClip} from 'three';
import type {AuthoredGait123,FootLimb123} from './authoredFootfalls123';
import {refreshSkinPose098} from './movingRFfeet067';
import type {SourceCatalog154} from './sourcePresentation154';
import type {GroundHit067,GroundSupport067} from './groundSupport067';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';

const limbs=['FL','FR','HL','HR'] as const;
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
type Witness={mesh:SkinnedMesh;index:number;rest:Vector3};
/** Source event alignment only: all selected cycles share the HL touchdown
 * clock. Each clip retains its real intra-cycle fore/hind offsets and duty. */
export function sourceCyclePhase155(phase:number,gait:AuthoredGait123):number{
 const offset=gait.sourceOffsets?.HL;if(offset===undefined)throw Error('155_MISSING_ACTUAL_HIND_EVENT');
 return ((phase-offset)%1+1)%1;
}

/** Visual mount coordination, never native motion or a world-contact owner.
 * Sole points are actual attached skin, reduced once by identical-weight hulls.
 * Height is a source-load presentation, not a terrain/support certificate. */
export class SourceCoordination155{
 private feet:{limb:FootLimb123;points:Witness[]}[]=[];
 private yaw:number|null=null;private height=0;private previous:Vector3|null=null;
 private surface:GroundHit067|null=null;
 private margin=0;
 private point=new Vector3();private leftTurn:number;private rightTurn:number;
 readonly diagnostic={policy:'SOURCE_EVENT_AND_SOLE_MOUNT155',contactQualified:false,visualYaw:0,nativeYaw:0,signedDistance:0,height:0,targetHeight:0,requestedHeight:0,margin:0,authoredLoad:0,suspension:false,soleSamples:0,queries:0,surface:null as GroundHit067['lease']|null,reason:null as string|null,soleProvenance:'CURRENT_ATTACHED_SKIN_IDENTICAL_WEIGHT_CONVEX_VERTICES_EXACT_FOOT_FAMILY_PLANE_EXTREMA_NOT_NATIVE_CONTACT'};
 constructor(private model:Object3D,clips:readonly AnimationClip[]){
  const turn=(name:string)=>{const c=clips.find(c=>c.name===name);if(!c||!Number.isFinite(c.duration)||c.duration<=0)throw Error('155_MISSING_ACTUAL_TURN:'+name);return c.duration;};
  this.leftTurn=turn('FelineTurnLeft');this.rightTurn=turn('FelineTurnRight');
  refreshSkinPose098(model);
  for(const limb of limbs){
   const paw=model.getObjectByName(limb+'_paw');if(!(paw instanceof Bone))throw Error('155_MISSING_ACTUAL_PAW:'+limb);
   const family=new Set<string>();paw.traverse(b=>{if(b instanceof Bone)family.add(b.name);});
   const candidates:Witness[]=[],groups=new Map<string,Witness[]>();
   model.traverse(o=>{if(!(o instanceof SkinnedMesh))return;const p=o.geometry.getAttribute('position'),ix=o.geometry.getAttribute('skinIndex'),weights=o.geometry.getAttribute('skinWeight');
    for(let i=0;i<p.count;i++){let owned=0;for(let j=0;j<4;j++)if(family.has(o.skeleton.bones[ix.getComponent(i,j)]?.name))owned+=weights.getComponent(i,j);if(owned>.99){const w={mesh:o,index:i,rest:new Vector3().fromBufferAttribute(p,i)};candidates.push(w);const key=o.uuid+':'+[0,1,2,3].flatMap(j=>[ix.getComponent(i,j),weights.getComponent(i,j)]).join(',');const group=groups.get(key)??[];group.push(w);groups.set(key,group);}}
   });
   if(candidates.length<4)throw Error('155_MISSING_ACTUAL_SOLE:'+limb);
   const selected=new Set<Witness>();
   for(const group of groups.values()){
    // Equal four-joint weights produce one affine map of rest POSITION.
    // Its plane minimum is attained at a convex-hull vertex for every pose.
    // Degenerate groups retain all vertices; no guessed extrema are admitted.
    if(group.length<4){for(const w of group)selected.add(w);continue;}
    try{const byPoint=new Map(group.map(w=>[w.rest,w])),hull=new ConvexHull().setFromPoints(group.map(w=>w.rest));if(!hull.faces.length)throw Error('DEGENERATE_FOOT_WEIGHT_GROUP');for(const face of hull.faces){let edge=face.edge;do{selected.add(byPoint.get(edge.vertex.point)!);edge=edge.next;}while(edge!==face.edge);}}
    catch{for(const w of group)selected.add(w);}
   }
   this.feet.push({limb,points:[...selected]});
  }
 }
 heading(nativeYaw:number,position:{x:number;y:number;z:number},distance:number,dt:number,reset:boolean,eligible:boolean):number{
  if(reset||this.yaw===null||!eligible){this.yaw=nativeYaw;this.height=0;this.previous=null;}
  const delta=angle(nativeYaw-this.yaw),duration=delta>=0?this.leftTurn:this.rightTurn;
  // Authored quarter-turn rate bounds the visual body; confirmed translation
  // and native heading remain immediate. This has no body extrapolation.
  this.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),Math.max(0,dt)*(Math.PI/2)/duration);
  const dot=this.previous?-(position.x-this.previous.x)*Math.sin(this.yaw)-(position.z-this.previous.z)*Math.cos(this.yaw):0;
  if(!this.previous)this.previous=new Vector3();this.previous.set(position.x,position.y,position.z);
  Object.assign(this.diagnostic,{visualYaw:this.yaw,nativeYaw,signedDistance:dot<0?-distance:distance});return this.yaw;
 }
 observeSurface(support:GroundSupport067|undefined,frameClock:number,time:number,life:number,root:Object3D,height:number,margin:number):void{
  this.margin=margin;this.diagnostic.margin=margin;
  this.surface=null;Object.assign(this.diagnostic,{queries:0,surface:null,reason:'NO_CURRENT_SCENE_SUPPORT'});
  if(!support||!Number.isFinite(margin)||margin<=0)return;support.begin(frameClock,time,life);const hit=support.probe(root.position,height,height*2);
  this.diagnostic.queries=support.diagnostic.queries;
  if(hit&&support.validate(hit.lease)){this.surface=hit;this.diagnostic.surface={...hit.lease};this.diagnostic.reason=null;}
 }
 place(actions:Iterable<readonly[string,AnimationAction]>,catalog:SourceCatalog154,body:Object3D,dt:number,stance:number):void{
  if(!this.surface){this.height=0;body.position.y=0;Object.assign(this.diagnostic,{height:0,targetHeight:0,authoredLoad:0,suspension:false,soleSamples:0});refreshSkinPose098(this.model);return;}
  body.position.y=0;refreshSkinPose098(this.model);const loads=new Map<FootLimb123,number>(limbs.map(l=>[l,0]));let response=0,weight=0;
  for(const [name,a] of actions){const w=a.getEffectiveWeight(),g=catalog[name]?.measuredGait;if(w<=0||!g?.sourceOffsets||g.sourceDuty===undefined)continue;
   const start=Math.fround(g.cycleStart!),end=Math.fround(g.cycleEnd!),phase=(a.time-start)/(end-start);response+=w*(end-start)*(1-g.sourceDuty);weight+=w;
   for(const limb of limbs){if(g.unloadedLimbs?.includes(limb))continue;const local=((phase+g.sourceOffsets[limb])%1+1)%1;const load=local<g.sourceDuty?Math.sin(Math.PI*local/g.sourceDuty)**2:0;loads.set(limb,loads.get(limb)!+w*load);}
  }
  // Idle has no footfall metadata; its loaded source sole sets the mount.
  if(weight===0){for(const l of limbs)loads.set(l,l.startsWith('F')?1-stance:1);response=this.leftTurn;weight=1;}
  const surface=this.surface;let sum=0,total=0,count=0;for(const foot of this.feet){const load=loads.get(foot.limb)!;if(load<=0)continue;let low=Infinity;for(const w of foot.points){this.point.copy(w.rest);w.mesh.applyBoneTransform(w.index,this.point);w.mesh.localToWorld(this.point);low=Math.min(low,this.point.sub(surface.point).dot(surface.normal)/surface.normal.y);count++;}sum+=low*load;total+=load;}
  // Genuine authored all-limb suspension releases the mount toward the source
  // basis on its authored recovery interval; it never pulls swing feet down.
  const requested=total>0?-sum/total:0;
  // The native rounded border is the unchanged available visual-placement
  // margin, not a newly enlarged reach. Beyond it, return toward uncorrected
  // source continuously and expose the unmet request rather than clamp a paw.
  const target=Math.abs(requested)<=this.margin?requested:0;
  if(target!==requested)this.diagnostic.reason='SOURCE_MOUNT_OUTSIDE_NATIVE_BORDER_MARGIN';
  const duration=response/weight;if(!Number.isFinite(target)||!Number.isFinite(duration)||duration<=0)throw Error('155_INVALID_SOURCE_MOUNT');
  this.height+=(target-this.height)*(1-Math.exp(-Math.max(0,dt)/duration));body.position.y=this.height;
  Object.assign(this.diagnostic,{height:this.height,targetHeight:target,requestedHeight:requested,authoredLoad:total,suspension:total===0,soleSamples:count});refreshSkinPose098(this.model);
 }
}

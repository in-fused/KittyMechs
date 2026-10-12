import {Bone,Matrix4,Object3D,SkinnedMesh,Vector3,type AnimationAction,type AnimationClip,type Skeleton} from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';
import {authoredFootPolicy123,selectedFootfalls123,type AuthoredGait123,type FootLimb123} from '../../src/game/entities/authoredFootfalls123';
import {refreshSkinPose098} from '../../src/game/entities/movingRFfeet067';
import type {SourceCatalog154} from '../../src/game/entities/sourcePresentation154';
import type {GroundHit067,GroundSupport067} from '../../src/game/entities/groundSupport067';
const limbs=['FL','FR','HL','HR'] as const,up=new Vector3(0,1,0);
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function sourceCyclePhase164(phase:number,gait:AuthoredGait123):number{const offset=gait.sourceOffsets?.HL;if(offset===undefined)throw Error('164_MISSING_ACTUAL_HIND_EVENT');return ((phase-offset)%1+1)%1;}
type Group164={mesh:SkinnedMesh;indices:number[];weights:number[];points:Float64Array;affine:Matrix4};
type Mesh164={mesh:SkinnedMesh;skeleton:Skeleton;bind:Matrix4;geometry:SkinnedMesh['geometry'];attributes:{name:string;attribute:any;array:unknown;version:number}[]};
type Skeleton164={skeleton:Skeleton;bones:Bone[];inverses:Matrix4[];inverseValues:Matrix4[];maps:Matrix4[]};
const normalizeAffine=(m:Matrix4)=>{const e=m.elements,w=e[15];for(let c=0;c<4;c++)for(let r=0;r<3;r++)e[c*4+r]/=w;e[15]=1;return m;};
const affine=(m:Matrix4)=>{const e=m.elements;if(!e.every(Number.isFinite)||e[3]!==0||e[7]!==0||e[11]!==0||e[15]===0)throw Error('164_NONFINITE_OR_NONAFFINE_SKIN_MAP');};

/** Identical exact 4-weight groups are affine maps of POSITION. Plane minima
 * require scalar dot products over their convex vertices, not vertex skinning.
 * Maps are rebuilt once per current pose; no cross-frame admission cache. */
export class SkinSole164{
 private groups=new Map<FootLimb123,Group164[]>();private meshes:Mesh164[]=[];private skeletons:Skeleton164[]=[];private weighted=new Matrix4();private post=new Matrix4();private inverse=new Matrix4();
 readonly counts={groups:0,vertices:0,meshes:0,skeletons:0};
 constructor(private model:Object3D){
  refreshSkinPose098(model);const meshSet=new Set<SkinnedMesh>(),skeletonSet=new Set<Skeleton>();
  for(const limb of limbs){const paw=model.getObjectByName(limb+'_paw');if(!(paw instanceof Bone))throw Error('164_MISSING_ACTUAL_PAW:'+limb);const family=new Set<string>();paw.traverse(b=>{if(b instanceof Bone)family.add(b.name);});const result:Group164[]=[];
   model.traverse(mesh=>{if(!(mesh instanceof SkinnedMesh))return;const p=mesh.geometry.getAttribute('position'),ix=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');if(!p||!ix||!w)throw Error('164_MISSING_SKIN_LAYOUT');const bins=new Map<string,{indices:number[];weights:number[];points:Vector3[]}>();
    for(let i=0;i<p.count;i++){const indices=[0,1,2,3].map(j=>ix.getComponent(i,j)),weights=[0,1,2,3].map(j=>w.getComponent(i,j));let owned=0;for(let j=0;j<4;j++)if(family.has(mesh.skeleton.bones[indices[j]]?.name))owned+=weights[j];if(owned<=.99)continue;const key=indices.join(',')+':'+weights.join(',');let bin=bins.get(key);if(!bin){bin={indices,weights,points:[]};bins.set(key,bin);}bin.points.push(new Vector3().fromBufferAttribute(p,i));}
    for(const bin of bins.values()){let points=bin.points;try{if(points.length>=4){const hull=new ConvexHull().setFromPoints(points),vertices=new Set<Vector3>();for(const f of hull.faces){let e=f.edge;do{vertices.add(e.vertex.point);e=e.next;}while(e!==f.edge);}if(vertices.size)points=[...vertices];}}catch{/* Degenerate groups retain every original point. */}
     const packed=new Float64Array(points.length*3);points.forEach((p,i)=>(packed[i*3]=p.x,packed[i*3+1]=p.y,packed[i*3+2]=p.z));result.push({mesh,indices:bin.indices,weights:bin.weights,points:packed,affine:new Matrix4()});this.counts.groups++;this.counts.vertices+=points.length;meshSet.add(mesh);skeletonSet.add(mesh.skeleton);
    }
   });if(!result.length)throw Error('164_MISSING_ACTUAL_FOOT_FAMILY:'+limb);this.groups.set(limb,result);
  }
  this.meshes=[...meshSet].map(mesh=>({mesh,skeleton:mesh.skeleton,bind:mesh.bindMatrix.clone(),geometry:mesh.geometry,attributes:['position','skinIndex','skinWeight'].map(name=>{const attribute=mesh.geometry.getAttribute(name) as any;return {name,attribute,array:attribute.array??attribute.data?.array,version:attribute.version??attribute.data?.version};})}));
  this.skeletons=[...skeletonSet].map(skeleton=>({skeleton,bones:[...skeleton.bones],inverses:[...skeleton.boneInverses],inverseValues:skeleton.boneInverses.map(m=>m.clone()),maps:skeleton.bones.map(()=>new Matrix4())}));this.counts.meshes=this.meshes.length;this.counts.skeletons=this.skeletons.length;
 }
 beginPose(refresh=true):void{
  if(refresh)refreshSkinPose098(this.model);
  for(const s of this.skeletons){if(s.skeleton.bones.length!==s.bones.length||s.skeleton.boneInverses.length!==s.inverses.length)throw Error('164_SKIN_LAYOUT_MUTATION');for(let i=0;i<s.bones.length;i++){if(s.skeleton.bones[i]!==s.bones[i]||s.skeleton.boneInverses[i]!==s.inverses[i]||!s.inverses[i].equals(s.inverseValues[i]))throw Error('164_SKIN_OWNER_ORDER_OR_INVERSE_MUTATION');affine(s.bones[i].matrixWorld);s.maps[i].multiplyMatrices(s.bones[i].matrixWorld,s.inverses[i]);affine(s.maps[i]);normalizeAffine(s.maps[i]);}}
  for(const m of this.meshes){if(m.mesh.skeleton!==m.skeleton||m.mesh.geometry!==m.geometry||!m.mesh.bindMatrix.equals(m.bind)||m.attributes.some(a=>m.geometry.getAttribute(a.name)!==a.attribute||(a.attribute.array??a.attribute.data?.array)!==a.array||(a.attribute.version??a.attribute.data?.version)!==a.version))throw Error('164_MESH_BIND_OR_LAYOUT_MUTATION');affine(m.mesh.matrixWorld);affine(m.mesh.bindMatrix);affine(m.mesh.bindMatrixInverse);this.inverse.copy(m.mesh.bindMode==='attached'?m.mesh.matrixWorld:m.mesh.bindMode==='detached'?m.mesh.bindMatrix:(()=>{throw Error('164_UNKNOWN_BIND_MODE');})()).invert();if(!m.mesh.bindMatrixInverse.equals(this.inverse))throw Error('164_STALE_ATTACHED_BIND_INVERSE');}
  for(const groups of this.groups.values())for(const g of groups){const s=this.skeletons.find(s=>s.skeleton===g.mesh.skeleton)!;const e=this.weighted.elements;e.fill(0);e[15]=1;for(let j=0;j<4;j++){const weight=g.weights[j];if(weight===0)continue;const map=s.maps[g.indices[j]];if(!map||!Number.isFinite(weight)||weight<0)throw Error('164_INVALID_SKIN_WEIGHT_MAP');for(let c=0;c<4;c++)for(let r=0;r<3;r++)e[c*4+r]+=weight*map.elements[c*4+r];}
   // Each Vector3.applyMatrix4 divides by its finite constant homogeneous w.
   // normalizeAffine incorporates that exact division, including inversion
   // roundoff in attached matrices; it does not alter source/bind matrices.
   // Three treats the weighted xyz sum as a Vector3 (homogeneous w=1), even
   // when Float32 weights sum very slightly away from one. No renormalization.
   this.post.multiplyMatrices(g.mesh.matrixWorld,g.mesh.bindMatrixInverse);normalizeAffine(this.post);this.inverse.copy(g.mesh.bindMatrix);normalizeAffine(this.inverse);g.affine.multiplyMatrices(this.post,this.weighted).multiply(this.inverse);
  }
 }
 minimum(limb:FootLimb123,point:Vector3,normal:Vector3):{gap:number;world:Vector3;vertices:number}{
  let best=Infinity,winner:Group164|undefined,index=0,count=0;const d=normal.dot(point);
  for(const g of this.groups.get(limb)!){const e=g.affine.elements,a=normal.x*e[0]+normal.y*e[1]+normal.z*e[2],b=normal.x*e[4]+normal.y*e[5]+normal.z*e[6],c=normal.x*e[8]+normal.y*e[9]+normal.z*e[10],k=normal.x*e[12]+normal.y*e[13]+normal.z*e[14]-d;for(let i=0;i<g.points.length;i+=3){const gap=a*g.points[i]+b*g.points[i+1]+c*g.points[i+2]+k;if(gap<best){best=gap;winner=g;index=i;}count++;}}
  if(!winner||!Number.isFinite(best))throw Error('164_INVALID_CURRENT_SOLE');return {gap:best,world:new Vector3().fromArray(winner.points,index).applyMatrix4(winner.affine),vertices:count};
 }
}

export class SourceCoordination164{
 readonly soles:SkinSole164;private yaw:number|null=null;private height=0;private previous:Vector3|null=null;private support?:GroundSupport067;private margin=0;private probeHeight=0;private root?:Object3D;private leftTurn:number;private rightTurn:number;
 readonly diagnostic={policy:'FINAL_SOURCE_ROLE_FOOTPRINT_SUPPORT_AFFINE164',contactQualified:false,visualYaw:0,nativeYaw:0,signedDistance:0,height:0,targetHeight:0,requestedHeight:0,margin:0,authoredLoad:0,suspension:false,queries:0,soleSamples:0,reason:null as string|null,basis:null as {frameClock:number;time:number;life:number;root:number[];probeHeight:number;margin:number}|null,foreRoleBasis:null as {stance:number;uprightClips:string[];arc:{time:number;weight:number}|null}|null,feet:[] as {limb:FootLimb123;role:string;load:number;sole:number[];gap:number|null;requested:number|null;surface:GroundHit067['lease']|null;surfacePoint:number[]|null;surfaceNormal:number[]|null;reason:string|null}[]};
 constructor(private model:Object3D,clips:readonly AnimationClip[]){const duration=(n:string)=>{const c=clips.find(c=>c.name===n);if(!c||c.duration<=0)throw Error('164_MISSING_ACTUAL_TURN:'+n);return c.duration;};this.leftTurn=duration('FelineTurnLeft');this.rightTurn=duration('FelineTurnRight');this.soles=new SkinSole164(model);}
 heading(nativeYaw:number,position:{x:number;y:number;z:number},distance:number,dt:number,reset:boolean,eligible:boolean):number{
  if(reset||this.yaw===null||!eligible){this.yaw=nativeYaw;this.height=0;this.previous=null;}const delta=angle(nativeYaw-this.yaw),duration=delta>=0?this.leftTurn:this.rightTurn;this.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),Math.max(0,dt)*(Math.PI/2)/duration);const dot=this.previous?-(position.x-this.previous.x)*Math.sin(this.yaw)-(position.z-this.previous.z)*Math.cos(this.yaw):0;if(!this.previous)this.previous=new Vector3();this.previous.set(position.x,position.y,position.z);
  this.support=undefined;this.root=undefined;Object.assign(this.diagnostic,{visualYaw:this.yaw,nativeYaw,signedDistance:dot<0?-distance:distance,height:this.height,targetHeight:0,requestedHeight:0,authoredLoad:0,suspension:false,queries:0,soleSamples:0,reason:eligible?'AWAITING_CURRENT_SOURCE_SAMPLE':'INACTIVE_SOURCE_MOUNT',basis:null,feet:[],foreRoleBasis:null});return this.yaw;
 }
 observeSurface(support:GroundSupport067|undefined,frameClock:number,time:number,life:number,root:Object3D,height:number,margin:number):void{
  this.support=support;this.root=root;this.margin=margin;this.probeHeight=height;this.diagnostic.margin=margin;this.diagnostic.basis={frameClock,time,life,root:root.position.toArray(),probeHeight:height,margin};
  if(support&&Number.isFinite(height)&&height>0&&Number.isFinite(margin)&&margin>0)support.begin(frameClock,time,life);else{this.support=undefined;this.diagnostic.reason='UNKNOWN_CURRENT_NATIVE_BODY_OR_SUPPORT';}
 }
 place(actions:Iterable<readonly[string,AnimationAction]>,catalog:SourceCatalog154,body:Object3D,dt:number,stance:number):void{
  body.position.y=0;this.soles.beginPose();const selected=[...actions].filter(([,a])=>a.getEffectiveWeight()>0),contributors=selectedFootfalls123(selected,catalog),upright=selected.filter(([name])=>name.startsWith('FelineUpright')).map(([name])=>name),arc=selected.find(([name])=>name==='FelineTransitionArc106');this.diagnostic.foreRoleBasis={stance,uprightClips:upright,arc:arc?{time:arc[1].time,weight:arc[1].getEffectiveWeight()}:null};
  const unknown=contributors.some(c=>!c.gait&&!c.name.endsWith('Idle')),idle=contributors.length>0&&contributors.every(c=>c.name.endsWith('Idle')),moving=contributors.filter(c=>!c.name.endsWith('Idle'));let interval=0,weight=0;for(const c of contributors)if(c.gait){interval+=c.weight*(Math.fround(c.gait.cycleEnd!)-Math.fround(c.gait.cycleStart!))*(1-c.gait.sourceDuty!);weight+=c.weight;}const duration=weight?interval/weight:this.leftTurn;
  const requests:number[]=[],feet:typeof this.diagnostic.feet=[];let total=0,count=0,allSuspended=true,compatible=!!this.support&&!!this.root;const axis=body.parent?new Vector3(0,1,0).transformDirection(body.parent.matrixWorld):up;
  for(const limb of limbs){let role=idle?'stance':authoredFootPolicy123(limb,moving);if(limb.startsWith('F')&&(stance>0||upright.length>0))role='unloaded';if(unknown)role='source-only';const sole=this.soles.minimum(limb,new Vector3(),up);count+=sole.vertices;let load=0;
   if(role==='stance'){if(idle)load=1;else for(const c of contributors){if(!c.gait){if(c.name.endsWith('Idle'))load+=c.weight;continue;}const g=c.gait;const phase=((c.phase!+g.sourceOffsets![limb])%1+1)%1;load+=c.weight*Math.sin(Math.PI*phase/g.sourceDuty!)**2;}}
   // A contributor-specific swing keeps the final blended limb in recovery.
   // This is distinct from actual all-contributor/all-limb suspension.
   if(contributors.some(c=>c.gait&&!c.gait.unloadedLimbs?.includes(limb)&&((c.phase!+c.gait.sourceOffsets![limb])%1+1)%1<c.gait.sourceDuty!))allSuspended=false;
   const row={limb,role,load,sole:sole.world.toArray(),gap:null as number|null,requested:null as number|null,surface:null as GroundHit067['lease']|null,surfacePoint:null as number[]|null,surfaceNormal:null as number[]|null,reason:null as string|null};
   if(load>0){total+=load;const hit=this.support?.probe(sole.world,this.probeHeight,this.probeHeight*2);if(!hit||!this.support!.validate(hit.lease)){row.reason='UNKNOWN_CURRENT_FOOTPRINT_SUPPORT';compatible=false;}else{row.surface={...hit.lease};row.surfacePoint=hit.point.toArray();row.surfaceNormal=hit.normal.toArray();const projected=this.soles.minimum(limb,hit.point,hit.normal);count+=projected.vertices;const denominator=hit.normal.dot(axis);row.gap=projected.gap;row.requested=-projected.gap/denominator;const rootGap=new Vector3().copy(this.root!.position).sub(hit.point).dot(hit.normal)/denominator;
     if(!Number.isFinite(row.requested)||denominator<=0||Math.abs(rootGap)>this.margin){row.reason='CURRENT_NATIVE_BODY_FOOTPRINT_BASIS_INCOMPATIBLE';compatible=false;}requests.push(row.requested);
    }}feet.push(row);
  }
  const requested=requests.length?Math.max(...requests):0;let reason=unknown?'UNDECLARED_SOURCE_LOAD':total===0?(allSuspended?'AUTHORED_SUSPENSION':'SOURCE_RECOVERY_OR_LOAD_TRANSFER'):compatible?null:'UNKNOWN_OR_INCOMPATIBLE_FOOTPRINT_SUPPORT';if(requests.length&&Math.max(...requests)-Math.min(...requests)>this.margin){compatible=false;reason='INCOMPATIBLE_LOADED_FOOTPRINT_HEIGHTS';}if(Math.abs(requested)>this.margin){compatible=false;reason='SOURCE_MOUNT_OUTSIDE_NATIVE_BORDER_MARGIN';}const target=compatible&&total>0&&!unknown?requested:0;
  if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(target))throw Error('164_INVALID_SOURCE_MOUNT');this.height+=(target-this.height)*(1-Math.exp(-Math.max(0,dt)/duration));if(!this.support)this.height=0;body.position.y=this.height;refreshSkinPose098(this.model);
  Object.assign(this.diagnostic,{height:this.height,targetHeight:target,requestedHeight:requested,authoredLoad:total,suspension:allSuspended&&!idle,queries:this.support?.diagnostic.queries??0,soleSamples:count,reason,feet});
 }
}


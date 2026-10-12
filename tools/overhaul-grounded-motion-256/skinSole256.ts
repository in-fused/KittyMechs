import {Bone,Matrix4,Object3D,SkinnedMesh,Vector3,type AnimationAction,type AnimationClip,type Skeleton} from 'three';
import {ConvexHull} from 'three/examples/jsm/math/ConvexHull.js';
import {authoredFootPolicy123,selectedFootfalls123,type AuthoredGait123,type FootLimb123} from '../../src/game/entities/authoredFootfalls123';
import {refreshSkinPose098} from '../../src/game/entities/movingRFfeet067';
import type {SourceCatalog154} from '../../src/game/entities/sourcePresentation154';
import type {GroundHit067,GroundSupport067} from '../../src/game/entities/groundSupport067';
const limbs=['FL','FR','HL','HR'] as const,up=new Vector3(0,1,0);
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function sourceCyclePhase164(phase:number,gait:AuthoredGait123):number{const offset=gait.sourceOffsets?.HL;if(offset===undefined)throw Error('164_MISSING_ACTUAL_HIND_EVENT');return ((phase-offset)%1+1)%1;}
type Group164={mesh:SkinnedMesh;indices:number[];weights:number[];points:Float64Array;vertexIndices:number[];affine:Matrix4;meshWorld:Matrix4;boneWorlds:Matrix4[];inversePose:Matrix4};
type Mesh164={mesh:SkinnedMesh;skeleton:Skeleton;bind:Matrix4;geometry:SkinnedMesh['geometry'];attributes:{name:string;attribute:any;array:unknown;version:number}[]};
type Skeleton164={skeleton:Skeleton;bones:Bone[];inverses:Matrix4[];inverseValues:Matrix4[];maps:Matrix4[];worlds:Matrix4[]};
const normalizeAffine=(m:Matrix4)=>{const e=m.elements,w=e[15];for(let c=0;c<4;c++)for(let r=0;r<3;r++)e[c*4+r]/=w;e[15]=1;return m;};
const affine=(m:Matrix4)=>{const e=m.elements;if(!e.every(Number.isFinite)||e[3]!==0||e[7]!==0||e[11]!==0||e[15]===0)throw Error('164_NONFINITE_OR_NONAFFINE_SKIN_MAP');};

/** Identical exact 4-weight groups are affine maps of POSITION. Plane minima
 * require scalar dot products over their convex vertices, not vertex skinning.
 * Maps are rebuilt once per current pose; no cross-frame admission cache. */
export type MaterialPoint250=Readonly<{limb:FootLimb123;meshUUID:string;geometryUUID:string;vertexIndex:number;groupIndex:number}>;
export class SkinSole256{
 private ready256=false;private hasMaps256=false;
 readonly work256={begins:0,boneMaps:0,reusedBoneMaps:0,groupMaps:0,reusedGroupMaps:0,invalidations:0};
 invalidatePose256(){this.ready256=false;this.work256.invalidations++;}
 private requirePose256(){if(!this.ready256)throw Error("256_POSE_WRITE_REQUIRES_REFRESH");}
 private points250=new WeakMap<MaterialPoint250,{group:Group164;offset:number}>();
 private groups=new Map<FootLimb123,Group164[]>();private meshes:Mesh164[]=[];private skeletons:Skeleton164[]=[];private weighted=new Matrix4();private post=new Matrix4();private inverse=new Matrix4();
 readonly counts={groups:0,vertices:0,meshes:0,skeletons:0};
 constructor(private model:Object3D){
  refreshSkinPose098(model);const meshSet=new Set<SkinnedMesh>(),skeletonSet=new Set<Skeleton>();
  for(const limb of limbs){const paw=model.getObjectByName(limb+'_paw');if(!(paw instanceof Bone))throw Error('164_MISSING_ACTUAL_PAW:'+limb);const family=new Set<string>();paw.traverse(b=>{if(b instanceof Bone)family.add(b.name);});const result:Group164[]=[];
   model.traverse(mesh=>{if(!(mesh instanceof SkinnedMesh))return;const p=mesh.geometry.getAttribute('position'),ix=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');if(!p||!ix||!w)throw Error('164_MISSING_SKIN_LAYOUT');const bins=new Map<string,{indices:number[];weights:number[];points:Vector3[];original:Map<Vector3,number>}>();
    for(let i=0;i<p.count;i++){const indices=[0,1,2,3].map(j=>ix.getComponent(i,j)),weights=[0,1,2,3].map(j=>w.getComponent(i,j));let owned=0;for(let j=0;j<4;j++)if(family.has(mesh.skeleton.bones[indices[j]]?.name))owned+=weights[j];if(owned<=.99)continue;const key=indices.join(',')+':'+weights.join(',');let bin=bins.get(key);if(!bin){bin={indices,weights,points:[],original:new Map()};bins.set(key,bin);}const point=new Vector3().fromBufferAttribute(p,i);bin.points.push(point);bin.original.set(point,i);}
    for(const bin of bins.values()){let points=bin.points;try{if(points.length>=4){const hull=new ConvexHull().setFromPoints(points),vertices=new Set<Vector3>();for(const f of hull.faces){let e=f.edge;do{vertices.add(e.vertex.point);e=e.next;}while(e!==f.edge);}if(vertices.size)points=[...vertices];}}catch{/* Degenerate groups retain every original point. */}
     const packed=new Float64Array(points.length*3);points.forEach((p,i)=>(packed[i*3]=p.x,packed[i*3+1]=p.y,packed[i*3+2]=p.z));result.push({mesh,indices:bin.indices,weights:bin.weights,points:packed,vertexIndices:points.map(point=>bin.original.get(point)!),affine:new Matrix4(),meshWorld:new Matrix4(),boneWorlds:bin.indices.map(()=>new Matrix4()),inversePose:new Matrix4()});this.counts.groups++;this.counts.vertices+=points.length;meshSet.add(mesh);skeletonSet.add(mesh.skeleton);
    }
   });if(!result.length)throw Error('164_MISSING_ACTUAL_FOOT_FAMILY:'+limb);this.groups.set(limb,result);
  }
  this.meshes=[...meshSet].map(mesh=>({mesh,skeleton:mesh.skeleton,bind:mesh.bindMatrix.clone(),geometry:mesh.geometry,attributes:['position','skinIndex','skinWeight'].map(name=>{const attribute=mesh.geometry.getAttribute(name) as any;return {name,attribute,array:attribute.array??attribute.data?.array,version:attribute.version??attribute.data?.version};})}));
  this.skeletons=[...skeletonSet].map(skeleton=>({skeleton,bones:[...skeleton.bones],inverses:[...skeleton.boneInverses],inverseValues:skeleton.boneInverses.map(m=>m.clone()),maps:skeleton.bones.map(()=>new Matrix4()),worlds:skeleton.bones.map(()=>new Matrix4())}));this.counts.meshes=this.meshes.length;this.counts.skeletons=this.skeletons.length;
 }
 beginPose(refresh=true):void{
  this.work256.begins++;this.ready256=false;
  try{
  if(refresh)refreshSkinPose098(this.model);
  for(const s of this.skeletons){if(s.skeleton.bones.length!==s.bones.length||s.skeleton.boneInverses.length!==s.inverses.length)throw Error('164_SKIN_LAYOUT_MUTATION');for(let i=0;i<s.bones.length;i++){if(s.skeleton.bones[i]!==s.bones[i]||s.skeleton.boneInverses[i]!==s.inverses[i]||!s.inverses[i].equals(s.inverseValues[i]))throw Error('164_SKIN_OWNER_ORDER_OR_INVERSE_MUTATION');affine(s.bones[i].matrixWorld);if(!this.hasMaps256||!s.worlds[i].equals(s.bones[i].matrixWorld)){s.maps[i].multiplyMatrices(s.bones[i].matrixWorld,s.inverses[i]);this.work256.boneMaps++;}else this.work256.reusedBoneMaps++;affine(s.maps[i]);normalizeAffine(s.maps[i]);}}
  for(const m of this.meshes){if(m.mesh.skeleton!==m.skeleton||m.mesh.geometry!==m.geometry||!m.mesh.bindMatrix.equals(m.bind)||m.attributes.some(a=>m.geometry.getAttribute(a.name)!==a.attribute||(a.attribute.array??a.attribute.data?.array)!==a.array||(a.attribute.version??a.attribute.data?.version)!==a.version))throw Error('164_MESH_BIND_OR_LAYOUT_MUTATION');affine(m.mesh.matrixWorld);affine(m.mesh.bindMatrix);affine(m.mesh.bindMatrixInverse);this.inverse.copy(m.mesh.bindMode==='attached'?m.mesh.matrixWorld:m.mesh.bindMode==='detached'?m.mesh.bindMatrix:(()=>{throw Error('164_UNKNOWN_BIND_MODE');})()).invert();if(!m.mesh.bindMatrixInverse.equals(this.inverse))throw Error('164_STALE_ATTACHED_BIND_INVERSE');}
  for(const groups of this.groups.values())for(const g of groups){if(this.hasMaps256&&g.meshWorld.equals(g.mesh.matrixWorld)&&g.inversePose.equals(g.mesh.bindMatrixInverse)&&g.indices.every((index,j)=>g.boneWorlds[j].equals(g.mesh.skeleton.bones[index].matrixWorld))){this.work256.reusedGroupMaps++;continue;}this.work256.groupMaps++;const s=this.skeletons.find(s=>s.skeleton===g.mesh.skeleton)!;const e=this.weighted.elements;e.fill(0);e[15]=1;for(let j=0;j<4;j++){const weight=g.weights[j];if(weight===0)continue;const map=s.maps[g.indices[j]];if(!map||!Number.isFinite(weight)||weight<0)throw Error('164_INVALID_SKIN_WEIGHT_MAP');for(let c=0;c<4;c++)for(let r=0;r<3;r++)e[c*4+r]+=weight*map.elements[c*4+r];}
   // Each Vector3.applyMatrix4 divides by its finite constant homogeneous w.
   // normalizeAffine incorporates that exact division, including inversion
   // roundoff in attached matrices; it does not alter source/bind matrices.
   // Three treats the weighted xyz sum as a Vector3 (homogeneous w=1), even
   // when Float32 weights sum very slightly away from one. No renormalization.
   this.post.multiplyMatrices(g.mesh.matrixWorld,g.mesh.bindMatrixInverse);normalizeAffine(this.post);this.inverse.copy(g.mesh.bindMatrix);normalizeAffine(this.inverse);g.affine.multiplyMatrices(this.post,this.weighted).multiply(this.inverse);g.meshWorld.copy(g.mesh.matrixWorld);g.inversePose.copy(g.mesh.bindMatrixInverse);g.indices.forEach((index,j)=>g.boneWorlds[j].copy(g.mesh.skeleton.bones[index].matrixWorld));
  }
  for(const s of this.skeletons)s.bones.forEach((bone,i)=>s.worlds[i].copy(bone.matrixWorld));
  this.hasMaps256=this.ready256=true;
  }catch(error){this.hasMaps256=this.ready256=false;throw error;}
 }
 selectMaterialPoint250(limb:FootLimb123,point:Vector3,normal:Vector3):MaterialPoint250{
  this.requirePose256();let best=Infinity,winner:Group164|undefined,offset=0,groupIndex=0;
  const groups=this.groups.get(limb)!;
  for(let j=0;j<groups.length;j++){const g=groups[j];for(let i=0;i<g.points.length;i+=3){const gap=new Vector3().fromArray(g.points,i).applyMatrix4(g.affine).sub(point).dot(normal);if(gap<best){best=gap;winner=g;offset=i;groupIndex=j;}}}
  if(!winner||!Number.isFinite(best))throw Error('250_INVALID_MATERIAL_SELECTION');
  const handle=Object.freeze({limb,meshUUID:winner.mesh.uuid,geometryUUID:winner.mesh.geometry.uuid,vertexIndex:winner.vertexIndices[offset/3],groupIndex});this.points250.set(handle,{group:winner,offset});return handle;
 }
 sampleMaterialPoint250(handle:MaterialPoint250):Vector3{
  this.requirePose256();const bound=this.points250.get(handle);if(!bound)throw Error('250_FOREIGN_MATERIAL_POINT');
  const g=bound.group,p=g.mesh.geometry.getAttribute('position'),ix=g.mesh.geometry.getAttribute('skinIndex'),w=g.mesh.geometry.getAttribute('skinWeight');
  if(g.mesh.uuid!==handle.meshUUID||g.mesh.geometry.uuid!==handle.geometryUUID||!g.meshWorld.equals(g.mesh.matrixWorld)||g.indices.some((index,j)=>!g.boneWorlds[j].equals(g.mesh.skeleton.bones[index].matrixWorld)))throw Error('250_STALE_MATERIAL_MAP');
  for(let j=0;j<3;j++)if(p.getComponent(handle.vertexIndex,j)!==g.points[bound.offset+j])throw Error('250_MATERIAL_POSITION_MUTATED');
  for(let j=0;j<4;j++)if(ix.getComponent(handle.vertexIndex,j)!==g.indices[j]||w.getComponent(handle.vertexIndex,j)!==g.weights[j])throw Error('250_MATERIAL_WEIGHTS_MUTATED');
  return new Vector3().fromArray(g.points,bound.offset).applyMatrix4(g.affine);
 }
 minimum(limb:FootLimb123,point:Vector3,normal:Vector3):{gap:number;world:Vector3;vertices:number}{
  this.requirePose256();let best=Infinity,winner:Group164|undefined,index=0,count=0;const d=normal.dot(point);
  for(const g of this.groups.get(limb)!){const e=g.affine.elements,a=normal.x*e[0]+normal.y*e[1]+normal.z*e[2],b=normal.x*e[4]+normal.y*e[5]+normal.z*e[6],c=normal.x*e[8]+normal.y*e[9]+normal.z*e[10],k=normal.x*e[12]+normal.y*e[13]+normal.z*e[14]-d;for(let i=0;i<g.points.length;i+=3){const gap=a*g.points[i]+b*g.points[i+1]+c*g.points[i+2]+k;if(gap<best){best=gap;winner=g;index=i;}count++;}}
  if(!winner||!Number.isFinite(best))throw Error('164_INVALID_CURRENT_SOLE');return {gap:best,world:new Vector3().fromArray(winner.points,index).applyMatrix4(winner.affine),vertices:count};
 }
}


import {Box3,InterleavedBufferAttribute,Matrix4,Mesh,SkinnedMesh,Vector3,type Bone,type BufferAttribute,type BufferGeometry,type Object3D,type Skeleton} from 'three';
import type {VisualEnvelope,VisualEnvelopeSample} from './visualEnvelope';

type Attribute=BufferAttribute|InterleavedBufferAttribute;
interface SavedAttribute {name:string;attribute:Attribute;array:ArrayLike<number>;version:number;}
interface BoneBox {bone:Bone;parent:Object3D|null;box:Box3;inverse:number[];}
interface Binding {mesh:Mesh;parent:Object3D|null;geometry:BufferGeometry;attributes:SavedAttribute[];positionMagnitude:number;box:Box3;skin?:{skeleton:Skeleton;bones:Bone[];inverses:number[][];bind:number[];boxes:BoneBox[];sMin:number;sMax:number};}
interface Prepared {bindings:Binding[];matrix:Matrix4;point:Vector3;convex:Box3;work:Box3;aggregate:Box3;origin:Vector3;}
export interface WeightedVisualEnvelope007 extends VisualEnvelope {readonly weightSumRanges:readonly {mesh:string;min:number;max:number}[];}
const preparations=new WeakMap<WeightedVisualEnvelope007,Prepared>(),samples=new WeakMap<VisualEnvelopeSample,WeightedVisualEnvelope007>();
// A conservative highp Float32 arithmetic budget for this shader's finite
// affine operations, including uploaded matrix coefficient rounding. It is
// geometric padding, never a skin-weight acceptance tolerance.
const U=2**-24,G=128*U/(1-128*U);
function fail(s:string):never {throw new Error(`Weighted visual envelope007: ${s}`);}
function finitePoint(p:Vector3):void {if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)||!Number.isFinite(Math.fround(p.x))||!Number.isFinite(Math.fround(p.y))||!Number.isFinite(Math.fround(p.z)))fail('nonfinite/Float32-overflow point');}
function affine(m:Matrix4):void {const e=m.elements;for(const n of e)if(!Number.isFinite(n)||!Number.isFinite(Math.fround(n)))fail('nonfinite/Float32-overflow matrix');if(e[3]!==0||e[7]!==0||e[11]!==0||Math.fround(e[15])!==1)fail('unsupported projective matrix');if(m.determinant()===0)fail('singular matrix');}
function same(m:Matrix4,a:readonly number[]):void {for(let i=0;i<16;i++)if(m.elements[i]!==a[i])fail('binding matrix changed; reprepare');}
function array(a:Attribute):ArrayLike<number>{return a instanceof InterleavedBufferAttribute?a.data.array:a.array;}
function version(a:Attribute):number{return a instanceof InterleavedBufferAttribute?a.data.version:a.version;}
function attr(g:BufferGeometry,name:string,size:number,count?:number):Attribute{const a=g.getAttribute(name);if(!a||a.itemSize!==size||a.count<1||!Number.isInteger(a.count)||(count!==undefined&&a.count!==count))fail(`invalid ${name}`);return a;}
function supported(m:Mesh):void {if('isInstancedMesh' in m||'isBatchedMesh' in m)fail('instanced/batched mesh unsupported');for(const a of Object.values(m.geometry.morphAttributes))if(a?.length)fail('morph attributes unsupported');if(m.morphTargetInfluences?.length)fail('morph influences unsupported');}
function attached(m:SkinnedMesh,scratch:Matrix4):void {if(m.bindMode!=='attached')fail('detached skin unsupported');affine(m.matrixWorld);affine(m.bindMatrixInverse);scratch.copy(m.matrixWorld).invert();same(m.bindMatrixInverse,scratch.elements);scratch.multiplyMatrices(m.matrixWorld,m.bindMatrixInverse);for(let i=0;i<16;i++)if(Math.abs(scratch.elements[i]-(i%5===0?1:0))>1e-8)fail('inconsistent attached inverse');}
function corner(p:Vector3,b:Box3,i:number):Vector3{return p.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z);}
function linear(m:Matrix4):number{const e=m.elements;return Math.max(Math.abs(e[0])+Math.abs(e[4])+Math.abs(e[8]),Math.abs(e[1])+Math.abs(e[5])+Math.abs(e[9]),Math.abs(e[2])+Math.abs(e[6])+Math.abs(e[10]));}
function translation(m:Matrix4):number{const e=m.elements;return Math.max(Math.abs(e[12]),Math.abs(e[13]),Math.abs(e[14]));}
function rounding(magnitude:number):number{return G*magnitude+128*2**-149;}

/** Scan actual postloader vertices once. No weights, geometry, transforms or
 * inverse caches are rewritten. Positive sums need not equal one. */
export function prepareWeightedVisualEnvelope007(root:Object3D):WeightedVisualEnvelope007 {
 const bindings:Binding[]=[],matrix=new Matrix4(),point=new Vector3(),bones=new Set<Bone>(),ranges:{mesh:string;min:number;max:number}[]=[];let vertices=0,statics=0;
 root.traverse(node=>{if(!(node instanceof Mesh))return;supported(node);affine(node.matrixWorld);
  const position=attr(node.geometry,'position',3),attributes:SavedAttribute[]=[];
  const save=(name:string,a:Attribute)=>attributes.push({name,attribute:a,array:array(a),version:version(a)});save('position',position);
  const binding:Binding={mesh:node,parent:node.parent,geometry:node.geometry,attributes,positionMagnitude:0,box:new Box3()};bindings.push(binding);vertices+=position.count;
  let indices:Attribute|undefined,weights:Attribute|undefined;
  if(node instanceof SkinnedMesh){attached(node,matrix);affine(node.bindMatrix);const s=node.skeleton;if(!s||!s.bones.length||s.bones.length!==s.boneInverses.length)fail('invalid skeleton');
   indices=attr(node.geometry,'skinIndex',4,position.count);weights=attr(node.geometry,'skinWeight',4,position.count);if(indices.normalized)fail('normalized joint indices unsupported');save('skinIndex',indices);save('skinWeight',weights);
   const inverses=s.boneInverses.map(m=>{affine(m);return Array.from(m.elements);});for(const b of s.bones){if(!b?.isBone)fail('invalid bone');affine(b.matrixWorld);bones.add(b);}
   binding.skin={skeleton:s,bones:s.bones.slice(),inverses,bind:Array.from(node.bindMatrix.elements),boxes:[],sMin:Infinity,sMax:0};
  }else statics++;
  const boxes=new Map<number,BoneBox>();
  for(let v=0;v<position.count;v++){point.fromBufferAttribute(position,v);finitePoint(point);binding.positionMagnitude=Math.max(binding.positionMagnitude,Math.abs(point.x),Math.abs(point.y),Math.abs(point.z));
   if(!binding.skin||!indices||!weights){binding.box.expandByPoint(point);continue;}
   const skin=binding.skin;let sum=0;for(let k=0;k<4;k++){const w=weights.getComponent(v,k),i=indices.getComponent(v,k);if(!Number.isFinite(w)||w<0||!Number.isFinite(Math.fround(w)))fail('invalid skin weight');if(!Number.isInteger(i)||i<0||i>=skin.bones.length)fail('invalid joint index');sum+=w;}
   if(!(sum>0)||!Number.isFinite(sum)||!Number.isFinite(Math.fround(sum)))fail('invalid positive skin sum');skin.sMin=Math.min(skin.sMin,sum);skin.sMax=Math.max(skin.sMax,sum);
   for(let k=0;k<4;k++)if(weights.getComponent(v,k)>0){const i=indices.getComponent(v,k);let box=boxes.get(i);if(!box){box={bone:skin.bones[i],parent:skin.bones[i].parent,box:new Box3(),inverse:skin.inverses[i]};boxes.set(i,box);skin.boxes.push(box);}const local=point.clone().applyMatrix4((node as SkinnedMesh).bindMatrix).applyMatrix4(skin.skeleton.boneInverses[i]);finitePoint(local);box.box.expandByPoint(local);}
  }
  if(binding.skin)ranges.push({mesh:node.name,min:binding.skin.sMin,max:binding.skin.sMax});
 });
 if(!bindings.length)fail('no supported meshes');const envelope=Object.freeze({boneCount:bones.size,staticMeshCount:statics,vertexCount:vertices,cornerCount:bindings.length*8,weightSumRanges:Object.freeze(ranges.map(r=>Object.freeze(r)))});
 preparations.set(envelope,{bindings,matrix,point,convex:new Box3(),work:new Box3(),aggregate:new Box3(),origin:new Vector3()});return envelope;
}
export function createWeightedVisualEnvelopeSample007(e:WeightedVisualEnvelope007):VisualEnvelopeSample{if(!preparations.has(e))fail('unknown preparation');const s={bounds:new Box3(),corners:Array.from({length:e.cornerCount},()=>new Vector3())};samples.set(s,e);return s;}
/** Mesh-specific normalized convex hull C becomes origin+s*(C-origin).
 * Evaluate both actual sum endpoints. Work is bounded by 8 corners per used
 * bone/mesh; output is a camera AABB, not occupied skin or collision geometry. */
export function sampleWeightedVisualEnvelope007(e:WeightedVisualEnvelope007,out:VisualEnvelopeSample):VisualEnvelopeSample{
 const d=preparations.get(e);if(!d||samples.get(out)!==e||out.corners.length!==e.cornerCount)fail('unknown sample');
 for(const b of d.bindings){const m=b.mesh;if(m.parent!==b.parent||m.geometry!==b.geometry)fail('mesh ownership/geometry changed');supported(m);affine(m.matrixWorld);for(const a of b.attributes){const now=m.geometry.getAttribute(a.name);if(now!==a.attribute||array(now)!==a.array||version(now)!==a.version)fail('attribute changed; reprepare');}
  if(b.skin){if(!(m instanceof SkinnedMesh)||m.skeleton!==b.skin.skeleton)fail('skeleton changed');attached(m,d.matrix);same(m.bindMatrix,b.skin.bind);const s=m.skeleton;if(s.bones.length!==b.skin.bones.length||s.boneInverses.length!==b.skin.inverses.length)fail('skeleton layout changed');for(let i=0;i<s.bones.length;i++){if(s.bones[i]!==b.skin.bones[i])fail('bone owner changed');same(s.boneInverses[i],b.skin.inverses[i]);affine(s.bones[i].matrixWorld);}for(const box of b.skin.boxes)if(box.bone.parent!==box.parent)fail('bone parent changed');}
 }
 d.aggregate.makeEmpty();
 for(const b of d.bindings){const m=b.mesh;d.work.makeEmpty();let error:number;
  if(b.skin&&m instanceof SkinnedMesh){const s=b.skin;d.convex.makeEmpty();let qBound=0,qError=0;const bindBound=linear(m.bindMatrix)*b.positionMagnitude+translation(m.bindMatrix);
   for(const box of s.boxes){for(let i=0;i<8;i++){corner(d.point,box.box,i).applyMatrix4(box.bone.matrixWorld);finitePoint(d.point);d.convex.expandByPoint(d.point);}d.matrix.fromArray(box.inverse);const lj=linear(box.bone.matrixWorld)*linear(d.matrix),tj=linear(box.bone.matrixWorld)*translation(d.matrix)+translation(box.bone.matrixWorld),q=lj*bindBound+tj;qBound=Math.max(qBound,q);qError=Math.max(qError,lj*rounding(bindBound)+rounding(q));}
   d.origin.setFromMatrixPosition(m.matrixWorld);for(const sum of [s.sMin,s.sMax])for(let i=0;i<8;i++){corner(d.point,d.convex,i).sub(d.origin).multiplyScalar(sum).add(d.origin);finitePoint(d.point);d.work.expandByPoint(d.point);}
   const lr=linear(m.bindMatrixInverse),tr=translation(m.bindMatrixInverse),localBound=lr*s.sMax*qBound+tr*s.sMax;
   const localError=lr*(s.sMax*qError+rounding(s.sMax*qBound))+tr*rounding(s.sMax)+rounding(localBound);
   error=linear(m.matrixWorld)*localError+rounding(linear(m.matrixWorld)*localBound+translation(m.matrixWorld));
  }else{for(let i=0;i<8;i++){corner(d.point,b.box,i).applyMatrix4(m.matrixWorld);finitePoint(d.point);d.work.expandByPoint(d.point);}error=rounding(linear(m.matrixWorld)*b.positionMagnitude+translation(m.matrixWorld));}
  if(!Number.isFinite(error)||error<0)fail('numeric bound overflow');d.work.expandByScalar(error);finitePoint(d.work.min);finitePoint(d.work.max);d.aggregate.union(d.work);
 }
 // An AABB of all mesh bounds is deliberately conservative for camera framing.
 out.bounds.copy(d.aggregate);for(let i=0;i<out.corners.length;i++)corner(out.corners[i],d.aggregate,i%8);return out;
}
export function weightedCameraProvider007(e:WeightedVisualEnvelope007){return {create:()=>createWeightedVisualEnvelopeSample007(e),sample:(out:VisualEnvelopeSample)=>sampleWeightedVisualEnvelope007(e,out)};}

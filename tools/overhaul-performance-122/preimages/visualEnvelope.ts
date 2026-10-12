import {Box3,InterleavedBufferAttribute,Matrix4,Mesh,SkinnedMesh,Vector3,type Bone,type BufferAttribute,type BufferGeometry,type Object3D,type Skeleton} from 'three';

type Attribute=BufferAttribute|InterleavedBufferAttribute;
interface AttributeBinding {name:string;attribute:Attribute;array:ArrayLike<number>;version:number;}
interface MeshBinding {mesh:Mesh;geometry:BufferGeometry;attributes:AttributeBinding[];skin?:{skeleton:Skeleton;bind:number[];bones:Bone[];inverses:number[][]};}
interface Entry {node:Object3D;box:Box3;}
interface Prepared {entries:Entry[];meshes:MeshBinding[];scratch:Matrix4;}

/** Opaque render-only preparation. Drop it on model disposal; reprepare after
 * geometry or binding changes. This does not own the meshes or skeleton. */
export interface VisualEnvelope {readonly boneCount:number;readonly staticMeshCount:number;readonly vertexCount:number;readonly cornerCount:number;}
export interface VisualEnvelopeSample {readonly bounds:Box3;readonly corners:readonly Vector3[];}
const preparations=new WeakMap<VisualEnvelope,Prepared>();
const samples=new WeakMap<VisualEnvelopeSample,VisualEnvelope>();
// This is an attached inverse consistency check, not a visual/collision margin.
const INVERSE_ARITHMETIC_ERROR=1e-8;
function fail(message:string):never {throw new Error(`Visual envelope: ${message}`);}
function finiteMatrix(matrix:Matrix4,label:string,computedInverse=false):void {
  const e=matrix.elements;for(let i=0;i<16;i++)if(!Number.isFinite(e[i]))fail(`${label} is nonfinite`);
  if(e[3]!==0||e[7]!==0||e[11]!==0||(computedInverse?Math.abs(e[15]-1)>INVERSE_ARITHMETIC_ERROR:e[15]!==1))fail(`${label} is not affine`);
}
function sameMatrix(matrix:Matrix4,expected:readonly number[],label:string):void {
  for(let i=0;i<16;i++)if(matrix.elements[i]!==expected[i])fail(`${label} changed; reprepare`);
}
function attributeArray(attribute:Attribute):ArrayLike<number> {return attribute instanceof InterleavedBufferAttribute?attribute.data.array:attribute.array;}
function attributeVersion(attribute:Attribute):number {return attribute instanceof InterleavedBufferAttribute?attribute.data.version:attribute.version;}
function requireAttribute(geometry:BufferGeometry,name:string,size:number,count?:number):Attribute {
  const attribute=geometry.getAttribute(name);
  if(!attribute||attribute.itemSize!==size||attribute.count<1||!Number.isInteger(attribute.count)||(count!==undefined&&attribute.count!==count))fail(`invalid ${name} attribute`);
  return attribute;
}
function rejectMorphs(mesh:Mesh):void {
  const morphs=mesh.geometry.morphAttributes as Record<string,Attribute[]|undefined>;
  for(const name in morphs)if(morphs[name]?.length)fail(`unsupported morph ${name}`);
  if(mesh.morphTargetInfluences?.length)fail('unsupported morph influences');
}
function attachedInverse(mesh:SkinnedMesh,scratch:Matrix4):void {
  if(mesh.bindMode!=='attached')fail('only attached skin binding is supported');
  finiteMatrix(mesh.matrixWorld,'mesh world');finiteMatrix(mesh.bindMatrixInverse,'attached inverse',true);
  // Three's computed inverse may have a footer one ULP from literal1. Keep
  // its exact bytes and check the actual library inversion provenance instead.
  scratch.copy(mesh.matrixWorld).invert();
  for(let i=0;i<16;i++)if(scratch.elements[i]!==mesh.bindMatrixInverse.elements[i])fail('attached inverse is stale or inconsistent; update world matrices before sampling');
  scratch.multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);
  for(let i=0;i<16;i++)if(Math.abs(scratch.elements[i]-(i%5===0?1:0))>INVERSE_ARITHMETIC_ERROR)fail('attached inverse is stale or inconsistent; update world matrices before sampling');
}
function prepared(envelope:VisualEnvelope):Prepared {const value=preparations.get(envelope);if(!value)fail('unknown preparation');return value;}

/** Traverse the actual shipping meshes once. All nonzero skin contributors get
 * their bone-local point; convex normalized skinning then lies in the combined
 * corner envelope, not necessarily inside any single bone's box. No source
 * attributes, bounds, bind matrices, bone transforms or world matrices change. */
export function prepareVisualEnvelope(root:Object3D):VisualEnvelope {
  const entries:Entry[]=[],meshes:MeshBinding[]=[],boneEntries=new Map<Bone,Entry>();
  const point=new Vector3(),local=new Vector3(),scratch=new Matrix4();let vertexCount=0,staticMeshCount=0;
  root.traverse(node=>{
    if(!(node instanceof Mesh))return;
    if('isInstancedMesh' in node||'isBatchedMesh' in node)fail('unsupported instanced/batched mesh');
    rejectMorphs(node);
    const position=requireAttribute(node.geometry,'position',3);
    const attributes:AttributeBinding[]=[{name:'position',attribute:position,array:attributeArray(position),version:attributeVersion(position)}];
    const binding:MeshBinding={mesh:node,geometry:node.geometry,attributes};meshes.push(binding);vertexCount+=position.count;
    if(node instanceof SkinnedMesh){
      attachedInverse(node,scratch);finiteMatrix(node.bindMatrix,'bind matrix');
      if(node.bindMatrix.determinant()===0)fail('singular bind matrix');
      const skeleton=node.skeleton;
      if(!skeleton||!skeleton.bones.length||skeleton.bones.length!==skeleton.boneInverses.length)fail('invalid skeleton binding');
      for(const bone of skeleton.bones){if(!bone?.isBone)fail('invalid bone owner');finiteMatrix(bone.matrixWorld,'bone world');}
      const indices=requireAttribute(node.geometry,'skinIndex',4,position.count),weights=requireAttribute(node.geometry,'skinWeight',4,position.count);
      if(indices.normalized)fail('normalized joint indices are unsupported');
      for(const [name,attribute] of [['skinIndex',indices],['skinWeight',weights]] as const)attributes.push({name,attribute,array:attributeArray(attribute),version:attributeVersion(attribute)});
      binding.skin={skeleton,bind:Array.from(node.bindMatrix.elements),bones:skeleton.bones.slice(),inverses:skeleton.boneInverses.map(matrix=>{finiteMatrix(matrix,'bone inverse',true);if(matrix.determinant()===0)fail('singular bone inverse');return Array.from(matrix.elements);})};
      for(let vertex=0;vertex<position.count;vertex++){
        point.fromBufferAttribute(position,vertex);if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.z))fail('nonfinite authored position');
        let sum=0;
        for(let slot=0;slot<4;slot++){
          const weight=weights.getComponent(vertex,slot),index=indices.getComponent(vertex,slot);
          if(!Number.isFinite(weight)||weight<0)fail('nonfinite or negative skin weight');
          if(!Number.isInteger(index)||index<0||index>=skeleton.bones.length)fail('invalid joint index');
          sum+=weight;
        }
        // Exact convex sums avoid silently normalizing different rendered data.
        // Current rigid shipping skins and exactly normalized blends qualify.
        if(sum!==1)fail('skin weights must sum exactly to one');
        for(let slot=0;slot<4;slot++)if(weights.getComponent(vertex,slot)>0){
          const index=indices.getComponent(vertex,slot),bone=skeleton.bones[index];
          let entry=boneEntries.get(bone);if(!entry){entry={node:bone,box:new Box3()};boneEntries.set(bone,entry);entries.push(entry);}
          local.copy(point).applyMatrix4(node.bindMatrix).applyMatrix4(skeleton.boneInverses[index]);
          if(!Number.isFinite(local.x)||!Number.isFinite(local.y)||!Number.isFinite(local.z))fail('nonfinite bone-local position');
          entry.box.expandByPoint(local);
        }
      }
    }else{
      const box=new Box3();staticMeshCount++;
      for(let vertex=0;vertex<position.count;vertex++){
        point.fromBufferAttribute(position,vertex);if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.z))fail('nonfinite static position');box.expandByPoint(point);
      }
      entries.push({node,box});
    }
  });
  if(!entries.length)fail('no supported visual geometry');
  const envelope=Object.freeze({boneCount:boneEntries.size,staticMeshCount,vertexCount,cornerCount:entries.length*8});
  preparations.set(envelope,{entries,meshes,scratch});return envelope;
}

/** Allocate once per consumer, outside the frame loop. */
export function createVisualEnvelopeSample(envelope:VisualEnvelope):VisualEnvelopeSample {
  prepared(envelope);const sample={bounds:new Box3(),corners:Array.from({length:envelope.cornerCount},()=>new Vector3())};samples.set(sample,envelope);return sample;
}

/** Current world matrices are caller-owned. Reads 8 corners per unique bone or
 * static mesh, with no vertex scans, matrix updates or steady-state allocations.
 * Registry detachment/reset belongs to the caller; this function owns no hooks. */
export function sampleVisualEnvelope(envelope:VisualEnvelope,out:VisualEnvelopeSample):VisualEnvelopeSample {
  const data=prepared(envelope);if(samples.get(out)!==envelope||out.corners.length!==envelope.cornerCount)fail('sample belongs to a different preparation');
  // Validate first: a failure leaves the previously completed output untouched.
  for(const binding of data.meshes){
    const mesh=binding.mesh;if(mesh.geometry!==binding.geometry)fail('geometry changed; reprepare');rejectMorphs(mesh);
    for(const saved of binding.attributes){const current=mesh.geometry.getAttribute(saved.name);if(current!==saved.attribute||attributeArray(current)!==saved.array||attributeVersion(current)!==saved.version)fail('geometry attributes changed; reprepare');}
    if(binding.skin){
      if(!(mesh instanceof SkinnedMesh)||mesh.skeleton!==binding.skin.skeleton)fail('skeleton changed; reprepare');
      attachedInverse(mesh,data.scratch);sameMatrix(mesh.bindMatrix,binding.skin.bind,'bind matrix');
      const skeleton=mesh.skeleton;if(skeleton.bones.length!==binding.skin.bones.length||skeleton.boneInverses.length!==binding.skin.inverses.length)fail('skeleton layout changed');
      for(let i=0;i<skeleton.bones.length;i++){if(skeleton.bones[i]!==binding.skin.bones[i])fail('bone owner changed');sameMatrix(skeleton.boneInverses[i],binding.skin.inverses[i],'bone inverse');}
    }
  }
  for(const entry of data.entries)finiteMatrix(entry.node.matrixWorld,'sampled world');
  out.bounds.makeEmpty();let corner=0;
  for(const entry of data.entries){const min=entry.box.min,max=entry.box.max;
    for(let i=0;i<8;i++){const point=out.corners[corner++];point.set(i&1?max.x:min.x,i&2?max.y:min.y,i&4?max.z:min.z).applyMatrix4(entry.node.matrixWorld);
      if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.z))fail('nonfinite sampled corner');out.bounds.expandByPoint(point);}
  }
  return out;
}

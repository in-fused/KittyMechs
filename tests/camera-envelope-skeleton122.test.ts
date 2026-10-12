import {describe,expect,it} from 'vitest';
import {Bone,BufferGeometry,Float32BufferAttribute,Group,Matrix4,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute} from 'three';
import {prepareVisualEnvelope,createVisualEnvelopeSample,sampleVisualEnvelope,type VisualEnvelope,type VisualEnvelopeSample} from '../src/game/camera/visualEnvelope';
import {prepareWeightedVisualEnvelope007,createWeightedVisualEnvelopeSample007,sampleWeightedVisualEnvelope007} from '../src/game/camera/weightedVisualEnvelope007';
// Immutable preimages are an independent equivalence/failure-order oracle.
import {prepareVisualEnvelope as oldPrepare,createVisualEnvelopeSample as oldCreate,sampleVisualEnvelope as oldSample} from '../tools/overhaul-performance-122/preimages/visualEnvelope';
import {prepareWeightedVisualEnvelope007 as oldWeightedPrepare,createWeightedVisualEnvelopeSample007 as oldWeightedCreate,sampleWeightedVisualEnvelope007 as oldWeightedSample} from '../tools/overhaul-performance-122/preimages/weightedVisualEnvelope007';

function fixture(separate=false){
 const root=new Group(),a=new Bone(),b=new Bone();b.position.set(0,0,2);a.add(b);root.add(a);root.updateMatrixWorld(true);
 const first=new Skeleton([a,b]),second=separate?new Skeleton([a,b],first.boneInverses.map(m=>m.clone())):first;
 const meshes=[first,second].map((s,i)=>{
  const g=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([-1,0,0,1,1,0,0,0,4],3))
   .setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0,0,1,0,0,1,0,0,0],4))
   .setAttribute('skinWeight',new Float32BufferAttribute([.5,.5,0,0,.25,.75,0,0,1,0,0,0],4));
  const mesh=new SkinnedMesh(g,new MeshBasicMaterial());mesh.name=`part${i}`;mesh.position.x=i*.4;root.add(mesh);root.updateMatrixWorld(true);mesh.bind(s,mesh.matrixWorld.clone());return mesh;
 });root.updateMatrixWorld(true);return {root,a,b,first,second,meshes};
}
function provider<E extends VisualEnvelope>(name:string,prepare:(root:Group)=>E,create:(e:E)=>VisualEnvelopeSample,sample:(e:E,out:VisualEnvelopeSample)=>VisualEnvelopeSample,oldPrepare:(root:Group)=>E,oldCreate:(e:E)=>VisualEnvelopeSample,oldSample:(e:E,out:VisualEnvelopeSample)=>VisualEnvelopeSample){
 const runner=(prep:typeof prepare,make:typeof create,read:typeof sample)=>(root:Group)=>{const e=prep(root),out=make(e);return {out,sample:()=>read(e,out)};};
 return {name,run:runner(prepare,create,sample),oldRun:runner(oldPrepare,oldCreate,oldSample)};
}
const providers=[provider('standard',prepareVisualEnvelope,createVisualEnvelopeSample,sampleVisualEnvelope,oldPrepare,oldCreate,oldSample),
 provider('weighted',prepareWeightedVisualEnvelope007,createWeightedVisualEnvelopeSample007,sampleWeightedVisualEnvelope007,oldWeightedPrepare,oldWeightedCreate,oldWeightedSample)];
function snapshot(out:ReturnType<typeof createVisualEnvelopeSample>){return {min:out.bounds.min.toArray(),max:out.bounds.max.toArray(),corners:out.corners.map(c=>c.toArray())};}
function failure(run:()=>unknown){try{run();return null;}catch(e){return (e as Error).message;}}

for(const p of providers)describe(`${p.name} canonical Skeleton validation122`,()=>{
 it.each([false,true])('exactly matches preserved provider through current attached poses; separate=%s',(separate)=>{
  const r=fixture(separate),current=p.run(r.root),out=current.out,previous=p.oldRun(r.root),oldOut=previous.out;
  for(let i=0;i<6;i++){
   r.root.position.set(i*.7,-i*.2,i*.1);r.a.rotation.set(.05*i,.13*i,-.02*i);r.b.rotation.set(-.04*i,.1*i,.02*i);r.root.updateMatrixWorld(true);
   previous.sample();current.sample();expect(snapshot(out)).toEqual(snapshot(oldOut));
  }
 });
 it.each([false,true])('reads inverse elements once per UNIQUE Skeleton on EACH sample; separate=%s',(separate)=>{
  const r=fixture(separate),current=p.run(r.root),out=current.out;let reads=0;
  for(const s of new Set([r.first,r.second]))for(const inverse of s.boneInverses){
   inverse.elements=new Proxy(inverse.elements,{get(target,key,receiver){if(typeof key==='string'&&/^(?:[0-9]|1[0-5])$/.test(key))reads++;return Reflect.get(target,key,receiver);}});
  }
  for(let i=0;i<3;i++){reads=0;current.sample();expect(reads).toBe(16*2*(separate?2:1));}
 });
 const mutations:[string,(r:ReturnType<typeof fixture>)=>void][]=[
  ['owner',r=>{r.first.bones[0]=new Bone();}],
  ['order',r=>{r.first.bones.reverse();}],
  ['inverse',r=>{r.first.boneInverses[0].elements[12]+=.125;}],
  ['second Skeleton inverse',r=>{r.second.boneInverses[1].elements[13]+=.25;}],
  ['second Skeleton owner',r=>{r.second.bones[1]=new Bone();}],
  ['bone layout',r=>{r.first.bones.pop();}],
  ['inverse layout',r=>{r.first.boneInverses.pop();}],
  ['second mesh Skeleton binding',r=>{r.meshes[1].skeleton=new Skeleton(r.first.bones,r.first.boneInverses.map(m=>m.clone()));}],
  ['second mesh stale attached inverse',r=>{r.meshes[1].bindMatrixInverse=new Matrix4().makeTranslation(9,0,0);}],
  ['second mesh bind',r=>{r.meshes[1].bindMatrix.elements[13]+=.5;}],
  ['second mesh geometry identity',r=>{r.meshes[1].geometry=r.meshes[1].geometry.clone();}],
  ['second mesh attribute version',r=>{r.meshes[1].geometry.getAttribute('position').needsUpdate=true;}],
  ['bone world nonfinite',r=>{r.a.matrixWorld.elements[12]=NaN;}],
  ['first skeleton vs later mesh failure precedence',r=>{r.first.boneInverses[0].elements[12]+=.125;r.meshes[1].geometry=r.meshes[1].geometry.clone();}]
 ];
 for(const [name,mutate] of mutations)it.each([false,true])(`rejects ${name} with original failure/output ordering; separate=%s`,(separate)=>{
  const r=fixture(separate),current=p.run(r.root),out=current.out,previous=p.oldRun(r.root),oldOut=previous.out;
  current.sample();previous.sample();const before=snapshot(out),oldBefore=snapshot(oldOut);mutate(r);
  const expected=failure(()=>previous.sample());expect(expected).not.toBeNull();
  expect(failure(()=>current.sample())).toBe(expected);expect(snapshot(out)).toEqual(before);expect(snapshot(oldOut)).toEqual(oldBefore);
 });
});

describe('weighted122 mesh and bone ownership guards remain mesh-specific',()=>{
 for(const [name,mutate] of [
  ['mesh parent',(r:ReturnType<typeof fixture>)=>{new Group().add(r.meshes[1]);}],
  ['bone parent',(r:ReturnType<typeof fixture>)=>{new Group().add(r.b);}],
  ['singular bone world',(r:ReturnType<typeof fixture>)=>{r.a.matrixWorld.makeScale(0,1,1);}]
 ] as const)it(`preserves ${name} rejection and output`,()=>{
  const r=fixture(),e=prepareWeightedVisualEnvelope007(r.root),out=createWeightedVisualEnvelopeSample007(e),old=oldWeightedPrepare(r.root),oldOut=oldWeightedCreate(old);
  sampleWeightedVisualEnvelope007(e,out);oldWeightedSample(old,oldOut);const before=snapshot(out);mutate(r);
  const expected=failure(()=>oldWeightedSample(old,oldOut));expect(expected).not.toBeNull();expect(failure(()=>sampleWeightedVisualEnvelope007(e,out))).toBe(expected);expect(snapshot(out)).toEqual(before);
 });
});

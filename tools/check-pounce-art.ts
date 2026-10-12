/** Decode a derivative and require exact retained rig/animation semantics. */
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { NodeIO, type Accessor, type AnimationChannel } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const base=resolve('assets/source/pounce-art-v1');
const candidate=resolve(process.argv[2]??'assets/source/pounce-art-v1/Pounce_Quadruped.candidate.glb');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const before=(await io.read(resolve(base,'approved-Pounce_Quadruped.glb'))).getRoot(),after=(await io.read(candidate)).getRoot();
let values=0;const compare=(a:Accessor|null,b:Accessor|null,label:string)=>{
  assert.ok(a&&b&&a.getArray()&&b.getArray(),label);assert.equal(b.getType(),a.getType(),label);assert.equal(b.getComponentType(),a.getComponentType(),label);
  assert.equal(b.getNormalized(),a.getNormalized(),label);assert.equal(b.getArray()!.length,a.getArray()!.length,label);
  const x=a.getArray()!,y=b.getArray()!;for(let i=0;i<x.length;i++){assert.equal(y[i],x[i],`${label}[${i}]`);values++;}
};
assert.equal(after.listSkins().length,1);assert.equal(after.listSkins()[0].listJoints().length,25);
const oldSkin=before.listSkins()[0],newSkin=after.listSkins()[0];
assert.deepEqual(newSkin.listJoints().map(n=>n.getName()),oldSkin.listJoints().map(n=>n.getName()));
compare(oldSkin.getInverseBindMatrices(),newSkin.getInverseBindMatrices(),'inverse binds');
for(const joint of oldSkin.listJoints()){
  const next=newSkin.listJoints().find(n=>n.getName()===joint.getName())!;
  assert.deepEqual(next.getTranslation(),joint.getTranslation(),joint.getName()+' translation');
  assert.deepEqual(next.getRotation(),joint.getRotation(),joint.getName()+' rotation');assert.deepEqual(next.getScale(),joint.getScale());
  assert.deepEqual(next.listChildren().map(n=>n.getName()).sort(),joint.listChildren().map(n=>n.getName()).sort());
}
assert.equal(before.listAnimations().length,32);assert.equal(after.listAnimations().length,32);
const key=(c:AnimationChannel)=>c.getTargetNode()!.getName()+':'+c.getTargetPath();
for(const a of before.listAnimations()){
  const b=after.listAnimations().find(b=>b.getName()===a.getName());assert.ok(b,a.getName());
  const x=a.listChannels().sort((a,b)=>key(a).localeCompare(key(b))),y=b.listChannels().sort((a,b)=>key(a).localeCompare(key(b)));assert.equal(y.length,x.length);
  x.forEach((c,i)=>{assert.equal(key(y[i]),key(c));assert.equal(y[i].getSampler()!.getInterpolation(),c.getSampler()!.getInterpolation());
    compare(c.getSampler()!.getInput(),y[i].getSampler()!.getInput(),a.getName()+' input');compare(c.getSampler()!.getOutput(),y[i].getSampler()!.getOutput(),a.getName()+' output');});
}
let triangles=0,vertices=0;
for(const mesh of after.listMeshes())for(const p of mesh.listPrimitives()){
  vertices+=p.getAttribute('POSITION')!.getCount();triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION')!.getCount())/3;
  assert.equal(p.listTargets().length,0);const weights=p.getAttribute('WEIGHTS_0')!;
  for(let i=0;i<weights.getCount();i++){const w=weights.getElement(i,[]);assert.equal(w.filter(x=>x>0).length,1);assert.equal(Math.max(...w),1);}
}
assert.ok(vertices<=36000&&triangles<=22000,JSON.stringify({vertices,triangles}));assert.ok(after.listMaterials().length<=7);
const manifest=JSON.parse(await readFile(resolve(base,'baseline-models.json'),'utf8')) as Record<string,string>;
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const shippingCandidate=candidate===resolve('public/assets/models/Pounce_Quadruped.glb');
const roster=(await readdir('public/assets/models')).filter(n=>n.endsWith('.glb')).sort();
const additions=process.argv.filter(a=>a.startsWith('--allow-added=')).map(a=>a.slice('--allow-added='.length)).sort();
assert.deepEqual(roster,[...Object.keys(manifest),...additions].sort(),'Shipping roster changed outside the explicitly declared parallel additions');
const parallelAdditions=[];
for(const name of additions){assert.ok(!manifest[name]&&name.endsWith('.glb')&&!name.includes('/')&&!name.includes('\\'));const bytes=await readFile(resolve('public/assets/models',name));parallelAdditions.push({name,bytes:bytes.length,sha256:hash(bytes),scope:'Declared parallel addition, not qualified by the Pounce art audit'});}
for(const [name,digest] of Object.entries(manifest))if(!shippingCandidate||name!=='Pounce_Quadruped.glb')assert.equal(hash(await readFile(resolve('public/assets/models',name))),digest,'Unrelated shipping model changed: '+name);
const sourceReceipt=JSON.parse(await readFile(resolve(base,'source-art-receipt.json'),'utf8'));
assert.deepEqual(sourceReceipt.pawBoundsAfter,sourceReceipt.pawBoundsBefore);
const result={passed:true,method:'Exact decoded32 animation channel arrays/interpolation,25joint transforms/hierarchy/inverse binds; rigid one-bone influences; source paw-local bounds unchanged; all unrelated baseline shipping GLBs remain byte-identical. Only explicit parallel roster additions admitted separately and not qualified here.',candidate,sha256:hash(await readFile(candidate)),valuesCompared:values,retainedAnimations:32,retainedJoints:25,triangles,exportedVertices:vertices,materials:after.listMaterials().length,baselineRoster:Object.keys(manifest).length,shippingModelsUnchanged:Object.keys(manifest).length-(shippingCandidate?1:0),parallelAdditions,sourceEnvelopeParts:sourceReceipt.newParts.length};
await writeFile(resolve(base,shippingCandidate?'shipping-preservation-receipt.json':'candidate-preservation-receipt.json'),JSON.stringify(result,null,2));console.log(result);

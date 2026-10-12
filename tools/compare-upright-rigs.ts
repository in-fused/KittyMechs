import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NodeIO, type Accessor, type AnimationChannel, type Material, type Texture, type TextureInfo } from '@gltf-transform/core';
import { ALL_EXTENSIONS, type EmissiveStrength } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const argument=(name:string)=>process.argv[process.argv.indexOf(name)+1];
const baselineArgument=process.argv.includes('--baseline')?argument('--baseline'):undefined;
const baselineSource=process.argv.includes('--baseline-source')?argument('--baseline-source'):undefined;
const output=process.argv.includes('--output')?argument('--output'):undefined;
assert.ok(baselineArgument&&baselineSource&&/^[a-f0-9]{40}$/.test(baselineSource)&&output,
  'Usage: tsx tools/compare-upright-rigs.ts --baseline <preserved model directory> --baseline-source <Git SHA> --output <receipt.json>');
const baseline=resolve(baselineArgument),runtime=resolve('public/assets/models');
assert.notEqual(baseline,runtime,'Preservation requires an independent baseline directory.');
const names=['Bastion_Quadruped.glb','Caracal_Quadruped.glb','Lynx_Quadruped.glb','Pounce_Quadruped.glb'];
const addedClips=['FelineUprightStride','FelineUprightTurnLeft','FelineUprightTurnRight','FelineUprightWalkLong'];
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const baselineFiles=(await readdir(baseline)).filter(name=>name.endsWith('.glb')).sort();
const runtimeFiles=(await readdir(runtime)).filter(name=>name.endsWith('.glb')).sort();
assert.deepEqual(runtimeFiles,baselineFiles,'The admitted model roster changed.');
const unchanged=[];
for(const file of runtimeFiles.filter(file=>!names.includes(file))){
  const oldBytes=await readFile(resolve(baseline,file)),newBytes=await readFile(resolve(runtime,file));
  assert.equal(hash(newBytes),hash(oldBytes),`${file}: unrelated admitted model changed`);
  unchanged.push({file,bytes:newBytes.length,sha256:hash(newBytes)});
}
const texture=(image:Texture|null,info:TextureInfo|null)=>image?{
  name:image.getName(),mimeType:image.getMimeType(),imageSha256:hash(image.getImage()!),
  texCoord:info?.getTexCoord(),magFilter:info?.getMagFilter(),minFilter:info?.getMinFilter(),wrapS:info?.getWrapS(),wrapT:info?.getWrapT(),
}:null;
const material=(m:Material)=>({
  name:m.getName(),baseColor:m.getBaseColorFactor(),metallic:m.getMetallicFactor(),roughness:m.getRoughnessFactor(),
  emissive:m.getEmissiveFactor(),normalScale:m.getNormalScale(),occlusionStrength:m.getOcclusionStrength(),
  alphaMode:m.getAlphaMode(),alphaCutoff:m.getAlphaCutoff(),doubleSided:m.getDoubleSided(),
  extensions:m.listExtensions().map(e=>e.extensionName).sort(),
  emissiveStrength:m.getExtension<EmissiveStrength>('KHR_materials_emissive_strength')?.getEmissiveStrength(),
  baseColorTexture:texture(m.getBaseColorTexture(),m.getBaseColorTextureInfo()),
  metallicRoughnessTexture:texture(m.getMetallicRoughnessTexture(),m.getMetallicRoughnessTextureInfo()),
  emissiveTexture:texture(m.getEmissiveTexture(),m.getEmissiveTextureInfo()),
  normalTexture:texture(m.getNormalTexture(),m.getNormalTextureInfo()),
  occlusionTexture:texture(m.getOcclusionTexture(),m.getOcclusionTextureInfo()),
});
const rows=[];
for(const file of names){
  const oldBytes=await readFile(resolve(baseline,file)),newBytes=await readFile(resolve(runtime,file));
  const before=(await io.read(resolve(baseline,file))).getRoot(),after=(await io.read(resolve(runtime,file))).getRoot();
  let geometryError=0,clipError=0,transformError=0,comparedValues=0;
  const vectors=(a:number[],b:number[],kind:'geometry'|'clip'|'transform')=>{
    assert.equal(b.length,a.length,`${file}: ${kind} value count changed`);
    for(let i=0;i<a.length;i++){
      assert.ok(Number.isFinite(a[i])&&Number.isFinite(b[i]),`${file}: nonfinite ${kind} value`);
      const error=Math.abs(a[i]-b[i]);comparedValues++;
      if(kind==='geometry')geometryError=Math.max(geometryError,error);
      else if(kind==='clip')clipError=Math.max(clipError,error);else transformError=Math.max(transformError,error);
      assert.equal(error,0,`${file}: retained ${kind} changed at ${i}: ${error}`);
    }
  };
  const accessor=(a:Accessor|null,b:Accessor|null,kind:'geometry'|'clip')=>{
    assert.ok(a&&b,`${file}: missing retained ${kind} accessor`);
    assert.equal(b.getType(),a.getType());assert.equal(b.getComponentType(),a.getComponentType());assert.equal(b.getNormalized(),a.getNormalized());
    assert.ok(a.getArray()&&b.getArray());
    vectors(Array.from(a.getArray()!),Array.from(b.getArray()!),kind);
  };
  assert.deepEqual(after.listMaterials().map(material),before.listMaterials().map(material),`${file}: retained material/texture changed`);
  assert.equal(after.listMeshes().length,before.listMeshes().length);
  before.listMeshes().forEach((mesh,index)=>{
    const next=after.listMeshes()[index];assert.equal(next.getName(),mesh.getName());assert.deepEqual(next.getWeights(),mesh.getWeights());
    assert.equal(next.listPrimitives().length,mesh.listPrimitives().length);
    mesh.listPrimitives().forEach((primitive,index)=>{
      const newer=next.listPrimitives()[index];assert.equal(newer.getMode(),primitive.getMode());
      assert.equal(newer.getMaterial()?.getName(),primitive.getMaterial()?.getName());
      assert.deepEqual(newer.listSemantics().sort(),primitive.listSemantics().sort());
      accessor(primitive.getIndices(),newer.getIndices(),'geometry');
      for(const semantic of primitive.listSemantics())accessor(primitive.getAttribute(semantic),newer.getAttribute(semantic),'geometry');
      assert.equal(primitive.listTargets().length,0,'These rigid rigs must not acquire morph targets.');
      assert.equal(newer.listTargets().length,0);
    });
  });
  assert.equal(after.listSkins().length,before.listSkins().length);
  before.listSkins().forEach((skin,index)=>{
    const next=after.listSkins()[index];assert.equal(next.getName(),skin.getName());
    assert.deepEqual(next.listJoints().map(n=>n.getName()),skin.listJoints().map(n=>n.getName()));
    assert.equal(next.getSkeleton()?.getName(),skin.getSkeleton()?.getName());accessor(skin.getInverseBindMatrices(),next.getInverseBindMatrices(),'geometry');
  });
  const oldNodes=before.listNodes(),newNodes=after.listNodes();
  assert.equal(new Set(oldNodes.map(n=>n.getName())).size,oldNodes.length,'Baseline node names must be unique.');
  assert.deepEqual(newNodes.map(n=>n.getName()).sort(),oldNodes.map(n=>n.getName()).sort());
  for(const node of oldNodes){
    const next=newNodes.find(n=>n.getName()===node.getName())!;
    assert.deepEqual(next.listChildren().map(n=>n.getName()).sort(),node.listChildren().map(n=>n.getName()).sort());
    assert.equal(next.getMesh()?.getName(),node.getMesh()?.getName());assert.equal(next.getSkin()?.getName(),node.getSkin()?.getName());
    vectors(node.getTranslation(),next.getTranslation(),'transform');vectors(node.getRotation(),next.getRotation(),'transform');
    vectors(node.getScale(),next.getScale(),'transform');assert.deepEqual(next.getWeights(),node.getWeights());
  }
  assert.deepEqual(after.listScenes().map(s=>({name:s.getName(),roots:s.listChildren().map(n=>n.getName()).sort()})),
    before.listScenes().map(s=>({name:s.getName(),roots:s.listChildren().map(n=>n.getName()).sort()})));
  const key=(c:AnimationChannel)=>`${c.getTargetNode()!.getName()}:${c.getTargetPath()}`;
  assert.equal(before.listAnimations().length,28,`${file}: expected the retained 28-action release`);
  for(const clip of before.listAnimations()){
    const next=after.listAnimations().find(c=>c.getName()===clip.getName());assert.ok(next,`${file}: missing retained ${clip.getName()}`);
    const oldChannels=clip.listChannels().sort((a,b)=>key(a).localeCompare(key(b))),newChannels=next.listChannels().sort((a,b)=>key(a).localeCompare(key(b)));
    assert.equal(newChannels.length,oldChannels.length);
    oldChannels.forEach((channel,index)=>{
      const newer=newChannels[index];assert.equal(key(newer),key(channel));
      const oldSampler=channel.getSampler()!,newSampler=newer.getSampler()!;assert.equal(newSampler.getInterpolation(),oldSampler.getInterpolation());
      accessor(oldSampler.getInput(),newSampler.getInput(),'clip');accessor(oldSampler.getOutput(),newSampler.getOutput(),'clip');
    });
  }
  const added=after.listAnimations().filter(c=>!before.listAnimations().some(old=>old.getName()===c.getName())).map(c=>c.getName()).sort();
  assert.deepEqual(added,addedClips,`${file}: undeclared new animation`);assert.equal(after.listAnimations().length,32);
  rows.push({file,baselineSha256:hash(oldBytes),runtimeSha256:hash(newBytes),baselineBytes:oldBytes.length,runtimeBytes:newBytes.length,
    geometryError,clipError,transformError,comparedValues,retainedClips:28,addedClips:added,materials:after.listMaterials().length,joints:after.listSkins()[0].listJoints().length});
}
await writeFile(output,JSON.stringify({at:new Date().toISOString(),baselineSource,baselineDirectory:baseline,passed:true,
  floatTolerance:0,integerTolerance:0,method:'Decode optimized GLBs; require exact equality of every retained geometry, skin, bind, named hierarchy, material/texture and animation channel. All unrelated models remain byte-identical.',rows,unchangedModels:unchanged},null,2)+'\n');
console.log(`Preserved all 28 existing clips and rig data on four players; admitted four new clips each. ${unchanged.length} unrelated models unchanged.`);

import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

const names=process.argv.slice(2);
if(!names.length||names.some(name=>!/^\w+\.glb$/.test(name)))throw new Error('Provide explicit environment GLB filenames.');
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const rows=[];
for(const name of names){
  const input=resolve('assets/runtime/models',name),output=resolve('public/assets/models',name),doc=await io.read(input);
  if(name==='Forest_Fir.glb')for(const material of doc.getRoot().listMaterials()){
    const stem=material.getName()==='PH_Fir_Trunk'?'trunk_b':material.getName()==='PH_Fir_Needles'?'twig':'bark';
    const map=doc.createTexture('PH_Fir_'+stem+'_ARM').setImage(await readFile(resolve('assets/source/environment-foliage/prepared',stem+'-arm.jpg'))).setMimeType('image/jpeg');
    material.setMetallicRoughnessTexture(map).setRoughnessFactor(1).setMetallicFactor(0);
  }
  for(const material of doc.getRoot().listMaterials())if(/^PH_(?:Fir_Needles|Fern_Leaves)/.test(material.getName()))material.setAlphaMode('MASK').setAlphaCutoff(material.getName()==='PH_Fir_Needles'?.15:.5).setDoubleSided(true);
  await doc.transform(weld(),dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
  await io.write(output,doc);
  const data=await readFile(output);
  if(data.length>5_000_000)throw new Error(name+' exceeds shipping file budget.');
  const nodes=doc.getRoot().listNodes().filter(n=>n.getMesh()).map(node=>({name:node.getName(),triangles:node.getMesh()!.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION')!.getCount())/3,0),primitives:node.getMesh()!.listPrimitives().length}));
  const row={file:name,sourceBytes:(await readFile(input)).length,runtimeBytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),nodes,
    materials:doc.getRoot().listMaterials().map(m=>({name:m.getName(),alphaMode:m.getAlphaMode(),alphaCutoff:m.getAlphaCutoff(),doubleSided:m.getDoubleSided(),baseColor:!!m.getBaseColorTexture(),normal:!!m.getNormalTexture(),roughness:!!m.getMetallicRoughnessTexture(),roughnessFactor:m.getRoughnessFactor(),metallicFactor:m.getMetallicFactor()}))};
  if(name==='Forest_Fir.glb'&&row.materials.some(m=>!m.baseColor||!m.normal||!m.roughness))throw new Error('Fir matched PBR maps were lost during optimization.');
  rows.push(row);console.log(JSON.stringify(row));
}
const ledger='assets/reference/environment-optimization.json';
const previous=JSON.parse(await readFile(ledger,'utf8').catch(()=> '[]')) as typeof rows;
const merged=[...previous.filter(row=>!names.includes(row.file)),...rows].sort((a,b)=>a.file.localeCompare(b.file));
await writeFile(ledger,JSON.stringify(merged,null,2)+'\n');

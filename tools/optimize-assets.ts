import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const source=resolve('assets/runtime/models'),destination=resolve('public/assets/models');
await mkdir(destination,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const receipt:{file:string;sourceBytes:number;runtimeBytes:number;sha256:string}[]=[];
const felineOnly=process.argv.includes('--feline-only');
const playersOnly=process.argv.includes('--players-only');
if(felineOnly&&playersOnly)throw new Error('Choose either --feline-only or --players-only.');
const playerRig=/^(?:Pounce|Bastion|Lynx|Caracal)_Quadruped\.glb$/;
const names=(await readdir(source)).filter(name=>name.endsWith('.glb')&&(playersOnly?playerRig.test(name):!felineOnly||playerRig.test(name)||/^Sentinel_(?:Scout|Mortar|Anchor)\.glb$/.test(name))).sort();
if(felineOnly&&names.length!==7)throw new Error('Feline optimization requires all four player and three Sentinel rigs.');
if(playersOnly&&names.length!==4)throw new Error('Player optimization requires all four player rigs.');
for(const name of names) {
  const document=await io.read(resolve(source,name));
  await document.transform(weld(),dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
  await io.write(resolve(destination,name),document);
  const original=await readFile(resolve(source,name)),optimized=await readFile(resolve(destination,name));
  receipt.push({file:name,sourceBytes:original.length,runtimeBytes:optimized.length,sha256:createHash('sha256').update(optimized).digest('hex')});
  console.log(`${name}: ${(original.length/1024).toFixed(0)} → ${(optimized.length/1024).toFixed(0)} KiB`);
}
if(felineOnly||playersOnly){
  // Preserve unrelated, already-admitted art and its receipt during rig work.
  const previous=JSON.parse(await readFile('assets/runtime/optimization-receipt.json','utf8')) as typeof receipt;
  receipt.push(...previous.filter(asset=>!names.includes(asset.file)));receipt.sort((a,b)=>a.file.localeCompare(b.file));
}else execFileSync(process.env.PYTHON_PATH??'python',['tools/prepare-textures.py'],{stdio:'inherit'});
await writeFile('assets/runtime/optimization-receipt.json',JSON.stringify(receipt,null,2));

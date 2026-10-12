/** STATIC PREPARED/UNRUN: bundle only after root authorizes next source gate. */
import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
const result=await build({entryPoints:['tools/overhaul-pack-221/equivalence-entry221.ts'],bundle:true,platform:'browser',format:'iife',metafile:true,outfile:'tools/overhaul-pack-221/equivalence-bundle221.js'});
await writeFile('tools/overhaul-pack-221/esbuild-metafile221-final.json',JSON.stringify(result.metafile,null,2),{flag:'wx'});
const inputs=[...new Set(Object.values(result.metafile.outputs).flatMap(o=>Object.entries(o.inputs).filter(([,v])=>v.bytesInOutput>0).map(([p])=>p)))];if(inputs.some(p=>p.includes('meshoptimizer/')||p.includes('/node_modules/three/node_modules/three/')||p.includes('three/examples/jsm/loaders/GLTFLoader')))throw Error('221_DIVERGENT_LOADER_OR_CODEC');
const threeRoots=[...new Set(inputs.filter(p=>p.includes('node_modules/three/')).map(p=>p.split('node_modules/three/')[0]+'node_modules/three'))];
if(inputs.filter(p=>p.endsWith('/loaders/GLTFLoader.js')).length!==1||inputs.filter(p=>/meshopt.*decoder/i.test(p)).length!==1||threeRoots.length!==1)throw Error('221_LOADER_CODEC_MODULE_COUNT');
await writeFile('tools/overhaul-pack-221/bundle-summary221.json',JSON.stringify({threeRoots,loader:inputs.filter(p=>p.endsWith('/loaders/GLTFLoader.js')),codec:inputs.filter(p=>/meshopt.*decoder/i.test(p)),standalone:true,appBootstrap:false},null,2),{flag:'wx'});

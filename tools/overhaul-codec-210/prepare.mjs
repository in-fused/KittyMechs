import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const out=resolve('.sites-runtime/overhaul-20261011/codec210-private'),h=b=>createHash('sha256').update(b).digest('hex');await mkdir(out,{recursive:false});
const seal=JSON.parse(await readFile('tools/overhaul-loading-208/source-seal.json','utf8'));if(h(await readFile('tools/overhaul-loading-208/source-seal.json'))!=='2b48ef227f1c7d7cc6c1da21890f234d6089c23b48f15e375ce4d1b1670bc185')throw Error('208 seal identity changed');
for(const row of seal.files){const b=await readFile(row.path);if(b.length!==row.bytes||h(b)!==row.sha256)throw Error('208 protected file changed: '+row.path);}
const adapter={name:'private-worker-route-only',setup(api){api.onLoad({filter:/install-decoder\.reviewed\.mjs$/},async args=>{const b=await readFile(args.path),text=b.toString('utf8'),needle="new URL('./decoder.worker.mjs',import.meta.url)";if(text.split(needle).length!==2)throw Error('Private URL adapter must match exactly once');return {contents:text.replace(needle,"new URL('/__codec210/worker.js',location.origin)"),loader:'js',resolveDir:resolve('tools/overhaul-loading-208')};});}};
const main=await build({entryPoints:['tools/overhaul-codec-210/entry.mjs'],outdir:out+'/bundle',bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',metafile:true,plugins:[adapter],entryNames:'main'});
const worker=await build({entryPoints:['tools/overhaul-loading-208/decoder.worker.mjs'],outfile:out+'/bundle/worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022',metafile:true});
const keys=m=>Object.keys(m.inputs).filter(x=>x.endsWith('/libs/MeshoptDecoder.js'));const a=keys(main.metafile),b=keys(worker.metafile);if(a.length!==1||b.length!==1||resolve(a[0])!==resolve(b[0]))throw Error('Numerical codec module identity differs');
await writeFile(out+'/main-metafile.json',JSON.stringify(main.metafile,null,2));await writeFile(out+'/worker-metafile.json',JSON.stringify(worker.metafile,null,2));
await writeFile(out+'/preflight.json',JSON.stringify({status:'PASS',codecModule:a[0],codecSHA256:h(await readFile(a[0])),sameModuleMainAndWorker:true,oneModulePerBundle:true,adapter:'Only immutable208 worker URL rewritten to private same-origin fulfilled route',seal208:'2b48ef227f1c7d7cc6c1da21890f234d6089c23b48f15e375ce4d1b1670bc185',actualBrowserRun:false},null,2));console.log('PASS private compile and single numerical module identity');

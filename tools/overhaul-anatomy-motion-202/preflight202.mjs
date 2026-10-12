import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const dir='tools/overhaul-anatomy-motion-202';
const result=await build({entryPoints:[dir+'/browser-entry202.ts'],bundle:true,format:'iife',platform:'browser',outfile:dir+'/browser-bundle202.js',logLevel:'silent',metafile:true});
await writeFile(dir+'/bundle-preflight202.json',JSON.stringify({status:'STATIC_BUNDLE_PASS_NOT_EXECUTED',inputs:Object.keys(result.metafile.inputs),outputBytes:(await readFile(dir+'/browser-bundle202.js')).length},null,2));
console.log('202 isolated decoder bundle PASS; no browser launched');

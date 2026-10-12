import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const dir=resolve('.sites-runtime/overhaul-20261010/render136-raster');await mkdir(dir,{recursive:false});
const files={baseline:'.sites-runtime/overhaul-20261009/build-055/playable-root/src/game/effects/WeatherSky.tsx',candidate:'src/game/effects/WeatherSky.tsx'};
const sources=Object.fromEntries(await Promise.all(Object.entries(files).map(async([k,p])=>[k,await readFile(p,'utf8')])));
const sha=s=>createHash('sha256').update(s).digest('hex');
const shader=s=>({vertex:s.match(/const vertex=`([\s\S]*?)`;/)[1],fragment:s.match(/const fragment=`([\s\S]*?)`;/)[1]});
const code=await readFile('tools/player-render-136/raster-browser.js','utf8');
const bundle=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife',platform:'browser'});
let browser;const start=Date.now();
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.setContent('<html><body style="margin:0"></body></html>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 const result=await page.evaluate(async shaders=>await window.raster136(shaders),Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,shader(s)])));
 await page.screenshot({path:resolve(dir,'candidate-mixed.png')});
 const receipt={...result,errors,elapsedMs:Date.now()-start,sourceSHA256:Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,sha(s)])),scope:'ONE fixed static WebGL raster/synchronized frame comparison, not game FPS or affected-client lag. Original clouds/fog uniforms; no gameplay state.'};
 await writeFile(resolve(dir,'comparison.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));if(!receipt.pixelEquivalent||errors.length)process.exitCode=1;
}finally{await browser?.close();}

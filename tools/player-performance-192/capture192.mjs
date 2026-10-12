import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const root=resolve('.sites-runtime/overhaul-20261009/build-062'),output=resolve('.sites-runtime/overhaul-20261010/gpu192-public');
const hash=b=>createHash('sha256').update(b).digest('hex');
if(hash(await readFile(resolve(root,'receipt.json')))!=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c')throw Error('Retained062 receipt changed');
const html=await(await fetch('http://localhost:8799/')).text();
const clean=html.replace('<meta name="kittymech-arena" content="same-origin"/>','').replace('<meta name="kittymech-client-report" content="local"/>','');
if(clean!==await readFile(resolve(root,'playable-root/dist/index.html'),'utf8'))throw Error('Served index mismatch');
for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/g))if(hash(Buffer.from(await(await fetch('http://localhost:8799'+match[1])).arrayBuffer()))!==hash(await readFile(resolve(root,'playable-root/dist'+match[1]))))throw Error('Served bundle mismatch');
await mkdir(output,{recursive:false});
const result={scope:'ONE read-only EXT_disjoint_timer_query_webgl2 probe on retained062. GPU elapsed within actual main-thread RAF callbacks, not CPU profile arithmetic. Headless Edge cannot qualify affected IAB performance. Ordinary solo Low OFF/ON; different native scene times are not a matched benchmark.',phases:[],errors:[]};
let browser,context,page;const started=Date.now();const deadline=setTimeout(()=>void browser?.close(),60000);
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>result.errors.push(String(e)));
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByLabel('Pilot callsign').fill('GPU192');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();await readyForOrdinaryPlay(page,'GPU192');
 for(const label of ['off','on']){
  if(label==='on'){await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await page.waitForTimeout(1000);}
  const probe=await page.evaluate(async()=>{
   const canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2'),ext=gl?.getExtension('EXT_disjoint_timer_query_webgl2');
   if(!gl||!ext)return {status:'UNAVAILABLE',webgl2:!!gl,extension:!!ext};
   const raw=requestAnimationFrame,pending=[],gpu=[],cpu=[],spacing=[],started=performance.now();let previous=0,frames=0,disjoint=0,inside=false;
   const poll=()=>{if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const q of pending)gl.deleteQuery(q);pending.length=0;return;}for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){const ms=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;if(ms>0)gpu.push(ms);gl.deleteQuery(q);pending.splice(i,1);}}};
   window.requestAnimationFrame=callback=>raw.call(window,time=>{poll();if(inside||frames>=180){callback(time);return;}inside=true;const query=gl.createQuery(),begin=performance.now();if(previous)spacing.push(begin-previous);previous=begin;gl.beginQuery(ext.TIME_ELAPSED_EXT,query);try{callback(time);}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);cpu.push(performance.now()-begin);pending.push(query);frames++;inside=false;}});
   await new Promise(resolve=>setTimeout(resolve,4500));window.requestAnimationFrame=raw;await new Promise(resolve=>setTimeout(resolve,100));poll();for(const q of pending)gl.deleteQuery(q);
   const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:sorted.length,meanMs:values.reduce((a,b)=>a+b,0)/(values.length||1),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??null,maxMs:sorted.at(-1)??null};};
   return {status:gpu.length>=30&&disjoint===0?'MEASURED':'INCOMPLETE',gpu:stats(gpu),cpuCallback:stats(cpu),rafSpacing:stats(spacing),frames,disjoint,pendingDeleted:pending.length,inclusiveMs:performance.now()-started,renderer:gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL??gl.RENDERER)};
  });
  result.phases.push({label,probe,state:await page.evaluate(()=>({performance:window.kittyMechDebug.performance(),camera:window.kittyMechDebug.camera(),actor:window.kittyMechDebug.snapshot().actors.find(a=>a.name==='GPU192')}))});await page.screenshot({path:resolve(output,label+'.png')});if(result.errors.length)throw Error(result.errors[0]);
 }
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).waitFor({state:'visible'});result.teardown=await page.evaluate(()=>window.__kittyTrainingWorker145());if(result.teardown.session?.status!=='closed')throw Error('Worker not closed');result.status=result.phases.every(p=>p.probe.status==='MEASURED')?'MEASURED':'INCOMPLETE';
}catch(e){result.status='INCOMPLETE';result.failure=String(e.stack??e);process.exitCode=1;}
finally{clearTimeout(deadline);try{await context?.close();}finally{await browser?.close();}result.inclusiveMs=Date.now()-started;result.browserConnected=browser?.isConnected()??false;await writeFile(resolve(output,'evidence.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}

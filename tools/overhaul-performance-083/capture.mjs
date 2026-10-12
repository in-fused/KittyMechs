import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]),receipt=process.env.KITTYMECH_BUILD_RECEIPT;
if(!/^[a-f0-9]{64}$/.test(receipt??''))throw Error('Exact frozen build receipt required');
await mkdir(output,{recursive:false});const started=Date.now();
const evidence={receipt,scope:'ONE identical public Low/Pounce COOP camera sweep, backpedal and prototype on/off comparison. Read-only diagnostics, no injection. Headless Edge is not actual IAB.',status:'RUNNING',errors:[],samples:[],phases:[]};
let browser,context,page,cdp,profileStarted=false;
const guard=()=>{if(Date.now()-started>60000)throw Error('60s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const read=async phase=>{guard();const sample=await page.evaluate(async()=>{const d=window.kittyMechDebug,s=d.snapshot();return {performance:d.performance(),camera:d.camera(),input:await d.input(),tick:s.tick,time:s.time,weather:s.weather,actors:s.actors.map(a=>({id:a.id,bot:a.bot,role:a.role,position:a.position,hp:a.hp,stance:a.stance,pair:a.pair,climb:a.climb})),bounds:window.kittyEnemyBounds078?.read?.()??null};});evidence.samples.push({phase,wall:Date.now(),sample});};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',x=>evidence.errors.push(String(x)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Perf078');await page.getByRole('button',{name:'CO-OP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Perf078'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness')),20000);})]);}finally{clearTimeout(timer);}guard();
 evidence.renderer=await page.evaluate(()=>{const canvas=document.querySelector('canvas'),gl=canvas?.getContext('webgl2');if(!gl)return null;const ext=gl.getExtension('WEBGL_debug_renderer_info');return {bufferWidth:gl.drawingBufferWidth,bufferHeight:gl.drawingBufferHeight,renderer:gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL??gl.RENDERER)};});
 cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');profileStarted=true;
 const segment=async(phase,keys,ms)=>{guard();const began=Date.now();const frames=page.evaluate(ms=>new Promise(resolve=>{let last=performance.now(),start=last,values=[];function tick(now){values.push(now-last);last=now;if(now-start>=ms)resolve(values);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}),ms);await Promise.all(keys.map(k=>page.keyboard.down(k)));try{while(Date.now()-began<ms){await read(phase);await page.waitForTimeout(350);}}finally{await Promise.all(keys.map(k=>page.keyboard.up(k)));}evidence.phases.push({phase,began,ended:Date.now(),frames:await frames});await page.screenshot({path:resolve(output,phase+'.png')});};
 await segment('prototype-idle',[],5000);await segment('prototype-sweep',['KeyJ'],5000);await segment('prototype-backpedal',['KeyS'],2500);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await page.waitForTimeout(1500);
 await segment('standard-idle',[],5000);await segment('standard-sweep',['KeyJ'],5000);await segment('standard-backpedal',['KeyS'],2500);guard();
 const profile=(await cdp.send('Profiler.stop')).profile;profileStarted=false;await writeFile(resolve(output,'cpu-profile.json'),JSON.stringify(profile));evidence.status='CAPTURED_INDEPENDENT_REVIEW_REQUIRED';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=error.stack??String(error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 const close=(async()=>{if(profileStarted)await cdp?.send('Profiler.stop').then(x=>writeFile(resolve(output,'failed-cpu-profile.json'),JSON.stringify(x.profile))).catch(()=>{});await cdp?.detach().catch(()=>{});evidence.video=page?.video()?await page.video().path():null;try{await context?.close();}finally{await browser?.close();}})();let timer;
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('80s inclusive cleanup bound')),Math.max(1,Math.min(20000,80000-(Date.now()-started))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,elapsedMs:evidence.elapsedMs,samples:evidence.samples.length}));
}

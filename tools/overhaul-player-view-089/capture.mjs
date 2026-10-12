import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]),receipt=process.env.KITTYMECH_BUILD_RECEIPT;
if(!/^[a-f0-9]{64}$/.test(receipt??''))throw Error('Exact frozen receipt required');
await mkdir(output,{recursive:false});const started=Date.now();
const evidence={receipt,scope:'One ordinary public Low Pounce PvP travel/reverse/moving-R/pitch/yaw capture, prototype on/off. No injection. Headless Edge does not qualify actual IAB performance, wall/pair/cooperative mission or full district.',status:'RUNNING',errors:[],samples:[],phases:[]};
let browser,context,page;
const guard=()=>{if(Date.now()-started>60000)throw Error('60s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const read=async phase=>{guard();const sample=await page.evaluate(async()=>{const d=window.kittyMechDebug,s=d.snapshot();return {performance:d.performance(),camera:d.camera(),input:await d.input(),tick:s.tick,time:s.time,actors:s.actors.map(a=>({id:a.id,bot:a.bot,name:a.name,position:a.position,hp:a.hp,stance:a.stance,pair:a.pair,climb:a.climb})),feline:window.kittyFelinePrototype008?.read?.()??null};});evidence.samples.push({phase,wall:Date.now(),sample});};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:1440,height:900}}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',x=>evidence.errors.push(String(x)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('View089');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'View089'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness')),20000);})]);}finally{clearTimeout(timer);}guard();
 evidence.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');if(!gl)return null;const e=gl.getExtension('WEBGL_debug_renderer_info');return {width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,renderer:gl.getParameter(e?.UNMASKED_RENDERER_WEBGL??gl.RENDERER)};});
 const segment=async(phase,keys,ms)=>{guard();const began=Date.now();await Promise.all(keys.map(k=>page.keyboard.down(k)));try{while(Date.now()-began<ms){await read(phase);await page.waitForTimeout(180);}}finally{await Promise.all(keys.map(k=>page.keyboard.up(k)));}evidence.phases.push({phase,began,ended:Date.now()});await page.screenshot({path:resolve(output,phase+'.png')});};
 const travel=async prefix=>{
  await segment(prefix+'-idle',[],450);
  await segment(prefix+'-quad-forward',['KeyW'],2300);await segment(prefix+'-quad-reverse',['KeyS'],2000);await segment(prefix+'-stop',[],450);
  await page.keyboard.down('KeyW');await page.keyboard.press('KeyR');await segment(prefix+'-moving-R-up',[],1000);await page.keyboard.up('KeyW');
  await segment(prefix+'-upright-forward',['KeyW'],1700);await segment(prefix+'-upright-reverse',['KeyS'],1700);
  await page.keyboard.down('KeyW');await page.keyboard.press('KeyR');await segment(prefix+'-moving-R-down',[],1000);await page.keyboard.up('KeyW');
  await segment(prefix+'-pitch-up',['KeyI'],750);await segment(prefix+'-pitch-down',['KeyK'],1400);await page.keyboard.press('KeyV');await segment(prefix+'-level',[],450);
  await segment(prefix+'-yaw',['KeyJ'],900);await segment(prefix+'-yaw-return',['KeyL'],900);
 };
 await travel('prototype');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await page.waitForTimeout(650);
 await travel('standard');guard();evidence.status='CAPTURED_INDEPENDENT_REVIEW_REQUIRED';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=error.stack??String(error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 if(page)for(const k of ['KeyW','KeyS','KeyI','KeyK','KeyJ','KeyL'])await page.keyboard.up(k).catch(()=>{});
 evidence.video=page?.video()?await page.video().path():null;const close=(async()=>{try{await context?.close();}finally{await browser?.close();}})();let timer;
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('80s inclusive cleanup bound')),Math.max(1,Math.min(20000,80000-(Date.now()-started))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,elapsedMs:evidence.elapsedMs,samples:evidence.samples.length}));
}

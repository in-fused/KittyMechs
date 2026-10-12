import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const receipt='0f85163eac0dbc7047caf84ae725b094f38b1ca3ceccc3ee0bfbb9b4bb612215',root=resolve('.sites-runtime/overhaul-20261009/build-061');
if(createHash('sha256').update(await readFile(resolve(root,'receipt.json'))).digest('hex')!==receipt)throw Error('Exact061 receipt mismatch');
const start=Date.now(),output=resolve('.sites-runtime/overhaul-20261010/draw180-public');await mkdir(output,{recursive:false});
const evidence={status:'RUNNING',receipt,scope:'ONE readonly per-draw submission attribution on exact061. OFF quad then publicON quad/upright idle. Graphics API delegates unchanged; counting overhead means no frame-time/GPU/human-lag conclusion. No native/state/HP/actor/mesh overrides.',errors:[],phases:[],bounds:{workMs:60000,cleanupMs:20000,inclusiveMs:80000}};
let browser,context,page;
const guard=()=>{if(Date.now()-start>60000)throw Error('60s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const capture=async label=>{
 guard();await page.evaluate(label=>window.__drawAudit180.arm(label,12),label);
 await page.waitForFunction(()=>{const r=window.__drawAudit180.read();return r?.done||r?.error;},null,{timeout:5000});
 const read=await page.evaluate(()=>{const s=window.kittyMechDebug.snapshot();return {draw:window.__drawAudit180.read(),performance:window.kittyMechDebug.performance(),camera:window.kittyMechDebug.camera(),tick:s.tick,actor:s.actors.find(a=>a.name==='Audit180'),feline:window.kittyFelinePrototype008.read()};});
 evidence.phases.push({label,wall:Date.now(),...read});
 if(read.draw.error||!read.draw.done||read.draw.frames.length!==12||!read.actor||read.actor.hp<=0)throw Error('Draw capture incomplete: '+JSON.stringify({label,error:read.draw.error}));
 if(read.draw.frames.some(f=>f.triangles<1||f.nativeCalls<1))throw Error('No observed scene draws');
 await page.screenshot({path:resolve(output,label+'.png')});guard();
};
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});
 await context.addInitScript({path:resolve('tools/overhaul-draw-audit-180/counter180.js')});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Audit180');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Audit180'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness bound')),20000);})]);}finally{clearTimeout(timer);}
 await page.waitForTimeout(1200);await capture('off-quad');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();
 await page.waitForFunction(()=>{const a=window.kittyMechDebug.snapshot()?.actors.find(a=>a.name==='Audit180');return !!window.kittyFelinePrototype008.read().diagnostics.find(d=>d.actor===a?.id&&d.browserClipContract128?.passed&&d.presentation154?.status==='source');},null,{timeout:5000});
 await page.waitForTimeout(600);await capture('on-quad');await page.keyboard.press('KeyR');await page.waitForTimeout(1300);await capture('on-upright');
 if(evidence.phases.at(-1).actor.stance!=='upright')throw Error('PublicR native upright unobserved');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).waitFor({state:'visible'});
 evidence.teardown=await page.evaluate(()=>window.__kittyTrainingWorker145());if(evidence.teardown.session?.status!=='closed')throw Error('Nativeworker teardown not closed');guard();evidence.status='CAPTURED_ATTRIBUTION_REVIEW_REQUIRED';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=String(error.stack??error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 let timer;try{evidence.video=await Promise.race([page?.video()?.path(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('1s video path')),1000);})]);}catch(error){evidence.videoError=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 try{await Promise.race([(async()=>{try{await context?.close();}finally{await browser?.close();}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s cleanup within80s')),Math.max(1,Math.min(20000,80000-(Date.now()-start))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 if(evidence.errors.length){evidence.status='FIRST_FAILURE_STOP';evidence.failure??=evidence.errors[0];process.exitCode=1;}
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveMs=Date.now()-start;evidence.browserConnected=browser?.isConnected()??false;
 await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,inclusiveMs:evidence.inclusiveMs,cleanupFailure:evidence.cleanupFailure}));
}

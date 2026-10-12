import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve('.sites-runtime/overhaul-20261010/solo146-baseline'),started=Date.now();
const evidence={scope:'ONE actual public DEPLOY SOLO frozen056 baseline. Read-only timings; not affected-human or controlled net-gain evidence.',receipt:process.env.KITTYMECH_BUILD_RECEIPT,status:'RUNNING',errors:[],samples:[]};
if(!/^[a-f0-9]{64}$/.test(evidence.receipt??''))throw Error('Frozen baseline receipt required');
await mkdir(output,{recursive:false});let browser,context,page;
const guard=()=>{if(Date.now()-started>60000)throw Error('60s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const read=async phase=>{guard();evidence.samples.push({phase,wall:Date.now(),sample:await page.evaluate(()=>{const d=window.kittyMechDebug,s=d.snapshot();return {tick:s.tick,time:s.time,transport:d.transport(),performance:d.performance(),local:d.localAuthorityTiming(),actors:s.actors.map(a=>({id:a.id,name:a.name,bot:a.bot,hp:a.hp,position:a.position,velocity:a.velocity,stance:a.stance})),feline:window.kittyFelinePrototype008.read()};})});};
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Solo146Baseline');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Solo146Baseline'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness bound')),20000);})]);}finally{clearTimeout(timer);}
 const segment=async(phase,keys,ms)=>{const began=Date.now();for(const key of keys)await page.keyboard.down(key);try{while(Date.now()-began<ms){await read(phase);await page.waitForTimeout(500);}}finally{for(const key of keys)await page.keyboard.up(key);}await page.screenshot({path:resolve(output,phase+'.png')});};
 await segment('solo-on-warm-idle',[],7000);await segment('solo-on-forward',['KeyW'],2000);await segment('solo-on-reverse',['KeyS'],2000);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();
 await segment('solo-off-warm-idle',[],7000);await segment('solo-off-forward',['KeyW'],2000);guard();evidence.status='CAPTURED_BASELINE_ONLY';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=String(error.stack??error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 for(const key of ['KeyW','KeyS'])await page?.keyboard.up(key).catch(()=>{});
 const close=(async()=>{try{await context?.close();}finally{await browser?.close();}})();let timer;
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('80s inclusive cleanup')),Math.max(1,Math.min(20000,80000-(Date.now()-started))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,elapsedMs:evidence.elapsedMs,samples:evidence.samples.length}));
}

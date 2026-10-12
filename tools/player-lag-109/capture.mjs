import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]),receipt=process.env.KITTYMECH_BUILD_RECEIPT;
if(!/^[a-f0-9]{64}$/.test(receipt??''))throw Error('Exact frozen receipt required');
await mkdir(output,{recursive:false});const started=Date.now();
const evidence={receipt,scope:'ONE plain-URL public Pounce motion106 contact/moving-R review. No state injection; headless observation cannot qualify affected IAB lag or full district.',status:'RUNNING',errors:[],samples:[],phases:[]};let browser,context,page;
const guard=()=>{if(Date.now()-started>50000)throw Error('50s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const read=async phase=>{guard();const sample=await page.evaluate(()=>{const d=window.kittyMechDebug,s=d.snapshot();return {performance:d.performance(),camera:d.camera(),tick:s.tick,time:s.time,actors:s.actors.map(a=>({id:a.id,name:a.name,position:a.position,hp:a.hp,stance:a.stance})),feline:window.kittyFelinePrototype008.read()};});evidence.samples.push({phase,wall:Date.now(),sample});const actor=sample.actors.find(a=>a.name==='Motion110'),owner=sample.feline?.diagnostics?.find(d=>d.actor===actor?.id);if(sample.feline.enabled&&(!owner||owner.firstFailure||sample.feline.fallbacks.length))throw Error('Actual local prototype owner unavailable/failed/fell back: '+JSON.stringify({owner:owner?.firstFailure,fallbacks:sample.feline?.fallbacks}));};
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:1440,height:900}}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Motion110');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Motion110'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness')),20000);})]);}finally{clearTimeout(timer);}
 const segment=async(phase,keys,ms)=>{guard();const began=Date.now();for(const k of keys)await page.keyboard.down(k);try{while(Date.now()-began<ms){await read(phase);await page.waitForTimeout(110);}}finally{for(const k of keys)await page.keyboard.up(k);}evidence.phases.push({phase,began,ended:Date.now()});await page.screenshot({path:resolve(output,phase+'.png')});};
 await segment('idle',[],450);await segment('quad-forward',['KeyW'],2600);await segment('quad-reverse',['KeyS'],2300);await segment('quad-stop',[],450);
 await page.keyboard.down('KeyW');await page.keyboard.press('KeyR');try{await segment('moving-R-up',[],1050);}finally{await page.keyboard.up('KeyW');}
 await segment('upright-forward',['KeyW'],1900);await segment('upright-reverse',['KeyS'],1900);await segment('upright-stop',[],450);
 await page.keyboard.down('KeyW');await page.keyboard.press('KeyR');try{await segment('moving-R-down',[],1050);}finally{await page.keyboard.up('KeyW');}
 await segment('quad-return',['KeyW'],1700);await segment('final-idle',[],650);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();
 await segment('standard-plain-forward',['KeyW'],1800);guard();if(evidence.samples.at(-1).sample.feline.enabled)throw Error('Public OFF selection not observed');evidence.status='CAPTURED_INDEPENDENT_REVIEW_REQUIRED';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=error.stack??String(error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 for(const k of ['KeyW','KeyS'])await page?.keyboard.up(k).catch(()=>{});evidence.video=page?.video()?await page.video().path():null;const close=(async()=>{try{await context?.close();}finally{await browser?.close();}})();let timer;
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('70s inclusive cleanup')),Math.max(1,Math.min(20000,70000-(Date.now()-started))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,elapsedMs:evidence.elapsedMs,samples:evidence.samples.length}));
}

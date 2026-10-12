import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]),receipt=process.env.KITTYMECH_BUILD_RECEIPT;
if(!/^[a-f0-9]{64}$/.test(receipt??''))throw Error('Exact frozen receipt required');
await mkdir(output,{recursive:false});const started=Date.now();
const evidence={receipt,status:'RUNNING',scope:'ONE ordinary local diagnostics admission capture. Shared city snapshot dispatch and redundant solo fitting correction105. Headless provenance cannot qualify actual IAB lag or net performance.',errors:[],phases:[],reports:null};let browser,context,page;
const guard=()=>{if(Date.now()-started>40000)throw Error('40s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:1440,height:900}}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Lag105');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Lag105'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness')),20000);})]);}finally{clearTimeout(timer);}
 const observe=async(phase,transform)=>{guard();await page.keyboard.down('KeyW');try{if(transform)await page.keyboard.press('KeyR');await page.waitForTimeout(900);}finally{await page.keyboard.up('KeyW');}await page.waitForTimeout(5200);guard();const diagnostics=await page.evaluate(()=>{const s=window.kittyMechDebug.snapshot();return {snapshot:{tick:s.tick,time:s.time,actors:s.actors.map(a=>({id:a.id,name:a.name,position:a.position,hp:a.hp,stance:a.stance}))},performance:window.kittyMechDebug.performance(),camera:window.kittyMechDebug.camera(),feline:window.kittyFelinePrototype008.read()};});evidence.phases.push({phase,wall:Date.now(),diagnostics});await page.screenshot({path:resolve(output,phase+'.png')});};
 await observe('prototype-report',true);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).waitFor({state:'visible'});await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();
 await observe('standard-report',false);
 evidence.reports=await page.evaluate(async()=>{const r=await fetch('/client-report',{cache:'no-store'});if(!r.ok)throw Error('Client report GET '+r.status);return r.json();});
 const rows=evidence.reports.clients.flatMap(c=>c.reports.map(r=>r.report));if(!rows.some(r=>r.prototype&&r.browser==='headless-chromium'&&r.phaseAtEnd==='playing')||!rows.some(r=>!r.prototype&&r.browser==='headless-chromium'&&r.phaseAtEnd==='playing'))throw Error('Both actual headless diagnostic windows required');
 guard();evidence.status='CAPTURED_INDEPENDENT_REVIEW_REQUIRED';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=error.stack??String(error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 await page?.keyboard.up('KeyW').catch(()=>{});evidence.video=page?.video()?await page.video().path():null;const close=(async()=>{try{await context?.close();}finally{await browser?.close();}})();let timer;
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('60s inclusive cleanup')),Math.max(1,Math.min(20000,60000-(Date.now()-started))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,elapsedMs:evidence.elapsedMs}));
}

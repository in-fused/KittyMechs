import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const out=resolve('.sites-runtime/overhaul-20261010/lag109-solo');
await mkdir(out,{recursive:false});
const evidence={scope:'Public Solo Low with standard rig; headless hardware observation cannot qualify affected IAB',errors:[],samples:[]};
let browser,context,page;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByLabel('Pilot callsign').fill('Solo109');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
 await Promise.race([readyForOrdinaryPlay(page,'Solo109'),new Promise((_,reject)=>setTimeout(()=>reject(Error('30s readiness')),30000))]);
 await page.keyboard.down('KeyW');try{await page.waitForTimeout(3000);}finally{await page.keyboard.up('KeyW');}
 for(let i=0;i<3;i++){await page.waitForTimeout(1800);evidence.samples.push(await page.evaluate(()=>({performance:window.kittyMechDebug.performance(),local:window.kittyMechDebug.localAuthorityTiming(),transport:window.kittyMechDebug.transport(),snapshot:(()=>{const s=window.kittyMechDebug.snapshot();return {tick:s.tick,time:s.time,phase:s.phase,actors:s.actors.map(a=>({id:a.id,name:a.name,position:a.position,hp:a.hp}))};})()})));}
 await page.screenshot({path:resolve(out,'solo.png')});evidence.status=evidence.errors.length?'ERROR':'OBSERVED';
}catch(e){evidence.status='FIRST_FAILURE_STOP';evidence.failure=String(e);process.exitCode=1;}
finally{await context?.close();await browser?.close();await writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,samples:evidence.samples.map(s=>({performance:s.performance,tick:s.snapshot.tick,time:s.snapshot.time,actors:s.snapshot.actors.length,frames:s.local.frames.length,physicsMs:s.local.frames.reduce((n,f)=>n+f.physicsMs,0)/s.local.frames.length}))}));}

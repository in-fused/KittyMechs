import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const out=resolve('.sites-runtime/overhaul-20261010/profile169-public'),start=Date.now();
const evidence={scope:'ONE read-only main-thread V8 sampling profile of retained060, Low1440x900, ON/OFF ordinary movement. Profiling adds overhead; no GPU/worker/IAB timing or gameplay quality acceptance.',receipt:process.env.KITTYMECH_BUILD_RECEIPT,status:'ACTIVE',errors:[],phases:[]};
if(evidence.receipt!=='a17e8ae25f8f136e5a7d9ab145448f8fa977d41882e4d17cc5b2a24fa784867b')throw Error('Expected immutable060');
await mkdir(out,{recursive:false});let browser,context,page,cdp;
const guard=()=>{if(Date.now()-start>70000)throw Error('70s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
try{
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByLabel('Pilot callsign').fill('Profile169');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Profile169'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness')),20000);})]);}finally{clearTimeout(timer);}
 await page.waitForTimeout(2000);cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
 const phase=async(name,keys,duration)=>{
  guard();await cdp.send('Profiler.start');const began=Date.now(),samples=[];for(const key of keys)await page.keyboard.down(key);
  try{while(Date.now()-began<duration){guard();samples.push(await page.evaluate(()=>{const d=window.kittyMechDebug,s=d.snapshot(),a=s.actors.find(a=>a.name==='Profile169');return {time:s.time,tick:s.tick,actor:{id:a.id,position:a.position,hp:a.hp,stance:a.stance},camera:d.camera(),performance:d.performance(),prototype:window.kittyFelinePrototype008.read(),worker:window.__kittyTrainingWorker145()};}));await page.waitForTimeout(250);}}
  finally{for(const key of keys)await page.keyboard.up(key);}
  const {profile}=await cdp.send('Profiler.stop');await writeFile(resolve(out,name+'.cpuprofile'),JSON.stringify(profile));await page.screenshot({path:resolve(out,name+'.png')});evidence.phases.push({name,durationMs:Date.now()-began,samples,profile:name+'.cpuprofile'});
 };
 await phase('on-idle',[],4000);await phase('on-forward',['KeyW'],6000);await phase('on-reverse',['KeyS'],6000);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await page.waitForTimeout(500);await phase('off-forward',['KeyW'],6000);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).waitFor({state:'visible'});evidence.workerClosed=await page.evaluate(()=>window.__kittyTrainingWorker145()?.session?.status==='closed');if(!evidence.workerClosed)throw Error('Worker not closed');evidence.status='PROFILED_NOT_A_BENCHMARK';
}catch(e){evidence.status='FIRST_FAILURE_STOP';evidence.failure=String(e.stack??e);process.exitCode=1;await page?.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});}
finally{
 for(const key of ['KeyW','KeyS','KeyR','KeyF','Space'])await page?.keyboard.up(key).catch(()=>{});
 let timer;try{await Promise.race([(async()=>{try{await context?.close();}finally{await browser?.close();}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('90s inclusive cleanup')),Math.max(1,Math.min(15000,90000-(Date.now()-start))));})]);}catch(e){evidence.cleanupFailure=String(e);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-start;await writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,elapsedMs:evidence.elapsedMs,phases:evidence.phases.length}));
}

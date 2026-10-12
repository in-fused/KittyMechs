import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve('.sites-runtime/overhaul-20261010/cpu182-public');
await mkdir(output,{recursive:false});
const result={scope:'Read-only CDP CPU sampling during public Low OFF/ON movement on retained061; instrumentation is not human performance proof.',phases:[],errors:[]};
let browser,context,page,cdp;const started=Date.now();let deadline=setTimeout(()=>{result.errors.push('75s inclusive deadline');void browser?.close();},75000);
try {
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>result.errors.push(String(e)));cdp=await context.newCDPSession(page);
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(false);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByLabel('Pilot callsign').fill('CPU182');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
 await Promise.race([readyForOrdinaryPlay(page,'CPU182'),new Promise((_,reject)=>setTimeout(()=>reject(Error('20s readiness')),20000))]);
 for(const label of ['off','on']){
  if(label==='on'){await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await page.waitForTimeout(1200);}
  await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');await page.keyboard.down('KeyW');try{await page.waitForTimeout(3000);}finally{await page.keyboard.up('KeyW');}await page.waitForTimeout(1500);await page.keyboard.down('KeyS');try{await page.waitForTimeout(1500);}finally{await page.keyboard.up('KeyS');}
  const {profile}=await cdp.send('Profiler.stop');await writeFile(resolve(output,label+'.cpuprofile'),JSON.stringify(profile));
  const state=await page.evaluate(()=>({performance:window.kittyMechDebug.performance(),camera:window.kittyMechDebug.camera(),actor:window.kittyMechDebug.snapshot().actors.find(a=>a.name==='CPU182')}));result.phases.push({label,...state,profileSamples:profile.samples?.length??0});await page.screenshot({path:resolve(output,label+'.png')});if(!state.actor||state.actor.hp<=0||result.errors.length)throw Error('Actor/errors failed');
 }
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'RETURN TO HANGAR',exact:true}).click();await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).waitFor({state:'visible'});result.teardown=await page.evaluate(()=>window.__kittyTrainingWorker145());if(result.teardown.session?.status!=='closed')throw Error('Worker not closed');result.status='CAPTURED';
}catch(e){result.status='INCOMPLETE';result.failure=String(e.stack??e);process.exitCode=1;}
finally{clearTimeout(deadline);await context?.close().finally(()=>browser?.close());result.inclusiveMs=Date.now()-started;result.browserConnected=browser?.isConnected()??false;await writeFile(resolve(output,'evidence.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}

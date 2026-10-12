import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]);await mkdir(output,{recursive:false});
const e={build:'043',scope:'ONE actual publicLow/Pounce ordinary play with CDP sampled JS CPU profile. No GPU timing or actual IAB claim.',errors:[],samples:[]};let browser,context,page,cdp;const started=Date.now();
const read=async phase=>e.samples.push({phase,wall:Date.now(),snapshot:await page.evaluate(async()=>({state:window.kittyMechDebug.snapshot(),input:await window.kittyMechDebug.input(),performance:window.kittyMechDebug.performance(),owner:window.kittyIdentity57Runtime005?.read?.()}))});
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',x=>e.errors.push(String(x)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Profile069');await page.getByRole('button',{name:'CO-OP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Profile069'),new Promise((_,rej)=>{timer=setTimeout(()=>rej(Error('20s ordinary readiness')),20000);})]);}finally{clearTimeout(timer);}await read('ready');
 cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
 e.frames=page.evaluate(()=>new Promise(res=>{let start=performance.now(),last=start,values=[];function tick(now){values.push(now-last);last=now;if(now-start>=21000)res(values);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
 const segment=async(phase,keys,ms)=>{for(const key of keys)await page.keyboard.down(key);try{const until=Date.now()+ms;while(Date.now()<until){await read(phase);if(e.errors.length)throw Error(e.errors[0]);await page.waitForTimeout(400);}}finally{for(const key of keys)await page.keyboard.up(key);}await page.screenshot({path:resolve(output,phase+'.png')});};
 await segment('quad-arc',['KeyW','KeyJ'],7000);await segment('idle',[],4000);await page.keyboard.press('KeyR');await segment('upright-reverse',['KeyS'],7000);await page.keyboard.press('KeyR');await segment('quad-rest',[],3000);
 const profile=(await cdp.send('Profiler.stop')).profile;await writeFile(resolve(output,'cpu-profile.json'),JSON.stringify(profile));e.frames=await e.frames;e.status='CAPTURED_PROFILE_REVIEW_REQUIRED';
}catch(error){e.failure=String(error);e.status='FIRST_FAILURE_STOP';process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{await cdp?.detach().catch(()=>{});await context?.close();await browser?.close();e.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(e));console.log(JSON.stringify({status:e.status,failure:e.failure,elapsedMs:e.elapsedMs,samples:e.samples.length}));}

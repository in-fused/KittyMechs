import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]),receipt=process.env.KITTYMECH_BUILD_RECEIPT;
if(!output||!receipt||!/^[a-f0-9]{64}$/.test(receipt))throw Error('Exact receipt and output required');
await mkdir(output,{recursive:false});
const began=Date.now(),e={receipt,scope:'ONE normal single connected Rainline pilot, Lowest/new feline rig, movement/stance and Low pixel-budget/report UI review; no upward-camera repeat. Public UI/held keys only. Read-only sampled state, rAF timing not GPU timing or actual IAB qualification.',samples:[],frames:[],errors:[]};
let browser,context,page,phase='launch';
const guard=()=>{if(Date.now()-began>80000)throw Error('80s work bound');if(e.errors.length)throw Error(e.errors[0]);};
const read=async()=>{guard();const x=await page.evaluate(async()=>({snapshot:window.kittyMechDebug.snapshot(),camera:window.kittyMechDebug.camera(),input:await window.kittyMechDebug.input(),performance:window.kittyMechDebug.performance(),owner:window.kittyIdentity57Runtime005?.read?.()}));e.samples.push({wallMs:Date.now()-began,phase,...x});};
const segment=async(name,keys,ms)=>{phase=name;guard();for(const k of keys)await page.keyboard.down(k);try{const end=Date.now()+ms;while(Date.now()<end){await read();await page.waitForTimeout(150);}}finally{for(const k of keys)await page.keyboard.up(k);}await page.screenshot({path:resolve(output,name+'.png')});};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const system=await browser.newBrowserCDPSession();try{e.gpu=(await system.send('SystemInfo.getInfo')).gpu;}finally{await system.detach();}
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',x=>e.errors.push(String(x)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('LowBudget059');await page.getByRole('button',{name:'CO-OP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'LowBudget059'),new Promise((_,rej)=>{timer=setTimeout(()=>rej(Error('20s ordinary readiness')),20000);})]);}finally{clearTimeout(timer);}await read();
 const frames=page.evaluate(()=>new Promise(res=>{const start=performance.now(),values=[];let last=start;function tick(now){values.push(now-last);last=now;if(now-start>=12000)res(values);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
 await segment('rest',[],2000);await segment('forward',['KeyW'],3000);await segment('backward',['KeyS'],3000);
 await page.keyboard.press('KeyR');await segment('upright',['KeyW'],2000);await page.keyboard.press('KeyR');await segment('quadruped',['KeyS'],2000);e.frames=await frames;
 const report=page.getByRole('group',{name:'Renderer report',exact:true});e.buffers=[];
 const buffer=async(name)=>{phase=name;guard();await page.waitForFunction(()=>{const c=document.querySelector('canvas');return c&&c.width>0&&c.height>0&&c.width*c.height<=921600+4000;},null,{timeout:5000});await page.waitForTimeout(1500);const b=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight}));if(b.width*b.height>925600)throw Error('Low budget exceeded');e.buffers.push({name,...b,report:await report.innerText()});await page.screenshot({path:resolve(output,name+'.png')});};
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await buffer('report-1440');
 await page.setViewportSize({width:1920,height:1080});await buffer('report-1920');
 await page.setViewportSize({width:3840,height:2160});await buffer('report-3840');
 await page.setViewportSize({width:1440,height:900});await buffer('report-restored');await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByRole('button',{name:'RESUME EXPEDITION',exact:true}).click();await segment('resumed',['KeyW'],1000);e.status='CAPTURED_REVIEW_REQUIRED';

}catch(error){e.status='FIRST_FAILURE_STOP';e.failure=String(error);e.failedPhase=phase;process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 e.video=page?.video()?await page.video().path():null;let timer;
 try{await Promise.race([(async()=>{if(page)for(const k of ['KeyW','KeyS','KeyA','KeyD'])await page.keyboard.up(k).catch(()=>{});await context?.close();await browser?.close();})(),new Promise((_,rej)=>{timer=setTimeout(()=>rej(Error('30s close/110s inclusive')),Math.max(1,Math.min(30000,110000-(Date.now()-began))));})]);}catch(error){e.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 e.elapsedMs=Date.now()-began;await writeFile(resolve(output,'evidence.json'),JSON.stringify(e));console.log(JSON.stringify({status:e.status,failure:e.failure,elapsedMs:e.elapsedMs,samples:e.samples.length}));
}

import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay as ready} from './overhaul-play-ready.mjs';
import {installAudioCapture,finishAudioCapture} from './overhaul-browser-audio.mjs';

// Root-controlled presentation candidate; every simulation action is public UI
// or sustained keyboard input. Samples never steer the actor or create events.
const output=resolve('.sites-runtime/overhaul-20261010/practical-motion-player-002');
await mkdir(output,{recursive:false});
const origin='http://localhost:8795',viewport={width:1440,height:900};
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const contexts=await Promise.all([browser.newContext({viewport,recordVideo:{dir:output,size:{width:960,height:600}}}),browser.newContext({viewport,recordVideo:{dir:output,size:{width:960,height:600}}})]);
const [host,guest]=await Promise.all(contexts.map(c=>c.newPage()));
await installAudioCapture(host);
const evidence={startUTC:new Date().toISOString(),scope:'ONE frozen022 private pending legacy-rig motion observation; public sustained keys and read-only sparse samples. No new anatomy asset, warp, damage injection or acceptance flags. Pair and climbing attempts only qualify if real authoritative actions occur.',status:'RUNNING',events:[],errors:[]};
const start=Date.now();
const guard=()=>{if(Date.now()-start>180000)throw Error('Cumulative180s observation bound STOP');};
for(const [page,name] of [[host,'host'],[guest,'guest']]){page.setDefaultTimeout(15000);page.on('pageerror',e=>evidence.errors.push({name,message:e.message,at:new Date().toISOString()}));}
const read=page=>page.evaluate(async()=>({snapshot:window.kittyMechDebug.snapshot(),camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance(),transport:window.kittyMechDebug.transport(),input:await window.kittyMechDebug.input(),motion:window.kittyPracticalMotion002?.read(),audio:window.__kittyMechOutputCapture?.inspect()}));
const sample=async(label,{check=true}={})=>{
  if(check)guard();
  const [h,g]=await Promise.all([read(host),read(guest)]);
  evidence.events.push({label,wallUTC:new Date().toISOString(),host:h,guest:g});
  await writeFile(resolve(output,'progress.json'),JSON.stringify(evidence,null,2));
  console.log(label);
  if(check&&evidence.errors.length)throw Error('Actual browser error: '+evidence.errors[0].message);
  if(check&&[h,g].some(s=>s.transport.error))throw Error('Actual transport error');
  if(check&&[h,g].some(s=>s.motion?.diagnostics.some(d=>d.missingBones.length||d.missingClips.length)))throw Error('Actual candidate rig/clip binding incomplete');
  if(check&&[h,g].some(s=>s.motion?.diagnostics.some(d=>d.firstFailure)))throw Error('Actual candidate rejected contact request preserved');
  if(check&&[h,g].some(s=>s.motion?.diagnostics.some(d=>d.queryCount>12)))throw Error('Actual candidate exceeded bounded scene query budget');
  return {h,g};
};
const keys=['KeyW','KeyA','KeyS','KeyD','KeyJ','KeyL','KeyI','KeyK','KeyF','KeyQ','KeyC','KeyE','KeyR','Space','ShiftLeft'];
const release=async page=>{for(const key of keys)await page.keyboard.up(key);};
const hold=async(page,held,ms)=>{guard();await page.bringToFront();for(const key of held)await page.keyboard.down(key);try{await page.waitForTimeout(ms);}finally{for(const key of held)await page.keyboard.up(key);}};
const shot=async(name)=>{await host.screenshot({path:resolve(output,name+'-host.png')});await guest.screenshot({path:resolve(output,name+'-guest.png')});};
try{
  await host.goto(origin+'/?debug=1&overhaul=1');
  await host.getByLabel('Pilot callsign').fill('MotionHost');await host.getByRole('button',{name:'PVP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'MotionHost');
  await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');invite.searchParams.set('overhaul','1');
  await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('MotionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'MotionGuest');
  for(const page of [host,guest])await page.evaluate(()=>{const ids=window.kittyMechDebug.snapshot().actors.filter(a=>!a.bot).map(a=>a.id);if(!window.kittyPracticalMotion002)throw Error('Root-local presentation candidate unavailable');window.kittyPracticalMotion002.configure({enabled:true,actors:ids});});
  await host.waitForTimeout(500);await sample('actual private owner idle');await shot('idle');
  await hold(host,['KeyL'],825);await hold(host,['KeyW'],350);await sample('public facing and approach toward nearby pilot');
  await hold(host,['KeyW','ShiftLeft'],800);await sample('public pounce strike attempt');await host.waitForTimeout(650);await sample('actual post-pounce outcome');await shot('pounce');
  await hold(host,['KeyW'],1000);await sample('continuous quadruped travel');
  await host.keyboard.down('KeyW');await host.keyboard.press('KeyR');await host.waitForTimeout(850);await sample('moving R upright transition');await host.waitForTimeout(600);await sample('continuous upright stride');await host.keyboard.up('KeyW');await shot('upright');
  await hold(host,['KeyA'],650);await sample('upright lateral turn');
  await host.keyboard.down('KeyW');await host.keyboard.press('Space');await host.waitForTimeout(250);await sample('public jump airborne');await host.waitForTimeout(850);await sample('public landing recovery');await host.keyboard.press('KeyR');await host.waitForTimeout(850);await host.keyboard.up('KeyW');await sample('moving R return to quadruped');await shot('return');
  await hold(host,['KeyW','KeyC'],2500);await sample('public facade claw catch attempt');await host.waitForTimeout(400);await sample('actual held contact or unobserved climb');await shot('claw');
  await hold(host,['KeyF'],300);await sample('public repeater and actual audio output');await host.waitForTimeout(700);await sample('released inputs and contact recovery');await shot('finish');
  evidence.status='OBSERVATION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';
}catch(error){evidence.status='FAIL_STOP';evidence.failure=error instanceof Error?error.stack:String(error);await sample('first failure preserved',{check:false}).catch(e=>{evidence.failureSampleError=String(e);});await shot('failure').catch(()=>{});process.exitCode=1;}
finally{
  await Promise.all([release(host),release(guest)]).catch(()=>{});
  evidence.endUTC=new Date().toISOString();
  evidence.audio=await finishAudioCapture(host,resolve(output,'actual-game-output.webm')).catch(e=>({failure:String(e)}));
  evidence.videos=await Promise.all([host.video().path(),guest.video().path()]);
  await Promise.all(contexts.map(c=>c.close()));await browser.close();
  await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,output}));
}

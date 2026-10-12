import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const output=resolve(process.argv[2]),origin='http://localhost:8799',started=Date.now();
await mkdir(output,{recursive:false});
const evidence={origin,buildReceipt:process.env.KITTYMECH_BUILD_RECEIPT,status:'RUNNING',recording:true,viewport:{width:1440,height:900},stages:[],errors:[]};
let browser,context,page;
const guard=()=>{if(Date.now()-started>85000)throw Error('85s finite observation bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const release=async()=>{if(page)for(const key of ['KeyW','KeyF','KeyR','KeyV'])await page.keyboard.up(key).catch(()=>{});};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 context=await browser.newContext({viewport:evidence.viewport,recordVideo:{dir:output,size:{width:960,height:600}}});
 await context.addInitScript(()=>{window.__player042={stage:null,frames:[]};let prior=0;requestAnimationFrame(function sample(at){const d=window.kittyMechDebug,s=d?.snapshot(),a=s?.actors.find(a=>a.name==='Player042'),p=window.kittyFelinePrototype008?.read(),o=p?.diagnostics.find(o=>o.actor===a?.id);if(window.__player042.stage&&window.__player042.frames.length<3000)window.__player042.frames.push({stage:window.__player042.stage,at,ms:prior?at-prior:null,tick:s?.tick,time:s?.time,position:a?.position,velocity:a?.velocity,stance:a?.stance,pulseAt:a?.pulseAt,mode:o?.mode,phase:o?.phase,clips:o?.activeClips,ownerMs:o?.lastOwnerMs,failure:o?.firstFailure,camera:d?.camera(),renderer:d?.performance()});prior=at;requestAnimationFrame(sample);});});
 page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>evidence.errors.push(e.message));
 await page.goto(origin+'/?overhaul=1&debug=1');
 await page.getByRole('button',{name:'Open settings',exact:true}).click();
 await page.getByRole('combobox',{name:'Graphics quality'}).selectOption('medium');
 await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);
 evidence.settingDescription=await page.locator('.settings-panel').innerText();
 await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Player042');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 await readyForOrdinaryPlay(page,'Player042');guard();await page.locator('canvas').click({position:{x:720,y:450}});await page.keyboard.press('KeyV');await page.waitForTimeout(1200);
 evidence.gpu=await page.evaluate(()=>{const c=document.querySelector('canvas'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return{renderer:g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER),dpr:devicePixelRatio,width:c.width,height:c.height};});
 for(const [name,keys] of [['idle',[]],['walking',['KeyW']],['moving-fire',['KeyW','KeyF']],['upright-walking',['KeyW']]]){
  guard();await release();if(name==='upright-walking'){await page.keyboard.press('KeyR');await page.waitForTimeout(650);}
  await page.evaluate(name=>{window.__player042.stage=name;},name);
  for(const key of keys)await page.keyboard.down(key);
  await page.waitForTimeout(2600);await page.screenshot({path:resolve(output,name+'.png')});await release();
  evidence.stages.push({name,read:await page.evaluate(async()=>({snapshot:window.kittyMechDebug.snapshot(),input:await window.kittyMechDebug.input(),prototype:window.kittyFelinePrototype008.read(),camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance()}))});await page.evaluate(()=>{window.__player042.stage=null;});await page.waitForTimeout(500);
 }
 evidence.frames=await page.evaluate(()=>window.__player042.frames);
 const percentile=(a,p)=>{a=[...a].sort((x,y)=>x-y);return a[Math.ceil((a.length-1)*p)]??null;};
 evidence.summary=evidence.stages.map(s=>{const rows=evidence.frames.filter(f=>f.stage===s.name);return{name:s.name,count:rows.length,medianMs:percentile(rows.map(f=>f.ms).filter(Number.isFinite),.5),p95Ms:percentile(rows.map(f=>f.ms).filter(Number.isFinite),.95),modes:[...new Set(rows.map(f=>f.mode))],gaitFrames:rows.filter(f=>f.clips?.some(c=>/Walk|Stride|Trot|Gallop/.test(c.name)&&c.weight>.1)).length,phaseSamples:[...new Set(rows.map(f=>f.phase))].length};});
 evidence.status='OBSERVED_REQUIRES_PIXEL_AND_GAMEPLAY_REVIEW';
}catch(error){evidence.status='FIRST_FAILURE_STOP';evidence.failure=error.stack??String(error);process.exitCode=1;await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{await release();evidence.video=page?.video()?await page.video().path():null;await context?.close();await browser?.close();evidence.elapsedMs=Date.now()-started;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({status:evidence.status,failure:evidence.failure,summary:evidence.summary,elapsedMs:evidence.elapsedMs}));}

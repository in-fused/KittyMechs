import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
const out=resolve('.sites-runtime/overhaul-20261010/experience157-default-camera'),started=Date.now();
const evidence={scope:'ONE readonly frozen058 default6m ON camera, no V or camera slider. Headless baseline only, not affected-IAB lag proof.',receipt:process.env.KITTYMECH_BUILD_RECEIPT,errors:[],samples:[],status:'RUNNING'};
if(evidence.receipt!=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf')throw Error('Exact058 required');
await mkdir(out,{recursive:false});let browser,context,page;
const read=async name=>{const value=await page.evaluate(async()=>({camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance(),transport:window.kittyMechDebug.transport(),worker:window.__kittyTrainingWorker145?.(),feline:window.kittyFelinePrototype008.read(),contact:await window.kittyMechDebug.contact()}));evidence.samples.push({name,wall:Date.now(),value});};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,timeout:10000});context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/?debug=1');await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);
 const slider=page.getByLabel('Feline preview camera distance',{exact:true});evidence.initialCameraMetres=await slider.inputValue();if(evidence.initialCameraMetres!=='6')throw Error('Not fresh default6');
 await page.getByRole('button',{name:'Close settings',exact:true}).click();await page.getByLabel('Pilot callsign').fill('Camera157');await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByRole('button',{name:'DEPLOY SOLO',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Camera157'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('20s readiness')),20000)})]);}finally{clearTimeout(timer);}
 await read('initial-default');await page.screenshot({path:resolve(out,'initial-default.png')});
 await page.keyboard.down('KeyD');try{await page.waitForTimeout(1400);}finally{await page.keyboard.up('KeyD');}
 await read('beacon-departure');await page.screenshot({path:resolve(out,'beacon-departure.png')});
 await page.keyboard.down('KeyW');try{for(let i=0;i<4;i++){await page.waitForTimeout(350);await read('forward-'+i);}}finally{await page.keyboard.up('KeyW');}
 await page.screenshot({path:resolve(out,'forward.png')});await page.waitForTimeout(900);await read('settled');
 if(evidence.errors.length)throw Error(evidence.errors[0]);evidence.status='CAPTURED_DEFAULT_CAMERA_REVIEW_REQUIRED';
}catch(e){evidence.status='STOPPED_FIRST_FAILURE';evidence.failure=String(e);process.exitCode=1;}
finally{
 let timer;try{await Promise.race([(async()=>{try{await context?.close();}finally{await browser?.close();}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('40s inclusive cleanup')),Math.max(1,Math.min(10000,40000-(Date.now()-started))))})]);}catch(e){evidence.cleanupFailure=String(e);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.elapsedMs=Date.now()-started;await writeFile(resolve(out,'evidence.json'),JSON.stringify(evidence));console.log(JSON.stringify({status:evidence.status,elapsedMs:evidence.elapsedMs,failure:evidence.failure}));
}

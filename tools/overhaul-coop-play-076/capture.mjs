import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from '../overhaul-play-ready.mjs';
import {createWaypointController076} from './controller.mjs';
const receipt=process.env.KITTYMECH_BUILD_RECEIPT;if(!/^[a-f0-9]{64}$/i.test(receipt??''))throw Error('076 requires exact immutable live045 build receipt SHA256');
const started=Date.now(),output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261010/waypoint076-public');await mkdir(output,{recursive:false});
const evidence={scope:'ONE small ordinary Low/Pounce Rainline7734 public waypoint convergence; no mission/camera/performance/rescue qualification',buildReceipt:receipt,status:'RUNNING',startUTC:new Date(started).toISOString(),bounds:{workMs:60000,cleanupMs:20000,inclusiveMs:80000},waypoints:[],errors:[]};
let browser,context,page,controller,phase='startup';
const guard=()=>{if(Date.now()-started>=60000)throw Error('07660s work bound');if(evidence.errors.length)throw Error(evidence.errors[0]);};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',x=>evidence.errors.push(String(x)));
 await page.goto('http://localhost:8799/?overhaul=1&debug=1');guard();await page.getByRole('button',{name:'Open settings',exact:true}).click();await page.getByLabel('Graphics quality',{exact:true}).selectOption('low');await page.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await page.getByRole('button',{name:'Close settings',exact:true}).click();
 await page.getByLabel('Pilot callsign').fill('Waypoint076');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.getByLabel('Select theater').selectOption('7734');await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 let timer;try{await Promise.race([readyForOrdinaryPlay(page,'Waypoint076'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Existing20s ordinary readiness')),Math.max(1,Math.min(20000,60000-(Date.now()-started))));})]);}finally{clearTimeout(timer);}guard();
 controller=createWaypointController076({page,name:'Waypoint076',guard,evidence});evidence.initial=await controller.read();await page.screenshot({path:resolve(output,'initial.png')});
 phase='far-waypoint';const far=await controller.moveTo({x:-8,z:12},{phase,tolerance:1.1});await page.screenshot({path:resolve(output,'far-rest.png')});
 // The second goal is1.8m from the observed resting position, along the same
 // ordinary open spawn road; it is a target coordinate, never an actor write.
 phase='near-waypoint';await controller.moveTo({x:far.rest.position.x,z:far.rest.position.z-1.8},{phase,tolerance:1.1});await page.screenshot({path:resolve(output,'near-rest.png')});
 guard();evidence.final=await controller.read();evidence.status='BOTH_PUBLIC_WAYPOINTS_SETTLED_INDEPENDENT_REVIEW_REQUIRED';
}catch(error){evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);evidence.unfinishedPhase=phase;process.exitCode=1;await controller?.release().catch(()=>{});evidence.final=controller?.lastObservation();await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
 let timer;const close=(async()=>{await controller?.release().catch(()=>{});evidence.video=page?.video()?await page.video().path():null;await context?.close();await browser?.close();})();
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('07620s cleanup/80s inclusive bound')),Math.max(1,Math.min(20000,80000-(Date.now()-started))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-started;const text=JSON.stringify(evidence);if(Buffer.byteLength(text)>2000000)throw Error('076 explicit2MB evidence bound');await writeFile(resolve(output,'evidence.json'),text);console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,inclusiveElapsedMs:evidence.inclusiveElapsedMs}));
}

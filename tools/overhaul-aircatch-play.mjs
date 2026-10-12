import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve('.sites-runtime/overhaul-20261009/'+(process.argv[2]??'aircatch-001'));await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}}),page=await context.newPage();
const evidence={scope:'Ordinary PvP jump from ground, airborne wall catch and intact roof transition. Keyboard/UI only, no actor/input/state injection. Does not prove a strike-pounce catch or every surface.',events:[],errors:[],status:'RUNNING'};
page.on('pageerror',e=>evidence.errors.push(e.message));
const sample=async label=>{const state=await page.evaluate(async()=>({snapshot:window.kittyMechDebug.snapshot(),camera:window.kittyMechDebug.camera(),input:await window.kittyMechDebug.input(),performance:window.kittyMechDebug.performance()}));evidence.events.push({label,...state});await writeFile(resolve(output,'progress.json'),JSON.stringify(evidence,null,2));console.log(label);};
try{
 await page.goto('http://localhost:8790/?debug=1&overhaul=1');await page.getByLabel('Pilot callsign').fill('AirCatchReview');await page.getByRole('button',{name:'PVP',exact:true}).click();await page.getByRole('button',{name:'Select Pounce',exact:true}).click();await page.locator('summary').click();await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
 await page.waitForFunction(()=>window.kittyMechDebug?.snapshot()?.actors.some(a=>a.name==='AirCatchReview')&&window.kittyMechDebug.camera().preferredDistance>0&&window.kittyMechDebug.camera().frameClock>0&&!document.querySelector('.loading-overlay'),{},{timeout:60000});await page.mouse.click(720,450);await sample('ordinary spawn');
 await page.keyboard.down('KeyS');await page.waitForFunction(()=>window.kittyMechDebug.snapshot().actors.find(a=>a.name==='AirCatchReview').position.z>38,{},{timeout:12000});await page.keyboard.up('KeyS');
 await page.keyboard.down('KeyA');await page.waitForFunction(()=>window.kittyMechDebug.snapshot().actors.find(a=>a.name==='AirCatchReview').position.x< -28,{},{timeout:12000});await page.keyboard.up('KeyA');await page.waitForTimeout(400);await sample('grounded real facade approach');
 await page.keyboard.down('KeyW');await page.keyboard.press('Space');
 await page.waitForFunction(()=>{const a=window.kittyMechDebug.snapshot().actors.find(a=>a.name==='AirCatchReview');return !a.grounded&&!a.climb&&a.position.y>1.4;},{},{timeout:3000});await sample('observed airborne launch before grip');
 await page.keyboard.down('KeyC');await page.waitForFunction(()=>!!window.kittyMechDebug.snapshot().actors.find(a=>a.name==='AirCatchReview').climb,{},{timeout:5000});await page.keyboard.up('KeyW');await sample('actual airborne facade catch');await page.screenshot({path:resolve(output,'catch.png')});
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>{const a=window.kittyMechDebug.snapshot().actors.find(a=>a.name==='AirCatchReview');return !a.climb&&a.grounded&&a.position.y>9.3;},{},{timeout:16000});await page.keyboard.up('KeyW');await page.keyboard.up('KeyC');await sample('grounded roof mantle after airborne catch');
 await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');await sample('ordinary usable roof');await page.screenshot({path:resolve(output,'roof.png')});evidence.status='OBSERVED_JUMP_CATCH_REVIEW_REQUIRED';
}catch(e){evidence.status='INCOMPLETE';evidence.failure=String(e);await sample('failure').catch(()=>{});await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{for(const key of ['KeyW','KeyA','KeyS','KeyD','KeyC'])await page.keyboard.up(key).catch(()=>{});evidence.video=await page.video().path();await context.close();await browser.close();await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors}));}

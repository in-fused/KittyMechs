import {readyForOrdinaryPlay as ready} from './overhaul-play-ready.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve('.sites-runtime/overhaul-20261009/'+(process.argv[2]??'clock-play-001'));
await mkdir(output,{recursive:false});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const recording=process.env.KITTYMECH_CAPTURE_VIDEO!=='0';
const options={viewport:{width:1440,height:900},...(recording?{recordVideo:{dir:output,size:{width:960,height:600}}}:{})};
const hc=await browser.newContext(options),gc=await browser.newContext(options),host=await hc.newPage(),guest=await gc.newPage();
const evidence={scope:'Bounded ordinary two-client Co-op staging/movement clock capture. Normal UI/keys, readonly client and health receipts; no state/input mutation.',buildReceipt:process.argv[3]??'build-008',recording,events:[],errors:[],status:'RUNNING'};
for(const [page,name] of [[host,'host'],[guest,'guest']])page.on('pageerror',e=>evidence.errors.push(name+': '+e.message));
const read=page=>page.evaluate(async()=>({wall:Date.now(),snapshot:window.kittyMechDebug.snapshot(),input:await window.kittyMechDebug.input(),transport:window.kittyMechDebug.transport(),camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance()}));

const sample=async label=>{const wall=Date.now();let health;try{const r=await fetch('http://localhost:8790/health',{signal:AbortSignal.timeout(3000)});health=await r.json();}catch(e){health={error:String(e)};}evidence.events.push({label,wall,health,host:await read(host),guest:await read(guest)});await writeFile(resolve(output,'progress.json'),JSON.stringify(evidence,null,2));console.log(label);};
try{
 await host.goto('http://localhost:8790/?debug=1&overhaul=1');await host.getByLabel('Pilot callsign').fill('ClockHost');await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'ClockHost');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:30000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await guest.getByLabel('Pilot callsign').fill('ClockGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'ClockGuest');await sample('two client mounted staging');
 for(let i=0;i<5;i++){await host.waitForTimeout(3000);await sample('ordinary rest '+i);}
 await host.bringToFront();await host.keyboard.down('KeyW');
 for(let i=0;i<6;i++){await host.waitForTimeout(2000);await sample('ordinary forward held '+i);const a=evidence.events.at(-1).host.snapshot.actors.find(a=>a.name==='ClockHost');if(a.hp<=0||a.position.z<4)break;}
 await host.keyboard.up('KeyW');await sample('normal movement released');
 // Five seconds of admitted normal fire at the unchanged player crosshair;
 // this measures activation load, not aim success or combat quality approval.
 await host.keyboard.down('KeyF');for(let i=0;i<5;i++){await host.waitForTimeout(1000);await sample('ordinary pulse held '+i);}await host.keyboard.up('KeyF');
 await host.screenshot({path:resolve(output,'host-final.png')});await guest.screenshot({path:resolve(output,'guest-final.png')});evidence.status='CLOCK_RECEIPT_REVIEW_REQUIRED';
}catch(e){evidence.status='INCOMPLETE';evidence.failure=String(e);await sample('failure').catch(()=>{});evidence.hostFailure=await read(host).catch(e=>({error:String(e)}));evidence.hostUI=await host.locator('body').innerText().catch(()=>null);await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{for(const key of ['KeyW','KeyF','Tab'])await host.keyboard.up(key).catch(()=>{});evidence.hostVideo=recording?await host.video().path():null;evidence.guestVideo=recording?await guest.video().path():null;await hc.close();await gc.close();await browser.close();await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors}));}

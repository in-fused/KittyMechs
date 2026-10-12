import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const output=resolve('.sites-runtime/overhaul-20261009/'+(process.argv[2]??'duel-001'));await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});
const guestContext=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});
const host=await context.newPage(),guest=await guestContext.newPage();
const evidence={scope:'Ordinary UI/keyboard two-client PvP, read-only snapshots; no actor or input mutation.',events:[],errors:[]};
for(const [page,name] of [[host,'host'],[guest,'guest']])page.on('pageerror',e=>evidence.errors.push(name+': '+e.message));
const state=page=>page.evaluate(()=>{const s=window.kittyMechDebug.snapshot();return {snapshot:{time:s.time,tick:s.tick,seed:s.seed,mode:s.mode,phase:s.phase,actors:s.actors,events:s.events.slice(-20)},camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance()};});
const log=async label=>{console.log(label);await writeFile(resolve(output,'progress.json'),JSON.stringify({label,events:evidence.events,errors:evidence.errors},null,2));};
const sample=async label=>{evidence.events.push({label,host:await state(host),guest:await state(guest)});if(!label.includes('strike'))await log(label);};
const pilot=async(page,name)=>{await log('waiting '+name);await page.waitForFunction(n=>window.kittyMechDebug?.snapshot()?.actors.some(a=>a.name===n)&&!document.querySelector('.loading-overlay'),name,{timeout:60000});await page.mouse.click(720,450);await log('ready '+name);};
const turn=async(page,name,yaw)=>{await page.bringToFront();await page.mouse.click(720,450);for(let i=0;i<24;i++){const actor=(await state(page)).snapshot.actors.find(a=>a.name===name);const d=Math.atan2(Math.sin(yaw-actor.aimYaw),Math.cos(yaw-actor.aimYaw));evidence.events.push({label:'turn feedback',name,yaw:actor.aimYaw,desired:yaw,at:Date.now()});if(Math.abs(d)<.06)return;const key=d>0?'KeyJ':'KeyL';await page.keyboard.down(key);await page.waitForTimeout(Math.min(250,Math.max(20,Math.abs(d)/1.9*800)));await page.keyboard.up(key);await page.waitForTimeout(100);}throw Error('camera yaw did not converge');};
const record=async page=>page.evaluate(async()=>{await window.kittyMechDebug.contact();window.overhaulDuelHistory=[];window.overhaulDuelOrigin=performance.timeOrigin;let tick=-1;const collect=async()=>{const s=window.kittyMechDebug.snapshot();if(s.tick!==tick){tick=s.tick;const contacts=await window.kittyMechDebug.contact();window.overhaulDuelHistory.push({wall:performance.now(),visibility:document.visibilityState,frameClock:window.kittyMechDebug.camera().frameClock,fps:window.kittyMechDebug.performance().fps,time:s.time,tick:s.tick,render:contacts.map(c=>({id:c.id,frameClock:c.frameClock,time:c.renderTime,pair:c.pair??null})),actors:s.actors.map(a=>({id:a.id,name:a.name,hp:a.hp,stance:a.stance,position:{...a.position},yaw:a.yaw,pair:a.pair?{...a.pair}:null}))});if(window.overhaulDuelHistory.length>5000)window.overhaulDuelHistory.shift();}window.overhaulDuelRaf=requestAnimationFrame(collect);};await collect();});
try{
 await host.goto('http://localhost:8790/?debug=1&overhaul=1');await host.getByLabel('Pilot callsign').fill('PairHost');await host.getByRole('button',{name:'PVP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await pilot(host,'PairHost');
 await host.keyboard.down('Tab');const link=await host.getByLabel('Squad invite').inputValue();await host.keyboard.up('Tab');const url=new URL(link);url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await guest.getByLabel('Pilot callsign').fill('PairGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await pilot(guest,'PairGuest');await guest.waitForTimeout(3000);await sample('two client ready');
 await turn(host,'PairHost',-Math.PI/2);await turn(guest,'PairGuest',Math.PI/2);await sample('opposed cameras');
 await record(host);
 await host.bringToFront();await host.keyboard.press('ShiftLeft');
 await host.waitForTimeout(450);await host.keyboard.down('KeyF');await host.waitForTimeout(600);await host.keyboard.up('KeyF');await host.waitForTimeout(750);await sample('quad claw end');
 await host.waitForTimeout(2300);await host.keyboard.press('ShiftLeft');await host.waitForTimeout(350);await guest.keyboard.press('Space');await host.waitForTimeout(1450);await sample('quad escape end');
 await host.waitForTimeout(9000);await host.keyboard.press('KeyR');await guest.bringToFront();await guest.keyboard.press('KeyR');await guest.waitForTimeout(1400);await sample('both upright');await host.screenshot({path:resolve(output,'upright.png')});
 await host.bringToFront();await host.keyboard.press('ShiftLeft');await host.waitForTimeout(450);await host.keyboard.down('KeyF');await host.waitForTimeout(600);await host.keyboard.up('KeyF');await host.waitForTimeout(750);await sample('upright claw end');
 await host.waitForTimeout(2300);await host.keyboard.press('ShiftLeft');await host.waitForTimeout(350);await guest.keyboard.press('Space');await host.waitForTimeout(1450);await sample('upright escape end');
 evidence.history=await host.evaluate(()=>{cancelAnimationFrame(window.overhaulDuelRaf);return window.overhaulDuelHistory;});evidence.timeOrigin=await host.evaluate(()=>window.overhaulDuelOrigin);
 await guest.screenshot({path:resolve(output,'guest-end.png')});
 evidence.quadPair=evidence.history.some(e=>e.actors.some(a=>a.pair?.style==='quadruped'));
 evidence.uprightPair=evidence.history.some(e=>e.actors.some(a=>a.pair?.style==='upright'));
 evidence.status=evidence.quadPair&&evidence.uprightPair&&!evidence.errors.length?'CAPTURE_COMPLETE_REVIEW_REQUIRED':'INCOMPLETE';
}catch(error){evidence.failure=String(error);await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{evidence.hostVideo=await host.video().path();evidence.guestVideo=await guest.video().path();await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));await guestContext.close();await context.close();await browser.close();console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,quad:evidence.quadPair,upright:evidence.uprightPair,errors:evidence.errors}));}

import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {readyForOrdinaryPlay} from './overhaul-play-ready.mjs';

const output=resolve('.sites-runtime/overhaul-20261010/'+(process.argv[2]??'body-play-001'));
const base=process.env.KITTYMECH_PLAY_URL??'http://localhost:8790/?debug=1&overhaul=1';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:960,height:600}}});
const page=await context.newPage();
const report={scope:'Normal UI/keyboard two-client body motion observation. No state writes, injected actor/support, obstacle fixture or automatic gameplay approval.',buildReceipt:process.env.KITTYMECH_BUILD_RECEIPT??'UNSPECIFIED',events:[],errors:[],status:'RUNNING'};
let guestContext,guest;
page.on('pageerror',error=>report.errors.push(String(error)));
const read=async p=>p.evaluate(async()=>({snapshot:window.kittyMechDebug.snapshot(),camera:window.kittyMechDebug.camera(),contact:await window.kittyMechDebug.contact(),input:await window.kittyMechDebug.input(),performance:window.kittyMechDebug.performance(),transport:window.kittyMechDebug.transport()}));
const sample=async(label,png=false)=>{
  const host=await read(page),visitor=guest?await read(guest):null;
  report.events.push({label,wall:Date.now(),host,guest:visitor});
  if(png)await page.screenshot({path:resolve(output,label+'.png')});
  await writeFile(resolve(output,'progress.json'),JSON.stringify(report,null,2));
};
const hold=async(keys,ms)=>{for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(ms);for(const key of keys)await page.keyboard.up(key);};
try{
  await page.goto(base);
  await page.getByLabel('Pilot callsign').fill('BodyHost');
  await page.getByRole('button',{name:'Select Pounce',exact:true}).click();
  await page.locator('summary').click();
  await page.getByRole('button',{name:'Host on arena server',exact:true}).click();
  await readyForOrdinaryPlay(page,'BodyHost');
  await page.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:30000});
  await page.keyboard.down('Tab');
  const invite=await page.getByLabel('Squad invite').inputValue();
  await page.keyboard.up('Tab');
  const url=new URL(invite);url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');
  guestContext=await browser.newContext({viewport:{width:1440,height:900}});
  guest=await guestContext.newPage();guest.on('pageerror',error=>report.errors.push('guest: '+error));
  await guest.goto(url.toString());await guest.getByLabel('Pilot callsign').fill('BodyGuest');
  await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
  await readyForOrdinaryPlay(guest,'BodyGuest');
  await page.bringToFront();await page.locator('canvas').click({position:{x:720,y:450}});
  await sample('stand',true);
  await hold(['KeyW'],1300);await sample('quad-acceleration',true);
  await page.waitForTimeout(650);await sample('quad-brake',true);
  await hold(['KeyJ'],825);await hold(['KeyW'],550);await page.waitForTimeout(350);
  await sample('turn-and-replant',true);
  await page.keyboard.press('KeyR');await page.waitForTimeout(140);await sample('rise-early',true);
  await hold(['KeyW'],180);await sample('rise-moving',true);
  await page.waitForTimeout(600);await sample('upright-stand',true);
  await hold(['KeyW'],1300);await sample('upright-stride',true);
  await page.waitForTimeout(650);await sample('upright-brake',true);
  await page.keyboard.press('KeyR');await page.waitForTimeout(350);await sample('reverse-middle',true);
  await hold(['KeyW'],900);await sample('resumed-quad',true);
  await hold(['Space','KeyW'],140);await hold(['KeyW'],160);await sample('ordinary-jump',true);
  await page.waitForTimeout(1800);await sample('landing-recovery',true);
  await page.keyboard.press('KeyR');await page.waitForTimeout(260);await page.keyboard.press('KeyR');
  await hold(['KeyD'],250);await sample('intermediate-reversal-request',true);
  await page.waitForTimeout(1200);await sample('final-recovery',true);
  report.status='OBSERVATION_COMPLETE_REVIEW_REQUIRED';
}catch(error){report.status='INCOMPLETE';report.failure=String(error);await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{
  for(const key of ['KeyW','KeyA','KeyS','KeyD','KeyJ','KeyR','Space','Tab'])await page.keyboard.up(key).catch(()=>{});
  if(guestContext)await guestContext.close();await context.close();await browser.close();
  await writeFile(resolve(output,'evidence.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,failure:report.failure,events:report.events.length,errors:report.errors,output}));
}

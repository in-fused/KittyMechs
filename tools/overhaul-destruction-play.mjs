import {readyForOrdinaryPlay as ready} from './overhaul-play-ready.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pilotAim} from './overhaul-pilot-aim.ts';
const output=resolve('.sites-runtime/overhaul-20261009/'+(process.argv[2]??'destruction-001'));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const captureMode=process.env.KITTYMECH_CAPTURE_MODE??'both';
const viewport={width:1440,height:900},recordVideo={dir:output,size:captureMode==='host'?{width:640,height:400}:{width:960,height:600}};
const hc=await browser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await browser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();
const evidence={buildReceipt:process.env.KITTYMECH_BUILD_RECEIPT??'unknown',scope:'Ordinary two-client PvP structural attack. Source coordinates select visible components; no actor, damage, structure, ruin or input-state injection.',capture:{mode:captureMode,viewport,hostVideoSize:captureMode==='none'?null:recordVideo.size,guestVideoSize:captureMode==='both'?recordVideo.size:null},events:[],errors:[],status:'RUNNING'};
for(const [p,label] of [[host,'host'],[guest,'guest']])p.on('pageerror',e=>evidence.errors.push(label+': '+e.message));
const read=async p=>p.evaluate(()=>({snapshot:window.kittyMechDebug.snapshot(),camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance()}));
const sample=async label=>{const at=Date.now(),[hostState,guestState]=await Promise.all([read(host),read(guest)]);let authority;try{const h=await(await fetch('http://localhost:8790/health',{signal:AbortSignal.timeout(3000)})).json(),d=h.diagnostics,r=d?.rooms.find(r=>r.room===hostState.snapshot.room);authority={wall:d?.wall,status:h.status,rooms:h.rooms,players:h.players,clippedMs:d?.clippedMs,pump:d?.pump.slice(-2),room:r?{room:r.room,counts:r.counts,totalMs:r.totalMs,maxMs:r.maxMs,latest:r.latest}:null};}catch(error){authority={error:String(error)};}evidence.events.push({label,at,authority,host:hostState,guest:guestState});await writeFile(resolve(output,'progress.json'),JSON.stringify(evidence,null,2));console.log(label);};

const frameBank='7734:overhaul:spawn-west:frame-bank',facadeBank='7734:overhaul:spawn-west:facade-bank';
// Reposition around the actual fallen facade using normal camera-relative keys.
const go=async(target)=>{const deadline=Date.now()+14000;try{while(Date.now()<deadline){const {snapshot,camera}=await read(host),a=snapshot.actors.find(a=>a.name==='DemolitionHost'),dx=target.x-a.position.x,dz=target.z-a.position.z,d=Math.hypot(dx,dz);if(d<.55)return;const yaw=camera.movementYaw,forward=-(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d,strafe=(dx*Math.cos(yaw)-dz*Math.sin(yaw))/d;for(const [key,on] of [['KeyW',forward>.25],['KeyS',forward<-.25],['KeyD',strafe>.25],['KeyA',strafe<-.25]])if(on)await host.keyboard.down(key);else await host.keyboard.up(key);await host.waitForTimeout(Math.min(180,Math.max(40,d/7*700)));}throw Error('Ordinary ruin reposition bounded');}finally{for(const key of ['KeyW','KeyA','KeyS','KeyD'])await host.keyboard.up(key);}};

const cellHp=(s,id,cell)=>s.structures.find(b=>b.id===id)?.hp[cell];
// Every turn and shot uses keyboard input and the accepted authority angles.
// A bank transition is observed, never manufactured by the diagnostic reader.
const shootCell=async(bank,cell,target)=>{
  const deadline=Date.now()+16000;let start;
  try{while(Date.now()<deadline){const {snapshot:s,camera}=await read(host),a=s.actors.find(a=>a.name==='DemolitionHost');start??=s.time;
    if(cellHp(s,bank,cell)<=0)return;
    if(a.hp<=0||s.time-start>9)throw Error('Bounded structural shot did not remove '+bank+'/'+cell);
    const aim=pilotAim(a,{position:{...target,y:target.y-.65},velocity:{x:0,y:0,z:0}},camera,0);
    const keys=[];if(Math.abs(aim.dyaw)>.018)keys.push(aim.dyaw>0?'KeyJ':'KeyL');if(Math.abs(aim.dpitch)>.012)keys.push(aim.dpitch>0?'KeyI':'KeyK');
    await host.keyboard.up('KeyF');
    if(keys.length){for(const key of keys)await host.keyboard.down(key);await host.waitForTimeout(30);for(const key of keys)await host.keyboard.up(key);}
    else{await host.keyboard.down('KeyF');await host.waitForTimeout(220);}
  }throw Error('Structural shot wall watchdog '+bank+'/'+cell);
  }finally{for(const key of ['KeyF','KeyJ','KeyL','KeyI','KeyK'])await host.keyboard.up(key);}
};
try{
  await host.goto('http://localhost:8790/?debug=1&overhaul=1');await host.getByLabel('Pilot callsign').fill('DemolitionHost');await host.getByRole('button',{name:'PVP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'DemolitionHost');
  await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:30000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');invite.searchParams.set('overhaul','1');await guest.goto(invite.toString());await guest.getByLabel('Pilot callsign').fill('DemolitionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'DemolitionGuest');await host.bringToFront();await sample('ordinary two-client intact district');
  await host.keyboard.down('KeyS');await host.waitForFunction(()=>window.kittyMechDebug.snapshot().actors.find(a=>a.name==='DemolitionHost').position.z>38,{},{timeout:12000});await host.keyboard.up('KeyS');
  await host.keyboard.down('KeyA');await host.waitForFunction(()=>window.kittyMechDebug.snapshot().actors.find(a=>a.name==='DemolitionHost').position.x< -36.5,{},{timeout:12000});await host.keyboard.up('KeyA');await host.waitForTimeout(400);await sample('ordinary front facade firing position');
  // South row0 bay0 owns facade cell24; quadrant2 columns own cells4,5.
  await shootCell(facadeBank,24,{x:-36,y:2.07,z:32.8});await sample('source facade opening');
  await go({x:-43,z:39.5});await go({x:-43,z:32.35});await sample('west flank avoids actual settled facade');
  await shootCell(frameBank,4,{x:-37.35,y:2.07,z:32.35});await sample('first redundant column removed');
  await shootCell(frameBank,5,{x:-35.95,y:2.07,z:32.35});await sample('second support removed');
  for(let i=0;i<40;i++){await host.waitForTimeout(250);const {snapshot}=await read(host);if(snapshot.ruins?.length&&snapshot.ruins.every(r=>r.settled))break;}
  await sample('persistent settled structural state');
  const end=evidence.events.at(-1),roofBank='7734:overhaul:spawn-west:roof-bank';
  if(cellHp(end.host.snapshot,roofBank,2)>0)throw Error('Redundant support removal did not collapse owned roof quadrant');
  if(!end.host.snapshot.ruins?.length||end.host.snapshot.ruins.some(r=>!r.settled))throw Error('Persistent ruin settlement not observed within bound');
  for(const id of [frameBank,facadeBank,roofBank]){
    const h=end.host.snapshot.structures.find(s=>s.id===id),g=end.guest.snapshot.structures.find(s=>s.id===id);
    if(!h||!g||h.brokenMask!==g.brokenMask)throw Error('Guest structural bank mismatch '+id);
  }
  const stableRuins=state=>state.ruins.filter(r=>r.settled).map(r=>({block:r.block,position:r.position,rotation:r.rotation})).sort((a,b)=>a.block-b.block);
  if(JSON.stringify(stableRuins(end.host.snapshot))!==JSON.stringify(stableRuins(end.guest.snapshot)))throw Error('Settled source ruin poses differ between clients');
  await host.screenshot({path:resolve(output,'host-ruins.png')});await guest.screenshot({path:resolve(output,'guest-ruins.png')});
  evidence.status='OBSERVED_SUPPORT_ATTACK_REVIEW_REQUIRED';
}catch(e){evidence.status='INCOMPLETE';evidence.failure=String(e);await sample('failure').catch(()=>{});await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{for(const key of ['KeyW','KeyA','KeyS','KeyD','KeyF'])await host.keyboard.up(key).catch(()=>{});evidence.hostVideo=host.video()?await host.video().path():null;evidence.guestVideo=guest.video()?await guest.video().path():null;await hc.close();await gc.close();await browser.close();await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors}));}

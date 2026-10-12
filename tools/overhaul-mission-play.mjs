import {readyForOrdinaryPlay as ready} from './overhaul-play-ready.mjs';
import {installAudioCapture,finishAudioCapture} from './overhaul-browser-audio.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pilotAim,pilotGunAligned,pilotLatency} from './overhaul-pilot-aim.ts';
import {squadCombatInterruption,squadDecision,squadThreats} from './overhaul-squad-policy.ts';
const output=resolve('.sites-runtime/overhaul-20261009/'+(process.argv[2]??'mission-001'));await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const captureMode=process.env.KITTYMECH_CAPTURE_MODE??'both';
const viewport={width:1440,height:900},recordVideo={dir:output,size:captureMode==='host'?{width:640,height:400}:{width:960,height:600}};
const hc=await browser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await browser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();
const captureAudio=process.env.KITTYMECH_AUDIO_CAPTURE==='1';
if(captureAudio)await installAudioCapture(host);
const evidence={buildReceipt:process.env.KITTYMECH_BUILD_RECEIPT??'unknown',scope:'Ordinary two-client co-op UI/keyboard route. Adaptive pilot reads diagnostics only; never changes actor state, inputs, HP, objectives or collision.',capture:{mode:captureMode,viewport,hostVideoSize:captureMode==='none'?null:recordVideo.size,guestVideoSize:captureMode==='both'?recordVideo.size:null},events:[],errors:[]};
for(const [p,label] of [[host,'host'],[guest,'guest']])p.on('pageerror',e=>evidence.errors.push(label+': '+e.message));
const read=async p=>p.evaluate(async()=>{const input=await window.kittyMechDebug.input?.();return {snapshot:window.kittyMechDebug.snapshot(),transport:window.kittyMechDebug.transport?.(),input,camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance(),visibility:document.visibilityState};});
const pilotRead=async(p,name,id)=>{const value=await p.evaluate(({name,id})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),sight=e=>({...e,visible:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.65},{...e.position,y:e.position.y+.65})===true,fireClear:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+(actor.stance==='upright'?1.65:.65)},{...e.position,y:e.position.y+.65})===true});return {time:s.time,transport:window.kittyMechDebug.transport?.(),actor,humans:s.actors.filter(a=>!a.bot),enemy:id&&s.actors.find(a=>a.id===id)?sight(s.actors.find(a=>a.id===id)):undefined,enemies:id?undefined:s.actors.filter(a=>a.bot&&a.hp>0).map(sight),camera:window.kittyMechDebug.camera()};},{name,id});if(value.transport?.connection==='Disconnected'||value.transport?.error){(evidence.transportFailures??=[]).push({name,wall:Date.now(),...value.transport});throw Error('Arena transport stopped: '+(value.transport.error??JSON.stringify(value.transport.receipt?.close)));}return value;};
const sample=async label=>{const at=Date.now(),[hostState,guestState]=await Promise.all([read(host),read(guest)]);let authority;try{const h=await(await fetch('http://localhost:8790/health',{signal:AbortSignal.timeout(3000)})).json(),d=h.diagnostics,r=d?.rooms.find(r=>r.room===hostState.snapshot.room);authority={wall:d?.wall,status:h.status,rooms:h.rooms,players:h.players,clippedMs:d?.clippedMs,pump:d?.pump.slice(-2),room:r?{room:r.room,counts:r.counts,totalMs:r.totalMs,maxMs:r.maxMs,latest:r.latest}:null};}catch(error){authority={error:String(error)};}evidence.events.push({label,at,authority,host:hostState,guest:guestState});await writeFile(resolve(output,'progress.json'),JSON.stringify(evidence,null,2));console.log(label);};

const release=async p=>{for(const k of ['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK'])await p.keyboard.up(k);};
const faceNorth=async(p,name)=>{for(let i=0;i<20;i++){const state=await pilotRead(p,name),yaw=state.camera.movementYaw??state.actor.aimYaw,d=Math.atan2(Math.sin(-yaw),Math.cos(-yaw));if(Math.abs(d)<.055)return;const key=d>0?'KeyJ':'KeyL';await p.keyboard.down(key);await p.waitForTimeout(Math.max(35,Math.min(250,Math.abs(d)/1.9*800)));await p.keyboard.up(key);await p.waitForTimeout(50);}throw Error('Navigation camera did not converge');};
const go=async(p,name,target,rescue=true,arrival=1.1)=>{await p.bringToFront();await faceNorth(p,name);let prior=Infinity,stalls=0;
 for(let i=0;i<85;i++){let navigation=await pilotRead(p,name),a=navigation.actor;if(a.hp<=0){if(rescue){await rescuePilot(name);navigation=await pilotRead(p,name);a=navigation.actor;await p.bringToFront();}else throw Error(name+' downed on route');}const dx=target.x-a.position.x,dz=target.z-a.position.z,d=Math.hypot(dx,dz);if(d<arrival){await release(p);if(arrival<1.1){await p.waitForTimeout(250);const settled=(await pilotRead(p,name)).actor;if(Math.hypot(target.x-settled.position.x,target.z-settled.position.z)>=arrival)continue;}return;}if(Math.abs(prior-d)<.08)stalls++;else stalls=0;if(stalls>8){
 // Capture held keys and actual successful packets before any key release or
 // context switch. A stopped pose alone does not establish collider contact.
 const receipt=await read(p),yaw=navigation.camera.movementYaw??a.aimYaw;
 (evidence.movementFailures??=[]).push({name,wall:Date.now(),target:{...target},iteration:i,stalls,desired:{forward:-(dx*Math.sin(yaw)+dz*Math.cos(yaw))/d,strafe:(dx*Math.cos(yaw)-dz*Math.sin(yaw))/d,yaw},...receipt});
 throw Error(name+' route did not advance at '+JSON.stringify(a.position));}prior=d;
 const movementYaw=navigation.camera.movementYaw??a.aimYaw,forward=-(dx*Math.sin(movementYaw)+dz*Math.cos(movementYaw))/d,strafe=(dx*Math.cos(movementYaw)-dz*Math.sin(movementYaw))/d;
 for(const [k,on] of [['KeyW',forward>.25],['KeyS',forward<-.25],['KeyD',strafe>.25],['KeyA',strafe<-.25]])if(on)await p.keyboard.down(k);else await p.keyboard.up(k);
 if(arrival<1.1&&d<1.5){
  // Brake between short near-goal taps. A downed ally has no active hull;
  // stopping within the general 1.1m route tolerance can block its restoration.
  await p.waitForTimeout(Math.max(15,Math.min(45,d/7*180)));await release(p);await p.waitForTimeout(250);
 }else await p.waitForTimeout(Math.min(260,Math.max(50,d/7*700)));}
 await release(p);throw Error(name+' route time bound exceeded');};
// Track a live target through ordinary keyboard camera commands. A stale
// snapshot held through a long turn/fire burst cannot qualify shooting.
const trackFire=async(p,name,id,allowDownedAlly=false)=>{await p.bringToFront();let rocketAt=0,latency=0,startTime=null;const deadline=Date.now()+20000;
 const record={name,target:id,startedAt:Date.now(),steps:[],exit:'wall-watchdog'};(evidence.tracking??=[]).push(record);
 try{while(Date.now()<deadline){const readAt=Date.now(),state=await pilotRead(p,name,id),readMs=Date.now()-readAt,a=state.actor,e=state.enemy;startTime??=state.time;
 record.lastObserved={time:state.time,targetHp:e?.hp,targetPosition:e?.position,visible:e?.visible,fireClear:e?.fireClear,pilotHp:a.hp,teammates:state.humans.filter(h=>h.id!==a.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position}))};
 if(a.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!e||e.hp<=0){record.exit='target-defeated';return;}
 if(!e.visible||!e.fireClear){record.exit='target-occluded';return;}
 if(!squadThreats({actor:a,enemies:[e],time:state.time}).length){record.exit='target-disengaged';return;}
 const ally=state.humans.find(h=>h.id!==a.id),interruption=squadCombatInterruption(ally,startTime,state.time,allowDownedAlly);if(interruption){record.exit=interruption;return;}
 if(state.time-startTime>=6.5){record.exit='native-time-bound';record.targetHp=e.hp;return;}
 const aim=pilotAim(a,e,state.camera,latency),look=[];
 if(Math.abs(aim.dyaw)>.025)look.push(aim.dyaw>0?'KeyJ':'KeyL');if(Math.abs(aim.dpitch)>.015)look.push(aim.dpitch>0?'KeyI':'KeyK');
 // F is released before changing the camera. All controls and diagnostic reads
 // remain ordinary browser actions; authority gun alignment is sampled afterward.
 await p.keyboard.up('KeyF');const controlAt=Date.now();
 const pulseMs=look.length?Math.max(15,Math.min(45,Math.abs(aim.dyaw)/1.9*800||45,Math.abs(aim.dpitch)/1.1*800||45)):0;
 try{for(const key of look)await p.keyboard.down(key);if(pulseMs)await p.waitForTimeout(pulseMs);}
 finally{for(const key of look)await p.keyboard.up(key);}
 const controlMs=Date.now()-controlAt,postAt=Date.now(),post=await pilotRead(p,name,id),postReadMs=Date.now()-postAt;
 latency=pilotLatency(latency,state.time,post.time,pulseMs);
 if(post.actor.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!post.enemy||post.enemy.hp<=0){record.exit='target-defeated';return;}
 if(!post.enemy.visible||!post.enemy.fireClear){record.exit='target-occluded';return;}
 const fresh=pilotAim(post.actor,post.enemy,post.camera,latency),aligned=pilotGunAligned(post.actor,post.enemy,fresh.target,post.time);
 const step={wall:Date.now(),time:post.time,readMs,controlMs,postReadMs,pulseMs,latency,targetHp:post.enemy.hp,targetPosition:post.enemy.position,targetVelocity:post.enemy.velocity,actorPosition:post.actor.position,lookYaw:post.camera.lookYaw,lookPitch:post.camera.lookPitch,gunYaw:post.actor.aimYaw,gunPitch:post.actor.aimPitch,desiredYaw:fresh.yaw,desiredPitch:fresh.pitch,dyaw:fresh.dyaw,dpitch:fresh.dpitch,lead:fresh.lead,aligned,visible:post.enemy.visible,fireClear:post.enemy.fireClear,teammates:post.humans.filter(h=>h.id!==post.actor.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position,downed:h.downed}))};record.steps.push(step);
 if(aligned){await p.keyboard.down('KeyF');if(Date.now()>rocketAt){await p.keyboard.press('KeyQ');rocketAt=Date.now()+1600;}}
 await p.waitForTimeout(20);}
 }finally{record.finishedAt=Date.now();for(const k of ['KeyJ','KeyL','KeyI','KeyK','KeyF'])await p.keyboard.up(k);}};
const pilots=[{page:host,name:'MissionHost'},{page:guest,name:'MissionGuest'}];
const squadViews=async()=>{const views=[];for(const p of pilots)views.push(await pilotRead(p.page,p.name));return views;};
let rescues=0;
const rescuePilot=async name=>{if(++rescues>2)throw Error('Bounded rescue attempts exhausted');for(const p of pilots)await release(p.page);const views=await squadViews(),down=views.find(v=>v.actor.name===name)?.actor,survivor=views.find(v=>v.actor.hp>0)?.actor,p=pilots.find(p=>p.name===survivor?.name);if(!down?.downed||!p)throw Error('No surviving rescue pilot');await sample('rescue required '+name);
 const dx=survivor.position.x-down.position.x,dz=survivor.position.z-down.position.z,d=Math.hypot(dx,dz)||1;await go(p.page,p.name,{x:down.position.x+dx/d*4,z:down.position.z+dz/d*4},false,.2);
 await clearThreats(false);await p.page.bringToFront();const began=(await pilotRead(p.page,p.name)).time,deadline=Date.now()+15000;await p.page.keyboard.down('KeyE');
 try{while(Date.now()<deadline){await p.page.waitForTimeout(100);const state=await pilotRead(p.page,p.name),target=state.humans.find(a=>a.name===name);if(target?.hp>0){await sample('ordinary teammate revive '+name);return;}if(state.actor.hp<=0)throw Error('Rescue pilot downed');if(state.time-began>8)break;}}finally{await p.page.keyboard.up('KeyE');}throw Error('Rescue channel did not complete');};
const clearThreats=async(rescue=true)=>{for(let round=0;round<4;round++){const views=await squadViews();let action=squadDecision(views);if(action.kind==='rescue'){if(rescue){await rescuePilot(action.name);continue;}action=squadDecision(views.filter(v=>v.actor.hp>0));if(action.kind!=='fight')return;}
 if(action.kind==='move')return;const p=pilots.find(p=>p.name===action.name);try{await trackFire(p.page,p.name,action.enemy,!rescue);}catch(error){const after=await squadViews(),down=after.find(v=>v.actor.hp<=0&&v.actor.downed);if(rescue&&down){await rescuePilot(down.actor.name);continue;}throw error;}await sample('visible squad encounter '+action.enemy+' '+action.name+' round '+round);}};
// Choose the pilot already nearer the route goal. On a return leg the old
// follower is ahead; commanding the other pilot into that occupied waypoint
// cannot qualify movement. Both still move only through ordinary browser keys.
const squadGo=async point=>{
 // Select the nearer pilot once for this leg. Reassigning at every short hop
 // can put the other full hull directly ahead of the commanded follower.
 const initial=await squadViews(),chosen=[...initial].sort((a,b)=>Math.hypot(a.actor.position.x-point.x,a.actor.position.z-point.z)-Math.hypot(b.actor.position.x-point.x,b.actor.position.z-point.z))[0].actor.name;
 for(let hop=0;hop<60;hop++){
  const views=await squadViews(),down=views.find(v=>v.actor.hp<=0&&v.actor.downed);
  if(down){await rescuePilot(down.actor.name);continue;}
  const leader=pilots.find(p=>p.name===chosen),follower=pilots.find(p=>p!==leader),a=views.find(v=>v.actor.name===chosen).actor;
  const dx=point.x-a.position.x,dz=point.z-a.position.z,d=Math.hypot(dx,dz);
  if(d<1.1){
   // Interaction belongs to the host. If the guest leads home, clear the goal
   // sideways before the host approaches; retain both complete physical hulls.
   if(leader.name==='MissionGuest')await go(guest,'MissionGuest',{x:point.x+4.6,z:point.z});
   await go(host,'MissionHost',point);return;
  }
  const ux=dx/d,uz=dz/d,scale=Math.min(4,d),next={x:a.position.x+ux*scale,z:a.position.z+uz*scale};
  await clearThreats();await go(leader.page,leader.name,next);
  await go(follower.page,follower.name,{x:next.x-ux*4,z:next.z-uz*4});await clearThreats();
 }
 throw Error('Bounded squad route did not converge');
};
// Watch the same progress a player sees. Recording load can slow simulation
// relative to wall time; a fixed sleep cannot establish objective completion.
const holdObjective=async id=>{await host.bringToFront();await host.keyboard.down('KeyE');try{
 for(let i=0;i<80;i++){await host.waitForTimeout(250);await pilotRead(host,'MissionHost');const s=await host.evaluate(id=>{const s=window.kittyMechDebug.snapshot();return{objective:s.objectives.find(o=>o.id===id),downed:s.actors.filter(a=>!a.bot&&a.hp<=0&&a.downed).map(a=>a.name),phase:s.phase,time:s.time};},id);
  if(s.downed.length){await host.keyboard.up('KeyE');await rescuePilot(s.downed[0]);await host.bringToFront();await host.keyboard.down('KeyE');}
  if(s.objective?.complete||s.phase==='extracted')return;
 }throw Error('Bounded visible objective progress did not complete '+id);
}finally{await host.keyboard.up('KeyE');}};
// Optional ordinary lifecycle route: deliberately remain exposed to live NPC
// fire after the real checkpoint. No damage, failure or spawn state is injected.
// Deliberately expose only the guest to a real surviving ground enemy, while
// the host stays at the achieved checkpoint. A downing must come from normal
// NPC attacks; the existing ordinary rescue pilot clears threats and holds E.
const rescueExposure=async()=>{
 const view=await pilotRead(guest,'MissionGuest'),enemies=view.enemies.filter(e=>e.hp>0&&e.role!=='anchor'&&Math.abs(e.position.y-view.actor.position.y)<2);
 enemies.sort((a,b)=>Math.hypot(a.position.x-view.actor.position.x,a.position.z-view.actor.position.z)-Math.hypot(b.position.x-view.actor.position.x,b.position.z-view.actor.position.z));
 const enemy=enemies[0];if(!enemy)throw Error('No live ground enemy for ordinary rescue exposure');
 const dx=view.actor.position.x-enemy.position.x,dz=view.actor.position.z-enemy.position.z,length=Math.hypot(dx,dz)||1;
 try{await go(guest,'MissionGuest',{x:enemy.position.x+dx/length*8,z:enemy.position.z+dz/length*8},false);}catch(error){const observed=await pilotRead(guest,'MissionGuest');if(!observed.actor.downed)throw error;}
 await release(guest);await sample('ordinary guest rescue exposure '+enemy.id);
 let down=false;for(let i=0;i<360;i++){await guest.waitForTimeout(250);const views=await squadViews();if(views.find(v=>v.actor.name==='MissionHost').actor.hp<=0)throw Error('Checkpoint rescue host downed before guest rescue');const actor=views.find(v=>v.actor.name==='MissionGuest').actor;if(actor.downed&&actor.hp<=0){down=true;break;}}
 if(!down)throw Error('Bounded ordinary guest exposure did not down pilot');
 await rescuePilot('MissionGuest');await sample('ordinary rescue restored teammate');
 await host.waitForTimeout(200);
 evidence.reviveFeedback={wall:Date.now(),host:await read(host),guest:await read(guest),hostSquadText:await host.locator('.squad-rescue').allTextContents(),guestDamageVignetteCount:await guest.locator('.damage-vignette').count()};
 await host.screenshot({path:resolve(output,'revive-before-close-host.png')});await guest.screenshot({path:resolve(output,'revive-before-close-guest.png')});
 const s=evidence.events.at(-1).host.snapshot,actor=s.actors.find(a=>a.name==='MissionGuest');if(actor.hp<=0||actor.downed||s.coop?.status!=='active'||s.coop.attempt!==1)throw Error('Ordinary revive did not retain active first attempt');
 evidence.status='RESCUE_COMPLETE_REVIEW_REQUIRED';
};
const lifecycle=async invite=>{
 // Select a live ground enemy from the actual snapshot. A fixed empty street
 // cannot demonstrate all-down. This route deliberately accepts normal fire.
 const view=await pilotRead(host,'MissionHost'),enemies=view.enemies.filter(e=>e.hp>0&&e.role!=='anchor'&&Math.abs(e.position.y-view.actor.position.y)<2);
 enemies.sort((a,b)=>Math.hypot(a.position.x-view.actor.position.x,a.position.z-view.actor.position.z)-Math.hypot(b.position.x-view.actor.position.x,b.position.z-view.actor.position.z));
 const enemy=enemies[0];if(!enemy)throw Error('No live ground enemy for ordinary exposed lifecycle');
 const dx=view.actor.position.x-enemy.position.x,dz=view.actor.position.z-enemy.position.z,length=Math.hypot(dx,dz)||1,ux=dx/length,uz=dz/length;
 const exposure={x:enemy.position.x+ux*8,z:enemy.position.z+uz*8};
 for(const [page,name,point] of [[host,'MissionHost',exposure],[guest,'MissionGuest',{x:exposure.x-uz*4.6,z:exposure.z+ux*4.6}]]){await go(page,name,point,false);await release(page);}
 await sample('ordinary live enemy exposure '+enemy.id);
 let failed=false;
 for(let i=0;i<360;i++){await host.waitForTimeout(250);await pilotRead(host,'MissionHost');const state=await host.evaluate(()=>{const s=window.kittyMechDebug.snapshot();return{coop:s.coop,hp:s.actors.filter(a=>!a.bot).map(a=>a.hp)};});if(state.coop?.status==='failed'){failed=true;break;}}
 await sample('ordinary exposed squad lifecycle');if(!failed)throw Error('Bounded ordinary all-down exposure did not fail mission');
 const lc=await browser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),late=await lc.newPage();
 try{await late.goto(invite);await late.getByLabel('Pilot callsign').fill('MissionLate');await late.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(late,'MissionLate');await late.waitForTimeout(400);
 const joined=await read(late),newActor=joined.snapshot.actors.find(a=>a.name==='MissionLate');evidence.failedLateJoin={...joined};if(joined.snapshot.coop?.status!=='failed'||!newActor.downed||newActor.hp!==0)throw Error('Ordinary failed late join changed lifecycle');
 await guest.bringToFront();await guest.keyboard.up('KeyE');await guest.waitForTimeout(150);await guest.keyboard.down('KeyE');await guest.waitForTimeout(250);await guest.keyboard.up('KeyE');
 await guest.waitForFunction(()=>{const s=window.kittyMechDebug.snapshot();return s.coop?.status==='active'&&s.coop.attempt===2&&s.actors.filter(a=>!a.bot).every(a=>a.hp>0&&!a.downed);},{},{timeout:12000});
 await sample('ordinary fresh E checkpoint retry');evidence.retryLateJoin=await read(late);
 const retried=evidence.events.at(-1).host.snapshot;if(retried.checkpoint?.objectiveId!=='relay-west'||!retried.objectives.find(o=>o.id==='relay-west')?.complete)throw Error('Retry lost actual shared checkpoint');
 await host.waitForTimeout(200);evidence.retryVisibleRoster={wall:Date.now(),native:await read(host),label:await host.locator('.network-status').innerText()};await host.screenshot({path:resolve(output,'retry-before-late-close.png')});evidence.status='LIFECYCLE_COMPLETE_REVIEW_REQUIRED';evidence.lateVideo=late.video()?await late.video().path():null;
 }finally{await lc.close();}
};
try{
 await host.goto('http://localhost:8790/?debug=1&overhaul=1');await host.getByLabel('Pilot callsign').fill('MissionHost');await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'MissionHost');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:30000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await guest.getByLabel('Pilot callsign').fill('MissionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'MissionGuest');await sample('two client staging');await host.waitForTimeout(4000);await sample('staging rest');
 await host.keyboard.press('KeyR');await guest.keyboard.press('KeyR');await host.waitForTimeout(1200);
 // Follow the open west lane through the gantry. The actual climb portal is
 // solid in the east lane; both pilots follow in single file through the gap.
 for(const point of [{x:-8,z:12},{x:-4,z:-8},{x:-4,z:-21},{x:-4,z:-27},{x:-10,z:-34}]){await squadGo(point);await sample('route '+JSON.stringify(point));}
 await holdObjective('relay-west');await sample('west relay interaction');
 await host.screenshot({path:resolve(output,'route-west.png')});
 evidence.checkpoint=evidence.events.at(-1).host.snapshot.checkpoint;
 if(evidence.checkpoint?.objectiveId!=='relay-west')throw Error('West relay checkpoint not captured through normal interaction');
 if(process.argv[3]==='lifecycle'){await lifecycle(url.toString());}else if(process.argv[3]==='rescue'){await rescueExposure();}else{
 for(const point of [{x:0,z:-35},{x:18,z:-34},{x:33,z:-30}]){await squadGo(point);await sample('east route '+JSON.stringify(point));}
 await holdObjective('relay-east');await sample('east relay interaction');
 await host.screenshot({path:resolve(output,'route-east.png')});
 for(const point of [{x:0,z:-38},{x:0,z:-62},{x:0,z:-74}]){await squadGo(point);await sample('core route '+JSON.stringify(point));}
 await holdObjective('core');await sample('core interaction');
 await host.screenshot({path:resolve(output,'route-core.png')});
 for(const point of [{x:-4,z:-38},{x:-4,z:-21},{x:-4,z:-8},{x:-8,z:12}]){await squadGo(point);}
 await holdObjective('extraction');await sample('extraction');evidence.status=evidence.events.at(-1).host.snapshot.phase==='extracted'?'MISSION_COMPLETE_REVIEW_REQUIRED':'INCOMPLETE';
 await host.screenshot({path:resolve(output,'route-extraction.png')});
 }
}catch(error){evidence.status='INCOMPLETE';evidence.failure=String(error);await sample('failure').catch(()=>{});await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{await release(host);await release(guest);if(captureAudio){try{evidence.audio=await finishAudioCapture(host,resolve(output,'actual-game-output.webm'));}catch(error){evidence.audioCaptureError=String(error);}}evidence.hostVideo=host.video()?await host.video().path():null;evidence.guestVideo=guest.video()?await guest.video().path():null;await writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence,null,2));await gc.close();await hc.close();await browser.close();console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors}));}

import {readyForOrdinaryPlay as originalReady} from '../overhaul-play-ready.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pilotAim,pilotGunAligned,pilotLatency} from '../overhaul-pilot-aim.ts';
import {squadCombatInterruption,squadDecision,squadThreats} from '../overhaul-squad-policy.ts';
const start=Date.now(),origin='http://localhost:8805',output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261010/mission-traversal-040-public');await mkdir(output,{recursive:false});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const captureMode='host';
const viewport={width:1440,height:900},recordVideo={dir:output,size:{width:960,height:600}};
const hc=await browser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await browser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();
let currentPhase='two-client-staging';
const evidence={startUTC:new Date(start).toISOString(),status:'RUNNING',buildReceipt:process.env.KITTYMECH_BUILD_RECEIPT??'unknown',scope:'ONE ordinary two-client CO-OP mission through both relays, core and extraction. Public UI/keys and read-only diagnostics; no injected actors/HP/damage/warp/objectives. First genuine failure stops the capture. Optional roof objectives are not required mission phases.',capture:{mode:captureMode,viewport,hostVideoSize:recordVideo.size,guestVideoSize:null},events:[],errors:[],settledApproaches:[],native:{selector:'sharedWorld040 explicit server snapshot fields; recursive sorted-key canonical JSON SHA256, compared only at matching tick+room. Full host keyframes about1Hz and either-client semantic changes; every observed frame retains hash. No interpolated cross-time parity.',frames:{host:[],guest:[]},keyframes:[],parity:[],maxFramesPerPage:4000,keyframeBudgetBytes:20000000,keyframeBytes:0}};
const guard=()=>{if(Date.now()-start>155000)throw Error('040155s work bound; reserve15s final close inside170s');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const ready=async(p,name)=>{guard();let timer;try{await Promise.race([originalReady(p,name),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bounded ordinary readiness missing '+name)),Math.min(20000,155000-(Date.now()-start)));})]);}finally{clearTimeout(timer);}guard();};
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
function sharedWorld040(s){return stable({inputVersion:s.inputVersion,worldLayoutVersion:s.worldLayoutVersion,ruinFragmentVersion:s.ruinFragmentVersion,experimentalPhysicalRubble:s.experimentalPhysicalRubble,tick:s.tick,time:s.time,seed:s.seed,room:s.room,mode:s.mode,actors:s.actors,projectiles:s.projectiles,events:s.events,fields:s.fields,cover:s.cover,structures:s.structures,rubble:s.rubble,ruins:s.ruins,bondedMaterial:s.bondedMaterial,coop:s.coop,supplies:s.supplies,objectives:s.objectives,checkpoint:s.checkpoint,phase:s.phase,winner:s.winner});}
const recent={host:new Map(),guest:new Map()},semantics={host:null,guest:null},lastKeyframe={host:-Infinity,guest:-Infinity},firstWear=new Set();
for(const [p,label] of [[host,'host'],[guest,'guest']]){p.setDefaultTimeout(5000);p.on('pageerror',e=>evidence.errors.push(label+': '+e.message));p.on('websocket',ws=>ws.on('framereceived',frame=>{try{
 const msg=JSON.parse(typeof frame.payload==='string'?frame.payload:frame.payload.toString('utf8'));if(msg.type!=='snapshot')return;const s=msg.state,shared=sharedWorld040(s),text=JSON.stringify(shared),sha256=createHash('sha256').update(text).digest('hex'),actorsSha256=createHash('sha256').update(JSON.stringify(stable(s.actors))).digest('hex'),key=s.room+':'+s.tick;
 if(evidence.native.frames[label].length>=4000)throw Error('Explicit040 native frame cap; no silent omission');const row={tick:s.tick,time:s.time,room:s.room,wallMs:Date.now()-start,sha256,actorsSha256};evidence.native.frames[label].push(row);recent[label].set(key,row);if(recent[label].size>300)recent[label].delete(recent[label].keys().next().value);
 const peer=recent[label==='host'?'guest':'host'].get(key);if(peer){evidence.native.parity.push({tick:s.tick,time:s.time,room:s.room,actorsEqual:peer.actorsSha256===actorsSha256,worldEqual:peer.sha256===sha256,host:label==='host'?sha256:peer.sha256,guest:label==='guest'?sha256:peer.sha256});if(peer.sha256!==sha256)evidence.errors.push('Same-tick shared authority fields mismatch at '+key);}
 const semantic=JSON.stringify({room:s.room,phase:s.phase,checkpoint:s.checkpoint,coop:s.coop,objectives:s.objectives.map(o=>[o.id,o.complete,o.unlocked]),lifecycles:s.actors.filter(a=>!a.bot).map(a=>[a.id,a.jumpEpoch,a.hp<=0,!!a.downed,!!a.downed?.reviverId,a.climb?.anchor,a.climb?.phase]),broken:s.structures.map(b=>[b.id,b.brokenMask]),ruins:s.ruins?.map(r=>[r.block,r.piece,r.born,r.settled,r.revision]),supplies:s.supplies?.map(p=>[p.id,p.born,p.availableAt,p.claimedBy])});
 const wear=s.structures.filter(b=>b.revision>0&&!firstWear.has(b.id));for(const b of wear)firstWear.add(b.id);
 const changed=semantic!==semantics[label];if(changed||wear.length||label==='host'&&Date.now()-lastKeyframe.host>=1000){const bytes=Buffer.byteLength(text);if(evidence.native.keyframeBytes+bytes>20000000)throw Error('Explicit040 native keyframe20MB cap; stop without silent omission');evidence.native.keyframes.push({page:label,wallMs:Date.now()-start,tick:s.tick,reason:changed?'semantic-change':wear.length?'first-observed-wear':'host-1Hz',shared});evidence.native.keyframeBytes+=bytes;lastKeyframe[label]=Date.now();}semantics[label]=semantic;
}catch(error){evidence.errors.push(label+' native history: '+String(error));}}));}
// Phase-event reads are navigation/HUD observations, separate from full native
// authority keyframes. Avoid duplicating full worlds in progress/final files.
const eventSummary=s=>({tick:s.tick,time:s.time,room:s.room,mode:s.mode,phase:s.phase,checkpoint:s.checkpoint,objectives:s.objectives,coop:s.coop,actors:s.actors.filter(a=>!a.bot),structures:s.structures.map(b=>({id:b.id,revision:b.revision,brokenMask:b.brokenMask})),ruins:s.ruins?.map(r=>({block:r.block,piece:r.piece,born:r.born,settled:r.settled,revision:r.revision})),supplies:s.supplies});
const serializeEvidence=()=>JSON.stringify({...evidence,events:evidence.events.map(e=>({...e,host:{...e.host,snapshot:eventSummary(e.host.snapshot)},guest:{...e.guest,snapshot:eventSummary(e.guest.snapshot)}})),native:{...evidence.native,keyframes:{path:'native-keyframes.json',count:evidence.native.keyframes.length,compactSharedBytes:evidence.native.keyframeBytes}}},null,2);
const persist=async filename=>{await writeFile(resolve(output,'native-keyframes.json'),JSON.stringify(evidence.native.keyframes));await writeFile(resolve(output,filename),serializeEvidence());};
const read=async p=>p.evaluate(async()=>{const raw=await window.kittyMechDebug.input?.(),input=raw?{seq:raw.seq,input:raw.input,keys:raw.keys,look:raw.look,native:raw.native,lastSent:raw.lastSent,browser:raw.browser}:null;return {snapshot:window.kittyMechDebug.snapshot(),transport:window.kittyMechDebug.transport?.(),input,camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance(),visibility:document.visibilityState};});
const pilotRead=async(p,name,id)=>{guard();const value=await p.evaluate(({name,id})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),sight=e=>({...e,visible:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.65},{...e.position,y:e.position.y+.65})===true,fireClear:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+(actor.stance==='upright'?1.65:.65)},{...e.position,y:e.position.y+.65})===true});return {time:s.time,transport:window.kittyMechDebug.transport?.(),actor,humans:s.actors.filter(a=>!a.bot),enemy:id&&s.actors.find(a=>a.id===id)?sight(s.actors.find(a=>a.id===id)):undefined,enemies:id?undefined:s.actors.filter(a=>a.bot&&a.hp>0).map(sight),camera:window.kittyMechDebug.camera()};},{name,id});if(value.transport?.connection==='Disconnected'||value.transport?.error){(evidence.transportFailures??=[]).push({name,wall:Date.now(),...value.transport});throw Error('Arena transport stopped: '+(value.transport.error??JSON.stringify(value.transport.receipt?.close)));}return value;};
const sample=async(label,{check=true}={})=>{if(check)guard();const at=Date.now(),[hostState,guestState]=await Promise.all([read(host),read(guest)]);let authority;try{const h=await(await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)})).json(),d=h.diagnostics,r=d?.rooms.find(r=>r.room===hostState.snapshot.room);authority={wall:d?.wall,status:h.status,rooms:h.rooms,players:h.players,clippedMs:d?.clippedMs,room:r?{room:r.room,counts:r.counts,totalMs:r.totalMs,maxMs:r.maxMs,latest:r.latest}:null};}catch(error){authority={error:String(error)};}evidence.events.push({label,phase:currentPhase,at,authority,host:hostState,guest:guestState});await persist('progress.json');console.log(label);};

const release=async p=>{for(const k of ['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK','KeyC','Space','ShiftLeft'])await p.keyboard.up(k);};
// Two distinct native ticks, ACK of a neutral public packet and actual low
// horizontal velocity establish braking. Recheck coordinates after braking.
const settle=async(p,name,target=null,tolerance=1.1)=>{await release(p);let neutralSeq=null,lastTick=-1,count=0;const until=Date.now()+4000;
 while(Date.now()<until){guard();const r=await read(p),a=r.snapshot.actors.find(a=>a.name===name),sent=r.input?.lastSent?.input;if(!a||a.hp<=0)throw Error(name+' cannot settle a downed/missing actor');if(sent&&sent.forward===0&&sent.strafe===0&&!sent.climb)neutralSeq??=sent.seq;
  const neutral=r.input?.input?.forward===0&&r.input?.input?.strafe===0&&!r.input?.input?.climb,slow=Math.hypot(a.velocity.x,a.velocity.z)<=.12;
  if(neutral&&slow&&a.grounded&&neutralSeq!==null&&a.lastInput>=neutralSeq&&r.snapshot.tick!==lastTick){count++;lastTick=r.snapshot.tick;}else if(!neutral||!slow)count=0;
  if(count>=2){const distance=target?Math.hypot(target.x-a.position.x,target.z-a.position.z):null,receipt={name,wallMs:Date.now()-start,tick:r.snapshot.tick,phase:currentPhase,target,tolerance,distance,position:a.position,velocity:a.velocity,neutralSeq,lastInput:a.lastInput,keys:r.input.keys,look:r.input.look};evidence.settledApproaches.push(receipt);return target&&distance>=tolerance?null:receipt;}
  await p.waitForTimeout(60);
 }throw Error(name+' actual low-velocity neutral approach did not settle');};
const faceNorth=async(p,name)=>{for(let i=0;i<20;i++){const state=await pilotRead(p,name),yaw=state.camera.movementYaw??state.actor.aimYaw,d=Math.atan2(Math.sin(-yaw),Math.cos(-yaw));if(Math.abs(d)<.055)return;const key=d>0?'KeyJ':'KeyL';await p.keyboard.down(key);await p.waitForTimeout(Math.max(35,Math.min(250,Math.abs(d)/1.9*800)));await p.keyboard.up(key);await p.waitForTimeout(50);}throw Error('Navigation camera did not converge');};
const go=async(p,name,target,rescue=true,arrival=1.1)=>{await p.bringToFront();await settle(p,name);await faceNorth(p,name);await settle(p,name);let prior=Infinity,stalls=0;
 for(let i=0;i<85;i++){let navigation=await pilotRead(p,name),a=navigation.actor;if(a.hp<=0){if(rescue){await rescuePilot(name);navigation=await pilotRead(p,name);a=navigation.actor;await p.bringToFront();}else throw Error(name+' downed on route');}const dx=target.x-a.position.x,dz=target.z-a.position.z,d=Math.hypot(dx,dz);if(d<arrival){if(await settle(p,name,target,arrival))return;prior=Infinity;stalls=0;continue;}if(Math.abs(prior-d)<.08)stalls++;else stalls=0;if(stalls>8){
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
const trackFire=async(p,name,id,allowDownedAlly=false)=>{await p.bringToFront();await settle(p,name);let rocketAt=0,latency=0,startTime=null;const deadline=Date.now()+20000;
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
const holdObjective=async id=>{currentPhase='interaction-'+id;await host.bringToFront();const objective=(await read(host)).snapshot.objectives.find(o=>o.id===id);if(!objective?.unlocked)throw Error('Required objective not unlocked '+id);if(!await settle(host,'MissionHost',objective.position,4))throw Error('Settled required objective approach outside4m '+id);await sample('settled before required interaction '+id);let lastProgress=objective.progress;await host.keyboard.down('KeyE');try{
 for(let i=0;i<80;i++){await host.waitForTimeout(250);await pilotRead(host,'MissionHost');const s=await host.evaluate(id=>{const s=window.kittyMechDebug.snapshot();return{objective:s.objectives.find(o=>o.id===id),downed:s.actors.filter(a=>!a.bot&&a.hp<=0&&a.downed).map(a=>a.name),phase:s.phase,time:s.time};},id);
  if(s.downed.length){await host.keyboard.up('KeyE');await rescuePilot(s.downed[0]);await host.bringToFront();await host.keyboard.down('KeyE');}
  if(s.objective?.complete||s.phase==='extracted')return;
  if(i>0&&i%8===0){if((s.objective?.progress??0)<=lastProgress){const view=await pilotRead(host,'MissionHost');if(view.enemies.some(e=>e.hp>0&&e.visible&&e.fireClear&&Math.hypot(e.position.x-objective.position.x,e.position.z-objective.position.z)<7)){await host.keyboard.up('KeyE');await clearThreats();await host.bringToFront();if(!await settle(host,'MissionHost',objective.position,4))throw Error('Objective approach moved during genuine encounter '+id);await host.keyboard.down('KeyE');}}lastProgress=s.objective?.progress??0;}
 }throw Error('Bounded visible objective progress did not complete '+id);
}finally{await host.keyboard.up('KeyE');}};
const enablePublicPreview=async p=>{await p.getByRole('button',{name:'Open settings',exact:true}).click();await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await p.getByRole('button',{name:'Close settings',exact:true}).click();};
try{
 guard();await host.goto(origin+'/?debug=1&overhaul=1');await enablePublicPreview(host);await host.getByLabel('Pilot callsign').fill('MissionHost');await host.getByRole('button',{name:'CO-OP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'MissionHost');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:5000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await enablePublicPreview(guest);await guest.getByLabel('Pilot callsign').fill('MissionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'MissionGuest');await sample('two client staging');await host.waitForTimeout(400);await sample('staging rest');
 await host.keyboard.press('KeyR');await guest.keyboard.press('KeyR');await host.waitForTimeout(1200);
 // Follow the open west lane through the gantry. The actual climb portal is
 // solid in the east lane; both pilots follow in single file through the gap.
 currentPhase='west-relay-route';for(const point of [{x:-8,z:12},{x:-4,z:-8},{x:-4,z:-21},{x:-4,z:-27},{x:-10,z:-34}]){await squadGo(point);await sample('route '+JSON.stringify(point));}
 await holdObjective('relay-west');await sample('west relay interaction');
 await host.screenshot({path:resolve(output,'route-west.png')});
 evidence.checkpoint=evidence.events.at(-1).host.snapshot.checkpoint;
 if(evidence.checkpoint?.objectiveId!=='relay-west')throw Error('West relay checkpoint not captured through normal interaction');
 
 currentPhase='east-relay-route';for(const point of [{x:0,z:-35},{x:18,z:-34},{x:33,z:-30}]){await squadGo(point);await sample('east route '+JSON.stringify(point));}
 await holdObjective('relay-east');await sample('east relay interaction');
 await host.screenshot({path:resolve(output,'route-east.png')});
 currentPhase='core-route';for(const point of [{x:0,z:-38},{x:0,z:-62},{x:0,z:-74}]){await squadGo(point);await sample('core route '+JSON.stringify(point));}
 await holdObjective('core');await sample('core interaction');
 await host.screenshot({path:resolve(output,'route-core.png')});
 currentPhase='extraction-return-route';for(const point of [{x:-4,z:-38},{x:-4,z:-21},{x:-4,z:-8},{x:-8,z:12}]){await squadGo(point);}
 await holdObjective('extraction');await sample('extraction');const complete=()=>['relay-west','relay-east','core','extraction'];let joinedFinal;const until=Date.now()+3000;while(Date.now()<until){guard();joinedFinal=await read(guest);if(joinedFinal.snapshot.phase==='extracted')break;await guest.waitForTimeout(80);}const hostFinal=await read(host);evidence.completion={host:{phase:hostFinal.snapshot.phase,coop:hostFinal.snapshot.coop,checkpoint:hostFinal.snapshot.checkpoint,objectives:hostFinal.snapshot.objectives},guest:{phase:joinedFinal.snapshot.phase,coop:joinedFinal.snapshot.coop,checkpoint:joinedFinal.snapshot.checkpoint,objectives:joinedFinal.snapshot.objectives},organicRevives:rescues,nativeSameTickComparisons:evidence.native.parity.length};
 if([hostFinal,joinedFinal].some(r=>r.snapshot.mode!=='coop'||r.snapshot.phase!=='extracted'||complete().some(id=>!r.snapshot.objectives.find(o=>o.id===id)?.complete))||evidence.native.parity.length<3)throw Error('Full required two-client mission completion/parity not observed');evidence.status='FULL_REQUIRED_MISSION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';currentPhase='required-mission-complete';
 await host.screenshot({path:resolve(output,'route-extraction.png')});
}catch(error){evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);evidence.failureKind=String(error).includes('040155s')?'FINITE_WORK_BOUND_INCOMPLETE':String(error).includes('Explicit040')?'DECLARED_EVIDENCE_BOUND_INCOMPLETE':'ACTUAL_PUBLIC_OUTCOME_FAILURE';evidence.unfinishedPhase=currentPhase;process.exitCode=1;await sample('first genuine failure',{check:false}).catch(()=>{});await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});}
finally{await release(host);await release(guest);evidence.endUTC=new Date().toISOString();evidence.elapsedMs=Date.now()-start;evidence.hostVideo=host.video()?await host.video().path():null;evidence.guestVideo=guest.video()?await guest.video().path():null;await gc.close();await hc.close();await browser.close();evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;await persist('evidence.json');console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors}));}


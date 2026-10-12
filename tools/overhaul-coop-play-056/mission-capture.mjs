import {readyForOrdinaryPlay as originalReady} from '../overhaul-play-ready.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pilotAim,pilotGunAligned,pilotLatency} from '../overhaul-pilot-aim.ts';
import {squadThreats} from '../overhaul-squad-policy.ts';
const buildReceipt=process.env.KITTYMECH_BUILD_RECEIPT;if(!buildReceipt||!/^[a-f0-9]{64}$/i.test(buildReceipt))throw Error('053 requires the exact frozen build038 receipt SHA256 in KITTYMECH_BUILD_RECEIPT');
const start=Date.now(),origin='http://localhost:8799',output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261010/coop056-public');await mkdir(output,{recursive:false});
const launch={channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
const hostBrowser=await chromium.launch(launch),guestBrowser=await chromium.launch(launch);
const captureMode='both';
const viewport={width:1440,height:900},recordVideo={dir:output,size:{width:960,height:600}};
const hc=await hostBrowser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await guestBrowser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();
let currentPhase='two-client-staging';
const evidence={startUTC:new Date(start).toISOString(),status:'RUNNING',buildReceipt,scope:'ONE ordinary two-client CO-OP mission through both relays, core and extraction. Public UI/keys and read-only diagnostics; no injected actors/HP/damage/warp/objectives. First genuine failure stops the capture. Optional roof objectives are not required mission phases.',capture:{mode:captureMode,separateBrowserProcesses:true,viewport,hostVideoSize:recordVideo.size,guestVideoSize:recordVideo.size},events:[],errors:[],settledApproaches:[],native:{selector:'sharedWorld053 explicit server snapshot fields; recursive sorted-key canonical JSON SHA256, compared only at exact server room+publication epoch+sequence; matching tick is also required. Full host keyframes about0.5Hz and either-client semantic changes; every observed frame retains hash. No interpolated cross-time parity.',frames:{host:[],guest:[]},keyframes:[],parity:[],maxFramesPerPage:9000,keyframeBudgetBytes:18000000,keyframeBytes:0}};
const guard=()=>{if(Date.now()-start>420000)throw Error('053420s work bound; reserve30s final close inside450s');if(evidence.errors.length)throw Error(evidence.errors[0]);if(parallelFailure)throw parallelFailure;};
const ready=async(p,name)=>{guard();let timer;try{await Promise.race([originalReady(p,name),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bounded ordinary readiness missing '+name)),Math.min(20000,420000-(Date.now()-start)));})]);}finally{clearTimeout(timer);}guard();};
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
function sharedWorld053(s){return stable({publication:s.publication,inputVersion:s.inputVersion,worldLayoutVersion:s.worldLayoutVersion,ruinFragmentVersion:s.ruinFragmentVersion,experimentalPhysicalRubble:s.experimentalPhysicalRubble,tick:s.tick,time:s.time,seed:s.seed,room:s.room,mode:s.mode,actors:s.actors,projectiles:s.projectiles,events:s.events,fields:s.fields,cover:s.cover,structures:s.structures,rubble:s.rubble,ruins:s.ruins,bondedMaterial:s.bondedMaterial,coop:s.coop,supplies:s.supplies,objectives:s.objectives,checkpoint:s.checkpoint,phase:s.phase,winner:s.winner});}
const recent={host:new Map(),guest:new Map()},semantics={host:null,guest:null},lastKeyframe={host:-Infinity,guest:-Infinity},lastPublication={host:null,guest:null},firstWear=new Set();
evidence.native.bootstrap=[];
for(const [p,label] of [[host,'host'],[guest,'guest']]){p.setDefaultTimeout(5000);p.on('pageerror',e=>evidence.errors.push(label+': '+e.message));p.on('websocket',ws=>ws.on('framereceived',frame=>{try{
 const msg=JSON.parse(typeof frame.payload==='string'?frame.payload:frame.payload.toString('utf8'));if(msg.type!=='snapshot')return;const s=msg.state,pub=s.publication;
 if(!pub||typeof pub.roomEpoch!=='string'||!pub.roomEpoch||!Number.isSafeInteger(pub.sequence)||pub.sequence<=0||!['bootstrap','broadcast'].includes(pub.kind))throw Error('Missing/invalid053 server publication identity; no tick-only fallback');
 const prior=lastPublication[label];if(prior&&prior.room===s.room&&prior.roomEpoch===pub.roomEpoch&&pub.sequence<=prior.sequence)throw Error('Nonmonotonic053 server publication sequence');lastPublication[label]={room:s.room,...pub};
 const shared=sharedWorld053(s),text=JSON.stringify(shared),sha256=createHash('sha256').update(text).digest('hex'),actorsSha256=createHash('sha256').update(JSON.stringify(stable(s.actors))).digest('hex'),key=JSON.stringify([s.room,pub.roomEpoch,pub.sequence]);
 if(evidence.native.frames[label].length>=9000)throw Error('Explicit053 native frame cap; no silent omission');const row={tick:s.tick,time:s.time,room:s.room,publication:pub,wallMs:Date.now()-start,sha256,actorsSha256};evidence.native.frames[label].push(row);recent[label].set(key,row);if(recent[label].size>300)recent[label].delete(recent[label].keys().next().value);
 if(pub.kind==='bootstrap')evidence.native.bootstrap.push({...row,actorIds:s.actors.map(a=>a.id),comparison:'Unique immediate admission publication retained; never paired with a different same-tick broadcast'});
 const peer=recent[label==='host'?'guest':'host'].get(key);if(peer){evidence.native.parity.push({tick:s.tick,time:s.time,room:s.room,publication:pub,tickEqual:peer.tick===s.tick,timeEqual:peer.time===s.time,actorsEqual:peer.actorsSha256===actorsSha256,worldEqual:peer.sha256===sha256,host:label==='host'?sha256:peer.sha256,guest:label==='guest'?sha256:peer.sha256});if(peer.tick!==s.tick||peer.time!==s.time||peer.sha256!==sha256)evidence.errors.push('Committed-publication shared authority fields mismatch at '+key);}
 const semantic=JSON.stringify({room:s.room,phase:s.phase,checkpoint:s.checkpoint,coop:s.coop,objectives:s.objectives.map(o=>[o.id,o.complete,o.unlocked]),lifecycles:s.actors.filter(a=>!a.bot).map(a=>[a.id,a.jumpEpoch,a.hp<=0,!!a.downed,!!a.downed?.reviverId,a.climb?.anchor,a.climb?.phase]),broken:s.structures.map(b=>[b.id,b.brokenMask]),ruins:s.ruins?.map(r=>[r.block,r.piece,r.born,r.settled,r.revision]),supplies:s.supplies?.map(p=>[p.id,p.born,p.availableAt,p.claimedBy])});
 const wear=s.structures.filter(b=>b.revision>0&&!firstWear.has(b.id));for(const b of wear)firstWear.add(b.id);
 const changed=semantic!==semantics[label];if(pub.kind==='bootstrap'||changed||wear.length||label==='host'&&Date.now()-lastKeyframe.host>=2000){const bytes=Buffer.byteLength(text);if(evidence.native.keyframeBytes+bytes>18000000)throw Error('Explicit053 native keyframe18MB cap; stop without silent omission');evidence.native.keyframes.push({page:label,wallMs:Date.now()-start,tick:s.tick,publication:pub,reason:pub.kind==='bootstrap'?'explicit-admission-bootstrap':changed?'semantic-change':wear.length?'first-observed-wear':'host-0.5Hz',shared});evidence.native.keyframeBytes+=bytes;lastKeyframe[label]=Date.now();}semantics[label]=semantic;
}catch(error){evidence.errors.push(label+' native history: '+String(error));}}));}
// Phase-event reads are navigation/HUD observations, separate from full native
// authority keyframes. Avoid duplicating full worlds in progress/final files.
const eventSummary=s=>s?({publication:s.publication,tick:s.tick,time:s.time,room:s.room,mode:s.mode,phase:s.phase,checkpoint:s.checkpoint,objectives:s.objectives,coop:s.coop,actors:s.actors.filter(a=>!a.bot),structures:s.structures.map(b=>({id:b.id,revision:b.revision,brokenMask:b.brokenMask})),ruins:s.ruins?.map(r=>({block:r.block,piece:r.piece,born:r.born,settled:r.settled,revision:r.revision})),supplies:s.supplies}):null;
const serializeEvidence=()=>JSON.stringify({...evidence,events:evidence.events.map(e=>({...e,host:{...e.host,snapshot:eventSummary(e.host.snapshot)},guest:{...e.guest,snapshot:eventSummary(e.guest.snapshot)}})),native:{...evidence.native,keyframes:{path:'native-keyframes.json',count:evidence.native.keyframes.length,compactSharedBytes:evidence.native.keyframeBytes}}});
const persist=async filename=>{const keyframes=JSON.stringify(evidence.native.keyframes),full=serializeEvidence();if(Buffer.byteLength(keyframes)+Buffer.byteLength(full)>30000000)throw Error('Explicit053 combined30MB evidence cap');await writeFile(resolve(output,'native-keyframes.json'),keyframes);await writeFile(resolve(output,filename),filename==='progress.json'?JSON.stringify({status:evidence.status,phase:currentPhase,elapsedMs:Date.now()-start,events:evidence.events.map(e=>({label:e.label,phase:e.phase,at:e.at})),errors:evidence.errors,nativeFrames:{host:evidence.native.frames.host.length,guest:evidence.native.frames.guest.length},keyframes:evidence.native.keyframes.length}):full);};
const read=async p=>p.evaluate(async()=>{const raw=await window.kittyMechDebug.input?.(),input=raw?{seq:raw.seq,input:raw.input,keys:raw.keys,look:raw.look,native:raw.native,lastSent:raw.lastSent,browser:raw.browser}:null;return {snapshot:window.kittyMechDebug.snapshot(),transport:window.kittyMechDebug.transport?.(),input,camera:window.kittyMechDebug.camera(),owners:window.kittyIdentity57Runtime005?.read?.(),performance:window.kittyMechDebug.performance(),visibility:document.visibilityState};});
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
const go=async(p,name,target,rescue=false,arrival=1.1)=>{let prior=Infinity,stalls=0;
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
const trackFire=async(p,name,id,allowDownedAlly=false,combatStop=null)=>{await p.bringToFront();await settle(p,name);let rocketAt=0,latency=0,startTime=null;const deadline=Date.now()+20000;
 const record={name,target:id,startedAt:Date.now(),steps:[],exit:'wall-watchdog'};(evidence.tracking??=[]).push(record);
 try{while(Date.now()<deadline){const readAt=Date.now(),state=await pilotRead(p,name,id),readMs=Date.now()-readAt,a=state.actor,e=state.enemy;startTime??=state.time;
 record.lastObserved={time:state.time,targetHp:e?.hp,targetPosition:e?.position,visible:e?.visible,fireClear:e?.fireClear,pilotHp:a.hp,teammates:state.humans.filter(h=>h.id!==a.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position}))};
 if(a.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!e||e.hp<=0){record.exit='target-defeated';return;}
 if(!e.visible||!e.fireClear){record.exit='target-occluded';return;}
 if(!combatStop?.objective&&!squadThreats({actor:a,enemies:[e],time:state.time}).length){record.exit='target-disengaged';return;}
 const ally=state.humans.find(h=>h.id!==a.id),interruption=ally?.hp<=0&&!allowDownedAlly?'teammate-downed':null;if(interruption){record.exit=interruption;return;}
 if(state.time-startTime>=6.5||combatStop?.stop){record.exit='native-time-bound';record.targetHp=e.hp;return;}
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
// Each page is the only page in its own browser process. One controller per
// pilot runs at a time; cancellation joins both before rescue or role changes.
let parallelFailure=null;
const together=async tasks=>{parallelFailure=null;const results=await Promise.allSettled(tasks.map(task=>task().catch(error=>{parallelFailure??=error;throw error;})));const error=parallelFailure;parallelFailure=null;if(error)throw error;return results.map(r=>r.value);};
const clearThreats=async(rescue=true)=>{for(let round=0;round<6;round++){
 const views=await squadViews(),down=views.find(v=>v.actor.hp<=0&&v.actor.downed);if(down&&rescue){await rescuePilot(down.actor.name);continue;}
 const actions=views.filter(v=>v.actor.hp>0).map(v=>({pilot:pilots.find(p=>p.name===v.actor.name),target:squadThreats(v)[0]})).filter(v=>v.target);if(!actions.length)return;
 try{await together(actions.map(({pilot,target})=>()=>trackFire(pilot.page,pilot.name,target.id,!rescue)));}
 catch(error){const after=await squadViews(),fallen=after.find(v=>v.actor.hp<=0&&v.actor.downed);if(rescue&&fallen&&/downed|down requires/i.test(String(error))){await rescuePilot(fallen.actor.name);continue;}throw error;}
 await sample('concurrent squad encounter round '+round);
}};
const squadGo=async point=>{await clearThreats();
 for(let recovery=0;recovery<3;recovery++){
  const views=await squadViews(),down=views.find(v=>v.actor.hp<=0&&v.actor.downed);if(down){await rescuePilot(down.actor.name);continue;}
  const chosen=[...views].sort((a,b)=>Math.hypot(a.actor.position.x-point.x,a.actor.position.z-point.z)-Math.hypot(b.actor.position.x-point.x,b.actor.position.z-point.z))[0];
  const leader=pilots.find(p=>p.name===chosen.actor.name),follower=pilots.find(p=>p!==leader),dx=point.x-chosen.actor.position.x,dz=point.z-chosen.actor.position.z,d=Math.hypot(dx,dz);
  if(d<1.1)return;
  const trailing={x:point.x-dx/d*6,z:point.z-dz/d*6};
  (evidence.routeRoles??=[]).push({phase:currentPhase,wallMs:Date.now()-start,leader:leader.name,follower:follower.name,leaderTarget:point,followerTarget:trailing,separation:6});
  try{await together([()=>go(leader.page,leader.name,point,false),()=>go(follower.page,follower.name,trailing,false)]);return;}
  catch(error){const after=await squadViews(),fallen=after.find(v=>v.actor.hp<=0&&v.actor.downed);if(fallen&&/downed|down requires/i.test(String(error))){await rescuePilot(fallen.actor.name);continue;}throw error;}
 }
 throw Error('053 organic route recovery bound exhausted');
};
const holdObjective=async id=>{currentPhase='interaction-'+id;
 for(let recovery=0;recovery<3;recovery++){
  const objective=(await read(host)).snapshot.objectives.find(o=>o.id===id);if(!objective?.unlocked)throw Error('Required objective not unlocked '+id);if(objective.complete)return;
  const views=await squadViews(),h=views.find(v=>v.actor.name==='MissionHost').actor,g=views.find(v=>v.actor.name==='MissionGuest').actor;
  if(id==='extraction'){await go(guest,'MissionGuest',{x:objective.position.x+4.2,z:objective.position.z},false);if(!await settle(guest,'MissionGuest',objective.position,4.5))throw Error('Guest extraction approach outside4.5m');}
  else if(g.hp>0&&Math.hypot(g.position.x-objective.position.x,g.position.z-objective.position.z)<3.6)await go(guest,'MissionGuest',{x:objective.position.x+6,z:objective.position.z},false);
  if(Math.hypot(h.position.x-objective.position.x,h.position.z-objective.position.z)>=4)await go(host,'MissionHost',objective.position,false);
  await clearThreats();if(!await settle(host,'MissionHost',objective.position,4))throw Error('Actual settled objective outside4m '+id);await sample('settled required interaction '+id);
  const stop={stop:false,objective:id};let coverFailure=null;
  const cover=(async()=>{try{while(!stop.stop){guard();const v=await pilotRead(guest,'MissionGuest');if(v.actor.hp<=0)throw Error('MissionGuest organically downed during cover');const targets=v.enemies.filter(e=>e.visible&&e.fireClear&&(Math.hypot(e.position.x-objective.position.x,e.position.z-objective.position.z)<7||squadThreats(v).some(t=>t.id===e.id)));if(targets.length)await trackFire(guest,'MissionGuest',targets[0].id,false,stop);else await guest.waitForTimeout(100);}}catch(error){coverFailure=error;stop.stop=true;}})();
  let channelFailure=null,complete=false;const until=Date.now()+35000;
  try{await host.keyboard.down('KeyE');while(Date.now()<until){guard();if(coverFailure)throw coverFailure;await host.waitForTimeout(100);const s=(await read(host)).snapshot;if(s.coop?.status==='failed')throw Error('CoOp mission failed organically');if(s.actors.some(a=>!a.bot&&a.hp<=0&&a.downed))throw Error('Organic down requires coordinated rescue');if(s.objectives.find(o=>o.id===id)?.complete||s.phase==='extracted'){complete=true;break;}}if(!complete)throw Error('053 required objective channel35s bound '+id);}
  catch(error){channelFailure=error;}finally{await host.keyboard.up('KeyE');stop.stop=true;await cover;await release(guest);}
  if(complete)return;const after=await squadViews(),fallen=after.find(v=>v.actor.hp<=0&&v.actor.downed);if(fallen&&after.some(v=>v.actor.hp>0)&&/downed|down requires/i.test(String(channelFailure??coverFailure))){await rescuePilot(fallen.actor.name);continue;}throw channelFailure??coverFailure??Error('Incomplete required objective '+id);
 }
 throw Error('053 objective organic recovery bound exhausted '+id);
};

const enablePublicPreview=async p=>{await p.getByRole('button',{name:'Open settings',exact:true}).click();await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await p.getByRole('button',{name:'Close settings',exact:true}).click();};
try{
 guard();await host.goto(origin+'/?debug=1&overhaul=1');await enablePublicPreview(host);await host.getByLabel('Pilot callsign').fill('MissionHost');await host.getByRole('button',{name:'CO-OP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'MissionHost');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:5000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await enablePublicPreview(guest);await guest.getByLabel('Pilot callsign').fill('MissionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'MissionGuest');await sample('two client staging');await host.waitForTimeout(400);await sample('staging rest');
 await sample('both pilots retain selected quadruped travel stance');
 // Follow the open west lane through the gantry. The actual climb portal is
 // solid in the east lane; both pilots follow in single file through the gap.
 currentPhase='west-relay-route';for(const point of [{x:-8,z:12},{x:-4,z:-8},{x:-4,z:-21},{x:-4,z:-27},{x:-10,z:-34}]){await squadGo(point);await sample('route '+JSON.stringify(point));}
 await holdObjective('relay-west');await sample('west relay interaction');
 await host.screenshot({path:resolve(output,'route-west.png')});await guest.screenshot({path:resolve(output,'guest-route-west.png')});
 evidence.checkpoint=evidence.events.at(-1).host.snapshot.checkpoint;
 if(evidence.checkpoint?.objectiveId!=='relay-west')throw Error('West relay checkpoint not captured through normal interaction');
 
 currentPhase='east-relay-route';for(const point of [{x:0,z:-35},{x:18,z:-34},{x:33,z:-30}]){await squadGo(point);await sample('east route '+JSON.stringify(point));}
 await holdObjective('relay-east');await sample('east relay interaction');
 await host.screenshot({path:resolve(output,'route-east.png')});await guest.screenshot({path:resolve(output,'guest-route-east.png')});
 currentPhase='core-route';for(const point of [{x:0,z:-38},{x:0,z:-62},{x:0,z:-74}]){await squadGo(point);await sample('core route '+JSON.stringify(point));}
 await holdObjective('core');await sample('core interaction');
 await host.screenshot({path:resolve(output,'route-core.png')});await guest.screenshot({path:resolve(output,'guest-route-core.png')});
 currentPhase='extraction-return-route';for(const point of [{x:-4,z:-38},{x:-4,z:-21},{x:-4,z:-8},{x:-8,z:12}]){await squadGo(point);}
 await holdObjective('extraction');await sample('extraction');const complete=()=>['relay-west','relay-east','core','extraction'];let joinedFinal;const until=Date.now()+3000;while(Date.now()<until){guard();joinedFinal=await read(guest);if(joinedFinal.snapshot.phase==='extracted')break;await guest.waitForTimeout(80);}const hostFinal=await read(host);evidence.completion={host:{phase:hostFinal.snapshot.phase,coop:hostFinal.snapshot.coop,checkpoint:hostFinal.snapshot.checkpoint,objectives:hostFinal.snapshot.objectives},guest:{phase:joinedFinal.snapshot.phase,coop:joinedFinal.snapshot.coop,checkpoint:joinedFinal.snapshot.checkpoint,objectives:joinedFinal.snapshot.objectives},organicRevives:rescues,nativeCommittedPublicationComparisons:evidence.native.parity.length};
 if([hostFinal,joinedFinal].some(r=>r.snapshot.actors.filter(a=>!a.bot).some(a=>a.hp<=0||Math.hypot(a.position.x+8,a.position.y-1,a.position.z-12)>=4.5)||r.snapshot.mode!=='coop'||r.snapshot.phase!=='extracted'||complete().some(id=>!r.snapshot.objectives.find(o=>o.id===id)?.complete))||evidence.native.parity.length<3)throw Error('Full required two-client mission completion/parity not observed');evidence.status='FULL_REQUIRED_MISSION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';currentPhase='required-mission-complete';
 await host.screenshot({path:resolve(output,'route-extraction.png')});await guest.screenshot({path:resolve(output,'guest-route-extraction.png')});
}catch(error){evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);evidence.failureKind=String(error).includes('053420s')?'FINITE_WORK_BOUND_INCOMPLETE':String(error).includes('Explicit053')?'DECLARED_EVIDENCE_BOUND_INCOMPLETE':'ACTUAL_PUBLIC_OUTCOME_FAILURE';evidence.unfinishedPhase=currentPhase;process.exitCode=1;await sample('first genuine failure',{check:false}).catch(()=>{});await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});await guest.screenshot({path:resolve(output,'failure-guest.png')}).catch(()=>{});}
finally{evidence.endUTC=new Date().toISOString();evidence.elapsedMs=Date.now()-start;let timer;
 const closing=(async()=>{await Promise.all([release(host),release(guest)]);evidence.hostVideo=host.video()?await host.video().path():null;evidence.guestVideo=guest.video()?await guest.video().path():null;await Promise.all([gc.close(),hc.close()]);await Promise.all([hostBrowser.close(),guestBrowser.close()]);})();
 try{await Promise.race([closing,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('053 cleanup30s/inclusive450s bound')),Math.max(1,Math.min(30000,450000-(Date.now()-start))));})]);}
 catch(error){evidence.cleanupFailure=String(error);evidence.status='CLEANUP_BOUND_FAILURE';process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;await persist('evidence.json');console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors,cleanupFailure:evidence.cleanupFailure}));}





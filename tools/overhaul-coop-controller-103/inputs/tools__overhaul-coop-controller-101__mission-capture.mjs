import {createMissionController101} from './controller.mjs';
import {readyForOrdinaryPlay as originalReady} from '../overhaul-play-ready.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pilotGunAligned} from '../overhaul-pilot-aim.ts';
import {actorHullRadius} from '../../shared/config.ts';
import {squadThreats} from '../overhaul-squad-policy.ts';
const buildReceipt=process.env.KITTYMECH_BUILD_RECEIPT;if(buildReceipt!=='a7f4259eaa7f8398b9bd68bcf7302905195981ff283e6e04ae72e2a6da70abfe')throw Error('101 requires the exact frozen candidate receipt SHA256 in KITTYMECH_BUILD_RECEIPT');
const start=Date.now(),origin='http://localhost:8799',output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261010/coop101-public');await mkdir(output,{recursive:false});
const launch={channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
const hostBrowser=await chromium.launch(launch),guestBrowser=await chromium.launch(launch);
const captureMode='both';
const viewport={width:1440,height:900},recordVideo={dir:output,size:{width:960,height:600}};
const hc=await hostBrowser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await guestBrowser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();
let currentPhase='two-client-staging';
const evidence={startUTC:new Date(start).toISOString(),status:'RUNNING',buildReceipt,scope:'ONE ordinary two-client CO-OP mission through both relays, core and extraction. Public UI/keys and read-only diagnostics; no injected actors/HP/damage/warp/objectives. First genuine failure stops the capture. Optional roof objectives are not required mission phases.',capture:{mode:captureMode,separateBrowserProcesses:true,viewport,hostVideoSize:recordVideo.size,guestVideoSize:recordVideo.size},events:[],errors:[],waypoints:[],settledApproaches:[],bounds:{workMs:420000,cleanupMs:30000,inclusiveMs:450000,supervisorMs:480000,readinessMs:20000},native:{selector:'sharedWorld101 explicit server snapshot fields; recursive sorted-key canonical JSON SHA256, compared only at exact server room+publication epoch+sequence; matching tick is also required. Full host keyframes about0.5Hz and either-client semantic changes; every observed frame retains hash. No interpolated cross-time parity.',frames:{host:[],guest:[]},keyframes:[],parity:[],maxFramesPerPage:9000,keyframeBudgetBytes:18000000,keyframeBytes:0}};
const guard=()=>{if(Date.now()-start>420000)throw Error('101420s work bound; reserve30s final close inside450s');if(evidence.errors.length)throw Error(evidence.errors[0]);if(parallelFailure)throw parallelFailure;};
const ready=async(p,name)=>{guard();let timer;try{await Promise.race([originalReady(p,name),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bounded ordinary readiness missing '+name)),Math.min(20000,420000-(Date.now()-start)));})]);}finally{clearTimeout(timer);}guard();};
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
function sharedWorld101(s){return stable({publication:s.publication,inputVersion:s.inputVersion,worldLayoutVersion:s.worldLayoutVersion,ruinFragmentVersion:s.ruinFragmentVersion,experimentalPhysicalRubble:s.experimentalPhysicalRubble,tick:s.tick,time:s.time,seed:s.seed,room:s.room,mode:s.mode,actors:s.actors,projectiles:s.projectiles,events:s.events,fields:s.fields,cover:s.cover,structures:s.structures,rubble:s.rubble,ruins:s.ruins,bondedMaterial:s.bondedMaterial,coop:s.coop,supplies:s.supplies,objectives:s.objectives,checkpoint:s.checkpoint,phase:s.phase,winner:s.winner});}
const recent={host:new Map(),guest:new Map()},semantics={host:null,guest:null},lastKeyframe={host:-Infinity,guest:-Infinity},lastPublication={host:null,guest:null},firstWear=new Set();
evidence.native.bootstrap=[];evidence.lifecycle={organicDowns:[],revives:[],checkpointRetries:[]};const priorLife=new Map();
for(const [p,label] of [[host,'host'],[guest,'guest']]){p.setDefaultTimeout(5000);p.on('pageerror',e=>evidence.errors.push(label+': '+e.message));p.on('websocket',ws=>ws.on('framereceived',frame=>{try{
 const msg=JSON.parse(typeof frame.payload==='string'?frame.payload:frame.payload.toString('utf8'));if(msg.type!=='snapshot')return;const s=msg.state,pub=s.publication;
 if(!pub||typeof pub.roomEpoch!=='string'||!pub.roomEpoch||!Number.isSafeInteger(pub.sequence)||pub.sequence<=0||!['bootstrap','broadcast'].includes(pub.kind))throw Error('Missing/invalid101 server publication identity; no tick-only fallback');
 const prior=lastPublication[label];if(prior&&prior.room===s.room&&prior.roomEpoch===pub.roomEpoch&&pub.sequence<=prior.sequence)throw Error('Nonmonotonic101 server publication sequence');lastPublication[label]={room:s.room,...pub};
 const shared=sharedWorld101(s),text=JSON.stringify(shared),sha256=createHash('sha256').update(text).digest('hex'),actorsSha256=createHash('sha256').update(JSON.stringify(stable(s.actors))).digest('hex'),key=JSON.stringify([s.room,pub.roomEpoch,pub.sequence]);
 if(evidence.native.frames[label].length>=9000)throw Error('Explicit101 native frame cap; no silent omission');const row={tick:s.tick,time:s.time,room:s.room,publication:pub,wallMs:Date.now()-start,sha256,actorsSha256};evidence.native.frames[label].push(row);recent[label].set(key,row);if(recent[label].size>300)recent[label].delete(recent[label].keys().next().value);
 if(pub.kind==='bootstrap')evidence.native.bootstrap.push({...row,actorIds:s.actors.map(a=>a.id),comparison:'Unique immediate admission publication retained; never paired with a different same-tick broadcast'});
 const peer=recent[label==='host'?'guest':'host'].get(key);if(peer){evidence.native.parity.push({tick:s.tick,time:s.time,room:s.room,publication:pub,tickEqual:peer.tick===s.tick,timeEqual:peer.time===s.time,actorsEqual:peer.actorsSha256===actorsSha256,worldEqual:peer.sha256===sha256,host:label==='host'?sha256:peer.sha256,guest:label==='guest'?sha256:peer.sha256});if(peer.tick!==s.tick||peer.time!==s.time||peer.sha256!==sha256)evidence.errors.push('Committed-publication shared authority fields mismatch at '+key);}
  for(const a of s.actors.filter(a=>!a.bot)){
  const prior=priorLife.get(label+':'+a.id),now={down:!!a.downed,hp:a.hp,attempt:s.coop?.attempt};
  if(now.down&&!prior?.down)evidence.lifecycle.organicDowns.push({page:label,id:a.id,tick:s.tick,time:s.time,publication:pub,checkpoint:s.checkpoint,downed:a.downed});
  if(prior?.down&&!now.down&&now.hp>0)evidence.lifecycle.revives.push({page:label,id:a.id,tick:s.tick,time:s.time,publication:pub,attempt:s.coop?.attempt});
  if(prior?.attempt&&now.attempt>prior.attempt)evidence.lifecycle.checkpointRetries.push({page:label,id:a.id,tick:s.tick,time:s.time,publication:pub,checkpoint:s.checkpoint,from:prior.attempt,to:now.attempt});
  priorLife.set(label+':'+a.id,now);
 }const semantic=JSON.stringify({room:s.room,phase:s.phase,checkpoint:s.checkpoint,coop:s.coop,objectives:s.objectives.map(o=>[o.id,o.complete,o.unlocked]),lifecycles:s.actors.filter(a=>!a.bot).map(a=>[a.id,a.jumpEpoch,a.hp<=0,!!a.downed,!!a.downed?.reviverId,a.climb?.anchor,a.climb?.phase]),broken:s.structures.map(b=>[b.id,b.brokenMask]),ruins:s.ruins?.map(r=>[r.block,r.piece,r.born,r.settled,r.revision]),supplies:s.supplies?.map(p=>[p.id,p.born,p.availableAt,p.claimedBy])});
 const wear=s.structures.filter(b=>b.revision>0&&!firstWear.has(b.id));for(const b of wear)firstWear.add(b.id);
 const changed=semantic!==semantics[label];if(pub.kind==='bootstrap'||changed||wear.length||label==='host'&&Date.now()-lastKeyframe.host>=2000){const bytes=Buffer.byteLength(text);if(evidence.native.keyframeBytes+bytes>18000000)throw Error('Explicit101 native keyframe18MB cap; stop without silent omission');evidence.native.keyframes.push({page:label,wallMs:Date.now()-start,tick:s.tick,publication:pub,reason:pub.kind==='bootstrap'?'explicit-admission-bootstrap':changed?'semantic-change':wear.length?'first-observed-wear':'host-0.5Hz',shared});evidence.native.keyframeBytes+=bytes;lastKeyframe[label]=Date.now();}semantics[label]=semantic;
}catch(error){evidence.errors.push(label+' native history: '+String(error));}}));}
// Phase-event reads are navigation/HUD observations, separate from full native
// authority keyframes. Avoid duplicating full worlds in progress/final files.
const eventSummary=s=>s?({publication:s.publication,tick:s.tick,time:s.time,room:s.room,mode:s.mode,phase:s.phase,checkpoint:s.checkpoint,objectives:s.objectives,coop:s.coop,actors:s.actors.filter(a=>!a.bot),structures:s.structures.map(b=>({id:b.id,revision:b.revision,brokenMask:b.brokenMask})),ruins:s.ruins?.map(r=>({block:r.block,piece:r.piece,born:r.born,settled:r.settled,revision:r.revision})),supplies:s.supplies}):null;
const serializeEvidence=()=>JSON.stringify({...evidence,events:evidence.events.map(e=>({...e,host:{...e.host,snapshot:eventSummary(e.host.snapshot)},guest:{...e.guest,snapshot:eventSummary(e.guest.snapshot)}})),native:{...evidence.native,keyframes:{path:'native-keyframes.json',count:evidence.native.keyframes.length,compactSharedBytes:evidence.native.keyframeBytes}}});
const persist=async filename=>{const keyframes=JSON.stringify(evidence.native.keyframes),full=serializeEvidence();if(Buffer.byteLength(keyframes)+Buffer.byteLength(full)>30000000)throw Error('Explicit101 combined30MB evidence cap');await writeFile(resolve(output,'native-keyframes.json'),keyframes);await writeFile(resolve(output,filename),filename==='progress.json'?JSON.stringify({status:evidence.status,phase:currentPhase,elapsedMs:Date.now()-start,events:evidence.events.map(e=>({label:e.label,phase:e.phase,at:e.at})),errors:evidence.errors,nativeFrames:{host:evidence.native.frames.host.length,guest:evidence.native.frames.guest.length},keyframes:evidence.native.keyframes.length}):full);};
const read=async p=>p.evaluate(async()=>{const raw=await window.kittyMechDebug.input?.(),input=raw?{at:raw.at,seq:raw.seq,input:raw.input,keys:raw.keys,look:raw.look,native:raw.native,lastSent:raw.lastSent,sent:raw.sent?.slice(-20),browser:raw.browser}:null;return {snapshot:window.kittyMechDebug.snapshot(),transport:window.kittyMechDebug.transport?.(),input,camera:window.kittyMechDebug.camera(),owners:window.kittyIdentity57Runtime005?.read?.(),performance:window.kittyMechDebug.performance(),visibility:document.visibilityState};});
const inputRead=async(p,name)=>p.evaluate(async name=>{const raw=await window.kittyMechDebug.input(),s=window.kittyMechDebug.snapshot();return {at:raw.at,seq:raw.seq,actor:s.actors.find(a=>a.name===name),tick:s.tick,time:s.time,input:raw.input,keys:raw.keys,look:raw.look,sent:raw.sent.slice(-20),camera:window.kittyMechDebug.camera()};},name);
// The mark precedes key-down and is on the same browser performance clock as
// successful sends. Keep a hold until its intended packet is ACKed, not a tap.
const delivered=async(p,name,mark,intended,label)=>{const until=Date.now()+1500;let packet=null,r;
 while(Date.now()<until){guard();r=await inputRead(p,name);if(!r.actor||r.actor.hp<=0)throw Error(name+' downed during delivered '+label);packet??=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&intended(x.input));if(packet&&r.actor.lastInput>=packet.input.seq){if((evidence.deliveries??=[]).length>=1200)throw Error('Explicit101 delivery receipt cap');evidence.deliveries.push({name,label,wallMs:Date.now()-start,holdStartAt:mark.at,packet,ack:{tick:r.tick,time:r.time,lastInput:r.actor.lastInput},sent:r.sent.filter(x=>x.at>=mark.at).slice(-20)});return r;}await p.waitForTimeout(40);}
 (evidence.deliveryFailures??=[]).push({name,label,holdStartAt:mark.at,packet,receipt:r});throw Error(name+' intended '+label+' successful-send/ACK missing within1.5s');};
const opticalAim=(state,enemy)=>{const ray=state.look?.cameraRay,p=state.camera?.position;if(!ray||!p)throw Error('Actual current camera position/ray unavailable');const lead=Math.min(.5,Math.hypot(state.actor.position.x-enemy.position.x,state.actor.position.z-enemy.position.z)/105),target={x:enemy.position.x+enemy.velocity.x*lead,y:enemy.position.y+.65+enemy.velocity.y*lead,z:enemy.position.z+enemy.velocity.z*lead};const dx=target.x-p.x,dy=target.y-p.y,dz=target.z-p.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));return {target,lead,yaw,pitch,dyaw:Math.atan2(Math.sin(yaw-ray.yaw),Math.cos(yaw-ray.yaw)),dpitch:pitch-ray.pitch};};
const pilotRead=async(p,name,id)=>{guard();const value=await p.evaluate(({name,id})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),sight=e=>({...e,visible:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.65},{...e.position,y:e.position.y+.65})===true,fireClear:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+(actor.stance==='upright'?1.65:.65)},{...e.position,y:e.position.y+.65})===true});return {time:s.time,transport:window.kittyMechDebug.transport?.(),actor,humans:s.actors.filter(a=>!a.bot),enemy:id&&s.actors.find(a=>a.id===id)?sight(s.actors.find(a=>a.id===id)):undefined,enemies:id?undefined:s.actors.filter(a=>a.bot&&a.hp>0).map(sight),camera:window.kittyMechDebug.camera()};},{name,id});if(value.transport?.connection==='Disconnected'||value.transport?.error){(evidence.transportFailures??=[]).push({name,wall:Date.now(),...value.transport});throw Error('Arena transport stopped: '+(value.transport.error??JSON.stringify(value.transport.receipt?.close)));}return value;};
const sample=async(label,{check=true}={})=>{if(check)guard();const at=Date.now(),[hostState,guestState]=await Promise.all([read(host),read(guest)]);const authority={source:'Exact committed WebSocket publication observer'};evidence.events.push({label,phase:currentPhase,at,authority,host:hostState,guest:guestState});console.log(label);};

const release=async p=>{await Promise.all(['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK','KeyC','Space','ShiftLeft'].map(k=>p.keyboard.up(k)));};
// Two distinct native ticks, ACK of a neutral public packet and actual low
// horizontal velocity establish braking. Recheck coordinates after braking.
const settle=async(p,name,target=null,tolerance=1.1)=>{const mark=await inputRead(p,name);await release(p);let neutralSeq=null,lastTick=-1,count=0;const until=Date.now()+4000;
 while(Date.now()<until){guard();const r=await read(p),a=r.snapshot.actors.find(a=>a.name===name),sent=r.input?.sent?.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&x.input.forward===0&&x.input.strafe===0&&!x.input.climb&&!x.input.fire)?.input;if(!a||a.hp<=0)throw Error(name+' cannot settle a downed/missing actor');if(sent)neutralSeq??=sent.seq;
  const neutral=r.input?.input?.forward===0&&r.input?.input?.strafe===0&&!r.input?.input?.climb,slow=Math.hypot(a.velocity.x,a.velocity.z)<=.12;
  if(neutral&&slow&&a.grounded&&neutralSeq!==null&&a.lastInput>=neutralSeq&&r.snapshot.tick!==lastTick){count++;lastTick=r.snapshot.tick;}else if(!neutral||!slow)count=0;
  if(count>=2){const distance=target?Math.hypot(target.x-a.position.x,target.z-a.position.z):null,receipt={name,wallMs:Date.now()-start,tick:r.snapshot.tick,phase:currentPhase,target,tolerance,distance,position:a.position,velocity:a.velocity,neutralSeq,lastInput:a.lastInput,keys:r.input.keys,look:r.input.look};evidence.settledApproaches.push(receipt);return target&&distance>=tolerance?null:receipt;}
  await p.waitForTimeout(60);
 }throw Error(name+' actual low-velocity neutral approach did not settle');};
let activeRescueName=null,plannedExposure=false;const routeControllers=new Map();
const controllerFor=(p,name)=>{
 if(!routeControllers.has(name))routeControllers.set(name,createMissionController101({page:p,name,guard,evidence,onEvent:async()=>{
  const v=await pilotRead(p,name),down=v.humans.find(h=>h.hp<=0&&h.downed);
  if(down&&!activeRescueName&&!plannedExposure)throw Error('Organic down requires coordinated rescue');
  const threat=squadThreats(v)[0];
  if(threat&&!plannedExposure){const event=Error('ROUTE_COMBAT_EVENT');event.routeThreat=threat.id;throw event;}
 }}));
 return routeControllers.get(name);
};
const go=async(p,name,target,rescue=false,arrival=1.1,rescueName=null)=>{
 const ctl=controllerFor(p,name);activeRescueName=rescueName;
 // Bounded in-route encounters are mission events, not failed observations.
 // Every controller failure without an identified live threat stops immediately.
 for(let events=0;events<4;events++){
  try{return await ctl.moveTo(target,{phase:currentPhase,tolerance:arrival});}
  catch(error){await ctl.release();if(!error.routeThreat)throw error;
   await trackFire(p,name,error.routeThreat,rescue,{routeThreat:true});
  }
 }
 throw Error(name+' finite route event budget exhausted');
};
// Track a live target through ordinary keyboard camera commands. A stale
// snapshot held through a long turn/fire burst cannot qualify shooting.
const trackFire=async(p,name,id,allowDownedAlly=false,combatStop=null)=>{await p.bringToFront();await settle(p,name);let rocketAt=0,startTime=null,priorAimError=null,aimStalls=0;const deadline=Date.now()+20000;
 const record={name,target:id,startedAt:Date.now(),steps:[],exit:'wall-watchdog'};(evidence.tracking??=[]).push(record);
 try{while(Date.now()<deadline){const readAt=Date.now(),state=await pilotRead(p,name,id),readMs=Date.now()-readAt,a=state.actor,e=state.enemy;startTime??=state.time;
 record.lastObserved={time:state.time,targetHp:e?.hp,targetPosition:e?.position,visible:e?.visible,fireClear:e?.fireClear,pilotHp:a.hp,teammates:state.humans.filter(h=>h.id!==a.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position}))};
 if(a.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!e||e.hp<=0){record.exit='target-defeated';return;}
 if(!e.visible||!e.fireClear){record.exit='target-occluded';return;}
 if(!combatStop?.objective&&!combatStop?.routeThreat&&!squadThreats({actor:a,enemies:[e],time:state.time}).length){record.exit='target-disengaged';return;}
 const ally=state.humans.find(h=>h.id!==a.id),interruption=ally?.hp<=0&&!allowDownedAlly?'teammate-downed':null;if(interruption){record.exit=interruption;return;}
 if(state.time-startTime>=6.5||combatStop?.stop){record.exit='native-time-bound';record.targetHp=e.hp;return;}
 const optical=await inputRead(p,name),aim=opticalAim(optical,e),look=[];
 if(Math.abs(aim.dyaw)>.045)look.push(aim.dyaw>0?'KeyJ':'KeyL');if(Math.abs(aim.dpitch)>.035)look.push(aim.dpitch>0?'KeyI':'KeyK');
 // F is released before changing the camera. All controls and diagnostic reads
 // remain ordinary browser actions; authority gun alignment is sampled afterward.
 await p.keyboard.up('KeyF');const controlAt=Date.now();
 const pulseMs=look.length?70:0;
 try{for(const key of look)await p.keyboard.down(key);if(pulseMs)await p.waitForTimeout(pulseMs);}
 finally{for(const key of look)await p.keyboard.up(key);}
 if(look.length)await p.waitForTimeout(90);const controlMs=Date.now()-controlAt,postAt=Date.now(),post=await pilotRead(p,name,id),postReadMs=Date.now()-postAt;
 if(post.actor.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!post.enemy||post.enemy.hp<=0){record.exit='target-defeated';return;}
 if(!post.enemy.visible||!post.enemy.fireClear){record.exit='target-occluded';return;}
 const fresh=opticalAim(await inputRead(p,name),post.enemy),aligned=Math.abs(fresh.dyaw)<.045&&Math.abs(fresh.dpitch)<.035&&pilotGunAligned(post.actor,post.enemy,fresh.target,post.time);
 const step={wall:Date.now(),time:post.time,readMs,controlMs,postReadMs,pulseMs,targetHp:post.enemy.hp,targetPosition:post.enemy.position,targetVelocity:post.enemy.velocity,actorPosition:post.actor.position,lookYaw:post.camera.lookYaw,lookPitch:post.camera.lookPitch,gunYaw:post.actor.aimYaw,gunPitch:post.actor.aimPitch,desiredYaw:fresh.yaw,desiredPitch:fresh.pitch,dyaw:fresh.dyaw,dpitch:fresh.dpitch,lead:fresh.lead,aligned,visible:post.enemy.visible,fireClear:post.enemy.fireClear,teammates:post.humans.filter(h=>h.id!==post.actor.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position,downed:h.downed}))};record.steps.push(step);const actualAimError=Math.hypot(fresh.dyaw,fresh.dpitch);aimStalls=look.length&&priorAimError!==null&&actualAimError>=priorAimError-.002?aimStalls+1:0;priorAimError=actualAimError;if(aimStalls>=3&&!aligned){record.exit='actual-optical-aim-unreachable';throw Error(name+' actual optical camera aim failed to progress after3 public look pulses');}
 if(aligned){const mark=await inputRead(p,name);await p.keyboard.down('KeyF');await delivered(p,name,mark,input=>input.fire===true,'fire');if(Date.now()>rocketAt){await p.keyboard.press('KeyQ');rocketAt=Date.now()+1600;}await p.waitForTimeout(100);}
 await p.waitForTimeout(20);}
 }finally{record.finishedAt=Date.now();for(const k of ['KeyJ','KeyL','KeyI','KeyK','KeyF'])await p.keyboard.up(k);}};
const pilots=[{page:host,name:'MissionHost'},{page:guest,name:'MissionGuest'}];
const squadViews=async()=>{const views=[];for(const p of pilots)views.push(await pilotRead(p.page,p.name));return views;};
let rescues=0,successfulRevives=0;
const rescueRead=async(p,name,downName)=>p.evaluate(({name,downName})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),down=s.actors.find(a=>a.name===downName),clear=actor&&down&&window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.4},{...down.position,y:down.position.y+.4})===true;return {actor,down,time:s.time,tick:s.tick,clear};},{name,downName});
const rescueEligible=r=>!!r.actor&&r.actor.hp>0&&!!r.down?.downed&&r.down.hp<=0&&r.actor.grounded&&r.down.grounded&&!r.actor.climb&&!r.actor.pair&&!r.actor.strike&&r.time-r.actor.hurtAt>=.3&&Math.hypot(r.actor.velocity.x,r.actor.velocity.z)<=1.5&&Math.hypot(r.actor.position.x-r.down.position.x,r.actor.position.y-r.down.position.y,r.actor.position.z-r.down.position.z)<=4.5&&Math.hypot(r.actor.position.x-r.down.position.x,r.actor.position.z-r.down.position.z)>=actorHullRadius(r.actor)+actorHullRadius(r.down)+.05&&r.clear;
const rescuePilot=async name=>{if(++rescues>2)throw Error('Bounded rescue attempts exhausted');for(const p of pilots)await release(p.page);const views=await squadViews(),down=views.find(v=>v.actor.name===name)?.actor,survivor=views.find(v=>v.actor.hp>0)?.actor,p=pilots.find(p=>p.name===survivor?.name);if(!down?.downed||!p)throw Error('No surviving rescue pilot');await sample('rescue required '+name);
 await clearThreats(false);await p.page.bringToFront();await settle(p.page,p.name);let eligible=false;
 for(let approach=0;approach<3;approach++){const r=await rescueRead(p.page,p.name,name);if(rescueEligible(r)){eligible=true;(evidence.rescueEligibility??=[]).push({name,reviver:p.name,...r});break;}if(!r.down?.downed||r.actor.hp<=0)throw Error('Rescue target/pilot lifecycle changed');const dx=r.actor.position.x-r.down.position.x,dz=r.actor.position.z-r.down.position.z,d=Math.hypot(dx,dz)||1;await go(p.page,p.name,{x:r.down.position.x+dx/d*4,z:r.down.position.z+dz/d*4},true,.4,name);await settle(p.page,p.name);}
 if(!eligible){const r=await rescueRead(p.page,p.name,name);if(!rescueEligible(r)){(evidence.rescueEligibility??=[]).push({name,reviver:p.name,failed:true,...r});throw Error('Fresh native rescue range/LOS/grounded/separation not eligible');}}
 const mark=await inputRead(p.page,p.name),began=(await pilotRead(p.page,p.name)).time,deadline=Date.now()+15000;await p.page.keyboard.down('KeyE');await delivered(p.page,p.name,mark,input=>input.interact===true,'rescue-E');
 try{while(Date.now()<deadline){await p.page.waitForTimeout(100);const state=await pilotRead(p.page,p.name),target=state.humans.find(a=>a.name===name);if(target?.hp>0&&!target.downed){successfulRevives++;await sample('ordinary teammate revive '+name);return;}if(state.actor.hp<=0)throw Error('Rescue pilot downed');if(state.time-began>8)break;}}finally{await p.page.keyboard.up('KeyE');}throw Error('Rescue channel did not complete');};
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
 throw Error('101 organic route recovery bound exhausted');
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
  try{const mark=await inputRead(host,'MissionHost');await host.keyboard.down('KeyE');await delivered(host,'MissionHost',mark,input=>input.interact===true,'objective-E');while(Date.now()<until){guard();if(coverFailure)throw coverFailure;await host.waitForTimeout(100);const s=(await read(host)).snapshot;if(s.coop?.status==='failed')throw Error('CoOp mission failed organically');if(s.actors.some(a=>!a.bot&&a.hp<=0&&a.downed))throw Error('Organic down requires coordinated rescue');if(s.objectives.find(o=>o.id===id)?.complete||s.phase==='extracted'){complete=true;break;}}if(!complete)throw Error('101 required objective channel35s bound '+id);}
  catch(error){channelFailure=error;}finally{await host.keyboard.up('KeyE');stop.stop=true;await cover;await release(guest);}
  if(complete)return;const after=await squadViews(),fallen=after.find(v=>v.actor.hp<=0&&v.actor.downed);if(fallen&&after.some(v=>v.actor.hp>0)&&/downed|down requires/i.test(String(channelFailure??coverFailure))){await rescuePilot(fallen.actor.name);continue;}throw channelFailure??coverFailure??Error('Incomplete required objective '+id);
 }
 throw Error('101 objective organic recovery bound exhausted '+id);
};

// These are finite planned native lifecycle phases in this ONE capture, not an
// automatic replay. Real AI combat supplies every damage/down receipt.
const exposeSquad=async(kind)=>{
 currentPhase='planned-organic-'+kind;plannedExposure=true;
 try{
  const s=(await read(host)).snapshot,alive=s.actors.filter(a=>a.bot&&a.hp>0);
  const h=s.actors.find(a=>a.name==='MissionHost');
  const target=alive.sort((a,b)=>Math.hypot(a.position.x-h.position.x,a.position.z-h.position.z)-Math.hypot(b.position.x-h.position.x,b.position.z-h.position.z))[0];
  if(!target)throw Error('No real living AI for planned '+kind+'; lifecycle unqualified');
  evidence.plannedExposure??=[];evidence.plannedExposure.push({kind,tick:s.tick,time:s.time,targetId:target.id,targetPosition:target.position});
  // Independent targets retain six-meter separation for native hulls.
  const destinations=kind==='down-revive'?[{x:target.position.x+11,z:target.position.z+8},{x:target.position.x+5,z:target.position.z+8}]:[{x:target.position.x+5,z:target.position.z+8},{x:target.position.x-1,z:target.position.z+8}];
  await together(pilots.map((p,i)=>async()=>{
   try{await go(p.page,p.name,destinations[i]);}
   catch(error){const actual=(await read(p.page)).snapshot.actors.find(a=>a.name===p.name);if(!actual?.downed||!String(error).includes('downed'))throw error;}
  }));
  await Promise.all(pilots.map(p=>release(p.page)));
  const until=Date.now()+45000;let actual;
  while(Date.now()<until){guard();actual=(await read(host)).snapshot;
   if(kind==='down-revive'&&actual.actors.some(a=>!a.bot&&a.downed))break;
   if(kind==='checkpoint-retry'&&actual.coop?.status==='failed')break;
   await host.waitForTimeout(100);
  }
  await sample('planned '+kind+' actual native outcome');
  if(kind==='down-revive'){
   const humans=actual.actors.filter(a=>!a.bot),fallen=humans.find(a=>a.downed);
   if(!fallen||!humans.some(a=>a.hp>0))throw Error('Planned organic single down with survivor not observed within45s');
   plannedExposure=false;await rescuePilot(fallen.name);
   if(!successfulRevives)throw Error('Planned ordinary public revive unqualified');
  }else{
   if(actual.coop?.status!=='failed'||!actual.actors.filter(a=>!a.bot).every(a=>a.hp<=0&&a.downed))throw Error('Planned organic squad failure not observed within45s');
   const checkpoint=actual.checkpoint,attempt=actual.coop.attempt;
   if(checkpoint?.objectiveId!=='relay-west')throw Error('Retry required actual west checkpoint');
   const until=Date.now()+5000;let ready;
   while(Date.now()<until){guard();ready=(await read(host)).snapshot;if(ready.time>=ready.coop.retryReadyAt)break;await host.waitForTimeout(50);}
   if(ready.time<ready.coop.retryReadyAt)throw Error('Native retry readiness missing within5s');
   // Establish a fresh ACKed release before public rising E.
   await host.keyboard.up('KeyE');const mark=await inputRead(host,'MissionHost');let neutral,neutralAck=false;
   const releaseUntil=Date.now()+1500;
   while(Date.now()<releaseUntil){guard();const r=await inputRead(host,'MissionHost');neutral=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&!x.input.interact);if(neutral&&r.actor.lastInput>=neutral.input.seq){neutralAck=true;break;}await host.waitForTimeout(40);}
   if(!neutralAck)throw Error('Planned retry fresh release send/ACK missing');
   await host.keyboard.down('KeyE');
   try{
    const until=Date.now()+5000;let restored;
    while(Date.now()<until){guard();restored=(await read(host)).snapshot;if(restored.coop?.status==='active'&&restored.coop.attempt===attempt+1)break;await host.waitForTimeout(60);}
    if(restored.coop?.status!=='active'||restored.coop.attempt!==attempt+1||restored.checkpoint?.objectiveId!=='relay-west'||!restored.objectives.find(o=>o.id==='relay-west')?.complete||restored.actors.filter(a=>!a.bot).length!==2||restored.actors.filter(a=>!a.bot).some(a=>a.hp<=0||a.downed||Math.hypot(a.position.x-checkpoint.position.x,a.position.z-checkpoint.position.z)>12))throw Error('Actual native checkpoint retry/roster restoration not observed');
    evidence.actualCheckpointRetry={before:actual.coop,after:restored.coop,checkpoint:restored.checkpoint,actors:restored.actors.filter(a=>!a.bot),neutral};
    await sample('planned native checkpoint retry restored');
   }finally{await host.keyboard.up('KeyE');}
  }
 }finally{plannedExposure=false;activeRescueName=null;await Promise.all(pilots.map(p=>release(p.page)));}
};
const enablePublicPreview=async p=>{await p.getByRole('button',{name:'Open settings',exact:true}).click();await p.getByLabel('Graphics quality',{exact:true}).selectOption('low');await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await p.getByRole('button',{name:'Close settings',exact:true}).click();};
try{
 guard();await host.goto(origin+'/?debug=1&overhaul=1');await enablePublicPreview(host);await host.getByLabel('Pilot callsign').fill('MissionHost');await host.getByRole('button',{name:'CO-OP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.getByLabel('Select theater').selectOption('7734');await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'MissionHost');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:5000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await enablePublicPreview(guest);await guest.getByLabel('Pilot callsign').fill('MissionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'MissionGuest');await sample('two client staging');await host.waitForTimeout(400);await sample('staging rest');
 await sample('both pilots retain selected quadruped travel stance');
 // Follow the open west lane through the gantry. The actual climb portal is
 // solid in the east lane; both pilots follow in single file through the gap.
 currentPhase='west-relay-route';for(const point of [{x:-8,z:12},{x:-4,z:-8},{x:-4,z:-21},{x:-4,z:-27},{x:-10,z:-34}]){await squadGo(point);await sample('route '+JSON.stringify(point));}
 await holdObjective('relay-west');await sample('west relay interaction');
 await host.screenshot({path:resolve(output,'route-west.png')});await guest.screenshot({path:resolve(output,'guest-route-west.png')});
 evidence.checkpoint=evidence.events.at(-1).host.snapshot.checkpoint;
 if(evidence.checkpoint?.objectiveId!=='relay-west')throw Error('West relay checkpoint not captured through normal interaction');
 
 await exposeSquad('down-revive');await exposeSquad('checkpoint-retry');
 currentPhase='east-relay-route';for(const point of [{x:0,z:-35},{x:18,z:-34},{x:33,z:-30}]){await squadGo(point);await sample('east route '+JSON.stringify(point));}
 await holdObjective('relay-east');await sample('east relay interaction');
 await host.screenshot({path:resolve(output,'route-east.png')});await guest.screenshot({path:resolve(output,'guest-route-east.png')});
 currentPhase='core-route';for(const point of [{x:0,z:-38},{x:0,z:-62},{x:0,z:-74}]){await squadGo(point);await sample('core route '+JSON.stringify(point));}
 await holdObjective('core');await sample('core interaction');
 await host.screenshot({path:resolve(output,'route-core.png')});await guest.screenshot({path:resolve(output,'guest-route-core.png')});
 currentPhase='extraction-return-route';for(const point of [{x:-4,z:-38},{x:-4,z:-21},{x:-4,z:-8},{x:-8,z:12}]){await squadGo(point);}
 await holdObjective('extraction');await sample('extraction');const complete=()=>['relay-west','relay-east','core','extraction'];let joinedFinal;const until=Date.now()+3000;while(Date.now()<until){guard();joinedFinal=await read(guest);if(joinedFinal.snapshot.phase==='extracted')break;await guest.waitForTimeout(80);}const hostFinal=await read(host);evidence.completion={host:{phase:hostFinal.snapshot.phase,coop:hostFinal.snapshot.coop,checkpoint:hostFinal.snapshot.checkpoint,objectives:hostFinal.snapshot.objectives},guest:{phase:joinedFinal.snapshot.phase,coop:joinedFinal.snapshot.coop,checkpoint:joinedFinal.snapshot.checkpoint,objectives:joinedFinal.snapshot.objectives},organicRevives:successfulRevives,rescueAttempts:rescues,reviveObservation:successfulRevives?'ORGANIC_REVIVE_OBSERVED':'REVIVE_UNTESTED',nativeCommittedPublicationComparisons:evidence.native.parity.length};
 if([hostFinal,joinedFinal].some(r=>r.snapshot.actors.filter(a=>!a.bot).some(a=>a.hp<=0||Math.hypot(a.position.x+8,a.position.y-1,a.position.z-12)>=4.5)||r.snapshot.mode!=='coop'||r.snapshot.phase!=='extracted'||!r.snapshot.winner||r.snapshot.actors.filter(a=>!a.bot).length!==2||complete().some(id=>!r.snapshot.objectives.find(o=>o.id===id)?.complete))||evidence.native.parity.length<3)throw Error('Full required two-client mission completion/parity not observed');if(!successfulRevives||!evidence.lifecycle.organicDowns.length||!evidence.lifecycle.revives.length)throw Error('Full mission unqualified: organic down/public revive not observed');evidence.retryQualification=evidence.lifecycle.checkpointRetries.length?'NATIVE_CHECKPOINT_RETRY_OBSERVED':'CHECKPOINT_RETRY_UNQUALIFIED_FIRST_FAILURE_STOP';if(!evidence.actualCheckpointRetry||!evidence.lifecycle.checkpointRetries.length)throw Error('Full finite lifecycle unqualified: actual planned checkpoint retry not observed');evidence.status='FULL_REQUIRED_MISSION_COMPLETE_INDEPENDENT_REVIEW_REQUIRED';currentPhase='required-mission-complete';
 await host.screenshot({path:resolve(output,'route-extraction.png')});await guest.screenshot({path:resolve(output,'guest-route-extraction.png')});
}catch(error){evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);evidence.failureKind=String(error).includes('101420s')?'FINITE_WORK_BOUND_INCOMPLETE':String(error).includes('Explicit101')?'DECLARED_EVIDENCE_BOUND_INCOMPLETE':'ACTUAL_PUBLIC_OUTCOME_FAILURE';evidence.unfinishedPhase=currentPhase;process.exitCode=1;await Promise.all([release(host),release(guest)]).catch(()=>{});await sample('first genuine failure',{check:false}).catch(()=>{});await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});await guest.screenshot({path:resolve(output,'failure-guest.png')}).catch(()=>{});}
finally{evidence.endUTC=new Date().toISOString();evidence.elapsedMs=Date.now()-start;let timer;
 const closing=(async()=>{await Promise.all([release(host),release(guest)]);evidence.hostVideo=host.video()?await host.video().path():null;evidence.guestVideo=guest.video()?await guest.video().path():null;await Promise.all([gc.close(),hc.close()]);await Promise.all([hostBrowser.close(),guestBrowser.close()]);})();
 try{await Promise.race([closing,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('101 cleanup30s/inclusive450s bound')),Math.max(1,Math.min(30000,450000-(Date.now()-start))));})]);}
 catch(error){evidence.cleanupFailure=String(error);evidence.status='CLEANUP_BOUND_FAILURE';process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;await persist('evidence.json');console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors,cleanupFailure:evidence.cleanupFailure}));}





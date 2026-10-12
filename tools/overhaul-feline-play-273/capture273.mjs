import {planInteractionSeparation177,validateInteractionSeparation177} from '../overhaul-coop-177/interaction-separation.mjs';
import {chooseActiveStage177,finalExtraction177} from '../overhaul-coop-177/phased-stage.mjs';
import {createMotionScheduler177} from '../overhaul-coop-177/motion-scheduler.mjs';
import {createAimFeedback156,chooseLook156} from '../overhaul-coop-156/aim-feedback.mjs';
import {createMissionController177} from '../overhaul-coop-177/controller.mjs';
import {lifecyclePage177} from '../overhaul-coop-177/lifecycle-adapter.mjs';
import {geometry177,certify177} from '../overhaul-coop-177/planner.mjs';
import {planExposure177} from '../overhaul-coop-177/exposure-search.mjs';
import {createPlanningRead177,chooseStage177} from '../overhaul-coop-177/planning-read.mjs';
import {readyForOrdinary273 as originalReady,nativeFault273,read273} from './guards273.mjs';
import {bind273} from './bound273.mjs';
import {shortOrdinary273} from './short273.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pilotGunAligned} from '../overhaul-pilot-aim.ts';
import {actorHullRadius} from '../../shared/config.ts';
import {squadThreats} from '../overhaul-squad-policy.ts';
const bound273=await bind273(),buildReceipt=bound273.binding.buildSeal.sha256;
const start=Date.now(),workMs273=Math.min(420000,Number(process.env.KITTYMECH_273_SUPERVISOR_DEADLINE)-Date.now()-35000),inclusiveMs273=workMs273+30000,origin='http://localhost:8799',output=bound273.binding.output;if(!Number.isFinite(workMs273)||workMs273<=0)throw Error('273 supervisor remaining work budget absent');await mkdir(output,{recursive:false});
const launch={channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
let hostBrowser=null,guestBrowser=null,hc=null,gc=null,host=null,guest=null;
const captureMode='both';
const viewport={width:1440,height:900},recordVideo={dir:output,size:{width:960,height:600}};
// Every browser/context/page allocation is owned by the final try/finally below.
let currentPhase='two-client-staging';
const evidence={startUTC:new Date(start).toISOString(),status:'RUNNING',buildReceipt,scope:'ONE ordinary two-client CO-OP mission through both relays, core and extraction. Public UI/keys and read-only diagnostics; no injected actors/HP/damage/warp/objectives. First genuine failure stops the capture. Optional roof objectives are not required mission phases.',capture:{mode:captureMode,separateBrowserProcesses:true,viewport,hostVideoSize:recordVideo.size,guestVideoSize:recordVideo.size},events:[],errors:[],waypoints:[],settledApproaches:[],bounds:{workMs:workMs273,cleanupMs:30000,inclusiveMs:inclusiveMs273,supervisorMs:480000,readinessMs:20000},native:{selector:'sharedWorld138 explicit server snapshot fields; recursive sorted-key canonical JSON SHA256, compared only at exact server room+publication epoch+sequence; matching tick is also required. Full host keyframes about0.5Hz and either-client semantic changes; every observed frame retains hash. No interpolated cross-time parity.',frames:{host:[],guest:[]},keyframes:[],parity:[],maxFramesPerPage:9000,keyframeBudgetBytes:18000000,keyframeBytes:0}};
const guard=()=>{if(Date.now()-start>workMs273)throw Error('138420s work bound; reserve30s final close inside450s');if(evidence.errors.length)throw Error(evidence.errors[0]);if(parallelFailure)throw parallelFailure;};
const ready=async(p,name)=>{guard();let timer;try{await Promise.race([originalReady(p,name),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bounded ordinary readiness missing '+name)),Math.min(20000,workMs273-(Date.now()-start)));})]);}finally{clearTimeout(timer);}guard();};
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
function sharedWorld138(s){return stable({publication:s.publication,inputVersion:s.inputVersion,worldLayoutVersion:s.worldLayoutVersion,ruinFragmentVersion:s.ruinFragmentVersion,experimentalPhysicalRubble:s.experimentalPhysicalRubble,tick:s.tick,time:s.time,seed:s.seed,room:s.room,mode:s.mode,actors:s.actors,projectiles:s.projectiles,events:s.events,fields:s.fields,cover:s.cover,structures:s.structures,rubble:s.rubble,ruins:s.ruins,bondedMaterial:s.bondedMaterial,coop:s.coop,supplies:s.supplies,objectives:s.objectives,checkpoint:s.checkpoint,phase:s.phase,winner:s.winner});}
const recent={host:new Map(),guest:new Map()},semantics={host:null,guest:null},lastKeyframe={host:-Infinity,guest:-Infinity},lastPublication={host:null,guest:null},firstWear=new Set();
evidence.native.bootstrap=[];evidence.lifecycle={organicDowns:[],revives:[],checkpointRetries:[]};const priorLife=new Map();
const observeNative=(p,label)=>{p.setDefaultTimeout(5000);p.on('pageerror',e=>evidence.errors.push(label+': '+e.message));p.on('websocket',ws=>ws.on('framereceived',frame=>{try{
 const msg=JSON.parse(typeof frame.payload==='string'?frame.payload:frame.payload.toString('utf8'));if(msg.type!=='snapshot')return;const s=msg.state,pub=s.publication;
 if(!pub||typeof pub.roomEpoch!=='string'||!pub.roomEpoch||!Number.isSafeInteger(pub.sequence)||pub.sequence<=0||!['bootstrap','broadcast'].includes(pub.kind))throw Error('Missing/invalid138 server publication identity; no tick-only fallback');
 const prior=lastPublication[label];if(prior&&prior.room===s.room&&prior.roomEpoch===pub.roomEpoch&&pub.sequence<=prior.sequence)throw Error('Nonmonotonic138 server publication sequence');lastPublication[label]={room:s.room,...pub};
 const shared=sharedWorld138(s),text=JSON.stringify(shared),sha256=createHash('sha256').update(text).digest('hex'),actorsSha256=createHash('sha256').update(JSON.stringify(stable(s.actors))).digest('hex'),key=JSON.stringify([s.room,pub.roomEpoch,pub.sequence]);
 if(evidence.native.frames[label].length>=9000)throw Error('Explicit138 native frame cap; no silent omission');const row={tick:s.tick,time:s.time,room:s.room,publication:pub,wallMs:Date.now()-start,sha256,actorsSha256};evidence.native.frames[label].push(row);recent[label].set(key,row);if(recent[label].size>300)recent[label].delete(recent[label].keys().next().value);
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
 const changed=semantic!==semantics[label];if(pub.kind==='bootstrap'||changed||wear.length||label==='host'&&Date.now()-lastKeyframe.host>=2000){const bytes=Buffer.byteLength(text);if(evidence.native.keyframeBytes+bytes>18000000)throw Error('Explicit138 native keyframe18MB cap; stop without silent omission');evidence.native.keyframes.push({page:label,wallMs:Date.now()-start,tick:s.tick,publication:pub,reason:pub.kind==='bootstrap'?'explicit-admission-bootstrap':changed?'semantic-change':wear.length?'first-observed-wear':'host-0.5Hz',shared});evidence.native.keyframeBytes+=bytes;lastKeyframe[label]=Date.now();}semantics[label]=semantic;
}catch(error){evidence.errors.push(label+' native history: '+String(error));}}));};
// Phase-event reads are navigation/HUD observations, separate from full native
// authority keyframes. Avoid duplicating full worlds in progress/final files.
const eventSummary=s=>s?({publication:s.publication,tick:s.tick,time:s.time,room:s.room,mode:s.mode,phase:s.phase,checkpoint:s.checkpoint,objectives:s.objectives,coop:s.coop,actors:s.actors.filter(a=>!a.bot),structures:s.structures.map(b=>({id:b.id,revision:b.revision,brokenMask:b.brokenMask})),ruins:s.ruins?.map(r=>({block:r.block,piece:r.piece,born:r.born,settled:r.settled,revision:r.revision})),supplies:s.supplies}):null;
const serializeEvidence=()=>JSON.stringify({...evidence,events:evidence.events.map(e=>({...e,host:{...e.host,snapshot:eventSummary(e.host.snapshot)},guest:{...e.guest,snapshot:eventSummary(e.guest.snapshot)}})),native:{...evidence.native,keyframes:{path:'native-keyframes.json',count:evidence.native.keyframes.length,compactSharedBytes:evidence.native.keyframeBytes}}});
const persist=async filename=>{const keyframes=JSON.stringify(evidence.native.keyframes),full=serializeEvidence();if(Buffer.byteLength(keyframes)+Buffer.byteLength(full)>30000000)throw Error('Explicit138 combined30MB evidence cap');await writeFile(resolve(output,'native-keyframes.json'),keyframes);await writeFile(resolve(output,filename),filename==='progress.json'?JSON.stringify({status:evidence.status,phase:currentPhase,elapsedMs:Date.now()-start,events:evidence.events.map(e=>({label:e.label,phase:e.phase,at:e.at})),errors:evidence.errors,nativeFrames:{host:evidence.native.frames.host.length,guest:evidence.native.frames.guest.length},keyframes:evidence.native.keyframes.length}):full);};
const originalRead177=async p=>p.evaluate(async()=>{const raw=await window.kittyMechDebug.input?.(),input=raw?{at:raw.at,seq:raw.seq,input:raw.input,keys:raw.keys,look:raw.look,native:raw.native,lastSent:raw.lastSent,sent:raw.sent?.slice(-20),browser:raw.browser}:null;return {snapshot:window.kittyMechDebug.snapshot(),transport:window.kittyMechDebug.transport?.(),input,camera:window.kittyMechDebug.camera(),owners:window.kittyIdentity57Runtime005?.read?.(),publicFeline:window.kittyFelinePrototype008?.read?.(),performance:window.kittyMechDebug.performance(),visibility:document.visibilityState};});
const read=async p=>{const base=await originalRead177(p),name=base.snapshot?.actors.find(a=>a.id===base.input?.lastSent?.localId)?.name??base.snapshot?.actors.find(a=>!a.bot)?.name;const extra=await read273(p,name),fault=nativeFault273(extra,bound273.binding.delivery.asset.sha256,!!extra.actor&&extra.actor.hp>0&&!extra.actor.downed&&extra.localReadiness?.scene.ready===true);if(evidence.status==='RUNNING'&&fault)throw Error(fault);const observation={at:Date.now(),name,tick:extra.tick,time:extra.time,native:{registry:{rows:extra.native?.registry?.rows?.map(row=>({actor:row.actor,diagnostic:{mode:row.diagnostic.mode,status:row.diagnostic.status,life:row.diagnostic.life,frameClock:row.diagnostic.frameClock,activeClips:row.diagnostic.activeClips,browserClipContract:row.diagnostic.browserClipContract}}))}},actor:extra.actor?{id:extra.actor.id,hp:extra.actor.hp,downed:extra.actor.downed,stance:extra.actor.stance,jumpEpoch:extra.actor.jumpEpoch}:null};(evidence.nativeModes273??=[]).push(observation);if(evidence.nativeModes273.length>6000)throw Error('273 finite native mode evidence cap');return {...base,native:extra.native,shader:extra.shader};};
const inputRead=async(p,name)=>p.evaluate(async name=>{const raw=await window.kittyMechDebug.input(),s=window.kittyMechDebug.snapshot();return {at:raw.at,seq:raw.seq,actor:s.actors.find(a=>a.name===name),tick:s.tick,time:s.time,input:raw.input,keys:raw.keys,look:raw.look,sent:raw.sent.slice(-20),camera:window.kittyMechDebug.camera()};},name);
// The mark precedes key-down and is on the same browser performance clock as
// successful sends. Keep a hold until its intended packet is ACKed, not a tap.
const delivered=async(p,name,mark,intended,label)=>{const until=Date.now()+1500;let packet=null,r;
 while(Date.now()<until){guard();r=await inputRead(p,name);if(!r.actor||r.actor.hp<=0)throw Error(name+' downed during delivered '+label);packet??=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&intended(x.input));if(packet&&r.actor.lastInput>=packet.input.seq){if((evidence.deliveries??=[]).length>=1200)throw Error('Explicit138 delivery receipt cap');evidence.deliveries.push({name,label,wallMs:Date.now()-start,holdStartAt:mark.at,packet,ack:{tick:r.tick,time:r.time,lastInput:r.actor.lastInput},sent:r.sent.filter(x=>x.at>=mark.at).slice(-20)});return r;}await p.waitForTimeout(40);}
 (evidence.deliveryFailures??=[]).push({name,label,holdStartAt:mark.at,packet,receipt:r});throw Error(name+' intended '+label+' successful-send/ACK missing within1.5s');};
const opticalAim=(state,enemy)=>{const ray=state.look?.cameraRay,p=state.camera?.position;if(!ray||!p)throw Error('Actual current camera position/ray unavailable');const lead=Math.min(.5,Math.hypot(state.actor.position.x-enemy.position.x,state.actor.position.z-enemy.position.z)/105),target={x:enemy.position.x+enemy.velocity.x*lead,y:enemy.position.y+.65+enemy.velocity.y*lead,z:enemy.position.z+enemy.velocity.z*lead};const dx=target.x-p.x,dy=target.y-p.y,dz=target.z-p.z,yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));return {target,lead,yaw,pitch,dyaw:Math.atan2(Math.sin(yaw-ray.yaw),Math.cos(yaw-ray.yaw)),dpitch:pitch-ray.pitch};};
const pilotRead=async(p,name,id)=>{guard();const value=await p.evaluate(({name,id})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),sight=e=>({...e,visible:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.65},{...e.position,y:e.position.y+.65})===true,fireClear:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+(actor.stance==='upright'?1.65:.65)},{...e.position,y:e.position.y+.65})===true});return {time:s.time,transport:window.kittyMechDebug.transport?.(),actor,humans:s.actors.filter(a=>!a.bot),enemy:id&&s.actors.find(a=>a.id===id)?sight(s.actors.find(a=>a.id===id)):undefined,enemies:id?undefined:s.actors.filter(a=>a.bot&&a.hp>0).map(sight),camera:window.kittyMechDebug.camera()};},{name,id});if(value.transport?.connection==='Disconnected'||value.transport?.error){(evidence.transportFailures??=[]).push({name,wall:Date.now(),...value.transport});throw Error('Arena transport stopped: '+(value.transport.error??JSON.stringify(value.transport.receipt?.close)));}return value;};
const sample=async(label,{check=true}={})=>{if(check)guard();const at=Date.now(),[hostState,guestState]=await Promise.all([read(host),read(guest)]);const authority={source:'Exact committed WebSocket publication observer'};evidence.events.push({label,phase:currentPhase,at,authority,host:hostState,guest:guestState});console.log(label);if(/down|revive|checkpoint/i.test(label)){const safe=label.replace(/[^A-Za-z0-9_-]/g,'-').slice(0,100);await Promise.all([host.screenshot({path:resolve(output,'host-'+safe+'.png'),timeout:1500}),guest.screenshot({path:resolve(output,'guest-'+safe+'.png'),timeout:1500})]);}};

const release=async p=>{if(!p)return;await Promise.all(['KeyW','KeyA','KeyS','KeyD','KeyF','KeyE','KeyJ','KeyL','KeyI','KeyK','KeyC','Space','ShiftLeft','KeyR'].map(k=>p.keyboard.up(k)));};
// Two distinct native ticks, ACK of a neutral public packet and actual low
// horizontal velocity establish braking. Recheck coordinates after braking.
const settle=async(p,name,target=null,tolerance=1.1)=>{const mark=await inputRead(p,name);await release(p);let neutralSeq=null,lastTick=-1,count=0;const until=Date.now()+4000;
 while(Date.now()<until){guard();const r=await read(p),a=r.snapshot.actors.find(a=>a.name===name),sent=r.input?.sent?.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&x.input.forward===0&&x.input.strafe===0&&!x.input.climb&&!x.input.fire)?.input;if(!a||a.hp<=0)throw Error(name+' cannot settle a downed/missing actor');if(sent)neutralSeq??=sent.seq;
  const neutral=r.input?.input?.forward===0&&r.input?.input?.strafe===0&&!r.input?.input?.climb,slow=Math.hypot(a.velocity.x,a.velocity.z)<=.12;
  if(neutral&&slow&&a.grounded&&neutralSeq!==null&&a.lastInput>=neutralSeq&&r.snapshot.tick!==lastTick){count++;lastTick=r.snapshot.tick;}else if(!neutral||!slow)count=0;
  if(count>=2){const distance=target?Math.hypot(target.x-a.position.x,target.z-a.position.z):null,receipt={name,wallMs:Date.now()-start,tick:r.snapshot.tick,phase:currentPhase,target,tolerance,distance,position:a.position,velocity:a.velocity,neutralSeq,lastInput:a.lastInput,keys:r.input.keys,look:r.input.look};evidence.settledApproaches.push(receipt);return target&&distance>=tolerance?null:receipt;}
  await p.waitForTimeout(60);
 }throw Error(name+' actual low-velocity neutral approach did not settle');};
const planningRead177=createPlanningRead177;
const motion177=createMotionScheduler177({pilots:()=>pilots,controller:(p,n)=>controllerFor(p,n),read,release,guard,evidence});
let activeRescueName=null,plannedExposure=false;const routeControllers=new Map();
const controllerFor=(p,name)=>{
 if(!routeControllers.has(name)){const local=lifecyclePage177(p,name,guard,evidence);const owner=createMissionController177({page:local.page,name,guard,evidence,beforePulse:async(state,target)=>{try{await motion177.validate(state.snapshot,state.identity,target);}catch(error){if(error.rebindRequired177)(evidence.rejectedOccupancy177??=[]).push(error.geometryReceipt177??{tick:state.tick,publication:state.publication,kind:'CURRENT_REST_OR_NEUTRAL_OWNERSHIP_LOST',error:String(error)});else evidence.failureReceipt=error.geometryReceipt177??{kind:'177_CURRENT_LIFECYCLE_OWNERSHIP_FAILURE',tick:state.tick,error:String(error)};throw error;}},onEvent:async()=>{
  const v=await pilotRead(p,name),down=v.humans.find(h=>h.hp<=0&&h.downed);
  if(down&&!activeRescueName&&!plannedExposure)throw Error('Organic down requires coordinated rescue');
  const threat=squadThreats(v)[0];
  if(threat&&!plannedExposure){const event=Error('ROUTE_COMBAT_EVENT');event.routeThreat=threat.id;throw event;}
  const waypoint=evidence.waypoints.at(-1),pulses=waypoint?.name===name?waypoint.pulses.filter(p=>p.rest&&p.ack).slice(-3):[];
  if(pulses.length===3&&pulses.every(p=>p.restDistance>=1.1)&&pulses.reduce((sum,p)=>sum+p.actualTravel,0)<.15){evidence.failureReceipt={kind:'ACTUAL_ACKED_LOW_PROGRESS_OBSTRUCTION',name,target:waypoint.target,receipt:pulses.map(p=>({travel:p.actualTravel,ack:p.ack,rest:p.rest}))};throw Error('Three actual delivered ACK/rest pulses produced under.15m total progress; STOP for obstruction diagnosis');}
  await owner.settle();
 }});routeControllers.set(name,{...owner,settle:async()=>{local.reset();try{return await owner.settle();}finally{local.reset();}},moveTo:async(...args)=>{local.reset();try{const result=await owner.moveTo(...args),rest=await owner.settle(),target=args[0],tolerance=args[1]?.tolerance??1.1;if(Math.hypot(rest.rest.position.x-target.x,rest.rest.position.z-target.z)>=tolerance)throw Error(name+'138 arrival not actually settled after event');return result;}finally{local.reset();}}});}
 return routeControllers.get(name);
};
const directGo=async(p,name,target,rescue=false,arrival=1.1,rescueName=null,routeBudget={remaining:12})=>{
 const ctl=controllerFor(p,name);activeRescueName=rescueName;
 let legs=[target];
 // Bounded in-route encounters are mission events, not failed observations.
 // Every controller failure without an identified live threat stops immediately.
 for(let events=0;events<4;events++){
  try{for(let i=0;i<12;i++){await ctl.settle();const fresh=planningRead177(await read(p),name,guard),next=fresh.route(target);(evidence.planning177??=[]).push({phase:currentPhase,kind:'DIRECT_CURRENT_ORIGIN_CONTINUATION',...next});if(!next.path){evidence.failureReceipt={kind:'177_DIRECT_CONTINUATION_REJECTED',...next};throw Error('177 current-origin continuation unqualified');}motion177.commit(next);if(routeBudget.remaining--<=0)throw Error("177 original12 actual waypoint budget");const result=await ctl.moveTo(next.path[0],{phase:currentPhase,tolerance:next.path.length===1?arrival:1.1});if(next.path.length===1)return result;}throw Error('177 original12-waypoint continuation bound');}
  catch(error){await ctl.release();if(error.rebindRequired177){await motion177.rebind();const current=planningRead177(await read(p),name,guard),replanned=current.route(target);(evidence.planning177??=[]).push({phase:currentPhase,kind:'CONSEQUENTIAL_CLEARANCE_RELEASE_NEUTRAL_ACK_REST_FRESH_ACTUAL_REPLAN',...replanned});if(!replanned.path)throw Error('177 displaced parked mate fresh actual corridor infeasible');continue;}if(!error.routeThreat)throw error;
   await trackFire(p,name,error.routeThreat,rescue,{routeThreat:true});
   await ctl.settle();const current=planningRead177(await read(p),name,guard),resume=current.route(target,arrival);(evidence.planning151??=[]).push({phase:currentPhase,kind:'156_POST_COMBAT_CURRENT_ROUTE',...resume});if(!resume.path){evidence.failureReceipt={kind:'156_POST_COMBAT_ROUTE_REJECTED',...resume};throw Error('156 post-combat current route rejected: '+resume.rejection?.branch);}legs=resume.path;
  }
 }
 throw Error(name+' finite route event budget exhausted');
};
const go=async(p,name,target,rescue=false,arrival=1.1,rescueName=null,stage=null)=>motion177.run(name,{intent:'UNCOMMITTED',target,stage},()=>goOwned177(p,name,target,rescue,arrival,rescueName,stage),{downedPhase:rescue||plannedExposure});
const goOwned177=async(p,name,target,rescue=false,arrival=1.1,rescueName=null,stage=null)=>{
 guard();await controllerFor(p,name).settle();const initialRead=planningRead177(await read(p),name,guard),initial=stage?chooseStage177(initialRead,stage.objective,{reach:stage.reach,guard}):initialRead.route(target);
 (evidence.planning177??=[]).push({phase:currentPhase,kind:'INITIAL_COMPLETE_REGION_ROUTE',...initial});
 if(!initial.path){evidence.failureReceipt={kind:'177_INITIAL_ROUTE_REJECTED',...initial};throw Error('177 initial complete arrival-region route rejected');}
 motion177.commit(initial);const goal=initial.point??target,binding=initialRead.read,routeBudget={remaining:12};
 for(let leg=0;leg<12;leg++){
  guard();await controllerFor(p,name).settle();const fresh=planningRead177(await read(p),name,guard);
  if(fresh.read.identity.generation!==binding.identity.generation||fresh.actor.id!==binding.actor.id||fresh.read.identity.life!==binding.identity.life||fresh.read.publication.roomEpoch!==binding.publication.roomEpoch||fresh.read.tick<binding.tick)throw Error('177 actual-origin planning lifecycle/publication changed');
  const plan=fresh.route(goal);(evidence.planning177??=[]).push({phase:currentPhase,kind:'FRESH_NEUTRAL_ACK_ACTUAL_ORIGIN_ROUTE',leg,...plan});
  if(!plan.path){evidence.failureReceipt={kind:'177_ACTUAL_ORIGIN_ROUTE_REJECTED',...plan};throw Error('177 actual settled origin/endpoint region unqualified');}
  const waypoint=plan.path[0];await directGo(p,name,waypoint,rescue,plan.path.length===1?arrival:1.1,rescueName,routeBudget);
  if(plan.path.length===1)return;
 }
 throw Error('177 original12-waypoint route bound');
};
// Track a live target through ordinary keyboard camera commands. A stale
// snapshot held through a long turn/fire burst cannot qualify shooting.
const combatRead156=async(p,name,id)=>p.evaluate(async({name,id})=>{
 const d=window.kittyMechDebug,raw=await d.input(),s=d.snapshot(),actor=s.actors.find(a=>a.name===name),e=s.actors.find(a=>a.id===id),last=raw.lastSent;
 const enemy=e&&actor?{...e,visible:d.sight?.({...actor.position,y:actor.position.y+.65},{...e.position,y:e.position.y+.65})===true,fireClear:d.sight?.({...actor.position,y:actor.position.y+(actor.stance==='upright'?1.65:.65)},{...e.position,y:e.position.y+.65})===true}:e;
 return {at:raw.at,seq:raw.seq,time:s.time,tick:s.tick,publication:s.publication,actor,enemy,humans:s.actors.filter(a=>!a.bot),input:raw.input,keys:raw.keys,look:raw.look,sent:raw.sent,controlEvents:raw.controlEvents,camera:d.camera(),transport:d.transport?.(),identity:{generation:last?.generation,localId:last?.localId,life:actor?.jumpEpoch,sendLife:last?.input.jumpEpoch}};
},{name,id});
const trackFire=async(p,name,id,allowDownedAlly=false,combatStop=null)=>{await p.bringToFront();await settle(p,name);let rocketAt=0,startTime=null,priorAimError=null,aimStalls=0;const deadline=Date.now()+20000;
 const record={name,target:id,startedAt:Date.now(),steps:[],exit:'wall-watchdog'};(evidence.tracking??=[]).push(record);let previousLook=null;const feedback=createAimFeedback156({page:p,read:()=>combatRead156(p,name,id),guard,record,deadline});
 try{while(Date.now()<deadline){const readAt=Date.now(),state=await feedback.settled(),readMs=Date.now()-readAt,a=state.actor,e=state.enemy;startTime??=state.time;
 record.lastObserved={time:state.time,targetHp:e?.hp,targetPosition:e?.position,visible:e?.visible,fireClear:e?.fireClear,pilotHp:a.hp,teammates:state.humans.filter(h=>h.id!==a.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position}))};
 if(a.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!e||e.hp<=0){record.exit='target-defeated';return;}
 if(!e.visible||!e.fireClear){record.exit='target-occluded';return;}
 if(!combatStop?.objective&&!combatStop?.routeThreat&&!squadThreats({actor:a,enemies:[e],time:state.time}).length){record.exit='target-disengaged';return;}
 const ally=state.humans.find(h=>h.id!==a.id),interruption=ally?.hp<=0&&!allowDownedAlly?'teammate-downed':null;if(interruption){record.exit=interruption;return;}
 if(state.time-startTime>=6.5||combatStop?.stop){record.exit='native-time-bound';record.targetHp=e.hp;return;}
 const aim=opticalAim(state,e),command=chooseLook156(aim,previousLook);
 await p.keyboard.up('KeyF');const controlAt=Date.now();
 const post=command?await feedback.pulse(command,state):state,controlMs=Date.now()-controlAt,postReadMs=0,pulseMs=command?.requestedMs??0,look=command?[command.key]:[];
 if(post.actor.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}if(!post.enemy||post.enemy.hp<=0){record.exit='target-defeated';return;}
 if(!post.enemy.visible||!post.enemy.fireClear){record.exit='target-occluded';return;}
 if(post.time-startTime>=6.5||combatStop?.stop){record.exit='native-time-bound';return;}
 const fresh=opticalAim(post,post.enemy),aligned=Math.abs(fresh.dyaw)<.045&&Math.abs(fresh.dpitch)<.035&&pilotGunAligned(post.actor,post.enemy,fresh.target,post.time);
 if(command)previousLook={axis:command.axis,before:state,after:post,beforeAim:aim,afterAim:fresh};
 const step={wall:Date.now(),time:post.time,readMs,controlMs,postReadMs,pulseMs,targetHp:post.enemy.hp,targetPosition:post.enemy.position,targetVelocity:post.enemy.velocity,actorPosition:post.actor.position,lookYaw:post.camera.lookYaw,lookPitch:post.camera.lookPitch,gunYaw:post.actor.aimYaw,gunPitch:post.actor.aimPitch,desiredYaw:fresh.yaw,desiredPitch:fresh.pitch,dyaw:fresh.dyaw,dpitch:fresh.dpitch,lead:fresh.lead,aligned,visible:post.enemy.visible,fireClear:post.enemy.fireClear,teammates:post.humans.filter(h=>h.id!==post.actor.id).map(h=>({name:h.name,hp:h.hp,hurtAt:h.hurtAt,position:h.position,downed:h.downed}))};record.steps.push(step);const actualAimError=Math.hypot(fresh.dyaw,fresh.dpitch);aimStalls=look.length&&priorAimError!==null&&actualAimError>=priorAimError-.002?aimStalls+1:0;priorAimError=actualAimError;if(aimStalls>=3&&!aligned){record.exit='actual-optical-aim-unreachable';throw Error(name+' actual optical camera aim failed to progress after3 public look pulses');}
 if(aligned){const mark=await inputRead(p,name);try{await p.keyboard.down('KeyF');await delivered(p,name,mark,input=>input.fire===true,'fire');if(Date.now()>rocketAt){await p.keyboard.press('KeyQ');rocketAt=Date.now()+1600;}await p.waitForTimeout(100);}finally{await p.keyboard.up('KeyF');}}
 await p.waitForTimeout(20);}
 }finally{record.finishedAt=Date.now();for(const k of ['KeyJ','KeyL','KeyI','KeyK','KeyF'])await p.keyboard.up(k);}};
const interactionSeparation177=async(activeName,peerName)=>motion177.run(activeName,{intent:'INTERACTION_TO_NORMAL_TRAVEL_UNCOMMITTED'},async fresh=>{const plan=planInteractionSeparation177(fresh.snapshot,activeName,peerName);(evidence.interactionSeparation177??=[]).push(plan);if(!plan.needed)throw Error('177 unnecessary separation cannot commit a movement');motion177.active().separation=plan;motion177.commit({...plan,point:plan.target});const p=pilots.find(p=>p.name===activeName);await controllerFor(p.page,activeName).moveTo(plan.target,{phase:'INTERACTION_SEPARATION',tolerance:1.1});const actual=(await read(p.page)).snapshot;validateInteractionSeparation177(plan,actual);const a=actual.actors.find(a=>a.name===activeName),normal=certify177(geometry177(actual,a.id),a.position,a.position);if(!normal.clear)throw Error('177 settled separation did not qualify original normal origin');plan.transition={tick:actual.tick,publication:actual.publication,actualPosition:a.position,normal};delete motion177.active().separation;});
let pilots=[];
const squadViews=async()=>{const views=[];for(const p of pilots)views.push(await pilotRead(p.page,p.name));return views;};
let rescues=0,successfulRevives=0;
const rescueRead=async(p,name,downName)=>p.evaluate(({name,downName})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),down=s.actors.find(a=>a.name===downName),clear=actor&&down&&window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.4},{...down.position,y:down.position.y+.4})===true;return {actor,down,time:s.time,tick:s.tick,clear};},{name,downName});
const rescueEligible=r=>!!r.actor&&r.actor.hp>0&&!!r.down?.downed&&r.down.hp<=0&&r.actor.grounded&&r.down.grounded&&!r.actor.climb&&!r.actor.pair&&!r.actor.strike&&r.time-r.actor.hurtAt>=.3&&Math.hypot(r.actor.velocity.x,r.actor.velocity.z)<=1.5&&Math.hypot(r.actor.position.x-r.down.position.x,r.actor.position.y-r.down.position.y,r.actor.position.z-r.down.position.z)<=4.5&&Math.hypot(r.actor.position.x-r.down.position.x,r.actor.position.z-r.down.position.z)>=actorHullRadius(r.actor)+actorHullRadius(r.down)+.05&&r.clear;
const rescuePilot=async name=>{if(++rescues>2)throw Error('Bounded rescue attempts exhausted');for(const p of pilots)await release(p.page);const views=await squadViews(),down=views.find(v=>v.actor.name===name)?.actor,survivor=views.find(v=>v.actor.hp>0)?.actor,p=pilots.find(p=>p.name===survivor?.name);if(!down?.downed||!p)throw Error('No surviving rescue pilot');await sample('rescue required '+name);
 await clearThreats(false);await p.page.bringToFront();await settle(p.page,p.name);let eligible=false;
 for(let approach=0;approach<3;approach++){const r=await rescueRead(p.page,p.name,name);if(rescueEligible(r)){eligible=true;(evidence.rescueEligibility??=[]).push({name,reviver:p.name,...r});break;}if(!r.down?.downed||r.actor.hp<=0)throw Error('Rescue target/pilot lifecycle changed');const dx=r.actor.position.x-r.down.position.x,dz=r.actor.position.z-r.down.position.z,d=Math.hypot(dx,dz)||1;await go(p.page,p.name,{x:r.down.position.x+dx/d*4,z:r.down.position.z+dz/d*4},true,.4,name);await settle(p.page,p.name);}
 if(!eligible){const r=await rescueRead(p.page,p.name,name);if(!rescueEligible(r)){(evidence.rescueEligibility??=[]).push({name,reviver:p.name,failed:true,...r});throw Error('Fresh native rescue range/LOS/grounded/separation not eligible');}}
 const committedRescue=await rescueRead(p.page,p.name,name);if(!rescueEligible(committedRescue)||committedRescue.actor.nativePose?.enabled!==true||committedRescue.down.nativePose?.enabled!==false)throw Error('177 actual settled native restore interaction not eligible');(evidence.restoreCommit177??=[]).push({target:name,phase:'ACTUAL_SETTLED_INTERACTION',futureMovingDisk:'RETIRED',futureRestoredHull:'UNCOMMITTED_UNTIL_NATIVE_RESTORE',current:await rescueRead(p.page,p.name,name),authority:'Native in-place restore guard; no tool collider mutation'});const mark=await inputRead(p.page,p.name),began=(await pilotRead(p.page,p.name)).time,deadline=Date.now()+15000;await p.page.keyboard.down('KeyE');await delivered(p.page,p.name,mark,input=>input.interact===true,'rescue-E');
 try{while(Date.now()<deadline){await p.page.waitForTimeout(100);const state=await pilotRead(p.page,p.name),target=state.humans.find(a=>a.name===name);if(target?.hp>0&&!target.downed){await p.page.keyboard.up('KeyE');await Promise.all(pilots.map(q=>release(q.page)));motion177.reset();const reacquired=[];for(const q of pilots){const neutral=await controllerFor(q.page,q.name).settle();const fresh=await read(q.page),a=fresh.snapshot.actors.find(a=>a.name===q.name);if(a?.nativePose?.enabled!==true||a.hp<=0||a.downed)throw Error('177 revived collider/roster not currently enabled');reacquired.push({name:q.name,actor:a,neutral,publication:fresh.snapshot.publication});}(evidence.reviveReacquisition177??=[]).push({target:name,scope:'DISABLED_CERTIFICATE_RETIRED_FRESH_LIVING_NATIVE_ACK_REST',reacquired});await interactionSeparation177(p.name,name);successfulRevives++;await sample('ordinary teammate revive '+name);return;}if(state.actor.hp<=0)throw Error('Rescue pilot downed');const channel=await rescueRead(p.page,p.name,name);if(!rescueEligible(channel)||channel.actor.id!==committedRescue.actor.id||channel.actor.jumpEpoch!==committedRescue.actor.jumpEpoch||channel.down.id!==committedRescue.down.id||channel.down.jumpEpoch!==committedRescue.down.jumpEpoch||channel.down.nativePose?.enabled!==false)throw Error('177 current restore interaction/life/LOS became ineligible');if(state.time-began>8)break;}}finally{await p.page.keyboard.up('KeyE');}throw Error('Rescue channel did not complete');};
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
const activeStage177=async(p,name,objective,options)=>motion177.run(name,{intent:'UNCOMMITTED_ACTIVE_STAGE',objective,options},async fresh=>{
 const plan=chooseActiveStage177(fresh.snapshot,name,objective,{...options,guard});(evidence.phasedStages177??=[]).push(plan);
 if(!plan.path){evidence.failureReceipt={kind:'177_ACTIVE_STAGE_REJECTED',plan};throw Error('177 current active complete-arrival stage infeasible');}
 await goOwned177(p,name,plan.point);
});
const stageSquad177=async(objective,{hostReach=4,guestReach=10,extraction=false}={})=>{
 // Later host goal is never a currently occupied reservation during guest travel.
 await activeStage177(guest,'Mission177Guest',objective,{reach:guestReach,cover:true});
 await activeStage177(host,'Mission177Host',objective,{reach:extraction?4.5:hostReach,extraction});
 if(extraction)await motion177.run('Mission177Guest',{intent:'UNCOMMITTED_FINAL_EXTRACTION',objective},async fresh=>{
  const plan=finalExtraction177(fresh.snapshot,'Mission177Host','Mission177Guest',objective,guard);(evidence.phasedStages177??=[]).push({kind:'ACTUAL_PARKED_HOST_FINAL_EXTRACTION',...plan});
  if(!plan.path){evidence.failureReceipt={kind:'177_SEQUENTIAL_EXTRACTION_INFEASIBLE',plan};throw Error('177 active guest fullarrival/parkedhost extraction infeasible');}
  await goOwned177(guest,'Mission177Guest',plan.point);
 });
 if(extraction){const ended=(await read(host)).snapshot,humans=ended.actors.filter(a=>!a.bot);if(humans.length!==2||humans.some(a=>a.hp<=0||a.downed||Math.hypot(a.position.x-objective.x,a.position.y-(objective.y+1),a.position.z-objective.z)>=4.5))throw Error('177 actual twoalive3D extraction staging missing');}
};
const squadGo=async point=>{await clearThreats();await stageSquad177({...point,y:0});};
const squadStageObjective=async id=>{await clearThreats();const s=(await read(host)).snapshot,objective=s.objectives.find(o=>o.id===id);if(!objective?.unlocked)throw Error('Required native objective staging not unlocked '+id);await stageSquad177(objective.position,{hostReach:4,guestReach:10,extraction:id==='extraction'});};
const holdObjective=async id=>{currentPhase='interaction-'+id;
 for(let recovery=0;recovery<3;recovery++){
  const objective=(await read(host)).snapshot.objectives.find(o=>o.id===id);if(!objective?.unlocked)throw Error('Required objective not unlocked '+id);if(objective.complete)return;
  const views=await squadViews(),h=views.find(v=>v.actor.name==='Mission177Host').actor,g=views.find(v=>v.actor.name==='Mission177Guest').actor;
  if(id==='extraction'){if(!await settle(guest,'Mission177Guest',objective.position,4.5))throw Error('Guest extraction approach outside4.5m');}
  
  if(Math.hypot(h.position.x-objective.position.x,h.position.z-objective.position.z)>=4){await go(host,'Mission177Host',objective.position,false,1.1,null,{objective:objective.position,reach:4});}
  await clearThreats();if(!await settle(host,'Mission177Host',objective.position,4))throw Error('Actual settled objective outside4m '+id);await sample('settled required interaction '+id);
  const stop={stop:false,objective:id};let coverFailure=null;
  const cover=(async()=>{try{while(!stop.stop){guard();const v=await pilotRead(guest,'Mission177Guest');if(v.actor.hp<=0)throw Error('Mission177Guest organically downed during cover');const targets=v.enemies.filter(e=>e.visible&&e.fireClear&&(Math.hypot(e.position.x-objective.position.x,e.position.z-objective.position.z)<7||squadThreats(v).some(t=>t.id===e.id)));if(targets.length)await trackFire(guest,'Mission177Guest',targets[0].id,false,stop);else await guest.waitForTimeout(100);}}catch(error){coverFailure=error;stop.stop=true;}})();
  let channelFailure=null,complete=false;const until=Date.now()+35000;
  try{const mark=await inputRead(host,'Mission177Host');await host.keyboard.down('KeyE');await delivered(host,'Mission177Host',mark,input=>input.interact===true,'objective-E');while(Date.now()<until){guard();if(coverFailure)throw coverFailure;await host.waitForTimeout(100);const s=(await read(host)).snapshot;if(s.coop?.status==='failed')throw Error('CoOp mission failed organically');if(s.actors.some(a=>!a.bot&&a.hp<=0&&a.downed))throw Error('Organic down requires coordinated rescue');if(s.objectives.find(o=>o.id===id)?.complete||s.phase==='extracted'){complete=true;break;}}if(!complete)throw Error('138 required objective channel35s bound '+id);}
  catch(error){channelFailure=error;}finally{await host.keyboard.up('KeyE');stop.stop=true;await cover;await release(guest);}
  if(complete)return;const after=await squadViews(),fallen=after.find(v=>v.actor.hp<=0&&v.actor.downed);if(fallen&&after.some(v=>v.actor.hp>0)&&/downed|down requires/i.test(String(channelFailure??coverFailure))){await rescuePilot(fallen.actor.name);continue;}throw channelFailure??coverFailure??Error('Incomplete required objective '+id);
 }
 throw Error('138 objective organic recovery bound exhausted '+id);
};

// These are finite planned native lifecycle phases in this ONE capture, not an
// automatic replay. Real AI combat supplies every damage/down receipt.
const exposeSquad=async(kind)=>{
 currentPhase='planned-organic-'+kind;plannedExposure=true;
 try{
  const s=(await read(host)).snapshot;
  const observedLOS=async pairs=>host.evaluate(pairs=>pairs.map(({from,to})=>window.kittyMechDebug.sight?.(from,to)===true),pairs);
  const trace={};(evidence.exposureInputs153??=[]).push({kind,snapshot:structuredClone(s),trace});
  const plan=await planExposure177(s,pilots.map(p=>p.name),observedLOS,guard,trace);
  evidence.plannedExposure??=[];evidence.plannedExposure.push({kind,tick:s.tick,time:s.time,publication:s.publication,...plan});
  // The closer human is exposed first; survivor follows a separately qualified
  // path. Ordinary collision/input owns every step; no observer position writes.
  for(let i=0;i<pilots.length;i++){
   const p=pilots[i],route=plan.routes[i];
   for(const point of route){
    guard();const now=(await read(p.page)).snapshot,actor=now.actors.find(a=>a.name===p.name);
    if(actor?.downed)break;
    if(!actor||actor.hp<=0)throw Error('Exposure pilot missing/dead without organic down');
    const geometry=geometry177(now,actor.id);
    if(!certify177(geometry,point,point,{endpoint:true}).clear)throw Error('Current native solid mask invalidated planned exposure waypoint');
    try{await go(p.page,p.name,point);}catch(error){const actual=(await read(p.page)).snapshot.actors.find(a=>a.name===p.name);if(!actual?.downed||!String(error).includes('downed'))throw error;break;}
   }
  }
  const arrived=(await read(host)).snapshot,target=arrived.actors.find(a=>a.id===plan.targetId),actualHumans=pilots.map(p=>arrived.actors.find(a=>a.name===p.name));
  if(!target||target.hp<=0||Math.abs(target.position.y-plan.targetPosition.y)>1.1)throw Error('Selected current ground threat changed before actual exposure');
  const actualPairs=actualHumans.filter(a=>a?.hp>0).map(a=>({from:{...target.position,y:target.position.y+.65},to:{...a.position,y:a.position.y+.4}}));
  const actualSight=await observedLOS(actualPairs);
  evidence.plannedExposure.at(-1).actualExposure={tick:arrived.tick,publication:arrived.publication,target,humans:actualHumans,actualSight};
  if(actualSight.some(v=>v!==true))throw Error('Actual arrived ground exposure native LOS not clear');
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
   // Failed actors do not advance lastInput: this is a browser successful-send
   // release observation, explicitly NOT a native movement ACK. The actual
   // attempt+1/checkpoint/roster transition below proves retry consumed an edge.
   await host.keyboard.up('KeyE');const mark=await inputRead(host,'Mission177Host');let neutral,releaseObservation;
   const releaseUntil=Date.now()+1500;
   while(Date.now()<releaseUntil){guard();const r=await inputRead(host,'Mission177Host');neutral=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&!x.input.interact);
    if(neutral&&r.input.interact===false&&!r.keys.includes('KeyE')){releaseObservation={contract:'CLIENT_SEND_NOT_NATIVE_ACK',packet:neutral,currentInteract:r.input.interact,keys:r.keys,at:r.at,tick:r.tick,time:r.time,actorLastInputFrozen:r.actor.lastInput};break;}await host.waitForTimeout(40);}
   if(!releaseObservation)throw Error('Planned retry fresh public release send/current-held-false missing');
   await host.keyboard.down('KeyE');
   try{
    const until=Date.now()+5000;let restored;
    while(Date.now()<until){guard();restored=(await read(host)).snapshot;if(restored.coop?.status==='active'&&restored.coop.attempt===attempt+1)break;await host.waitForTimeout(60);}
    if(restored.coop?.status!=='active'||restored.coop.attempt!==attempt+1||restored.checkpoint?.objectiveId!=='relay-west'||!restored.objectives.find(o=>o.id==='relay-west')?.complete||restored.actors.filter(a=>!a.bot).length!==2||restored.actors.filter(a=>!a.bot).some(a=>a.hp<=0||a.downed||Math.hypot(a.position.x-checkpoint.position.x,a.position.z-checkpoint.position.z)>12))throw Error('Actual native checkpoint retry/roster restoration not observed');
    evidence.actualCheckpointRetry={before:actual.coop,after:restored.coop,checkpoint:restored.checkpoint,actors:restored.actors.filter(a=>!a.bot),releaseObservation};
    motion177.reset();await sample('planned native checkpoint retry restored');
   }finally{await host.keyboard.up('KeyE');}
  }
 }finally{plannedExposure=false;activeRescueName=null;await Promise.all(pilots.map(p=>release(p.page)));}
};
const enablePublicPreview=async p=>{await p.getByRole('button',{name:'Open settings',exact:true}).click();await p.getByLabel('Graphics quality',{exact:true}).selectOption('low');await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await p.getByRole('button',{name:'Close settings',exact:true}).click();};
try{
 currentPhase='owned-browser-startup';guard();
 hostBrowser=await chromium.launch(launch);guard();
 guestBrowser=await chromium.launch(launch);guard();
 hc=await hostBrowser.newContext({viewport,recordVideo});guard();
 gc=await guestBrowser.newContext({viewport,recordVideo});guard();
 host=motion177.page(await hc.newPage(),'Mission177Host');await bound273.route(host);observeNative(host,'host');guard();
 guest=motion177.page(await gc.newPage(),'Mission177Guest');await bound273.route(guest);observeNative(guest,'guest');guard();
 pilots=[{page:host,name:'Mission177Host'},{page:guest,name:'Mission177Guest'}];
 currentPhase='two-client-staging';
 guard();await bound273.goto(host,origin+'/?debug=1');await enablePublicPreview(host);await host.getByLabel('Pilot callsign').fill('Mission177Host');await host.getByRole('button',{name:'CO-OP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.getByLabel('Select theater').selectOption('7734');await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'Mission177Host');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:5000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.delete('overhaul');await bound273.goto(guest,url.toString());await enablePublicPreview(guest);await guest.getByLabel('Pilot callsign').fill('Mission177Guest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'Mission177Guest');await sample('two client staging');await host.waitForTimeout(400);await sample('staging rest');
 await shortOrdinary273({page:host,name:'Mission177Host',motion:motion177,planning:planningRead177,read,guard,evidence,output});
 await sample('both pilots retain selected quadruped travel stance');
 // Follow the open west lane through the gantry. The actual climb portal is
 // solid in the east lane; both pilots follow in single file through the gap.
 currentPhase='west-relay-route';await squadGo({x:-8,z:12});await squadStageObjective('relay-west');await sample('current-clear west objective staging');
 await holdObjective('relay-west');await sample('west relay interaction');
 await host.screenshot({path:resolve(output,'route-west.png')});await guest.screenshot({path:resolve(output,'guest-route-west.png')});
 evidence.checkpoint=evidence.events.at(-1).host.snapshot.checkpoint;
 if(evidence.checkpoint?.objectiveId!=='relay-west')throw Error('West relay checkpoint not captured through normal interaction');
 
 await exposeSquad('down-revive');await exposeSquad('checkpoint-retry');
 currentPhase='east-relay-route';await squadStageObjective('relay-east');await sample('current-clear east objective staging');
 await holdObjective('relay-east');await sample('east relay interaction');
 await host.screenshot({path:resolve(output,'route-east.png')});await guest.screenshot({path:resolve(output,'guest-route-east.png')});
 currentPhase='core-route';await squadStageObjective('core');await sample('current-clear core objective staging');
 await holdObjective('core');await sample('core interaction');
 await host.screenshot({path:resolve(output,'route-core.png')});await guest.screenshot({path:resolve(output,'guest-route-core.png')});
 currentPhase='extraction-return-route';await squadStageObjective('extraction');
 await holdObjective('extraction');await sample('extraction');const complete=()=>['relay-west','relay-east','core','extraction'];let joinedFinal;const until=Date.now()+3000;while(Date.now()<until){guard();joinedFinal=await read(guest);if(joinedFinal.snapshot.phase==='extracted')break;await guest.waitForTimeout(80);}const hostFinal=await read(host);evidence.completion={host:{phase:hostFinal.snapshot.phase,coop:hostFinal.snapshot.coop,checkpoint:hostFinal.snapshot.checkpoint,objectives:hostFinal.snapshot.objectives},guest:{phase:joinedFinal.snapshot.phase,coop:joinedFinal.snapshot.coop,checkpoint:joinedFinal.snapshot.checkpoint,objectives:joinedFinal.snapshot.objectives},organicRevives:successfulRevives,rescueAttempts:rescues,reviveObservation:successfulRevives?'ORGANIC_REVIVE_OBSERVED':'REVIVE_UNTESTED',nativeCommittedPublicationComparisons:evidence.native.parity.length};
 if([hostFinal,joinedFinal].some(r=>r.snapshot.actors.filter(a=>!a.bot).some(a=>a.hp<=0||Math.hypot(a.position.x+8,a.position.y-1,a.position.z-12)>=4.5)||r.snapshot.mode!=='coop'||r.snapshot.phase!=='extracted'||!r.snapshot.winner||r.snapshot.actors.filter(a=>!a.bot).length!==2||complete().some(id=>!r.snapshot.objectives.find(o=>o.id===id)?.complete))||evidence.native.parity.length<3)throw Error('Full required two-client mission completion/parity not observed');if(!successfulRevives||!evidence.lifecycle.organicDowns.length||!evidence.lifecycle.revives.length)throw Error('Full mission unqualified: organic down/public revive not observed');evidence.retryQualification=evidence.lifecycle.checkpointRetries.length?'NATIVE_CHECKPOINT_RETRY_OBSERVED':'CHECKPOINT_RETRY_UNQUALIFIED_FIRST_FAILURE_STOP';if(!evidence.actualCheckpointRetry||!evidence.lifecycle.checkpointRetries.length)throw Error('Full finite lifecycle unqualified: actual planned checkpoint retry not observed');evidence.lateJoinQualification='INCOMPLETE_NOT_OBSERVED';evidence.status='TWO_CLIENT_MISSION_PHASES_COMPLETE_FULL_COOP_UNQUALIFIED_LATE_JOIN';currentPhase='required-mission-complete';
 await host.screenshot({path:resolve(output,'route-extraction.png')});await guest.screenshot({path:resolve(output,'guest-route-extraction.png')});
}catch(error){
 evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);
 evidence.failureKind=String(error).includes('138420s')?'FINITE_WORK_BOUND_INCOMPLETE':String(error).includes('Explicit138')?'DECLARED_EVIDENCE_BOUND_INCOMPLETE':'ACTUAL_PUBLIC_OUTCOME_FAILURE';
 evidence.unfinishedPhase=currentPhase;process.exitCode=1;
 // Partial setup may have zero, one or two pages. Every observation is optional
 // and bounded; a failed diagnostic must never prevent owned finalization.
 evidence.partialFailureObservations=[];
 await Promise.allSettled([[host,'host'],[guest,'guest']].filter(([p])=>p).map(async([p,label])=>{
  for(const [kind,action] of [['release',()=>release(p)],['read',()=>read(p)],['screenshot',()=>p.screenshot({path:resolve(output,label==='host'?'failure.png':'failure-guest.png')})]]){
   try{const receipt=await bounded138(action,Math.min(1000,Math.max(1,start+inclusiveMs273-Date.now())),'failure-'+label+'-'+kind);if(kind==='read')evidence.partialFailureObservations.push({page:label,receipt});}
   catch(failure){evidence.partialFailureObservations.push({page:label,kind,error:String(failure)});}
  }
 }));
}finally{
 evidence.endUTC=new Date().toISOString();evidence.elapsedMs=Date.now()-start;
 const cleanupDeadline=Math.min(start+inclusiveMs273,Date.now()+30000);
 evidence.cleanup=[];
 // Each independently owned pilot has its own close chain. A release, video or
 // context failure is recorded and the browser close is still attempted.
 await Promise.allSettled([[host,hc,hostBrowser,'host'],[guest,gc,guestBrowser,'guest']].map(async([p,context,browser,label])=>{
  const actions=[];
  if(p){actions.push(['release',()=>release(p),1000]);actions.push(['video-path',async()=>{const video=p.video();if(video)evidence[label+'Video']=await video.path();},1000]);}
  if(context)actions.push(['context-close',()=>context.close(),12000]);
  if(browser)actions.push(['browser-close',()=>browser.close(),30000]);
  for(const [kind,action,cap] of actions){
   const began=Date.now(),remaining=cleanupDeadline-began;
   // Invocation itself is retained even at an exhausted deadline, so another
   // resource's timeout cannot skip an available browser retirement attempt.
   try{await bounded138(action,Math.max(1,Math.min(cap,remaining)),label+'-'+kind);evidence.cleanup.push({page:label,kind,status:'CLOSED_OR_COMPLETED',elapsedMs:Date.now()-began});}
   catch(error){evidence.cleanup.push({page:label,kind,status:'FAILED_OR_TIMED_OUT',elapsedMs:Date.now()-began,error:String(error)});}
  }
 }));
 if(evidence.cleanup.some(r=>r.status==='FAILED_OR_TIMED_OUT')){evidence.cleanupFailure='Independent owned cleanup action failed or timed out; see exact rows';process.exitCode=1;}
 evidence.network273=bound273.network;evidence.optional273={roof:'UNTESTED',climb:'UNTESTED',paired:'UNTESTED',destruction:'UNTESTED_UNLESS_ACTUAL_NATIVE_HISTORY_SHOWS_IT',lateJoin:'UNTESTED'};const modes=evidence.nativeModes273??[];evidence.actionReturn273={completeModeObserved:modes.some(r=>r.native?.registry?.rows?.some(x=>['down','death','reaction','pair','strike','landing'].includes(x.diagnostic?.mode))),returnOrdinaryObserved:modes.some((r,i)=>r.actor?.hp>0&&r.native?.registry?.rows?.some(x=>x.diagnostic?.mode==='ordinary')&&modes.slice(0,i).some(old=>old.native?.registry?.rows?.some(x=>['down','death','reaction','pair','strike','landing'].includes(x.diagnostic?.mode)))),qualification:'ACTUAL_SOURCE_MODES_REQUIRE_INDEPENDENT_TEMPORAL_PIXELS_REVIEW'};evidence.protectedAfter273=await bound273.verify();
 evidence.resourceInventory={hostBrowserAllocated:!!hostBrowser,guestBrowserAllocated:!!guestBrowser,hostContextAllocated:!!hc,guestContextAllocated:!!gc,hostPageAllocated:!!host,guestPageAllocated:!!guest,hostBrowserConnected:hostBrowser?.isConnected()??false,guestBrowserConnected:guestBrowser?.isConnected()??false};
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;
 await persist('evidence.json');console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors,cleanupFailure:evidence.cleanupFailure}));
}
async function bounded138(action,ms,label){let timer;try{return await Promise.race([Promise.resolve().then(action),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' finite '+ms+'ms bound')),ms);})]);}finally{clearTimeout(timer);}}








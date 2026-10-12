import {readyForOrdinaryPlay as originalReady} from '../overhaul-play-ready.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const buildReceipt=process.env.KITTYMECH_BUILD_RECEIPT;if(!buildReceipt||!/^[a-f0-9]{64}$/i.test(buildReceipt))throw Error('053 requires the exact frozen build037 receipt SHA256 in KITTYMECH_BUILD_RECEIPT');
const start=Date.now(),origin='http://localhost:8799',output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261010/loading054-public');await mkdir(output,{recursive:false});
const launch={channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
let hostBrowser,guestBrowser,hc,gc,host,guest;
let traceStopped=false,traceFailure=null,traceLoop=null,evidence=null;const traces={host:{network:[],samples:[],metrics:[]},guest:{network:[],samples:[],metrics:[]}},sessions={},profileActive={};
let closeFailed=false;
try{
 hostBrowser=await chromium.launch(launch);guestBrowser=await chromium.launch(launch);
const captureMode='both';
const viewport={width:1440,height:900},recordVideo={dir:output,size:{width:960,height:600}};
hc=await hostBrowser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})});gc=await guestBrowser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})});host=await hc.newPage();guest=await gc.newPage();
let currentPhase='two-client-staging';
evidence={startUTC:new Date(start).toISOString(),status:'RUNNING',buildReceipt,scope:'054 ONE instrumented startup diagnosis on unchanged037. Same053 host/guest UI, browsers, viewport, public preview and20s readiness. Stop before mission navigation. Browser Network/Performance/CPU sampling and resource/longtask/frame-gap observers may affect timing; NOT performance qualification or proof of the prior failure cause. No simulation or renderer mutation.',capture:{mode:captureMode,separateBrowserProcesses:true,viewport,hostVideoSize:recordVideo.size,guestVideoSize:recordVideo.size},events:[],errors:[],settledApproaches:[],native:{selector:'sharedWorld053 explicit server snapshot fields; recursive sorted-key canonical JSON SHA256, compared only at exact server room+publication epoch+sequence; matching tick is also required. Full host keyframes about0.5Hz and either-client semantic changes; every observed frame retains hash. No interpolated cross-time parity.',frames:{host:[],guest:[]},keyframes:[],parity:[],maxFramesPerPage:9000,keyframeBudgetBytes:18000000,keyframeBytes:0}};
const guard=()=>{if(Date.now()-start>100000)throw Error('054100s work bound; reserve30s final close inside130s');if(evidence.errors.length)throw Error(evidence.errors[0]);if(parallelFailure)throw parallelFailure;if(traceFailure)throw traceFailure;};
const ready=async(p,name)=>{guard();let timer;try{await Promise.race([originalReady(p,name),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bounded ordinary readiness missing '+name)),Math.min(20000,100000-(Date.now()-start)));})]);}finally{clearTimeout(timer);}guard();};
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
const read=async p=>p.evaluate(async()=>{const raw=await window.kittyMechDebug.input?.(),input=raw?{seq:raw.seq,input:raw.input,keys:raw.keys,look:raw.look,native:raw.native,lastSent:raw.lastSent,browser:raw.browser}:null;return {snapshot:window.kittyMechDebug.snapshot(),transport:window.kittyMechDebug.transport?.(),input,camera:window.kittyMechDebug.camera(),performance:window.kittyMechDebug.performance(),visibility:document.visibilityState};});
const pilotRead=async(p,name,id)=>{guard();const value=await p.evaluate(({name,id})=>{const s=window.kittyMechDebug.snapshot(),actor=s.actors.find(a=>a.name===name),sight=e=>({...e,visible:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+.65},{...e.position,y:e.position.y+.65})===true,fireClear:window.kittyMechDebug.sight?.({...actor.position,y:actor.position.y+(actor.stance==='upright'?1.65:.65)},{...e.position,y:e.position.y+.65})===true});return {time:s.time,transport:window.kittyMechDebug.transport?.(),actor,humans:s.actors.filter(a=>!a.bot),enemy:id&&s.actors.find(a=>a.id===id)?sight(s.actors.find(a=>a.id===id)):undefined,enemies:id?undefined:s.actors.filter(a=>a.bot&&a.hp>0).map(sight),camera:window.kittyMechDebug.camera()};},{name,id});if(value.transport?.connection==='Disconnected'||value.transport?.error){(evidence.transportFailures??=[]).push({name,wall:Date.now(),...value.transport});throw Error('Arena transport stopped: '+(value.transport.error??JSON.stringify(value.transport.receipt?.close)));}return value;};
const sample=async(label,{check=true}={})=>{if(check)guard();const at=Date.now(),[hostState,guestState]=await Promise.all([read(host),read(guest)]);let authority;try{const h=await(await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)})).json(),d=h.diagnostics,r=d?.rooms.find(r=>r.room===hostState.snapshot.room);authority={wall:d?.wall,status:h.status,rooms:h.rooms,players:h.players,clippedMs:d?.clippedMs,room:r?{room:r.room,counts:r.counts,totalMs:r.totalMs,maxMs:r.maxMs,latest:r.latest}:null};}catch(error){authority={error:String(error)};}evidence.events.push({label,phase:currentPhase,at,authority,host:hostState,guest:guestState});await persist('progress.json');console.log(label);};

const parallelFailure=null;const release=async()=>{};
// Read-only browser instrumentation: no loader, scheduler, WebGL, React or game patches.

function append(list,row,cap){if(list.length>=cap){traceFailure??=Error('054 explicit trace row cap');return;}list.push(row);}
for(const [page,label] of [[host,'host'],[guest,'guest']]){
 await page.addInitScript(()=>{
  const data={resources:[],longtasks:[],frameGaps:[],frames:0,lastFrame:null,dropped:0,unsupported:[]};
  window.__kittyStartup054=data;
  const put=(list,row,cap)=>{if(list.length<cap)list.push(row);else data.dropped++;};
  for(const type of ['resource','longtask'])try{new PerformanceObserver(list=>{for(const e of list.getEntries()){
   if(type==='resource')put(data.resources,{name:e.name,start:e.startTime,duration:e.duration,responseEnd:e.responseEnd,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize,initiatorType:e.initiatorType},2000);
   else put(data.longtasks,{start:e.startTime,duration:e.duration},1000);
  }}).observe({type,buffered:true});}catch{data.unsupported.push(type);}
  const frame=t=>{if(data.lastFrame!==null&&t-data.lastFrame>50)put(data.frameGaps,{start:data.lastFrame,duration:t-data.lastFrame},1000);data.lastFrame=t;data.frames++;requestAnimationFrame(frame);};requestAnimationFrame(frame);
 });
 const c=await page.context().newCDPSession(page);sessions[label]=c;
 await c.send('Network.enable');await c.send('Performance.enable');await c.send('Profiler.enable');await c.send('Profiler.setSamplingInterval',{interval:1000});await c.send('Profiler.start');profileActive[label]=true;
 for(const event of ['requestWillBeSent','responseReceived','loadingFinished','loadingFailed'])c.on('Network.'+event,e=>{
  append(traces[label].network,{event,at:Date.now()-start,requestId:e.requestId,timestamp:e.timestamp,type:e.type,url:e.request?.url??e.response?.url,status:e.response?.status,mime:e.response?.mimeType,fromDiskCache:e.response?.fromDiskCache,fromServiceWorker:e.response?.fromServiceWorker,encodedDataLength:e.encodedDataLength,errorText:e.errorText,timing:e.response?.timing},4000);
 });
 traces[label].metrics.push({at:Date.now()-start,kind:'before-navigation',...(await c.send('Performance.getMetrics'))});
}
traceLoop=(async()=>{while(!traceStopped){
 for(const [page,label] of [[host,'host'],[guest,'guest']]){
  if(traceStopped)break;
  try{const value=await page.evaluate(()=>{const d=window.kittyMechDebug,s=d?.snapshot?.(),owner=window.kittyIdentity57Runtime005?.read?.();return {timeOrigin:performance.timeOrigin,now:performance.now(),overlay:document.querySelector('.loading-overlay')?.textContent??null,camera:d?.camera?.(),performance:d?.performance?.(),visibility:document.visibilityState,publication:s?.publication,actors:s?.actors?.filter(a=>!a.bot).map(a=>({id:a.id,name:a.name,chassis:a.chassis,hp:a.hp})),owners:owner?.diagnostics?.map(o=>({actor:o.actor,frameClock:o.frameClock,nativeTick:o.nativeTick,mode:o.mode,firstFailure:o.firstFailure,missingBones:o.missingBones,missingClips:o.missingClips,lastOwnerMs:o.lastOwnerMs,maxOwnerMs:o.maxOwnerMs})),observer:window.__kittyStartup054?{frames:window.__kittyStartup054.frames,lastFrame:window.__kittyStartup054.lastFrame,dropped:window.__kittyStartup054.dropped}:null};});append(traces[label].samples,{at:Date.now()-start,...value},200);}catch(error){append(traces[label].samples,{at:Date.now()-start,readError:String(error)},200);}
 }
 await new Promise(resolve=>setTimeout(resolve,500));
}})();
async function saveTrace(){
 const text=JSON.stringify(traces);if(Buffer.byteLength(text)>10000000){
  await writeFile(resolve(output,'trace-overflow.json'),JSON.stringify({bytes:Buffer.byteLength(text),status:'INCOMPLETE_TRACE_SIZE_CAP'}));throw Error('054 trace10MB cap');
 }
 await writeFile(resolve(output,'startup-trace.json'),text);
}
async function finishTrace(){traceStopped=true;if(traceLoop)await traceLoop;
 // Persist node-side network/milestones before any fallible CDP finalization.
 await saveTrace();let failure=traceFailure;
 for(const [page,label] of [[host,'host'],[guest,'guest']]){
  traces[label].observer=await page.evaluate(()=>window.__kittyStartup054??null).catch(error=>({readError:String(error)}));
  if(traces[label].observer?.readError||traces[label].observer?.dropped)failure??=Error('054 partial/dropped observer evidence');
  await saveTrace();
  try{traces[label].metrics.push({at:Date.now()-start,kind:'after-startup',...(await sessions[label].send('Performance.getMetrics'))});}
  catch(error){traces[label].metricsError=String(error);failure??=error;}
  try{if(profileActive[label]){const {profile}=await sessions[label].send('Profiler.stop');profileActive[label]=false;const text=JSON.stringify(profile);if(Buffer.byteLength(text)>20000000){traces[label].profileError={status:'OVERSIZED_NOT_STORED',bytes:Buffer.byteLength(text)};failure??=Error('054 CPU profile20MB cap');}else{await writeFile(resolve(output,label+'-startup.cpuprofile'),text);traces[label].cpuProfile=label+'-startup.cpuprofile';}}}
  catch(error){traces[label].profileError=String(error);failure??=error;}
  await saveTrace();
 }
 if(failure)throw failure;
}

const enablePublicPreview=async p=>{await p.getByRole('button',{name:'Open settings',exact:true}).click();await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await p.getByRole('button',{name:'Close settings',exact:true}).click();};
try{
 guard();await host.goto(origin+'/?debug=1&overhaul=1');await enablePublicPreview(host);await host.getByLabel('Pilot callsign').fill('MissionHost');await host.getByRole('button',{name:'CO-OP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();await ready(host,'MissionHost');
 await host.getByRole('button',{name:'COPY INVITE ↗',exact:true}).waitFor({state:'visible',timeout:5000});await host.waitForTimeout(150);await host.keyboard.up('Tab');await host.keyboard.down('Tab');const url=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');url.searchParams.set('debug','1');url.searchParams.set('overhaul','1');await guest.goto(url.toString());await enablePublicPreview(guest);await guest.getByLabel('Pilot callsign').fill('MissionGuest');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();await ready(guest,'MissionGuest');await sample('two client staging');await host.waitForTimeout(400);await sample('staging rest');
 await host.screenshot({path:resolve(output,'ready-host.png')});await guest.screenshot({path:resolve(output,'ready-guest.png')});evidence.status='STARTUP_ONLY_READY_NOT_MISSION_APPROVAL';
}catch(error){evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);evidence.failureKind=String(error).includes('054100s')?'FINITE_WORK_BOUND_INCOMPLETE':String(error).includes('Explicit053')?'DECLARED_EVIDENCE_BOUND_INCOMPLETE':'ACTUAL_PUBLIC_OUTCOME_FAILURE';evidence.unfinishedPhase=currentPhase;process.exitCode=1;await sample('first genuine failure',{check:false}).catch(()=>{});await host.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});await guest.screenshot({path:resolve(output,'failure-guest.png')}).catch(()=>{});}
finally{evidence.endUTC=new Date().toISOString();evidence.elapsedMs=Date.now()-start;let timer;
 const closing=(async()=>{try{await finishTrace();}catch(error){evidence.traceFailure=String(error);evidence.status='INCOMPLETE_TRACE_FINALIZATION';process.exitCode=1;}await Promise.all([release(host),release(guest)]);evidence.hostVideo=host.video()?await host.video().path():null;evidence.guestVideo=guest.video()?await guest.video().path():null;await Promise.all([gc.close(),hc.close()]);await Promise.all([hostBrowser.close(),guestBrowser.close()]);})();
 try{await Promise.race([closing,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('054 cleanup30s/inclusive130s bound')),Math.max(1,Math.min(30000,130000-(Date.now()-start))));})]);}
 catch(error){evidence.cleanupFailure=String(error);evidence.status='CLEANUP_BOUND_FAILURE';process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;await persist('evidence.json');console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors,cleanupFailure:evidence.cleanupFailure}));}





}catch(error){
 process.exitCode=1;traceStopped=true;
 const failure={status:'INCOMPLETE_SETUP_OR_OUTER_FAILURE',failure:String(error),at:Date.now()-start,firstPublicFailure:evidence?.failure??null};
 await writeFile(resolve(output,'setup-failure.json'),JSON.stringify(failure));
 const text=JSON.stringify(traces);if(Buffer.byteLength(text)<=10000000)await writeFile(resolve(output,'startup-trace-partial.json'),text);
 else await writeFile(resolve(output,'trace-overflow.json'),JSON.stringify({status:'INCOMPLETE_TRACE_SIZE_CAP',bytes:Buffer.byteLength(text)}));
}finally{
 traceStopped=true;
 const retirement=(async()=>{
  for(const [label,c] of Object.entries(sessions))if(profileActive[label])try{const {profile}=await c.send('Profiler.stop');profileActive[label]=false;const text=JSON.stringify(profile);if(Buffer.byteLength(text)<=20000000)await writeFile(resolve(output,label+'-partial.cpuprofile'),text);}catch{}
  for(const handle of [gc,hc,guestBrowser,hostBrowser])if(handle)try{await handle.close();}catch(error){closeFailed=true;await writeFile(resolve(output,'retirement-error.json'),JSON.stringify({error:String(error)}));}
 })();let timer;
 try{await Promise.race([retirement,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('054 outer cleanup inside130s boundary')),Math.max(1,Math.min(30000,130000-(Date.now()-start))));})]);}
 catch(error){closeFailed=true;await writeFile(resolve(output,'retirement-error.json'),JSON.stringify({error:String(error)}));}
 finally{clearTimeout(timer);}
 if(closeFailed)process.exitCode=1;
}

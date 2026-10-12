from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
base=r/'tools/overhaul-coop-play-053/mission-capture.mjs'
assert hashlib.sha256(base.read_bytes()).hexdigest()=='9086be81576fa02213d4ed2bd954704c09fbbcfd6c67f240bc3c72fca08c7229'
s=base.read_text(encoding='utf8')
s=s.replace("import {pilotAim,pilotGunAligned,pilotLatency} from '../overhaul-pilot-aim.ts';\n",'').replace("import {squadThreats} from '../overhaul-squad-policy.ts';\n",'')
s=s.replace("String(error).includes('053420s')","String(error).includes('054100s')")
start=s.index('const release=async p=>')
end=s.index('const enablePublicPreview=')
s=s[:start]+"const parallelFailure=null;const release=async()=>{};\n"+s[end:]
start=s.index(" await sample('both pilots retain")
end=s.index('}catch(error){evidence.status=',start)
s=s[:start]+" evidence.status='STARTUP_ONLY_READY_NOT_MISSION_APPROVAL';\n"+s[end:]
s=s.replace('420000','100000').replace('450000','130000')
s=s.replace('053420s work bound; reserve30s final close inside450s','054100s work bound; reserve30s final close inside130s')
s=s.replace('053 cleanup30s/inclusive450s bound','054 cleanup30s/inclusive130s bound')
s=s.replace("scope:'ONE ordinary two-client CO-OP mission through both relays, core and extraction. Public UI/keys and read-only diagnostics; no injected actors/HP/damage/warp/objectives. First genuine failure stops the capture. Optional roof objectives are not required mission phases.'", "scope:'054 ONE instrumented startup diagnosis on unchanged037. Same053 host/guest UI, browsers, viewport, public preview and20s readiness. Stop before mission navigation. Browser Network/Performance/CPU sampling and resource/longtask/frame-gap observers may affect timing; NOT performance qualification or proof of the prior failure cause. No simulation or renderer mutation.'")
s=s.replace("'.sites-runtime/overhaul-20261011/coop053-public'", "'.sites-runtime/overhaul-20261010/loading054-public'")
instrument=r'''// Read-only browser instrumentation: no loader, scheduler, WebGL, React or game patches.
const traces={host:{network:[],samples:[],metrics:[]},guest:{network:[],samples:[],metrics:[]}},sessions={},profileActive={};
let traceStopped=false,traceFailure=null;
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
const traceLoop=(async()=>{while(!traceStopped){
 for(const [page,label] of [[host,'host'],[guest,'guest']]){
  if(traceStopped)break;
  try{const value=await page.evaluate(()=>{const d=window.kittyMechDebug,s=d?.snapshot?.(),owner=window.kittyIdentity57Runtime005?.read?.();return {timeOrigin:performance.timeOrigin,now:performance.now(),overlay:document.querySelector('.loading-overlay')?.textContent??null,camera:d?.camera?.(),performance:d?.performance?.(),visibility:document.visibilityState,publication:s?.publication,actors:s?.actors?.filter(a=>!a.bot).map(a=>({id:a.id,name:a.name,chassis:a.chassis,hp:a.hp})),owners:owner?.diagnostics?.map(o=>({actor:o.actor,frameClock:o.frameClock,nativeTick:o.nativeTick,mode:o.mode,firstFailure:o.firstFailure,missingBones:o.missingBones,missingClips:o.missingClips,lastOwnerMs:o.lastOwnerMs,maxOwnerMs:o.maxOwnerMs})),observer:window.__kittyStartup054?{frames:window.__kittyStartup054.frames,lastFrame:window.__kittyStartup054.lastFrame,dropped:window.__kittyStartup054.dropped}:null};});append(traces[label].samples,{at:Date.now()-start,...value},200);}catch(error){append(traces[label].samples,{at:Date.now()-start,readError:String(error)},200);}
 }
 await new Promise(resolve=>setTimeout(resolve,500));
}})();
async function finishTrace(){traceStopped=true;await traceLoop;
 for(const [page,label] of [[host,'host'],[guest,'guest']]){
  traces[label].observer=await page.evaluate(()=>window.__kittyStartup054??null).catch(error=>({readError:String(error)}));
  traces[label].metrics.push({at:Date.now()-start,kind:'after-startup',...(await sessions[label].send('Performance.getMetrics'))});
  if(profileActive[label]){const {profile}=await sessions[label].send('Profiler.stop');profileActive[label]=false;const text=JSON.stringify(profile);if(Buffer.byteLength(text)>20000000)throw Error('054 CPU profile20MB cap');await writeFile(resolve(output,label+'-startup.cpuprofile'),text);traces[label].cpuProfile=label+'-startup.cpuprofile';}
 }
 const text=JSON.stringify(traces);if(Buffer.byteLength(text)>10000000)throw Error('054 trace10MB cap');await writeFile(resolve(output,'startup-trace.json'),text);
 if(traceFailure||Object.values(traces).some(t=>t.observer?.dropped))throw traceFailure??Error('054 observer rows dropped; evidence incomplete');
}
'''
s=s.replace('const enablePublicPreview=',instrument+'\nconst enablePublicPreview=')
s=s.replace("const closing=(async()=>{await Promise.all([release(host),release(guest)]);", "const closing=(async()=>{try{await finishTrace();}catch(error){evidence.traceFailure=String(error);process.exitCode=1;}await Promise.all([release(host),release(guest)]);")
# Capture each own view on startup success as well as failure.
s=s.replace("evidence.status='STARTUP_ONLY_READY_NOT_MISSION_APPROVAL';", "await host.screenshot({path:resolve(output,'ready-host.png')});await guest.screenshot({path:resolve(output,'ready-guest.png')});evidence.status='STARTUP_ONLY_READY_NOT_MISSION_APPROVAL';")
out=r/'tools/overhaul-loading-054/startup-capture.mjs'
assert not out.exists()
out.write_text(s,encoding='utf8')
print(json.dumps({'path':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))

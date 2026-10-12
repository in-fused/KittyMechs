from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];p=r/'tools/overhaul-loading-054/startup-capture.mjs'
s=p.read_text(encoding='utf8');assert hashlib.sha256(p.read_bytes()).hexdigest()=='89685b9bbdca6838e6b427d85909cf06d78cf62fc02ab955c3e039eeb58ce56d'
s=s.replace("const hostBrowser=await chromium.launch(launch),guestBrowser=await chromium.launch(launch);", "let hostBrowser,guestBrowser,hc,gc,host,guest;\nlet traceStopped=false,traceFailure=null,traceLoop=null,evidence=null;const traces={host:{network:[],samples:[],metrics:[]},guest:{network:[],samples:[],metrics:[]}},sessions={},profileActive={};\nlet closeFailed=false;\ntry{\n hostBrowser=await chromium.launch(launch);guestBrowser=await chromium.launch(launch);")
s=s.replace("const hc=await hostBrowser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await guestBrowser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();", "hc=await hostBrowser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})});gc=await guestBrowser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})});host=await hc.newPage();guest=await gc.newPage();")
s=s.replace('const evidence={','evidence={')
s=s.replace('if(parallelFailure)throw parallelFailure;','if(parallelFailure)throw parallelFailure;if(traceFailure)throw traceFailure;')
s=s.replace("const traces={host:{network:[],samples:[],metrics:[]},guest:{network:[],samples:[],metrics:[]}},sessions={},profileActive={};\nlet traceStopped=false,traceFailure=null;",'')
s=s.replace('const traceLoop=(async()=>','traceLoop=(async()=>')
a=s.index('async function finishTrace(){');b=s.index('\nconst enablePublicPreview=',a)
s=s[:a]+r'''async function saveTrace(){
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
''' +s[b:]
s=s.replace("evidence.traceFailure=String(error);process.exitCode=1;", "evidence.traceFailure=String(error);evidence.status='INCOMPLETE_TRACE_FINALIZATION';process.exitCode=1;")
# Outer boundary owns successfully created handles even if setup rejects before
# the ordinary capture try/finally. Existing inner normal cleanup remains intact.
s+=r'''
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
'''
out=r/'tools/overhaul-loading-054/startup-capture-b.mjs';assert not out.exists();out.write_text(s,encoding='utf8')
print(json.dumps({'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))

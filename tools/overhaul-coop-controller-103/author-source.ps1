$base='tools/overhaul-coop-controller-103'
$c=(Get-Content tools/overhaul-coop-controller-101/controller.mjs -Raw).Replace('createMissionController101','createMissionController103').Replace('Explicit101','Explicit103')
[IO.File]::WriteAllText((Join-Path (Get-Location) "$base/controller.mjs"),$c)
$m=(Get-Content tools/overhaul-coop-controller-101/mission-capture.mjs -Raw).Replace('101','103')
$m=$m.Replace('const hostBrowser=await chromium.launch(launch),guestBrowser=await chromium.launch(launch);','let hostBrowser=null,guestBrowser=null,hc=null,gc=null,host=null,guest=null;')
$m=$m.Replace("const hc=await hostBrowser.newContext({viewport,...(captureMode!=='none'?{recordVideo}:{})}),gc=await guestBrowser.newContext({viewport,...(captureMode==='both'?{recordVideo}:{})}),host=await hc.newPage(),guest=await gc.newPage();", "// Every browser/context/page allocation is owned by the final try/finally below.")
$m=$m.Replace("for(const [p,label] of [[host,'host'],[guest,'guest']]){p.setDefaultTimeout(5000);",'const observeNative=(p,label)=>{p.setDefaultTimeout(5000);')
$m=$m.Replace("}catch(error){evidence.errors.push(label+' native history: '+String(error));}}));}","}catch(error){evidence.errors.push(label+' native history: '+String(error));}}));};")
$m=$m.Replace("const pilots=[{page:host,name:'MissionHost'},{page:guest,name:'MissionGuest'}];",'let pilots=[];')
$m=$m.Replace("const release=async p=>{await Promise.all(","const release=async p=>{if(!p)return;await Promise.all(")
$old=@"
   // Establish a fresh ACKed release before public rising E.
   await host.keyboard.up('KeyE');const mark=await inputRead(host,'MissionHost');let neutral,neutralAck=false;
   const releaseUntil=Date.now()+1500;
   while(Date.now()<releaseUntil){guard();const r=await inputRead(host,'MissionHost');neutral=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&!x.input.interact);if(neutral&&r.actor.lastInput>=neutral.input.seq){neutralAck=true;break;}await host.waitForTimeout(40);}
   if(!neutralAck)throw Error('Planned retry fresh release send/ACK missing');
"@
$new=@"
   // Failed actors do not advance lastInput: this is a browser successful-send
   // release observation, explicitly NOT a native movement ACK. The actual
   // attempt+1/checkpoint/roster transition below proves retry consumed an edge.
   await host.keyboard.up('KeyE');const mark=await inputRead(host,'MissionHost');let neutral,releaseObservation;
   const releaseUntil=Date.now()+1500;
   while(Date.now()<releaseUntil){guard();const r=await inputRead(host,'MissionHost');neutral=r.sent.find(x=>x.at>=mark.at&&x.input.seq>mark.seq&&!x.input.interact);
    if(neutral&&r.input.interact===false&&!r.keys.includes('KeyE')){releaseObservation={contract:'CLIENT_SEND_NOT_NATIVE_ACK',packet:neutral,currentInteract:r.input.interact,keys:r.keys,at:r.at,tick:r.tick,time:r.time,actorLastInputFrozen:r.actor.lastInput};break;}await host.waitForTimeout(40);}
   if(!releaseObservation)throw Error('Planned retry fresh public release send/current-held-false missing');
"@
# Existing file CRLF normalized only within replacement matching.
$m=$m.Replace("`r`n","`n")
$old=$old.Replace("`r`n","`n");$new=$new.Replace("`r`n","`n")
if(!$m.Contains($old)){throw 'Retry source preimage missing'}
$m=$m.Replace($old,$new)
$m=$m.Replace('actors:restored.actors.filter(a=>!a.bot),neutral};','actors:restored.actors.filter(a=>!a.bot),releaseObservation};')
$startNeedle="try{`n guard();await host.goto"
$allocated=@"
try{
 currentPhase='owned-browser-startup';guard();
 hostBrowser=await chromium.launch(launch);guard();
 guestBrowser=await chromium.launch(launch);guard();
 hc=await hostBrowser.newContext({viewport,recordVideo});guard();
 gc=await guestBrowser.newContext({viewport,recordVideo});guard();
 host=await hc.newPage();observeNative(host,'host');guard();
 guest=await gc.newPage();observeNative(guest,'guest');guard();
 pilots=[{page:host,name:'MissionHost'},{page:guest,name:'MissionGuest'}];
 currentPhase='two-client-staging';
 guard();await host.goto
"@
$allocated=$allocated.Replace("`r`n","`n")
if(!$m.Contains($startNeedle)){throw 'Main try preimage missing'}
$m=$m.Replace($startNeedle,$allocated)
$tail=$m.IndexOf("}catch(error){evidence.status='FIRST_GENUINE_FAILURE_STOP'")
if($tail -lt 0){throw 'Failure tail preimage missing'}
$closing=@"
}catch(error){
 evidence.status='FIRST_GENUINE_FAILURE_STOP';evidence.failure=error.stack??String(error);
 evidence.failureKind=String(error).includes('103420s')?'FINITE_WORK_BOUND_INCOMPLETE':String(error).includes('Explicit103')?'DECLARED_EVIDENCE_BOUND_INCOMPLETE':'ACTUAL_PUBLIC_OUTCOME_FAILURE';
 evidence.unfinishedPhase=currentPhase;process.exitCode=1;
 // Partial setup may have zero, one or two pages. Every observation is optional
 // and bounded; a failed diagnostic must never prevent owned finalization.
 evidence.partialFailureObservations=[];
 await Promise.allSettled([[host,'host'],[guest,'guest']].filter(([p])=>p).map(async([p,label])=>{
  for(const [kind,action] of [['release',()=>release(p)],['read',()=>read(p)],['screenshot',()=>p.screenshot({path:resolve(output,label==='host'?'failure.png':'failure-guest.png')})]]){
   try{const receipt=await bounded103(action,Math.min(1000,Math.max(1,start+450000-Date.now())),'failure-'+label+'-'+kind);if(kind==='read')evidence.partialFailureObservations.push({page:label,receipt});}
   catch(failure){evidence.partialFailureObservations.push({page:label,kind,error:String(failure)});}
  }
 }));
}finally{
 evidence.endUTC=new Date().toISOString();evidence.elapsedMs=Date.now()-start;
 const cleanupDeadline=Math.min(start+450000,Date.now()+30000);
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
   try{await bounded103(action,Math.max(1,Math.min(cap,remaining)),label+'-'+kind);evidence.cleanup.push({page:label,kind,status:'CLOSED_OR_COMPLETED',elapsedMs:Date.now()-began});}
   catch(error){evidence.cleanup.push({page:label,kind,status:'FAILED_OR_TIMED_OUT',elapsedMs:Date.now()-began,error:String(error)});}
  }
 }));
 if(evidence.cleanup.some(r=>r.status==='FAILED_OR_TIMED_OUT')){evidence.cleanupFailure='Independent owned cleanup action failed or timed out; see exact rows';process.exitCode=1;}
 evidence.resourceInventory={hostBrowserAllocated:!!hostBrowser,guestBrowserAllocated:!!guestBrowser,hostContextAllocated:!!hc,guestContextAllocated:!!gc,hostPageAllocated:!!host,guestPageAllocated:!!guest,hostBrowserConnected:hostBrowser?.isConnected()??false,guestBrowserConnected:guestBrowser?.isConnected()??false};
 evidence.closedUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;
 await persist('evidence.json');console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,errors:evidence.errors,cleanupFailure:evidence.cleanupFailure}));
}
"@
$m=$m.Substring(0,$tail)+$closing
# Hoisted helper is available to partial failure paths; timers always retired.
$m+="`n"+@"
async function bounded103(action,ms,label){let timer;try{return await Promise.race([Promise.resolve().then(action),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' finite '+ms+'ms bound')),ms);})]);}finally{clearTimeout(timer);}}
"@
[IO.File]::WriteAllText((Join-Path (Get-Location) "$base/mission-capture.mjs"),$m)

import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const receipt=process.env.KITTYMECH_BUILD_RECEIPT;if(!receipt||!/^[a-f0-9]{64}$/i.test(receipt))throw Error('Require exact unchanged036 receipt SHA');
const start=Date.now(),origin='http://localhost:8799',output=resolve(process.argv[2]??'.sites-runtime/overhaul-20261011/guest046-diagnostic');
await mkdir(output,{recursive:false});
const evidence={receipt,startUTC:new Date(start).toISOString(),scope:'ONE guest visual startup diagnosis on unchanged036, not a mission capture or045 retry. Public host/join UI and optional ordinary guest ESC pause/resume. Source cause UNKNOWN until actual guest owner/pixels/resources.',status:'RUNNING',rows:[],resources:[],console:[],errors:[],snapshots:{host:null,guest:null},snapshotCounts:{host:0,guest:0},firstGuestReadinessFailure:null};
let hb,gb,hc,gc,host,guest;
const guard=()=>{if(Date.now()-start>65000)throw Error('046 work65s bound, reserve15s cleanup inside80s');if(evidence.errors.length)throw Error(evidence.errors[0]);};
const flush=()=>writeFile(resolve(output,'evidence.json'),JSON.stringify(evidence));
const watch=(page,label)=>{page.setDefaultTimeout(5000);page.on('pageerror',error=>evidence.errors.push(label+': '+error.message));page.on('console',msg=>{if(evidence.console.length<100)evidence.console.push({page:label,type:msg.type(),text:msg.text()});});page.on('requestfailed',request=>evidence.resources.push({page:label,url:request.url(),failed:request.failure()}));page.on('response',response=>{if(/\.glb(?:\?|$)/i.test(response.url()))evidence.resources.push({page:label,url:response.url(),status:response.status()});});page.on('websocket',ws=>ws.on('framereceived',frame=>{try{const msg=JSON.parse(typeof frame.payload==='string'?frame.payload:frame.payload.toString('utf8'));if(msg.type==='snapshot'){evidence.snapshotCounts[label]++;evidence.snapshots[label]=msg.state;}}catch(error){evidence.errors.push(label+' native observer '+String(error));}}));};
const view=page=>page.evaluate(async()=>{const d=window.kittyMechDebug;if(!d)return {debugMissing:true,visibility:document.visibilityState};const snapshot=d.snapshot(),input=await d.input(),prototype=window.kittyFelinePrototype008?.read?.();return {transport:d.transport(),camera:d.camera(),performance:d.performance(),prototype,input:{mountedAt:input.mountedAt,phase:input.phase,seq:input.seq,keys:input.keys,browser:input.browser},overlay:!!document.querySelector('.loading-overlay'),visibility:document.visibilityState,snapshot:{publication:snapshot?.publication,tick:snapshot?.tick,time:snapshot?.time,room:snapshot?.room,mode:snapshot?.mode,actors:snapshot?.actors.filter(a=>!a.bot).map(a=>({id:a.id,name:a.name,hp:a.hp,stance:a.stance,position:a.position,nativePose:a.nativePose}))}};});
const sample=async label=>{guard();const [h,g]=await Promise.all([view(host),view(guest)]);const row={label,wallMs:Date.now()-start,host:h,guest:g};evidence.rows.push(row);await flush();return row;};
const ordinaryReady=(v,name)=>v.snapshot?.actors?.some(a=>a.name===name)&&v.camera?.preferredDistance>0&&v.camera?.frameClock>0&&v.camera?.visualFrameClock>=0&&v.camera?.visualCorners===8&&v.camera?.fitAvailable===true&&!v.overlay&&v.input?.mountedAt!==null&&v.input?.phase==='playing';
const preview=async p=>{await p.getByRole('button',{name:'Open settings',exact:true}).click();await p.getByRole('checkbox',{name:'Pounce feline prototype',exact:true}).setChecked(true);await p.getByRole('button',{name:'Close settings',exact:true}).click();};
try{
 const launch={channel:'msedge',headless:true,timeout:15000,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
 hb=await chromium.launch(launch);gb=await chromium.launch(launch);hc=await hb.newContext({viewport:{width:1440,height:900}});gc=await gb.newContext({viewport:{width:1440,height:900}});host=await hc.newPage();guest=await gc.newPage();watch(host,'host');watch(guest,'guest');
 await host.goto(origin+'/?debug=1&overhaul=1',{timeout:10000});await preview(host);await host.getByLabel('Pilot callsign').fill('DiagnosticHost046');await host.getByRole('button',{name:'CO-OP',exact:true}).click();await host.getByRole('button',{name:'Select Pounce',exact:true}).click();await host.locator('summary').click();await host.getByRole('button',{name:'Host on arena server',exact:true}).click();
 const hostUntil=Date.now()+20000;let h;
 while(Date.now()<hostUntil){guard();h=await view(host);if(ordinaryReady(h,'DiagnosticHost046'))break;await host.waitForTimeout(250);}
 if(!ordinaryReady(h,'DiagnosticHost046'))throw Error('Host ordinary startup did not qualify');
 await host.locator('canvas').click({position:{x:720,y:450}});await host.keyboard.down('Tab');const invite=new URL(await host.getByLabel('Squad invite').inputValue());await host.keyboard.up('Tab');invite.searchParams.set('debug','1');invite.searchParams.set('overhaul','1');
 await guest.goto(invite.toString(),{timeout:10000});await preview(guest);await guest.getByLabel('Pilot callsign').fill('DiagnosticGuest046');await guest.getByRole('button',{name:'JOIN SQUAD',exact:false}).click();
 const guestBegan=Date.now(),until=guestBegan+20000;let ready=false,last;
 while(Date.now()<until){last=await sample('guest-initial-readiness');if(ordinaryReady(last.guest,'DiagnosticGuest046')){ready=true;break;}await guest.waitForTimeout(1000);}
 await guest.screenshot({path:resolve(output,'guest-initial.png')});await host.screenshot({path:resolve(output,'host-initial.png')});
 if(ready){evidence.status='GUEST_READY_WITHOUT_PROBE_CAUSE_NOT_REPRODUCED';}
 else{
  evidence.firstGuestReadinessFailure={wallMs:Date.now()-start,elapsedSinceGuestJoinMs:Date.now()-guestBegan,reason:'20s actual ordinary readiness missing',row:last};await flush();
  // Preserve the initial failure before this diagnostic-only real UI action.
  // A remote ESC pause does not stop/change server authority or native actors.
  if(last.guest.transport?.phase==='playing'&&last.guest.transport?.connection==='Connected'&&!last.guest.transport?.error){
   await guest.keyboard.press('Escape');await sample('guest-after-public-ESC');await guest.screenshot({path:resolve(output,'guest-paused.png')});
   for(let i=0;i<3;i++){await guest.waitForTimeout(1000);await sample('guest-paused-observation');}
   await guest.keyboard.press('Escape');await sample('guest-after-public-resume');
   for(let i=0;i<3;i++){await guest.waitForTimeout(1000);await sample('guest-resumed-observation');}
   await guest.screenshot({path:resolve(output,'guest-resumed.png')});
  }
  evidence.status='INITIAL_GUEST_READINESS_FAILURE_PRESERVED_PROBE_REVIEW_REQUIRED';
 }
}catch(error){evidence.status='FIRST_DIAGNOSTIC_FAILURE_STOP';evidence.failure=error.stack??String(error);process.exitCode=1;if(guest)await guest.screenshot({path:resolve(output,'failure-guest.png')}).catch(()=>{});}
finally{
 let timer;const close=(async()=>{await Promise.allSettled([gc?.close(),hc?.close()]);await Promise.allSettled([gb?.close(),hb?.close()]);})();
 try{await Promise.race([close,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('04615s cleanup/inclusive80s bound')),Math.max(1,Math.min(15000,80000-(Date.now()-start))));})]);}catch(error){evidence.cleanupFailure=String(error);process.exitCode=1;}finally{clearTimeout(timer);}
 evidence.endUTC=new Date().toISOString();evidence.inclusiveElapsedMs=Date.now()-start;await flush();console.log(JSON.stringify({output,status:evidence.status,failure:evidence.failure,cleanupFailure:evidence.cleanupFailure}));
}

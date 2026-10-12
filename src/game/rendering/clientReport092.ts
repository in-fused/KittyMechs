import type {ClientFrameReport092} from '../../../shared/clientDiagnostics092';
type Identity092=Pick<ClientFrameReport092,'renderer'|'quality'|'prototype'|'phaseAtEnd'|'bufferWidth'|'bufferHeight'>;
export function createClientReport092(){
 const enabled=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&document.querySelector('meta[name="kittymech-client-report"]')?.getAttribute('content')==='local';
 const ua=navigator.userAgent,browser:ClientFrameReport092['browser']=/HeadlessChrome/.test(ua)?'headless-chromium':/Electron/.test(ua)?'electron':/Chrome|Chromium|Edg\//.test(ua)?'chromium':/Firefox/.test(ua)?'firefox':/Safari/.test(ua)?'safari':'unknown';
 return {enabled,instance:enabled?crypto.randomUUID():'',browser,identity:null as Identity092|null,values:new Float64Array(512),count:0,stored:0,elapsed:0,max:0,long:0,previous:0,sequence:0,inFlight:false,controller:null as AbortController|null};
}
type Collector092=ReturnType<typeof createClientReport092>;
/** At most20 reports/Canvas, one per5 visible seconds, one request in flight.
 * Timing is actual callback spacing. Tail p95 covers at most512 samples;
 * full-window mean/max/long counts remain correct if that ring wraps. */
export function sampleClientReport092(s:Collector092,now:number,identity:Identity092){
 if(!s.enabled||s.sequence>=20)return;
 const prior=s.identity;
 if(!prior||identity.phaseAtEnd!==prior.phaseAtEnd||identity.quality!==prior.quality||identity.prototype!==prior.prototype||identity.renderer!==prior.renderer||identity.bufferWidth!==prior.bufferWidth||identity.bufferHeight!==prior.bufferHeight){s.identity={...identity};s.previous=0;s.count=s.stored=s.elapsed=s.max=s.long=0;}
 if(document.visibilityState!=='visible'){s.previous=0;s.count=s.stored=s.elapsed=s.max=s.long=0;return;}
 if(!s.previous){s.previous=now;return;}const ms=now-s.previous;s.previous=now;
 if(!(ms>0&&ms<=120000)){s.count=s.stored=s.elapsed=s.max=s.long=0;return;}
 s.values[s.count%512]=ms;s.count++;s.stored=Math.min(512,s.count);s.elapsed+=ms;s.max=Math.max(s.max,ms);if(ms>50)s.long++;
 if(s.elapsed<5000||s.inFlight||identity.bufferWidth<1||identity.bufferHeight<1)return;
 const sorted=Array.from(s.values.subarray(0,s.stored)).sort((a,b)=>a-b);
 const report:ClientFrameReport092={version:1,instance:s.instance,sequence:++s.sequence,browser:s.browser,...identity,renderer:identity.renderer?.slice(0,256)??null,frames:s.count,tailSamples:s.stored,elapsedMs:s.elapsed,meanMs:s.elapsed/s.count,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:s.max,longFrames:s.long};
 s.count=s.stored=s.elapsed=s.max=s.long=0;s.inFlight=true;const controller=new AbortController();s.controller=controller;
 const timer=setTimeout(()=>controller.abort(),1500);
 void fetch('/client-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report),signal:controller.signal,credentials:'omit',cache:'no-store'}).then(response=>{if(response.status===403||response.status===404)s.enabled=false;}).catch(()=>{}).finally(()=>{clearTimeout(timer);s.inFlight=false;if(s.controller===controller)s.controller=null;});
}
export function closeClientReport092(s:Collector092){s.enabled=false;s.controller?.abort();s.controller=null;}

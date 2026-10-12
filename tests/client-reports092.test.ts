import {describe,it,expect,vi,afterEach} from 'vitest';
import {Readable} from 'node:stream';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createClientReports092,handleClientReports092} from '../server/clientReports092';
import {parseClientFrameReport092} from '../shared/clientDiagnostics092';
import {createClientReport092,sampleClientReport092,closeClientReport092} from '../src/game/rendering/clientReport092';
const report={version:1,instance:'12345678-1234-1234-1234-123456789abc',sequence:1,browser:'headless-chromium',renderer:'NVIDIA GeForce GTX1070Ti',quality:'low',prototype:true,phaseAtEnd:'playing',bufferWidth:1214,bufferHeight:758,frames:300,tailSamples:300,elapsedMs:5000,meanMs:5000/300,p95Ms:20,maxMs:45,longFrames:0};
function request(method='POST',body:unknown=report,origin='http://localhost:8799',address='127.0.0.1'){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]) as IncomingMessage;Object.assign(req,{url:'/client-report',method,headers:{host:'localhost:8799',origin,'content-type':'application/json'},socket:{remoteAddress:address},setTimeout:()=>req});let code=0,text='';
 const res={writeHead:(v:number)=>{code=v;},end:(v:string)=>{text=v;},destroyed:false,get headersSent(){return code!==0;}} as unknown as ServerResponse;
 return {req,res,result:()=>({code,text})};
}
describe('local client evidence admission',()=>{
 afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
 it('rejects remote, disabled and cross-origin admission without storing anything',async()=>{
  const store=createClientReports092();for(const [enabled,origin,address] of [[false,'http://localhost:8799','127.0.0.1'],[true,'https://another-site.example','127.0.0.1'],[true,'http://localhost:8799','192.168.1.5']] as const){const x=request('POST',report,origin,address);await handleClientReports092(x.req,x.res,store,enabled);expect(x.result().code).toBe(403);}expect(store.size).toBe(0);
 });
 it('preserves headless provenance and rejects flood/replayed reports',async()=>{
  const store=createClientReports092(),a=request();await handleClientReports092(a.req,a.res,store,true);expect(a.result().code).toBe(204);expect(store.get(report.instance)?.reports[0].report.browser).toBe('headless-chromium');const b=request();await handleClientReports092(b.req,b.res,store,true);expect(b.result().code).toBe(429);expect(store.get(report.instance)?.reports).toHaveLength(1);
 });
 it('rejects nonfinite/excessive timing and strips arbitrary gameplay fields',()=>{
  expect(parseClientFrameReport092({...report,maxMs:Infinity})).toBeNull();expect(parseClientFrameReport092({...report,tailSamples:513})).toBeNull();expect(parseClientFrameReport092({...report,sequence:21})).toBeNull();expect(parseClientFrameReport092({...report,position:{x:1},inputs:['W'],name:'pilot'})).toEqual(report);
 });
 it('ends a continuously dripping body at the absolute deadline',async()=>{
  vi.useFakeTimers();const x=request(),stream=new Readable({read(){}}) as IncomingMessage;
  Object.assign(stream,{url:x.req.url,method:x.req.method,headers:x.req.headers,socket:x.req.socket});
  const drip=setInterval(()=>stream.push(Buffer.from(' ')),400);
  const pending=handleClientReports092(stream,x.res,createClientReports092(),true);
  try{await vi.advanceTimersByTimeAsync(2100);await pending;expect(x.result().code).toBe(408);expect(stream.destroyed).toBe(true);}finally{clearInterval(drip);stream.destroy();}
 });
 it('resets hidden and phase-changing callback windows before reporting',async()=>{
  const doc={visibilityState:'visible',querySelector:()=>({getAttribute:()=> 'local'})};
  vi.stubGlobal('location',{hostname:'localhost'});vi.stubGlobal('document',doc);vi.stubGlobal('navigator',{userAgent:'HeadlessChrome'});
  const fetcher=vi.fn(async()=>({status:204}));vi.stubGlobal('fetch',fetcher);
  const s=createClientReport092(),identity={renderer:report.renderer,quality:'low' as const,prototype:true,phaseAtEnd:'playing' as const,bufferWidth:1214,bufferHeight:758};
  try{
   for(const t of [1,1001,2001])sampleClientReport092(s,t,identity);
   doc.visibilityState='hidden';sampleClientReport092(s,3001,identity);doc.visibilityState='visible';sampleClientReport092(s,4001,identity);
   sampleClientReport092(s,5001,{...identity,phaseAtEnd:'paused'});
   for(const t of [6001,7001,8001,9001,10001])sampleClientReport092(s,t,{...identity,phaseAtEnd:'paused'});
   expect(fetcher).toHaveBeenCalledTimes(1);const payload=JSON.parse((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
   expect(payload.phaseAtEnd).toBe('paused');expect(payload.elapsedMs).toBe(5000);expect(payload.frames).toBe(5);expect(payload.browser).toBe('headless-chromium');
   await Promise.resolve();await Promise.resolve();
  }finally{closeClientReport092(s);}
 });
});

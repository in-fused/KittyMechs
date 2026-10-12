import type {IncomingMessage,ServerResponse} from 'node:http';
import {parseClientFrameReport092,type ClientFrameReport092} from '../shared/clientDiagnostics092';
export function createClientReports092(){return new Map<string,{receivedAt:number;reports:({receivedAt:number;report:ClientFrameReport092})[]}>();}
type Store092=ReturnType<typeof createClientReports092>;
const local=(ip:string|undefined)=>ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1';
/** Diagnostics has no references to rooms, inputs or simulation. Eight clients,
 * twenty samples each, ten-minute expiry and a4096-byte request limit. */
export async function handleClientReports092(req:IncomingMessage,res:ServerResponse,store:Store092,enabled:boolean){
 if(req.url!=='/client-report')return false;
 const finish=(code:number,value?:unknown)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(value===undefined?'':JSON.stringify(value));};
 if(!enabled||!local(req.socket.remoteAddress)){finish(403);return true;}
 const now=Date.now();for(const [key,value] of store)if(now-value.receivedAt>600000)store.delete(key);
 if(req.method==='GET'){finish(200,{scope:'Reported local clients only; headless reports never qualify IAB. No player inputs or world state.',clients:[...store].map(([instance,value])=>({instance,...value}))});return true;}
 if(req.method!=='POST'){finish(405);return true;}
 if(req.headers.origin!==`http://${req.headers.host}`||req.headers['content-type']!=='application/json'||Number(req.headers['content-length']??0)>4096){finish(403);return true;}
 let bytes=0;const chunks:Buffer[]=[];const deadline=setTimeout(()=>{if(!res.headersSent)finish(408);req.destroy();},2000);
 try{for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>4096){finish(413);return true;}chunks.push(Buffer.from(chunk));}}
 catch{if(!res.destroyed&&!res.headersSent)finish(400);return true;}finally{clearTimeout(deadline);}
 let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString());}catch{finish(400);return true;}const report=parseClientFrameReport092(value);if(!report){finish(400);return true;}
 const receivedAt=Date.now(),old=store.get(report.instance);if(old&&(old.reports.length>=20||receivedAt-old.receivedAt<4000||report.sequence<=old.reports.at(-1)!.report.sequence)){finish(429);return true;}
 if(!old&&store.size>=8)store.delete(store.keys().next().value!);
 const entry=old??{receivedAt,reports:[]};entry.receivedAt=receivedAt;entry.reports.push({receivedAt,report});store.set(report.instance,entry);finish(204);return true;
}

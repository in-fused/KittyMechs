import type {terrainRenderData} from '../../../shared/streaming';

export type TerrainData=ReturnType<typeof terrainRenderData>;
export interface TerrainRequest {key:string;cx:number;cz:number;seed:number;requestId:number;epoch:number;}
export interface TerrainLease {readonly promise:Promise<TerrainData|null>;readonly retryable:boolean;release():void;}
export interface TerrainCacheStats {active:number;queued:number;completed:number;owners:number;fallback:boolean;failures:number;cancelled:number;}
type WorkerPort=Pick<Worker,'onmessage'|'onerror'|'onmessageerror'|'postMessage'|'terminate'>;
interface Options {createWorker:()=>WorkerPort;generate:(cx:number,cz:number,seed:number)=>TerrainData;timeoutMs?:number;maxQueued?:number;maxCompleted?:number;}
interface Owner {resolve:(data:TerrainData|null)=>void;settled:boolean;priority:number;entry?:Entry;}
interface Entry {request:TerrainRequest;owners:Set<Owner>;order:number;}

/** Validate the transferred grid, rather than treating any reply as readiness. */
function validData(value:unknown):value is TerrainData {
  if(!value||typeof value!=='object')return false;
  const data=value as Partial<TerrainData>;
  if(!(data.vertices instanceof Float32Array)||data.vertices.length!==3267||
    !(data.indices instanceof Uint32Array)||data.indices.length!==6144||
    !(data.normals instanceof Float32Array)||data.normals.length!==3267||
    !(data.uv instanceof Float32Array)||data.uv.length!==2178)return false;
  for(const array of [data.vertices,data.normals,data.uv])for(const n of array)if(!Number.isFinite(n))return false;
  for(const n of data.indices)if(n>=1089)return false;
  return true;
}

/** One worker job or deferred fallback tile at a time, with independent caller leases. */
export class TerrainScheduler {
  private readonly pending=new Map<string,Entry>();
  private readonly completed=new Map<string,TerrainData>();
  private readonly owners=new Set<Owner>();
  private readonly queue:Entry[]=[];
  private worker?:WorkerPort;
  private active?:Entry;
  private watchdog?:ReturnType<typeof setTimeout>;
  private deferred?:ReturnType<typeof setTimeout>;
  private epoch=0;
  private sequence=0;
  private dispatches=0;
  private fallback=false;
  private failures=0;
  private cancelled=0;
  private disposed=false;
  constructor(private readonly options:Options){}

  acquire(cx:number,cz:number,seed:number,priority=0):TerrainLease {
    if(this.disposed||![cx,cz,seed].every(Number.isSafeInteger))return this.empty(false);
    const key=`${seed}:${cx},${cz}`,cached=this.completed.get(key);
    let entry=this.pending.get(key);
    if(!cached&&!entry&&this.queue.length>=(this.options.maxQueued??64)&&this.active)return this.empty(true);
    let resolve!:(data:TerrainData|null)=>void;
    const promise=new Promise<TerrainData|null>(done=>{resolve=done;});
    const owner:Owner={resolve,settled:false,priority:Number.isFinite(priority)?priority:0};
    this.owners.add(owner);
    if(cached){
      this.completed.delete(key);this.completed.set(key,cached);this.settle(owner,cached);
    }else{
      if(!entry){entry={request:{key,cx,cz,seed,requestId:++this.sequence,epoch:0},owners:new Set(),order:this.sequence};this.pending.set(key,entry);this.queue.push(entry);}
      owner.entry=entry;entry.owners.add(owner);this.pump();
    }
    return {promise,retryable:false,release:()=>this.release(owner)};
  }
  stats():TerrainCacheStats{return {active:this.active?1:0,queued:this.queue.length,completed:this.completed.size,owners:this.owners.size,fallback:this.fallback,failures:this.failures,cancelled:this.cancelled};}
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.stopWorker();this.clearDeferred();
    for(const owner of this.owners){this.settle(owner,null);owner.entry=undefined;}
    for(const entry of this.pending.values())entry.owners.clear();
    this.owners.clear();this.pending.clear();this.completed.clear();this.queue.length=0;this.active=undefined;
  }
  private empty(retryable:boolean):TerrainLease{return {promise:Promise.resolve(null),retryable,release:()=>{}};}
  private settle(owner:Owner,data:TerrainData|null){if(!owner.settled){owner.settled=true;owner.resolve(data);}}
  private release(owner:Owner){
    if(!this.owners.delete(owner))return;
    this.settle(owner,null);
    const entry=owner.entry;
    if(entry){
      entry.owners.delete(owner);owner.entry=undefined;
      if(!entry.owners.size&&this.pending.get(entry.request.key)===entry){
        this.cancelled++;this.pending.delete(entry.request.key);
        if(this.active===entry){this.active=undefined;this.stopWorker();this.clearDeferred();}
        else {const index=this.queue.indexOf(entry);if(index>=0)this.queue.splice(index,1);}
      }
    }
    if(!this.owners.size)this.stopWorker();
    this.deferPump();
  }
  private clearDeferred(){if(this.deferred!==undefined)clearTimeout(this.deferred);this.deferred=undefined;}
  private stopWorker(){
    if(this.watchdog!==undefined)clearTimeout(this.watchdog);this.watchdog=undefined;
    const worker=this.worker;this.worker=undefined;
    if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();}
  }
  private failWorker(){
    this.failures++;this.fallback=true;this.stopWorker();this.clearDeferred();this.deferPump();
  }
  private deferPump(){
    if(this.disposed||this.deferred!==undefined||(!this.active&&!this.queue.length))return;
    this.deferred=setTimeout(()=>{this.deferred=undefined;this.pump();},0);
  }
  private pump(){
    if(this.disposed)return;
    if(!this.active){
      const priority=(entry:Entry)=>Math.min(...Array.from(entry.owners,owner=>owner.priority));
      // Reserve every eighth dispatch for the oldest owner-backed tile. A stream of
      // newer near tiles therefore cannot starve the bounded older queue forever.
      const oldest=this.dispatches%8===7;
      this.queue.sort((a,b)=>oldest?a.order-b.order:priority(a)-priority(b)||a.order-b.order);
      this.active=this.queue.shift();if(this.active)this.dispatches++;
    }
    const entry=this.active;if(!entry)return;
    if(this.fallback){
      // Yield before every synchronous tile, including the first failure fallback.
      if(this.deferred===undefined)this.deferred=setTimeout(()=>{
        this.deferred=undefined;
        if(this.active!==entry||!entry.owners.size)return;
        try {
          const data=this.options.generate(entry.request.cx,entry.request.cz,entry.request.seed);
          if(!validData(data))throw new Error('Invalid fallback terrain');
          this.finish(entry,data);
        }catch {this.failures++;this.finish(entry,null);}
      },0);
      return;
    }
    if(this.watchdog!==undefined)return;
    try {
      if(!this.worker){
        const worker=this.options.createWorker();this.worker=worker;const epoch=++this.epoch;
        worker.onmessage=event=>{
          if(this.worker!==worker||this.epoch!==epoch)return;
          const reply=event.data as Partial<TerrainRequest>&Partial<TerrainData>;
          if(!reply||typeof reply!=='object'){this.failWorker();return;}
          if(!Number.isSafeInteger(reply.requestId)||!Number.isSafeInteger(reply.epoch)||typeof reply.key!=='string'){this.failWorker();return;}
          const active=this.active;
          if(!active||reply.epoch!==epoch||reply.requestId!==active.request.requestId||reply.key!==active.request.key)return;
          if(!validData(reply)){this.failWorker();return;}
          this.finish(active,{vertices:reply.vertices,indices:reply.indices,normals:reply.normals,uv:reply.uv});
        };
        worker.onerror=event=>{
          if(this.worker!==worker||this.epoch!==epoch)return;
          // Execution faults are handled here; suppress the browser's default
          // uncaught worker report after retaining our failure counter.
          if(typeof event.preventDefault==='function')event.preventDefault();
          this.failWorker();
        };
        worker.onmessageerror=()=>{if(this.worker===worker&&this.epoch===epoch)this.failWorker();};
      }
      entry.request.epoch=this.epoch;
      this.watchdog=setTimeout(()=>{if(this.active===entry)this.failWorker();},this.options.timeoutMs??5000);
      this.worker.postMessage(entry.request);
    }catch {this.failWorker();}
  }
  private finish(entry:Entry,data:TerrainData|null){
    if(this.active!==entry)return;
    if(this.watchdog!==undefined)clearTimeout(this.watchdog);this.watchdog=undefined;
    this.active=undefined;this.pending.delete(entry.request.key);
    if(data){
      this.completed.set(entry.request.key,data);
      while(this.completed.size>(this.options.maxCompleted??96))this.completed.delete(this.completed.keys().next().value!);
    }
    for(const owner of entry.owners){owner.entry=undefined;this.settle(owner,data);}
    entry.owners.clear();this.deferPump();
  }
}

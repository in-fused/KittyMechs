import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {terrainRenderData} from '../shared/streaming';
import {TerrainScheduler,type TerrainData,type TerrainRequest} from '../src/game/world/terrainScheduler';

class ControlledWorker {
  onmessage:((event:MessageEvent)=>void)|null=null;
  onerror:((event:Partial<ErrorEvent>)=>void)|null=null;
  onmessageerror:(()=>void)|null=null;
  requests:TerrainRequest[]=[];
  terminate=vi.fn();
  postMessage=vi.fn((request:TerrainRequest)=>{this.requests.push({...request});});
  reply(data:unknown){this.onmessage?.({data} as MessageEvent);}
  complete(data:TerrainData=grid()){const request=this.requests.at(-1)!;this.reply({...request,...data});}
  port(){return this as unknown as Worker;}
}
// Valid-sized stand-in grids keep lifecycle/budget tests independent of terrain CPU cost.
function grid():TerrainData{return {vertices:new Float32Array(3267),indices:new Uint32Array(6144),normals:new Float32Array(3267),uv:new Float32Array(2178)};}
const schedulers:TerrainScheduler[]=[];
function setup(options:Partial<ConstructorParameters<typeof TerrainScheduler>[0]>={}){
  const workers:ControlledWorker[]=[],generate=vi.fn(()=>grid());
  const scheduler=new TerrainScheduler({createWorker:()=>{const worker=new ControlledWorker();workers.push(worker);return worker.port();},generate,...options});
  schedulers.push(scheduler);return {scheduler,workers,generate};
}
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{for(const scheduler of schedulers.splice(0))scheduler.dispose();vi.useRealTimers();vi.unstubAllGlobals();vi.resetModules();});

describe('owned bounded terrain work',()=>{
  it('deduplicates seed/tile work but independently settles and releases each owner',async()=>{
    const {scheduler,workers}=setup(),a=scheduler.acquire(0,0,7734),b=scheduler.acquire(0,0,7734);
    expect(workers[0].requests).toHaveLength(1);a.release();a.release();expect(await a.promise).toBeNull();
    expect(workers[0].terminate).not.toHaveBeenCalled();const data=grid();workers[0].complete(data);
    expect(await b.promise).toEqual(data);expect(scheduler.stats().owners).toBe(1);
    b.release();expect(scheduler.stats()).toMatchObject({owners:0,completed:1});
    const cached=scheduler.acquire(0,0,7734);expect(await cached.promise).toEqual(data);expect(workers).toHaveLength(1);cached.release();
  });
  it('admits only 65 unfinished distinct tiles and keeps duplicates independent under saturation',async()=>{
    const {scheduler,workers}=setup(),leases=Array.from({length:150},(_,x)=>scheduler.acquire(x,0,7734));
    expect(scheduler.stats()).toMatchObject({active:1,queued:64,owners:65});expect(workers[0].requests).toHaveLength(1);
    for(const lease of leases.slice(65)){expect(lease.retryable).toBe(true);expect(await lease.promise).toBeNull();}
    const duplicate=scheduler.acquire(1,0,7734);expect(duplicate.retryable).toBe(false);expect(scheduler.stats().owners).toBe(66);
    for(const lease of [...leases,duplicate])lease.release();
    expect(scheduler.stats()).toMatchObject({active:0,queued:0,owners:0,completed:0,cancelled:65});
    vi.runAllTimers();expect(workers).toHaveLength(1);
  });
  it('prioritizes current tiles and preserves FIFO ties, recalculating released owner priority',async()=>{
    const {scheduler,workers}=setup();scheduler.acquire(0,0,7734);
    scheduler.acquire(1,0,7734,10);const close=scheduler.acquire(1,0,7734,-5);close.release();
    scheduler.acquire(2,0,7734,0);scheduler.acquire(3,0,7734,0);
    workers[0].complete();await vi.advanceTimersByTimeAsync(0);expect(workers[0].requests.at(-1)?.cx).toBe(2);
    workers[0].complete();await vi.advanceTimersByTimeAsync(0);expect(workers[0].requests.at(-1)?.cx).toBe(3);
    workers[0].complete();await vi.advanceTimersByTimeAsync(0);expect(workers[0].requests.at(-1)?.cx).toBe(1);
  });
  it('terminates only an abandoned active job and ignores its captured late handler on key reuse',async()=>{
    const {scheduler,workers}=setup(),old=scheduler.acquire(0,0,7734),handler=workers[0].onmessage!,request=workers[0].requests[0];
    old.release();expect(await old.promise).toBeNull();expect(workers[0].terminate).toHaveBeenCalledOnce();
    const next=scheduler.acquire(0,0,7734),other=scheduler.acquire(1,0,4107);
    handler({data:{...request,...grid()}} as MessageEvent);expect(scheduler.stats().completed).toBe(0);
    workers[1].reply({...workers[1].requests[0],requestId:request.requestId,...grid()});expect(scheduler.stats().completed).toBe(0);
    workers[1].complete();expect(await next.promise).not.toBeNull();next.release();
    await vi.advanceTimersByTimeAsync(0);workers[1].complete();expect(await other.promise).not.toBeNull();other.release();
  });
  it('gives an old distant request a bounded turn despite continual newer near requests',async()=>{
    const {scheduler,workers}=setup();scheduler.acquire(0,0,7734);scheduler.acquire(99,0,7734,100);
    for(let x=1;x<=7;x++){
      scheduler.acquire(x,0,7734,-1);workers[0].complete();await vi.advanceTimersByTimeAsync(0);
    }
    expect(workers[0].requests.at(-1)?.cx).toBe(99);
  });
  it('evicts only completed data, with outstanding leases and other pending work intact',async()=>{
    const {scheduler,workers}=setup({maxCompleted:2}),a=scheduler.acquire(0,0,7734);
    workers[0].complete();const aData=await a.promise;
    for(const x of [1,2]){const lease=scheduler.acquire(x,0,7734);workers[0].complete();await lease.promise;lease.release();}
    expect(scheduler.stats().completed).toBe(2);expect(await a.promise).toBe(aData);
    scheduler.acquire(0,0,7734);expect(workers[0].requests).toHaveLength(4);
    a.release();expect(workers[0].terminate).not.toHaveBeenCalled();
  });
});

describe('terrain worker failures',()=>{
  it.each(['constructor','post','error','messageerror','timeout','malformed'] as const)('recovers %s without a synchronous fallback burst or unowned generation',async failure=>{
    const {scheduler,workers,generate}=setup(failure==='constructor'?{createWorker:()=>{throw new Error('unavailable');}}:{});
    if(failure==='post'){
      // First job establishes the port; inject failure in its next ordinary dispatch.
      scheduler.acquire(-1,0,7734);workers[0].complete();workers[0].postMessage.mockImplementation(()=>{throw new Error('post failed');});
    }
    const a=scheduler.acquire(0,0,7734),b=scheduler.acquire(1,0,7734),abandoned=scheduler.acquire(2,0,7734);
    const worker=workers.at(-1);
    if(failure==='error')worker!.onerror?.({});
    if(failure==='messageerror')worker!.onmessageerror?.();
    if(failure==='malformed')worker!.complete({...grid(),vertices:new Float32Array([NaN])});
    if(failure==='timeout')vi.advanceTimersToNextTimer();
    expect(generate).not.toHaveBeenCalled();abandoned.release();
    expect(await abandoned.promise).toBeNull();
    // A single pending timer callback cannot generate the entire backlog.
    vi.advanceTimersToNextTimer();expect(generate.mock.calls.length).toBeLessThanOrEqual(1);
    await vi.runAllTimersAsync();expect(await a.promise).not.toBeNull();expect(await b.promise).not.toBeNull();
    expect(generate).toHaveBeenCalledTimes(2);expect(scheduler.stats()).toMatchObject({active:0,queued:0,fallback:true,failures:1});
    a.release();b.release();
  });
  it('settles terminal fallback exceptions without retry eligibility or a hidden retry loop',async()=>{
    const generate=vi.fn(()=>{throw new Error('generator failed');}),{scheduler}=setup({createWorker:()=>{throw new Error('no worker');},generate});
    const lease=scheduler.acquire(0,0,7734);await vi.runAllTimersAsync();
    expect(await lease.promise).toBeNull();expect(lease.retryable).toBe(false);expect(generate).toHaveBeenCalledOnce();
    expect(scheduler.stats()).toMatchObject({active:0,queued:0,completed:0,failures:2});expect(vi.getTimerCount()).toBe(0);lease.release();
  });
  it.each(['nonfinite','index','identity'] as const)('rejects a current malformed %s reply before caching it',async fault=>{
    const {scheduler,workers}=setup(),lease=scheduler.acquire(0,0,7734),data=grid();
    if(fault==='nonfinite')data.normals[12]=NaN;
    if(fault==='index')data.indices[20]=1089;
    workers[0].reply({...workers[0].requests[0],...data,...(fault==='identity'?{requestId:undefined}:{})});
    expect(scheduler.stats()).toMatchObject({completed:0,fallback:true,failures:1});
    await vi.runAllTimersAsync();expect(await lease.promise).not.toBeNull();lease.release();
  });
  it('dispose settles all pending owners, terminates once and cancels watchdog/fallback tasks',async()=>{
    const {scheduler,workers,generate}=setup(),leases=[scheduler.acquire(0,0,7734),scheduler.acquire(1,0,7734)];
    workers[0].onerror?.({});scheduler.dispose();scheduler.dispose();await vi.runAllTimersAsync();
    expect(await Promise.all(leases.map(lease=>lease.promise))).toEqual([null,null]);expect(generate).not.toHaveBeenCalled();expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(scheduler.stats()).toMatchObject({owners:0,active:0,queued:0});
  });
  it('uses byte-identical canonical terrain in transferred replies and deferred fallback across theaters',async()=>{
    for(const seed of [7734,1926,4107]){
      const expected=terrainRenderData(-1,1,seed),{scheduler,workers}=setup(),lease=scheduler.acquire(-1,1,seed);
      workers[0].complete(expected);const result=(await lease.promise)!;
      const fallback=setup({createWorker:()=>{throw new Error('unavailable');},generate:terrainRenderData}),copy=fallback.scheduler.acquire(-1,1,seed);
      await vi.runAllTimersAsync();const actual=(await copy.promise)!;
      for(const field of ['vertices','indices','normals','uv'] as const){
        expect(new Uint8Array(result[field].buffer)).toEqual(new Uint8Array(expected[field].buffer));
        expect(new Uint8Array(actual[field].buffer)).toEqual(new Uint8Array(expected[field].buffer));
      }
      lease.release();copy.release();
    }
  });
  it('the real cache wrapper is lazy and catches an unavailable Worker constructor',async()=>{
    const constructor=vi.fn(function(){throw new Error('browser denied worker');});vi.stubGlobal('Worker',constructor);
    const {getTerrainCacheStats,acquireTerrain}=await import('../src/game/world/terrainCache');
    expect(getTerrainCacheStats().active).toBe(0);expect(constructor).not.toHaveBeenCalled();
    const lease=acquireTerrain(0,0,7734);expect(constructor).toHaveBeenCalledOnce();await vi.runAllTimersAsync();
    expect(await lease.promise).toEqual(terrainRenderData(0,0,7734));lease.release();expect(getTerrainCacheStats().owners).toBe(0);
  });
  it('cancels the browser default error report for a handled worker execution fault',async()=>{
    const {scheduler,workers}=setup(),lease=scheduler.acquire(0,0,7734),preventDefault=vi.fn();
    workers[0].onerror?.({preventDefault});expect(preventDefault).toHaveBeenCalledOnce();
    expect(scheduler.stats()).toMatchObject({fallback:true,failures:1});
    await vi.runAllTimersAsync();expect(await lease.promise).not.toBeNull();lease.release();
  });
});

export interface TerrainLease<T> {promise:Promise<T|null>;release():void;retryable:boolean;}
/** One scene consumer owns one lease and at most one retry timer. Results from
 * an abandoned key never reach React, even if shared work completes later. */
export function subscribeTerrain<T>(acquire:()=>TerrainLease<T>,commit:(value:T)=>void,retryDelay=200):()=>void {
  let alive=true,lease:TerrainLease<T>|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const attempt=()=>{
    if(!alive)return;
    const pending=acquire();lease=pending;
    const finish=(value:T|null)=>{
      if(!alive||lease!==pending)return;
      if(value!==null){commit(value);return;}
      if(pending.retryable){pending.release();lease=null;timer=setTimeout(()=>{timer=undefined;attempt();},retryDelay);}
    };
    pending.promise.then(finish,()=>finish(null));
  };
  attempt();
  return()=>{if(!alive)return;alive=false;if(timer!==undefined)clearTimeout(timer);lease?.release();lease=null;};
}

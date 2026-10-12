import {terrainRenderData} from '../../../shared/streaming';
import {TerrainScheduler} from './terrainScheduler';
export type {TerrainLease,TerrainCacheStats} from './terrainScheduler';

// Construction is lazy: importing the cache or reading diagnostics starts no work.
const cache=new TerrainScheduler({
  createWorker:()=>new Worker(new URL('./terrain.worker.ts',import.meta.url),{type:'module'}),
  generate:terrainRenderData,
});
/** CPU data is shared; scene geometries and GPU resources remain scene-owned. */
export function acquireTerrain(cx:number,cz:number,seed:number,priority=0){return cache.acquire(cx,cz,seed,priority);}
export function getTerrainCacheStats(){return cache.stats();}

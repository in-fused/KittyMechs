import {terrainRenderData} from '../../../shared/streaming';
import type {TerrainRequest} from './terrainScheduler';
self.onmessage=(event:MessageEvent<TerrainRequest>)=>{
  const {key,cx,cz,seed,requestId,epoch}=event.data,data=terrainRenderData(cx,cz,seed);
  self.postMessage({key,requestId,epoch,...data},{transfer:[data.vertices.buffer,data.indices.buffer,data.normals.buffer,data.uv.buffer]});
};

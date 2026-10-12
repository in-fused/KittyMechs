import {describe,it,expect} from 'vitest';
import {renderChunkKeys,terrainRenderData,visibleProp} from '../shared/streaming';
import {generateChunk,terrainMesh,propCollider} from '../shared/world';
describe('visible collision and streamed terrain',()=>{
  it('keeps every actual solid in the world visible at every graphics density',()=>{
    for(const seed of [7734,1926,4107])for(const cx of [-2,-1,0,1,2])for(const cz of [-2,-1,0,1])for(const prop of generateChunk(seed,cx,cz).props)if(propCollider(prop))for(const density of [0,.3,.6,.85,1])expect(visibleProp(prop,density)).toBe(true);
  });
  it('shows forward tiles before crossing while retaining the entire current collision neighborhood',()=>{
    const position={x:60,y:1,z:60},velocity={x:35,y:0,z:35},keys=renderChunkKeys(position,velocity,1);
    expect(keys).toContain('2,2');expect(keys).toContain('-1,-1');expect(keys.length).toBeLessThanOrEqual(16);
    expect(renderChunkKeys(position,{x:0,y:0,z:0},1)).toHaveLength(9);
    expect(renderChunkKeys(position,velocity,2).length).toBeLessThanOrEqual(36);
  });
  it('worker geometry matches physical terrain and produces continuous finite seam normals',()=>{
    for(const seed of [7734,1926,4107]){
      const a=terrainRenderData(-1,-1,seed),b=terrainRenderData(0,-1,seed);
      expect(a.vertices).toEqual(terrainMesh(-1,-1,32,seed).vertices);expect(b.indices).toEqual(terrainMesh(0,-1,32,seed).indices);
      for(let z=0;z<=32;z++)for(let axis=0;axis<3;axis++)expect(a.normals[(z*33+32)*3+axis]).toBeCloseTo(b.normals[z*33*3+axis],5);
      for(let i=0;i<b.normals.length;i+=3){expect(Math.hypot(...b.normals.slice(i,i+3))).toBeCloseTo(1,5);expect(b.normals[i+1]).toBeGreaterThan(0);}
    }
  });
});

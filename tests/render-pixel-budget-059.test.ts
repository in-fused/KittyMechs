import {describe,expect,it} from 'vitest';
import {LOW_MIN_DPR059,LOW_RENDER_PIXELS059,renderPixelRatio059} from '../src/game/rendering/renderPixelBudget059';
describe('Low rendering area budget',()=>{
 it('retains small view resolution and bounds landscape, portrait, high-DPI and resized buffers without changing aspect',()=>{
  expect(renderPixelRatio059(true,960,600,3,1)).toBe(1);
  expect(renderPixelRatio059(true,1280,720,2,1)).toBe(1);
  for(const [w,h] of [[1440,900],[900,1440],[1920,1080],[3840,2160]]){
   const ratio=renderPixelRatio059(true,w,h,3,1),bufferWidth=w*ratio,bufferHeight=h*ratio;
   expect(ratio).toBeLessThan(1);expect(ratio).toBeGreaterThanOrEqual(LOW_MIN_DPR059);
   expect(bufferWidth*bufferHeight).toBeCloseTo(LOW_RENDER_PIXELS059,6);
   expect(bufferWidth/bufferHeight).toBeCloseTo(w/h,12);
   expect(Math.floor(bufferWidth)*Math.floor(bufferHeight)).toBeLessThanOrEqual(LOW_RENDER_PIXELS059);
   expect(renderPixelRatio059(true,w/2,h/2,1,1)).toBeGreaterThan(ratio);
  }
 });
 it('preserves the existing non-Low device-DPR lower and preset-upper clamps regardless of viewport area',()=>{
  for(const maximum of [1.25,1.5,2]){
   expect(renderPixelRatio059(false,8000,5000,.5,maximum)).toBe(1);
   expect(renderPixelRatio059(false,8000,5000,1.1,maximum)).toBe(1.1);
   expect(renderPixelRatio059(false,8000,5000,3,maximum)).toBe(maximum);
  }
 });
 it('avoids invalid startup dimensions and explicitly retains the legibility floor for extreme areas',()=>{
  for(const [w,h] of [[0,900],[900,0],[-1,900],[NaN,900],[900,Infinity]])expect(renderPixelRatio059(true,w,h,1,1)).toBe(1);
  const ratio=renderPixelRatio059(true,20000,20000,1,1);expect(ratio).toBe(.25);expect(20000*20000*ratio*ratio).toBeGreaterThan(LOW_RENDER_PIXELS059);
 });
});

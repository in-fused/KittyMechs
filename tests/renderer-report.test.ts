import {describe,expect,it} from 'vitest';
import {classifyRendererLabel,readRendererIdentity} from '../src/game/rendering/rendererReport';
describe('renderer identity report',()=>{
 it('identifies explicit software names before vendor names and does not infer hardware from ANGLE alone',()=>{
  expect(classifyRendererLabel('ANGLE (NVIDIA GeForce GTX 1070 Ti Direct3D11)')).toBe('hardware-reported');
  expect(classifyRendererLabel('ANGLE (Google, Vulkan SwiftShader Device)')).toBe('software-reported');
  expect(classifyRendererLabel('Mesa Intel software rasterizer')).toBe('software-reported');
  for(const label of [null,'WebKit WebGL','ANGLE','Mesa OpenGL'])expect(classifyRendererLabel(label)).toBe('unknown');
 });
 it('reads one exposed unmasked identity parameter and retains its actual label',()=>{
  const queries:number[]=[],extensions:string[]=[];
  const result=readRendererIdentity({RENDERER:1,getExtension:name=>{extensions.push(name);return{UNMASKED_RENDERER_WEBGL:2};},getParameter:parameter=>{queries.push(parameter);return 'ANGLE (AMD Radeon RX 6800)';}});
  expect(result).toEqual({renderer:'ANGLE (AMD Radeon RX 6800)',classification:'hardware-reported'});expect(queries).toEqual([2]);expect(extensions).toEqual(['WEBGL_debug_renderer_info']);
 });
 it('handles privacy masking, unavailable identity and exceptions without fabricating hardware',()=>{
  const queries:number[]=[];
  expect(readRendererIdentity({RENDERER:1,getExtension:()=>null,getParameter:p=>{queries.push(p);return 'WebKit WebGL';}})).toEqual({renderer:'WebKit WebGL',classification:'unknown'});expect(queries).toEqual([1]);
  for(const raw of [null,0,' '])expect(readRendererIdentity({RENDERER:1,getExtension:()=>null,getParameter:()=>raw})).toEqual({renderer:null,classification:'unknown'});
  expect(readRendererIdentity({RENDERER:1,getExtension:()=>{throw new Error('withheld');},getParameter:()=>{throw new Error('must not query');}})).toEqual({renderer:null,classification:'unknown'});
 });
});

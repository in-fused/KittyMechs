import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {texturelessGeometryGlb} from '../tools/textureless-geometry-glb';
function parts(bytes:Uint8Array){const size=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(12,true);return {json:JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+size))),tail:bytes.subarray(20+size)};}
describe('headless GLB image-free pose fixture',()=>{
  it.each(['Pounce','Bastion'])('keeps actual shipping %s BIN, all accessors, skins, hierarchy and32animations exact',(chassis)=>{
    const original=readFileSync(`public/assets/models/${chassis}_Quadruped.glb`),copy=Buffer.from(original),before=parts(original),after=parts(new Uint8Array(texturelessGeometryGlb(original)));
    expect(original.equals(copy)).toBe(true);expect(Buffer.from(after.tail).equals(Buffer.from(before.tail))).toBe(true);
    for(const key of ['buffers','bufferViews','accessors','meshes','nodes','skins','scenes','animations'])expect(after.json[key]).toEqual(before.json[key]);
    expect(after.json.animations).toHaveLength(32);expect(after.json.skins[0].joints).toHaveLength(25);
    expect(before.json.images).toHaveLength(3);expect(after.json.images).toBeUndefined();expect(after.json.textures).toBeUndefined();expect(after.json.samplers).toBeUndefined();
    for(let i=0;i<before.json.materials.length;i++){
      const a=before.json.materials[i],b=after.json.materials[i];
      for(const key of ['name','emissiveFactor','alphaMode','doubleSided','extras'])expect(b[key]).toEqual(a[key]);
      for(const key of ['baseColorFactor','metallicFactor','roughnessFactor'])expect(b.pbrMetallicRoughness[key]).toEqual(a.pbrMetallicRoughness[key]);
      expect(b.normalTexture).toBeUndefined();expect(b.occlusionTexture).toBeUndefined();expect(b.pbrMetallicRoughness.baseColorTexture).toBeUndefined();expect(b.pbrMetallicRoughness.metallicRoughnessTexture).toBeUndefined();
    }
    expect(after.json.extensionsRequired).not.toContain('EXT_texture_webp');expect(after.json.extensionsRequired).toContain('EXT_meshopt_compression');
  });
  it('rejects malformed input rather than replacing missing geometry',()=>{
    expect(()=>texturelessGeometryGlb(new Uint8Array(20))).toThrow('complete glTF2 GLB');
    const bytes=readFileSync('public/assets/models/Pounce_Quadruped.glb');expect(()=>texturelessGeometryGlb(bytes.subarray(0,bytes.length-4))).toThrow('complete glTF2 GLB');
  });
});

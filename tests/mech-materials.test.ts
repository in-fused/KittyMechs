import {describe,expect,it} from 'vitest';
import {MeshStandardMaterial,SRGBColorSpace,Texture,Vector2} from 'three';
import {dressMaterial,felineSurfaceProfile,type SurfaceMaps} from '../src/game/rendering/surfaceMaterials';

function surfaces():SurfaceMaps{
  return {concrete:new Texture(),concreteNormal:new Texture(),concreteRough:new Texture(),ground:new Texture(),groundNormal:new Texture(),groundRough:new Texture(),armor:new Texture(),rock:new Texture(),rockNormal:new Texture()};
}
describe('authored feline PBR admission',()=>{
  it('retains glTF atlas references, factors, UV channels and normal convention on actor-owned material clones',()=>{
    const atlas=new Texture(),normal=new Texture(),orm=new Texture();
    atlas.colorSpace=SRGBColorSpace;atlas.flipY=normal.flipY=orm.flipY=false;orm.channel=0;
    const source=new MeshStandardMaterial({name:'FelinePBR_Armor',map:atlas,normalMap:normal,aoMap:orm,roughnessMap:orm,metalnessMap:orm,color:'#d9ddd3',roughness:.63,metalness:.7,normalScale:new Vector2(1,1),emissive:'#183132',emissiveIntensity:.08});
    for(const seed of [7734,1926,4107]){
      const result=dressMaterial(source,surfaces(),seed,felineSurfaceProfile(source)) as MeshStandardMaterial;
      expect(result).not.toBe(source);expect(result.map).toBe(atlas);expect(result.normalMap).toBe(normal);
      expect(result.aoMap).toBe(orm);expect(result.roughnessMap).toBe(orm);expect(result.metalnessMap).toBe(orm);
      expect(result.normalScale.toArray()).toEqual([1,1]);expect(result.color.equals(source.color)).toBe(true);
      expect(result.emissive.equals(source.emissive)).toBe(true);expect(result.emissiveIntensity).toBe(.08);
      expect(result.roughness).toBe(.63);expect(result.metalness).toBe(.7);expect(atlas.colorSpace).toBe(SRGBColorSpace);expect(orm.channel).toBe(0);
      result.color.set('#000000');expect(source.color.getHex()).not.toBe(0);result.dispose();
    }
  });
  it('preserves transparent canopy parameters and emissive lenses without adding concrete surface maps',()=>{
    for(const name of ['FelinePBR_Glass','FelinePBR_Glow']){
      const source=new MeshStandardMaterial({name,transparent:name.endsWith('Glass'),opacity:.38,roughness:.16,metalness:.2,emissive:'#35c5c2',emissiveIntensity:.42});
      const result=dressMaterial(source,surfaces(),4107,felineSurfaceProfile(source)) as MeshStandardMaterial;
      expect(result.transparent).toBe(source.transparent);expect(result.opacity).toBe(.38);expect(result.roughness).toBe(.16);
      expect(result.emissiveIntensity).toBe(.42);expect(result.map).toBeNull();expect(result.normalMap).toBeNull();result.dispose();
    }
  });
  it('keeps existing environment and untagged chassis surface behavior unchanged',()=>{
    const maps=surfaces();
    for(const name of ['Cat_Armor','Cat_Metal','Rain_Ivory','Rain_Roof']){
      const source=new MeshStandardMaterial({name,roughness:.2}),profile=felineSurfaceProfile(source);
      expect(profile).toBe('environment');const result=dressMaterial(source,maps,7734,profile) as MeshStandardMaterial;
      expect(result.map).toBe(name==='Rain_Roof'?maps.concrete:maps.armor);expect(result.normalMap).toBe(maps.concreteNormal);
      expect(result.roughnessMap).toBe(maps.concreteRough);expect(source.map).toBeNull();result.dispose();
    }
    expect(felineSurfaceProfile(new MeshStandardMaterial({name:'Other_FelinePBR_Armor'}))).toBe('environment');
  });
});

import {Color,MeshStandardMaterial,Vector2,type Material,type Texture} from 'three';

export interface SurfaceMaps {concrete:Texture;concreteNormal:Texture;concreteRough:Texture;ground:Texture;groundNormal:Texture;groundRough:Texture;armor:Texture;rock:Texture;rockNormal:Texture;}
export type SurfaceProfile='environment'|'feline-pbr';
/** Authored glTF materials own their UVs, color space and packed ORM channels.
 * Keep that contract distinct from the older procedural surface dressing. */
export function felineSurfaceProfile(original:Material):SurfaceProfile {
  return original.name.startsWith('FelinePBR_')?'feline-pbr':'environment';
}
export function dressMaterial(original:Material,texture:SurfaceMaps,seed:number,profile:SurfaceProfile='environment'){
  const material=original.clone();
  if(profile==='feline-pbr')return material;
  if(material instanceof MeshStandardMaterial){
    if(/Stone|Ivory|Roof|Moss/i.test(material.name)){material.map=texture.concrete;material.normalMap=texture.concreteNormal;material.roughnessMap=texture.concreteRough;material.normalScale=new Vector2(.35,-.35);}
    if(/Ivory|Enamel|Armor|Shell|Ochre|Metal|Copper/i.test(material.name)){material.map=texture.armor;material.normalMap=texture.concreteNormal;material.normalScale=new Vector2(.12,-.12);material.roughnessMap=texture.concreteRough;material.roughness=Math.max(.3,material.roughness);}
    if(material.name==='Rain_Teal')material.color.set('#35464a');
    if(material.name==='Rain_Ivory')material.color.set('#92988f');
    if(material.name==='Rain_Ochre')material.color.set('#a78555');
    if(material.name==='Rain_Window'){material.color.set('#779897');material.emissive.set('#82aeb0');material.emissiveIntensity=.16;}
    if(material.name==='Pine_Fronds'){material.alphaTest=.12;material.transparent=false;material.side=2;material.roughness=.9;material.alphaToCoverage=true;}
    if(seed===4107&&/Leaf|Stone|Roof|Moss/i.test(material.name))material.color.lerp(new Color('#dbe7ef'),.65);
    if(seed===1926&&/Leaf|Moss/i.test(material.name))material.color.set('#837055');
    if(/Canopy/i.test(material.name)){material.metalness=.35;material.roughness=.13;}
    if(/Window|Eye|Sensor|Glow|Warm/i.test(material.name)){material.emissiveIntensity=Math.max(.65,material.emissiveIntensity);}
  }
  return material;
}

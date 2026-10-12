/** Headless CPU pose input: remove image sampling only, preserve graphics bytes.
 * This is not a shipping transformation or material-quality qualification.
 */
export function texturelessGeometryGlb(input:Uint8Array):ArrayBuffer{
  const view=new DataView(input.buffer,input.byteOffset,input.byteLength);
  if(input.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==input.byteLength)throw new Error('Expected a complete glTF2 GLB');
  const size=view.getUint32(12,true);
  if(view.getUint32(16,true)!==0x4e4f534a||size%4!==0||20+size>input.byteLength)throw new Error('Invalid GLB JSON chunk');
  const json=JSON.parse(new TextDecoder().decode(input.subarray(20,20+size)));
  // All core and material-extension textureInfo bindings end in Texture.
  // Retain factors, alpha modes, extensions, extras and primitive references.
  const stripSampling=(value:unknown)=>{
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(stripSampling);return;}
    for(const [key,item] of Object.entries(value)){
      if(key.endsWith('Texture'))delete (value as Record<string,unknown>)[key];
      else stripSampling(item);
    }
  };
  for(const material of json.materials??[])stripSampling(material);
  delete json.images;delete json.textures;delete json.samplers;
  const samplingExtensions=new Set(['EXT_texture_webp','EXT_texture_avif','KHR_texture_basisu','MSFT_texture_dds','KHR_texture_transform']);
  for(const field of ['extensionsUsed','extensionsRequired'])if(json[field])json[field]=json[field].filter((name:string)=>!samplingExtensions.has(name));
  const encoded=new TextEncoder().encode(JSON.stringify(json)),length=(encoded.byteLength+3)&~3,tail=input.subarray(20+size),result=new Uint8Array(20+length+tail.byteLength),out=new DataView(result.buffer);
  out.setUint32(0,0x46546c67,true);out.setUint32(4,2,true);out.setUint32(8,result.byteLength,true);out.setUint32(12,length,true);out.setUint32(16,0x4e4f534a,true);
  result.fill(32,20,20+length);result.set(encoded,20);result.set(tail,20+length);
  return result.buffer;
}

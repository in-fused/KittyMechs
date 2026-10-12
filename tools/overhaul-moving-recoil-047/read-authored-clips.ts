import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AnimationClip,QuaternionKeyframeTrack,VectorKeyframeTrack} from 'three';

/** Read the actual, uncompressed animation accessors only. No mesh rewrite,
 * playback approximation, source pose synthesis or GLB mutation. */
export function readAuthoredClips047(path:string){
 const bytes=readFileSync(path),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.byteLength)throw Error('Expected complete glTF2 GLB');
 const jsonBytes=v.getUint32(12,true),g=JSON.parse(bytes.subarray(20,20+jsonBytes).toString('utf8')),binary=28+jsonBytes;
 if(v.getUint32(16,true)!==0x4e4f534a||v.getUint32(24+jsonBytes,true)!==0x004e4942)throw Error('Expected JSON then BIN');
 const values=(index:number)=>{const a=g.accessors[index],b=g.bufferViews[a.bufferView],size=({SCALAR:1,VEC3:3,VEC4:4} as Record<string,number>)[a.type];
  if(!size||a.componentType!==5126||a.sparse||a.normalized||b.buffer!==0||b.byteStride||b.extensions)throw Error('Unsupported accessor; do not invent decoding');
  const offset=binary+(b.byteOffset??0)+(a.byteOffset??0),length=a.count*size;
  if(offset%4||offset+4*length>bytes.byteLength)throw Error('Invalid actual accessor span');
  return new Float32Array(bytes.buffer,bytes.byteOffset+offset,length).slice();
 };
 const clips:AnimationClip[]=g.animations.map((a:any)=>new AnimationClip(a.name,-1,a.channels.map((c:any)=>{
  const s=a.samplers[c.sampler];if(s.interpolation&&s.interpolation!=='LINEAR')throw Error('Unsupported interpolation; do not guess');
  const name=g.nodes[c.target.node].name,property=({translation:'position',rotation:'quaternion',scale:'scale'} as Record<string,string>)[c.target.path];
  if(!property)throw Error('Unsupported authored channel');
  const Track=property==='quaternion'?QuaternionKeyframeTrack:VectorKeyframeTrack;
  return new Track(name+'.'+property,values(s.input),values(s.output));
 })));
 return {clips,sha256:createHash('sha256').update(bytes).digest('hex')};
}

import fs from 'node:fs';
import crypto from 'node:crypto';
import {MeshoptDecoder} from 'meshoptimizer';
// Read the retained mesh exactly, including compression, quantization and node transform.
const source='public/assets/models/SM_RainLamp.glb', bytes=fs.readFileSync(source);
const jsonLength=bytes.readUInt32LE(12), gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binStart=20+jsonLength+8, bin=bytes.subarray(binStart);
await MeshoptDecoder.ready;
const views=gltf.bufferViews.map(v=>{
 const e=v.extensions?.EXT_meshopt_compression;
 if(!e||e.buffer!==0)throw Error('Expected retained meshopt view');
 const out=new Uint8Array(e.count*e.byteStride);
 MeshoptDecoder.decodeGltfBuffer(out,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);
 return out;
});
function accessor(index){
 const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView],raw=views[a.bufferView],d=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
 if(a.sparse)throw Error('Unexpected sparse accessor');
 const width=a.type==='VEC3'?3:1,size=a.componentType===5122||a.componentType===5123?2:0;
 if(!size)throw Error('Unexpected component type');
 return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,j)=>{
  const offset=(a.byteOffset??0)+i*(v.byteStride??width*size)+j*size;
  const n=a.componentType===5122?d.getInt16(offset,true):d.getUint16(offset,true);
  return a.normalized?Math.max(-1,n/32767):n;
 }));
}
if(gltf.nodes.length!==1||gltf.nodes[0].rotation||gltf.nodes[0].matrix)throw Error('Unexpected node hierarchy');
const node=gltf.nodes[0],vertices=[],indices=[];
for(const p of gltf.meshes[node.mesh].primitives){
 if(p.mode!==undefined&&p.mode!==4)throw Error('Expected triangle primitive');
 const positions=accessor(p.attributes.POSITION),base=vertices.length/3;
 for(const point of positions)vertices.push(...point.map((n,i)=>n*node.scale[i]+node.translation[i]));
 for(const [index] of accessor(p.indices)){if(index>=positions.length)throw Error('Index outside primitive');indices.push(base+index);}
}
if(vertices.some(n=>!Number.isFinite(n))||indices.length%3)throw Error('Invalid mesh');
const bounds=[0,1,2].map(a=>[Math.min(...vertices.filter((_,i)=>i%3===a)),Math.max(...vertices.filter((_,i)=>i%3===a))]);
const result={revision:'retained-lamp-mesh-001',source,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),bounds,vertices,indices};
fs.mkdirSync('shared/data',{recursive:true});
fs.writeFileSync('shared/data/rainlineLampMeshCollision001.json',JSON.stringify(result));
console.log(JSON.stringify({source,sha:result.sourceSha256,vertices:vertices.length/3,triangles:indices.length/3,bounds}));

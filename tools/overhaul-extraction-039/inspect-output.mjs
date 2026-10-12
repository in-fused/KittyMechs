import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Box3,Mesh} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const path='public/assets/overhaul/extraction039/Rainline_Extraction039.glb',bytes=await readFile(path);
if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB header');
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
if(json.materials.length!==4||json.images?.length||json.buffers.some(b=>b.uri))throw Error('External input or material budget mismatch');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);let triangles=0;const rows=[];
for(const root of gltf.scene.children){
 const bounds=new Box3().setFromObject(root);if(bounds.isEmpty())throw Error('Empty module '+root.name);
 if([...bounds.min.toArray(),...bounds.max.toArray()].some(x=>!Number.isFinite(x)||Math.abs(x)>1.00002))throw Error('Out of owner envelope '+root.name);
 root.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});
 rows.push({module:root.name,min:bounds.min.toArray(),max:bounds.max.toArray()});
}
if(triangles>50000||bytes.length>10000000)throw Error('Output budget exceeded');
const source='assets/source/overhaul-extraction-art-039/Rainline_Extraction039.blend',sourceStat=await stat(source);
if(sourceStat.size>80000000)throw Error('Source budget exceeded');
const receipt={inspectedUTC:new Date().toISOString(),status:'VERIFIED_OUTPUT_BYTES_NOT_GAMEPLAY_APPROVAL',glb:{path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},editable:{path:source,bytes:sourceStat.size,sha256:createHash('sha256').update(await readFile(source)).digest('hex')},materials:json.materials.map(x=>x.name),triangles,modules:rows,provenance:'Original local procedural Blender geometry/materials; no external input'};
await writeFile('tools/overhaul-extraction-039/output-inspection.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({status:receipt.status,glb:receipt.glb,sourceBytes:sourceStat.size,triangles,modules:rows.length,materials:json.materials.length}));

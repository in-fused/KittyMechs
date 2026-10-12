import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer';
/** Actual game loader, including its cubic-spline interpolants; no GLTF reserialization. */
export async function loadActual196(path:string){
 await MeshoptDecoder.ready;
 const bytes=await readFile(path),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 return {model:gltf.scene,clips:gltf.animations};
}

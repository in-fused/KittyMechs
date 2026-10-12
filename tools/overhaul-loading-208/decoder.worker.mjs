// Same installed numerical codec as drei's current useGLTF. No replacement,
// resampling, geometry edits, quantization or external WASM/provider download.
import {MeshoptDecoder} from '../../node_modules/three-stdlib/libs/MeshoptDecoder.js';
const decoder=MeshoptDecoder();
self.onmessage=async e=>{const m=e.data;try{await decoder.ready;const start=performance.now(),queueMs=performance.timeOrigin+start-m.postedWall,target=new Uint8Array(m.count*m.stride);
 decoder.decodeGltfBuffer(target,m.count,m.stride,new Uint8Array(m.source),m.mode,m.filter);
 const decodeMs=performance.now()-start;self.postMessage({id:m.id,buffer:target.buffer,decodeMs,queueMs},[target.buffer]);
}catch(error){self.postMessage({id:m.id,error:String(error)});}};

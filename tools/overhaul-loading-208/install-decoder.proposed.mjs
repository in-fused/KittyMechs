import {MeshoptDecoder} from '../../node_modules/three-stdlib/libs/MeshoptDecoder.js';
import {createDecoderClient208} from './decoder-client.mjs';
/** Invoke ONCE before importing any GameCanvas/world useGLTF preload module.
 * drei gets this SAME cached decoder object on every useGLTF invocation.
 * stdlib GLTFLoader prefers decodeGltfBufferAsync when the method exists.
 * Asset cache keys/classes, source bytes and native owners are untouched. */
export function installDecoder208({record=()=>{}}={}){
 const decoder=MeshoptDecoder();
 if(typeof Worker==='undefined'){record({kind:'UNSUPPORTED_WORKER_RETAINED_EXISTING_CODEC'});return ()=>{};}
 if(decoder.decodeGltfBufferAsync)throw Error('208 existing async decoder owner cannot be overwritten');
 const worker=new Worker(new URL('./decoder.worker.mjs',import.meta.url),{type:'module',name:'kittymech-asset-decode-208'}),client=createDecoderClient208(worker,{onReceipt:r=>record({kind:'ACTUAL_DECODE_TASK',...r})}),asyncDecode=(...args)=>client.decode(...args);
 decoder.decodeGltfBufferAsync=asyncDecode;
 let retired=false;const close=()=>{if(retired)return;retired=true;client.close();if(decoder.decodeGltfBufferAsync===asyncDecode)delete decoder.decodeGltfBufferAsync;window.removeEventListener('pagehide',close);};
 window.addEventListener('pagehide',close,{once:true});return close;
}

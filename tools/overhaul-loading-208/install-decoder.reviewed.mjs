import {MeshoptDecoder} from '../../node_modules/three-stdlib/libs/MeshoptDecoder.js';
import {createDecoderClient208} from './decoder-client.reviewed.mjs';
/** Candidate only. Install before a DYNAMIC application import containing ALL
 * preload dependencies; invoking this before a static import is insufficient. */
export function installDecoder208({record=()=>{}}={}){
 const observationErrors=[],observe=r=>{try{record(r);}catch(e){if(observationErrors.length<32)observationErrors.push(String(e));}};
 const decoder=MeshoptDecoder();
 if(typeof Worker==='undefined'){observe({kind:'UNSUPPORTED_WORKER_RETAINED_EXISTING_CODEC'});return {close:()=>{},read:()=>({unsupported:true,observationErrors:[...observationErrors]})};}
 if(decoder.decodeGltfBufferAsync)throw Error('208 existing async decoder owner cannot be overwritten');
 const worker=new Worker(new URL('./decoder.worker.mjs',import.meta.url),{type:'module',name:'kittymech-asset-decode-208'}),client=createDecoderClient208(worker,{onReceipt:r=>observe({kind:'ACTUAL_DECODE_TASK',...r})}),asyncDecode=(...args)=>client.decode(...args);
 decoder.decodeGltfBufferAsync=asyncDecode;
 let retired=false;
 const onShow=e=>{if(e.persisted&&retired)observe({kind:'BFCACHE_RESTORED_RETIRED_DECODER_RELOAD_REQUIRED'});};
 const close=()=>{if(retired)return;retired=true;client.close();window.removeEventListener('pagehide',close);observe({kind:'PAGE_DECODER_RETIRED_RELOAD_REQUIRED'});
  // Keep the closed async method as a tombstone. Cached loader consumers after
  // bfcache restoration must reject, never silently fall back to main-thread
  // decode or implicitly restart another worker owner. New page reload is required.
 };
 window.addEventListener('pagehide',close,{once:true});window.addEventListener('pageshow',onShow);
 return {close,read:()=>({retired,pending:client.pending(),observationErrors:[...observationErrors,...client.observationErrors()]})};
}

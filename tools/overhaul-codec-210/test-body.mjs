import {MeshoptDecoder,GLTFLoader} from 'three-stdlib';
const check=(ok,message,operands)=>{if(!ok){const e=Error(message);e.operands=operands;throw e;}},hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''),sha=async b=>hex(await crypto.subtle.digest('SHA-256',b));
export async function run(assets,{records,ownership,owner}){
 const decoder=MeshoptDecoder(),rows=[],started=performance.now();await decoder.ready;
 check(typeof decoder.decodeGltfBufferAsync==='function','Barrel import did not share installed async decoder');
 let first=null;
 for(const asset of assets){
  const b=await(await fetch(asset.url)).arrayBuffer(),before=await sha(b);check(before===asset.sha256,'Private asset source hash changed',{path:asset.path,before,expected:asset.sha256});
  const dv=new DataView(b),jsonLength=dv.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(new Uint8Array(b,20,jsonLength))),binStart=20+jsonLength+8,binLength=dv.getUint32(20+jsonLength,true),original=new Uint8Array(b).slice();let n=0;
  for(let index=0;index<(j.bufferViews??[]).length;index++){
   const v=j.bufferViews[index].extensions?.EXT_meshopt_compression;if(!v)continue;
   check(v.buffer===0,'Unsupported external source buffer',{path:asset.path,index,v});
   const offset=binStart+(v.byteOffset??0);check(offset>=binStart&&offset+v.byteLength<=binStart+binLength,'Compressed view outside actual BIN',{index,v,binLength});
   const source=new Uint8Array(b,offset,v.byteLength),target=new Uint8Array(v.count*v.byteStride),t=performance.now();decoder.decodeGltfBuffer(target,v.count,v.byteStride,source,v.mode,v.filter);const syncMs=performance.now()-t;
   const output=await decoder.decodeGltfBufferAsync(v.count,v.byteStride,source,v.mode,v.filter);
   check(b.byteLength===original.length&&source.byteLength===v.byteLength,'Original source buffer detached',{path:asset.path,index});
   check(output instanceof Uint8Array&&output.byteOffset===0&&output.byteLength===target.length&&output.buffer.byteLength===target.length,'Incomplete output backing buffer',{path:asset.path,index});
   let mismatch=-1;for(let k=0;k<target.length;k++)if(target[k]!==output[k]){mismatch=k;break;}
   check(mismatch===-1,'Actual numerical decoded bytes differ',{path:asset.path,index,mismatch,expected:target[mismatch],observed:output[mismatch],v});
   rows.push({path:asset.path,index,count:v.count,stride:v.byteStride,mode:v.mode,filter:v.filter??null,sourceBytes:v.byteLength,decodedBytes:target.length,sha256:await sha(target),syncMs,receipt:records.at(-1)});n++;
  }
  let changed=-1;for(let k=0;k<original.length;k++)if(original[k]!==new Uint8Array(b)[k]){changed=k;break;}
  const after=await sha(b);check(changed===-1&&after===before,'Full original GLB/adjacent BIN bytes changed',{path:asset.path,changed,before,after});check(n===asset.meshoptViews,'Meshopt resource count differs',{path:asset.path,n,expected:asset.meshoptViews});
  if(!first&&n)first={b,path:asset.path};
 }
 // Actual installed loader invocation: texture-free Sentinel has no browser
 // texture API or WebGL prerequisite, and must select the same async method.
 const prior=records.filter(r=>r.kind==='ACTUAL_DECODE_TASK').length,t=performance.now();
 const gltf=await new Promise((resolve,reject)=>new GLTFLoader().setMeshoptDecoder(decoder).parse(first.b,'',resolve,reject));
 const loaderTasks=records.filter(r=>r.kind==='ACTUAL_DECODE_TASK').length-prior;
 check(loaderTasks>0&&gltf.animations.length===17,'Actual GLTFLoader async branch not observed',{loaderTasks,animations:gltf.animations.length});
 const loader={path:first.path,tasks:loaderTasks,animations:gltf.animations.length,elapsedMs:performance.now()-t};
 // Deliberately invalid numerical mode is an expected ownership test after all
 // protected resources passed. It must reject and retire, never sync fallback.
 let taskError=null;try{await decoder.decodeGltfBufferAsync(1,4,new Uint8Array([1]),'INVALID_EXPECTED_TEST','NONE');}catch(e){taskError=String(e);}
 check(taskError!==null,'Expected invalid-codec task unexpectedly succeeded');
 let retiredError=null;try{await decoder.decodeGltfBufferAsync(1,4,new Uint8Array([1]),'ATTRIBUTES','NONE');}catch(e){retiredError=String(e);}
 check(retiredError?.includes('owner closed'),'Failed worker ownership restarted',{retiredError});
 window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
 check(ownership.created===1&&ownership.terminated===1&&owner.read().retired&&owner.read().pending===0,'Worker ownership not closed exactly once',{ownership,owner:owner.read()});
 return {status:'PASS',rows,loader,ownership,taskError,retiredError,records,owner:owner.read(),elapsedMs:performance.now()-started,scope:'Private actual resource codec equivalence, no WebGL/gameplay/sustained FPS/GPU timing'};
}

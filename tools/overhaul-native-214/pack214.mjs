/** NOT EXECUTED. One future root-approved CPU15 packing candidate.
 * Direct JSON surgery; no NodeIO serialization, quantization or index reorder. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {readGLB206,hash206} from '../overhaul-delivery-206/convert206.mjs';
import {encode209} from '../overhaul-delivery-209/convert209.mjs';
export const input214='tools/overhaul-delivery-209/output/Pounce_Anatomy209.glb';
export const inputSHA214='64cc5c99ffb7ca038c20e56b50e0281643559cd44db2fd92deab48ca134864e7';
const ext='EXT_meshopt_compression',equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export async function preparePack214(source,operands=[]){
 const doc=structuredClone(source.doc),original=source.doc,accessors=new Set(),indexAccessors=new Set(),views=new Set();
 if(doc.extensionsUsed?.includes(ext)||doc.accessors.some(a=>a.sparse)||doc.bufferViews.some(v=>v.extensions)||doc.buffers.length!==1)throw Error('214_UNSUPPORTED_SOURCE_BUFFER_LAYOUT');
 for(const m of doc.meshes)for(const p of m.primitives){for(const v of Object.values(p.attributes))accessors.add(v);if(p.indices!==undefined){accessors.add(p.indices);indexAccessors.add(p.indices);}for(const t of p.targets??[])for(const v of Object.values(t))accessors.add(v);}
 for(const s of doc.skins)if(s.inverseBindMatrices!==undefined)accessors.add(s.inverseBindMatrices);
 // Delete unused samplers inside each action before tracing live accessors.
 for(const a of doc.animations){const used=[...new Set(a.channels.map(c=>c.sampler))].sort((a,b)=>a-b),mapping=new Map(used.map((v,i)=>[v,i]));a.samplers=used.map(i=>a.samplers[i]);for(const c of a.channels)c.sampler=mapping.get(c.sampler);for(const s of a.samplers){accessors.add(s.input);accessors.add(s.output);}}
 for(const i of accessors){const a=doc.accessors[i];if(!a||a.bufferView===undefined)throw Error('214_ACCESSOR_MISSING_VIEW');views.add(a.bufferView);}
 for(const i of doc.images??[])if(i.bufferView!==undefined)views.add(i.bufferView);
 const accessorOrder=[...accessors].sort((a,b)=>a-b),accessorMap=new Map(accessorOrder.map((i,j)=>[i,j])),viewOrder=[...views].sort((a,b)=>a-b),viewMap=new Map(viewOrder.map((i,j)=>[i,j]));
 for(const m of doc.meshes)for(const p of m.primitives){for(const k of Object.keys(p.attributes))p.attributes[k]=accessorMap.get(p.attributes[k]);if(p.indices!==undefined)p.indices=accessorMap.get(p.indices);for(const t of p.targets??[])for(const k of Object.keys(t))t[k]=accessorMap.get(t[k]);}
 for(const s of doc.skins)if(s.inverseBindMatrices!==undefined)s.inverseBindMatrices=accessorMap.get(s.inverseBindMatrices);
 for(const a of doc.animations)for(const s of a.samplers){s.input=accessorMap.get(s.input);s.output=accessorMap.get(s.output);}
 for(const i of doc.images??[])if(i.bufferView!==undefined)i.bufferView=viewMap.get(i.bufferView);
 doc.accessors=accessorOrder.map(i=>({...original.accessors[i],bufferView:viewMap.get(original.accessors[i].bufferView)}));
 const parts=[],decoded=new Map();let cursor=0,virtualCursor=0;
 const append=b=>{const pad=(4-cursor%4)%4;if(pad){parts.push(Buffer.alloc(pad));cursor+=pad;}const at=cursor;parts.push(b);cursor+=b.length;return at;};
 await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
 doc.bufferViews=viewOrder.map(oldIndex=>{
  const old=original.bufferViews[oldIndex],bytes=source.bin.subarray(old.byteOffset??0,(old.byteOffset??0)+old.byteLength),a=accessorOrder.filter(i=>original.accessors[i].bufferView===oldIndex);
  if(old.buffer!==0||bytes.length!==old.byteLength)throw Error('214_BUFFER_VIEW_RANGE');
  const image=(original.images??[]).some(i=>i.bufferView===oldIndex),isIndex=a.length>0&&a.every(i=>indexAccessors.has(i));
  let stride=old.byteStride??4,mode='ATTRIBUTES';
  if(isIndex){const types=new Set(a.map(i=>original.accessors[i].componentType));if(types.size!==1||![5123,5125].includes([...types][0])||old.byteStride)throw Error('214_INDEX_LAYOUT');stride=[...types][0]===5123?2:4;mode='INDICES';}
  if(image){const offset=append(Buffer.from(bytes));decoded.set(oldIndex,bytes);operands.push({view:oldIndex,rawBytes:bytes.length,mode:'UNCOMPRESSED_IMAGE'});return {...old,buffer:0,byteOffset:offset};}
  if(stride%4!==0&&mode!=='INDICES'||stride<=0||stride>256||bytes.length%stride)throw Error('214_UNSUPPORTED_LOSSLESS_STRIDE');
  const count=bytes.length/stride,encoded=Buffer.from(MeshoptEncoder.encodeGltfBuffer(bytes,count,stride,mode)),decodedBytes=new Uint8Array(bytes.length);
  MeshoptDecoder.decodeGltfBuffer(decodedBytes,count,stride,encoded,mode,'NONE');
  const operand={view:oldIndex,rawBytes:bytes.length,encodedBytes:encoded.length,count,stride,mode,filter:'NONE',exact:Buffer.from(decodedBytes).equals(bytes)};operands.push(operand);if(!operand.exact)throw Error('214_DECODED_VIEW_BYTES_CHANGED');
  decoded.set(oldIndex,Buffer.from(decodedBytes));const offset=append(encoded),pad=(4-virtualCursor%4)%4;virtualCursor+=pad;const virtualOffset=virtualCursor;virtualCursor+=bytes.length;
  return {...old,buffer:1,byteOffset:virtualOffset,extensions:{[ext]:{buffer:0,byteOffset:offset,byteLength:encoded.length,byteStride:stride,count,mode,filter:'NONE'}}};
 });
 // Required meshopt: compressed views intercept virtual fallback buffer access
 // in actual Three GLTFLoader. Images remain in embedded physical buffer0.
 doc.buffers=[{byteLength:cursor},{byteLength:virtualCursor,extensions:{[ext]:{fallback:true}}}];doc.extensionsUsed=[...new Set([...(doc.extensionsUsed??[]),ext])];doc.extensionsRequired=[...new Set([...(doc.extensionsRequired??[]),ext])];
 for(const key of ['nodes','scenes','scene','materials','textures','samplers','asset'])if(!equal(original[key],doc[key]))throw Error('214_PROTECTED_JSON_CHANGED:'+key);
 const ref=a=>{const r=structuredClone(a);r.bufferView=viewMap.get(r.bufferView);return r;};
 if(!equal(accessorOrder.map(i=>ref(original.accessors[i])),doc.accessors))throw Error('214_ACCESSOR_SEMANTICS_CHANGED');
 // Every retained byte of every referenced view was compared, including actual
 // mesh indices/order, float weights/UVs/rest IBMs and all45 clocks/value arrays.
 if(decoded.size!==viewOrder.length||doc.animations.length!==45)throw Error('214_INCOMPLETE_LIVE_BUFFER_EQUIVALENCE');
 let bin=Buffer.concat(parts);if(bin.length%4)bin=Buffer.concat([bin,Buffer.alloc(4-bin.length%4)]);return {doc,bin,liveViews:viewOrder.length,liveAccessors:accessorOrder.length,removedViews:original.bufferViews.length-viewOrder.length,removedAccessors:original.accessors.length-accessorOrder.length,original39LawsPreserved:true,semanticMaps:{accessorOrder,viewOrder}};
}
export async function pack214(){
 const folder='tools/overhaul-native-214',receipt={status:'INCOMPLETE',operands:[],contactQualified:false};let failure;
 try{const bytes=await readFile(input214);if(hash206(bytes)!==inputSHA214)throw Error('214_INPUT_SHA');const prepared=await preparePack214(readGLB206(bytes),receipt.operands),out=encode209(prepared);await mkdir(folder+'/output',{recursive:true});const path=folder+'/output/Pounce_Anatomy214.glb';await writeFile(path,out,{flag:'wx'});Object.assign(receipt,{status:'LOSSLESS_PACK_UNADMITTED_PRIMARY_REQUIRED',input:{path:input214,sha256:inputSHA214,bytes:bytes.length},output:{path,sha256:hash206(out),bytes:out.length},liveViews:prepared.liveViews,liveAccessors:prepared.liveAccessors,removedViews:prepared.removedViews,removedAccessors:prepared.removedAccessors,semanticMaps:prepared.semanticMaps});}catch(e){failure=e;receipt.error=String(e.stack??e);}finally{await writeFile(folder+'/pack214-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});}if(failure)throw failure;return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){if(!process.argv.includes('--root-approved'))throw Error('214_ACTUAL_PACK_NOT_APPROVED');console.log(JSON.stringify(await pack214()));}

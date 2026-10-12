/** Asset page lifetime owner, independent of native simulation/life ownership. */
export function createDecoderClient208(worker,{timeoutMs=20000,now=()=>performance.now(),onReceipt=()=>{}}={}){
 let serial=0,closed=false;const pending=new Map(),observationErrors=[];
 const fail=reason=>{if(closed)return;closed=true;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(reason));}pending.clear();worker.terminate();};
 worker.onerror=e=>fail('208 decoder worker error: '+(e.message??'unknown'));
 worker.onmessage=e=>{const m=e.data,p=pending.get(m.id);if(!p){fail('208 unknown/duplicate decoder worker result');return;}pending.delete(m.id);clearTimeout(p.timer);
  if(m.error){p.reject(Error(m.error));fail('208 decoder task failure');return;}
  if(!(m.buffer instanceof ArrayBuffer)||m.buffer.byteLength!==p.expected){p.reject(Error('208 decoded byte count changed'));fail('208 decoded byte count changed');return;}
  try{onReceipt({id:m.id,count:p.count,stride:p.stride,mode:p.mode,bytes:p.expected,roundTripMs:now()-p.at,workerDecodeMs:m.decodeMs,workerQueueMs:m.queueMs});}catch(error){if(observationErrors.length<32)observationErrors.push(String(error));}p.resolve(new Uint8Array(m.buffer));};
 const decode=(count,stride,source,mode,filter)=>{
  if(closed)return Promise.reject(Error('208 decoder owner closed'));
  if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(stride)||stride<=0||!Number.isSafeInteger(count*stride)||!(source instanceof Uint8Array))return Promise.reject(Error('208 invalid resource schema'));
  // Copy only the actual source view. Transfer this owned copy; never detach
  // the retained GLB BIN/shared source backing buffer or adjacent attributes.
  const copy=source.slice(),id=++serial,at=now();
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>fail('208 resource decode exceeded unchanged20s readiness budget'),timeoutMs);pending.set(id,{resolve,reject,timer,at,count,stride,mode,expected:count*stride});
   try{worker.postMessage({id,count,stride,mode,filter,source:copy.buffer,postedWall:performance.timeOrigin+performance.now()},[copy.buffer]);}catch(error){fail('208 postMessage failed: '+String(error));}});
 };
 return {decode,close:()=>fail('208 page decoder closed'),pending:()=>pending.size,observationErrors:()=>[...observationErrors]};
}

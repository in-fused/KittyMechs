from pathlib import Path
import hashlib,json
p=Path('tools/overhaul-loading-208')
preimages=['HANDOFF.md','decoder-client.mjs','install-decoder.proposed.mjs']
snapshot=p/'initial-closed-snapshot'
snapshot.mkdir(exist_ok=False)
for name in preimages:
 (snapshot/name).write_bytes((p/name).read_bytes())
(snapshot/'loading208-diagnosis.md').write_bytes(Path('docs/overhaul/loading208-diagnosis.md').read_bytes())
s=(p/'decoder-client.mjs').read_text(encoding='utf-8')
s=s.replace('let serial=0,closed=false;const pending=new Map();','let serial=0,closed=false;const pending=new Map(),observationErrors=[];')
s=s.replace('  onReceipt({id:m.id,count:p.count,stride:p.stride,mode:p.mode,bytes:p.expected,roundTripMs:now()-p.at,workerDecodeMs:m.decodeMs,workerQueueMs:m.queueMs});p.resolve(new Uint8Array(m.buffer));};','  try{onReceipt({id:m.id,count:p.count,stride:p.stride,mode:p.mode,bytes:p.expected,roundTripMs:now()-p.at,workerDecodeMs:m.decodeMs,workerQueueMs:m.queueMs});}catch(error){if(observationErrors.length<32)observationErrors.push(String(error));}p.resolve(new Uint8Array(m.buffer));};')
s=s.replace('pending:()=>pending.size','pending:()=>pending.size,observationErrors:()=>[...observationErrors]')
(p/'decoder-client.reviewed.mjs').write_text(s,encoding='utf-8')

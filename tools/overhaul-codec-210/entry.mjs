import {installDecoder208} from '../overhaul-loading-208/install-decoder.reviewed.mjs';
const records=[],ownership={created:0,terminated:0},NativeWorker=window.Worker;
window.Worker=class extends NativeWorker{constructor(...args){super(...args);ownership.created++;}terminate(){ownership.terminated++;return super.terminate();}};
let owner;
try{owner=installDecoder208({record:r=>records.push(r)});}finally{window.Worker=NativeWorker;}
window.runCodec210=async assets=>{const test=await import('./test-body.mjs');return test.run(assets,{records,ownership,owner});};
window.closeCodec210=()=>owner.close();

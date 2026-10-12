import {readFile,writeFile} from 'node:fs/promises';
import {createDelivery225} from './delivery-factory225.mjs';
import {verifyRetirement225} from './verify-retirement225.mjs';
const path='tools/overhaul-pack-221/loader-evidence/evidence.json',digest='4ec83d8df252390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232',proof=JSON.parse(await readFile(path,'utf8'));
const actual=await createDelivery225({loaderReceiptPath:path,loaderReceiptSHA256:digest});
const rows=[];
for(const [name,p,pth,hash] of [['no timeout', {...proof,cleanupErrors:[]},path,digest],['other cleanup error',{...proof,cleanupErrors:['different']},path,digest],['two errors',{...proof,cleanupErrors:[...proof.cleanupErrors,...proof.cleanupErrors]},path,digest],['connected',{...proof,browserConnected:true},path,digest],['different path',proof,path+'x',digest],['different hash',proof,path,'0'.repeat(64)]]){let rejected=false,error;try{await verifyRetirement225(p,pth,hash);}catch(e){rejected=true;error=String(e);}if(!rejected)throw Error('225 negative case accepted '+name);rows.push({name,rejected,error});}
await writeFile('tools/overhaul-native-admission-225/static-receipt.json',JSON.stringify({scope:'PURE_EXISTING_RECEIPT_ADMISSION_CHECKS_NO_BROWSER_NATIVE_OR_BUILD_JOB',status:'PASS',positive:{actorAssetURL:actual.actorAssetURL,assetSHA256:actual.delivery.contract.sha256,clips:Object.keys(actual.delivery.contract.clips).length,bones:actual.delivery.contract.bones.length,retirement:actual.retirement},negativeCases:rows},null,2),{flag:'wx'});
console.log(JSON.stringify({status:'PASS',actualValueBinding:true,negativeCases:rows.length,originalJobRemainsFailed:true}));

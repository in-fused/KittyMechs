import {createDelivery268,receiptPath268,receiptSHA268} from './delivery-factory268.mjs';
import {writeFile} from 'node:fs/promises';
const bound=await createDelivery268({loaderReceiptPath:receiptPath268,loaderReceiptSHA256:receiptSHA268});let missingRejected=false,wrongRejected=false;
try{await createDelivery268();}catch{missingRejected=true;}try{await createDelivery268({loaderReceiptPath:receiptPath268,loaderReceiptSHA256:'0'.repeat(64)});}catch{wrongRejected=true;}
if(!missingRejected||!wrongRejected)throw Error('268 missing/wrong qualification must fail');
const r={writer:'CLOSED',scope:'STATIC_FACTORY_BINDING_ONLY_NO_GAME_BROWSER_JOB',actorAssetURL:bound.actorAssetURL,assetSHA:bound.delivery.contract.sha256,clipCount:Object.keys(bound.delivery.contract.clips).length,boneCount:bound.delivery.contract.bones.length,retirement:bound.retirement,missingRejected,wrongRejected,contactQualified:false};await writeFile('tools/overhaul-feline-admission-268/factory-check268.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));

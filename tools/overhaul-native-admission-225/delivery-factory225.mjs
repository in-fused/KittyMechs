import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startupSelectedAsset220} from '../overhaul-startup-220/selected-asset.mjs';
import {verifyRetirement225} from './verify-retirement225.mjs';
export const packedSHA222='5147c2c2e46f4b2328d5d97ac091da70204244cb68882592d6328cec53489473',rawSHA222='64cc5c99ffb7ca038c20e56b50e0281643559cd44db2fd92deab48ca134864e7',publicURL222='/assets/private/Pounce_Anatomy221.glb';
const pass='PACK_ARRAY_AND_ACTUAL_LOADER_EQUIVALENCE_PASS_UNADMITTED_GAMEPLAY',sha=b=>createHash('sha256').update(b).digest('hex');
/** No import-time asset qualification and no pending/default proof. */
export async function createDelivery225({loaderReceiptPath,loaderReceiptSHA256,packedAssetPath='tools/overhaul-pack-221/output/Pounce_Anatomy221.glb'}={}){
 if(!loaderReceiptPath||!/^[a-f0-9]{64}$/.test(loaderReceiptSHA256??''))throw Error('222 actual root-verified loader receipt required; pending rejected');
 const proofBytes=await readFile(loaderReceiptPath);if(sha(proofBytes)!==loaderReceiptSHA256)throw Error('222 loader receipt identity changed');const proof=JSON.parse(proofBytes),result=proof.result;
 if(proof.status!==pass||result?.status!==pass||proof.persistenceStage!=='RESULT_AND_BOUNDED_CLEANUP'||proof.browserConnected!==false||proof.contactQualified!==false||['errors','consoleErrors','requestFailures','httpErrors'].some(key=>!Array.isArray(proof[key])||proof[key].length!==0)||proof.inputs?.source?.sha256!==rawSHA222||proof.inputs?.packed?.sha256!==packedSHA222||proof.contract?.sha256!==packedSHA222||proof.contract?.publicURL!==publicURL222)throw Error('222 actual221 proof incomplete/failed/cleanup or identity mismatch');
 if(result.boneCount!==61||result.primitives!==4||result.clips!==45||result.nativeOwnerStepped!==false||!result.arrays?.length||!result.loadedClips?.length||!result.loadedGeometry?.length||!result.loadedRig?.length||result.arrays.some(row=>!row.metadataEqual||row.mismatch)||result.loadedClips.some(row=>row.timeMismatch||row.valueMismatch)||result.loadedGeometry.some(row=>row.mismatch)||!result.ownerConstructor?.browserClipContract?.passed||result.ownerConstructor?.fatal)throw Error('222 actual all-array/loader61/4/45 proof required');
 const retirement=await verifyRetirement225(proof,loaderReceiptPath,loaderReceiptSHA256);
 const bytes=await readFile(packedAssetPath);if(sha(bytes)!==packedSHA222||bytes.length!==6441480)throw Error('222 packed served artifact changed');
 const contract=JSON.parse(await readFile('tools/overhaul-native-214/raw209-contract214.json','utf8'));contract.publicURL=publicURL222;contract.sha256=packedSHA222;
 if(contract.bones.length!==61||Object.keys(contract.clips).length!==45||contract.expectedPrimitives!==4||contract.scale!==.8)throw Error('222 retained raw metadata contract changed');
 const delivery={contract,qualification:{privateOnly:true,packedFromSHA256:rawSHA222,allArrayLoaderReceiptSHA256:loaderReceiptSHA256}};const actorAssetURL=startupSelectedAsset220(delivery);
 return {delivery,actorAssetURL,packedAssetPath,loaderReceiptPath,loaderReceiptSHA256,retirement,qualificationScope:'ACTUAL_ARRAY_LOADER_ONLY_NATIVE_BODY_BASIS_UNKNOWN_CONTACT_FALSE'};
}

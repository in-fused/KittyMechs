import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const rawPath='tools/overhaul-pack-221/loader-evidence/evidence.json';
const rawSHA='4ec83d8df252390f3cc991689229bf04861a2cb0effe8f3bd0a0baf7ef2d6232';
const inputs={
 supervisor:['tools/overhaul-pack-221/loader-supervisor/process-receipt.json','8d128ed73c922aeea91dc2b021dba3acf35464b28ed6eb0592e754cddd26c49a'],
 protected:['tools/overhaul-pack-221/loader-supervisor/protected-after.json','35e33761d8eaced0ccf8eb142730bebf5f358b20a891c95fd5c666ab80352111'],
 closure:['tools/overhaul-pack-closure-224/final-native-closure224.json','b68c881274d231ac6f14a507ba8447eed67a611f61a67d2e97bf4a13493fa1a0'],
 critic:['docs/overhaul/critic/pack221-actual-review.md','1103848b5e641b58b7cfbf61a3efe5155e101af3a3509dee1ec043145132f3e0'],
};
/** Exact failed-run admission only. This never converts the old job into PASS,
 * erases its timeout, or claims retirement within the old cleanup deadline. */
export async function verifyRetirement225(proof,path,digest){
 if(path!==rawPath||digest!==rawSHA||proof.cleanupErrors?.length!==1||proof.cleanupErrors[0]!=='Error: 221_CLEANUP_OPERATION_TIMEOUT'||proof.browserConnected!==false)throw Error('225 only exact immutable timeout-only value proof admitted');
 const data={};
 for(const [key,[name,expected]] of Object.entries(inputs)){const b=await readFile(name);if(sha(b)!==expected)throw Error('225 admission evidence changed '+name);data[key]=key==='critic'?b.toString('utf8'):JSON.parse(b);}
 if(!data.critic.includes('ACCEPT_221_ASSET_VALUE_EQUIVALENCE_ONLY'))throw Error('225 independent asset-value admission missing');
 const s=data.supervisor,c=data.closure;
 if(s.exitCode!==1||s.failure!==null||s.protectedMatch!==true||s.capSeconds!==30||s.inclusiveBoundObserved!==true||s.elapsedSeconds>30||s.finalOriginalIdentitiesAbsent!==false||c.writer!=='CLOSED'||c.originalJobExitCode!==1||c.originalCleanupTimeoutRetained!==true||c.originalIntermediate357904Retained!==true||c.allOwnedOriginalIdentitiesAbsentOrExited!==true||c.qualityAndGameplayAccepted!==false)throw Error('225 exact original failure and later closure required');
 if(c.nativeHealthAfter.status!=='ok'||c.nativeHealthAfter.rooms!==0||c.nativeHealthAfter.players!==0||c.nativeHealthAfter.tickRate!==60)throw Error('225 later native server not idle');
 const owned=Object.entries(s.ownedPIDCreationTimes);if(owned.length!==11||c.ownedFinal.length!==owned.length||new Set(c.ownedFinal.map(r=>r.pid)).size!==owned.length)throw Error('225 complete owned identity inventory required');
 for(const [pid,creation] of owned){const row=c.ownedFinal.find(r=>r.pid===Number(pid));if(!row||row.expectedCreation!==creation||!((row.originalAbsent===true&&row.openError===87)||(row.currentCreation===creation&&row.originalExited===true&&row.waitResult===0)))throw Error('225 original identity not demonstrably retired '+pid);}
 const still=s.ownedAfter['357904'];if(still.creationBefore!==134362318094110207||still.creationAfter!==still.creationBefore||still.originalIdentityAbsent!==false)throw Error('225 historical retained process object must remain explicit');
 for(const row of data.protected){if(row.match!==true||row.expected!==row.actual||sha(await readFile(row.path))!==row.expected)throw Error('225 protected asset/source changed '+row.path);}
 return {scope:'ASSET_VALUE_ADMISSION_ONLY_WITH_EXPLICIT_FAILED_CLEANUP_AND_LATER_NATIVE_RETIREMENT',originalJobExitCode:1,originalCleanupOperation:'UNKNOWN_CONTEXT_OR_BROWSER_OPERATION',originalCleanupTimeoutPreserved:true,originalCleanupDeadlinePassed:false,laterOwnedRetirement:{absent:10,sameIdentitySignaledExited:1},rawEvidenceSHA256:rawSHA,closureSHA256:inputs.closure[1],independentAssetCriticSHA256:inputs.critic[1],nativeGameplayContactArtPerformanceAccepted:false};
}

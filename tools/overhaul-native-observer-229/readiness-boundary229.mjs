import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ready219227,nativeFault227} from '../overhaul-native-observer-228/guards.mjs';
const path='.sites-runtime/overhaul-20261011/native228-public/evidence.json',bytes=await readFile(path),digest=createHash('sha256').update(bytes).digest('hex');
if(digest!=='ea4318287ff1e9e4cd54d457d6bf0a2b52c009bbc062a7a6c17bee2d18af7f26')throw Error('Exact actual228 evidence changed');
const e=JSON.parse(bytes),submission=e.events.find(x=>x.label==='guest-submit'),rows=e.events.filter(x=>x.pilot==='Native228Guest'&&x.label==='readiness').map(x=>({wallMs:x.wallMs,beforeDeadline:x.wallMs<submission.deadlineWallMs,diagnosticsReady:ready219227(x),nativeFault:nativeFault227(x,e.packedSHA,true),sceneReady:x.localReadiness?.scene?.ready,nativeACK:x.actor?.lastInput}));
const first=rows.find(x=>x.beforeDeadline&&x.diagnosticsReady&&x.nativeFault===null);if(first?.wallMs!==41246)throw Error('Exact before-deadline qualified boundary differs');
await writeFile('tools/overhaul-native-observer-229/readiness-boundary.json',JSON.stringify({writer:'CLOSED',rawEvidenceSHA256:digest,submission,rows,firstPreDeadlineQualifiedRow:first,remainingMs:submission.deadlineWallMs-first.wallMs,canvasClickCompletion:'UNOBSERVED',completeReadiness:'FAILED_ORIGINAL20S_NO_WAIVER',motionCases:0},null,2)+'\n');
console.log(JSON.stringify({qualifiedWallMs:first.wallMs,deadlineWallMs:submission.deadlineWallMs,remainingMs:submission.deadlineWallMs-first.wallMs,completeReadiness:'FAILED'}));

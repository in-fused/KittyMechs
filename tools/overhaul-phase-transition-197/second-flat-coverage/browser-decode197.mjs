import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const dir='tools/overhaul-phase-transition-197';
const started=Date.now(),evidence={scope:'Actual browser GLTFLoader and cubic interpolants, decoded source-space floors only; no native gameplay or affected-IAB lag claim',errors:[]};
let browser,context;const deadline=setTimeout(()=>{console.error('197 30s cap');process.exit(2);},30000);
try{
 const bundle=await readFile(dir+'/browser-bundle197.js'),asset=await readFile(dir+'/output/Pounce_Motion197.glb');
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext();const page=await context.newPage();
 const baseline=await readFile('tools/player-animation-package-196/Pounce_Motion196.glb');await page.route('**/review197-baseline.glb',r=>r.fulfill({status:200,contentType:'model/gltf-binary',body:baseline}));
 await page.route('**/review197-candidate.glb',r=>r.fulfill({status:200,contentType:'model/gltf-binary',body:asset}));
 await page.route('**/review197.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:bundle}));
 await page.route('**/private-review197',r=>r.fulfill({status:200,contentType:'text/html',body:'<!DOCTYPE html><script src="/review197.js"></script>'}));
 page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/private-review197');
 const manifest=JSON.parse(await readFile('src/game/entities/identity57Runtime121Manifest.json','utf8')),records=JSON.parse(await readFile('assets/source/overhaul-phase-transition-197/authored-motion-records197.json','utf8'));
 const baselineRecords=JSON.parse(await readFile('assets/source/overhaul-stance-gait-194/authored-motion-records194.json','utf8'));evidence.measurement=await page.evaluate(async({manifest,records,baselineRecords})=>await window.review197(manifest,records,baselineRecords),{manifest,records,baselineRecords});
 evidence.status=evidence.measurement.status; if(evidence.errors.length||evidence.status!=='SOURCE_TASK_PASS_UNADMITTED_CONTACT_UNQUALIFIED')process.exitCode=1;
}catch(e){evidence.status='INCOMPLETE';evidence.failure=String(e.stack??e);process.exitCode=1;}
finally{clearTimeout(deadline);await context?.close();await browser?.close();evidence.browserConnected=browser?.isConnected()??false;evidence.elapsedMs=Date.now()-started;await writeFile(dir+'/browser-decode197-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({status:evidence.status,elapsedMs:evidence.elapsedMs,failure:evidence.failure,errors:evidence.errors,floors:evidence.measurement?.maximumLoadedSourceFloor,mixedR:evidence.measurement?.mixedRLoadedFloorMax}));}

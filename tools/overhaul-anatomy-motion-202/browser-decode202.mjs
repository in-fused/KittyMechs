import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const dir='tools/overhaul-anatomy-motion-202';
const started=Date.now(),evidence={scope:'Actual browser GLTFLoader and cubic interpolants, decoded source-space floors only; no native gameplay or affected-IAB lag claim',errors:[]};
let browser,context;const deadline=setTimeout(()=>{console.error('202 30s cap');process.exit(2);},30000);
try{
 const bundle=await readFile(dir+'/browser-bundle202.js'),asset=await readFile(dir+'/output/Pounce_Anatomy202.glb');
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext();const page=await context.newPage();
 const baseline=await readFile('tools/overhaul-phase-transition-197/output/Pounce_Motion197.glb');await page.route('**/review202-baseline.glb',r=>r.fulfill({status:200,contentType:'model/gltf-binary',body:baseline}));
 await page.route('**/review202-candidate.glb',r=>r.fulfill({status:200,contentType:'model/gltf-binary',body:asset}));
 await page.route('**/review202.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:bundle}));
 await page.route('**/private-review202',r=>r.fulfill({status:200,contentType:'text/html',body:'<!DOCTYPE html><script src="/review202.js"></script>'}));
 page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/private-review202');
 const manifest=JSON.parse(await readFile('src/game/entities/identity57Runtime121Manifest.json','utf8')),records=JSON.parse(await readFile('assets/source/overhaul-anatomy-motion-202/authored-motion-records202.json','utf8'));
 const baselineRecords=JSON.parse(await readFile('assets/source/overhaul-phase-transition-197/authored-motion-records197.json','utf8'));evidence.measurement=await page.evaluate(async({manifest,records,baselineRecords})=>await window.review202(manifest,records,baselineRecords),{manifest,records,baselineRecords});
 evidence.status=evidence.measurement.status;if(evidence.measurement.actualCatalog)await writeFile(dir+'/decoded-catalog202.json',JSON.stringify({asset:'PRIVATE_SOURCE_UNADMITTED',clips:evidence.measurement.actualCatalog,rig:evidence.measurement.loadedRig,anatomicalBasis:evidence.measurement.anatomicalBasis},null,2)); if(evidence.errors.length||evidence.status!=='SOURCE_TASK_PASS_UNADMITTED_CONTACT_UNQUALIFIED')process.exitCode=1;
}catch(e){evidence.status='INCOMPLETE';evidence.failure=String(e.stack??e);process.exitCode=1;}
finally{clearTimeout(deadline);await context?.close();await browser?.close();evidence.browserConnected=browser?.isConnected()??false;evidence.elapsedMs=Date.now()-started;await writeFile(dir+'/browser-decode202-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({status:evidence.status,elapsedMs:evidence.elapsedMs,failure:evidence.failure,errors:evidence.errors,floors:evidence.measurement?.maximumLoadedSourceFloor,mixedR:evidence.measurement?.mixedRLoadedFloorMax}));}

import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const dir='tools/player-animation-package-196';
const started=Date.now(),evidence={scope:'Actual browser GLTFLoader and cubic interpolants, decoded source-space floors only; no native gameplay or affected-IAB lag claim',errors:[]};
let browser,context;const deadline=setTimeout(()=>{console.error('196 45s cap');process.exit(2);},45000);
try{
 const bundle=await readFile(dir+'/browser-bundle196.js'),asset=await readFile(dir+'/Pounce_Motion196.glb');
 browser=await chromium.launch({channel:'msedge',headless:true});context=await browser.newContext();const page=await context.newPage();
 await page.route('**/review196-candidate.glb',r=>r.fulfill({status:200,contentType:'model/gltf-binary',body:asset}));
 await page.route('**/review196.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:bundle}));
 await page.route('**/private-review196',r=>r.fulfill({status:200,contentType:'text/html',body:'<!DOCTYPE html><script src="/review196.js"></script>'}));
 page.on('pageerror',e=>evidence.errors.push(String(e)));
 await page.goto('http://localhost:8799/private-review196');
 const manifest=JSON.parse(await readFile('src/game/entities/identity57Runtime121Manifest.json','utf8')),records=JSON.parse(await readFile('assets/source/overhaul-stance-gait-194/authored-motion-records194.json','utf8'));
 evidence.measurement=await page.evaluate(async({manifest,records})=>await window.review196(manifest,records),{manifest,records});
 evidence.status=evidence.measurement.status; if(evidence.errors.length||evidence.status!=='DENSE_DECODED_SOURCE_PASS_CONTACT_UNQUALIFIED')process.exitCode=1;
}catch(e){evidence.status='INCOMPLETE';evidence.failure=String(e.stack??e);process.exitCode=1;}
finally{clearTimeout(deadline);await context?.close();await browser?.close();evidence.browserConnected=browser?.isConnected()??false;evidence.elapsedMs=Date.now()-started;await writeFile(dir+'/browser-decode196-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({status:evidence.status,elapsedMs:evidence.elapsedMs,failure:evidence.failure,errors:evidence.errors,floors:evidence.measurement?.results.map(r=>({name:r.name,max:r.maxAbsLoadedSourceFloor})),mixedR:evidence.measurement?.mixedRLoadedFloorMax}));}

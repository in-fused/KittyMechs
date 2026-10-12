import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
const start=Date.now(),output=resolve('.sites-runtime/overhaul-20261011/codec210-actual'),bundle=resolve('.sites-runtime/overhaul-20261011/codec210-private/bundle'),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(output,{recursive:false});
const protectedRows=JSON.parse(await readFile('tools/overhaul-loading-208/protected-inputs.json','utf8')).files,sourceRows=JSON.parse(await readFile('tools/overhaul-codec-210/source-seal.json','utf8')).files;
const verify=async rows=>{const result=[];for(const row of rows){const b=await readFile(row.path);result.push({path:row.path,match:b.length===row.bytes&&hash(b)===row.sha256});}return result;};
const before=await verify([...protectedRows,...sourceRows]);if(before.some(r=>!r.match))throw Error('210 input preflight changed');
const preflight=JSON.parse(await readFile('.sites-runtime/overhaul-20261011/codec210-private/preflight.json','utf8'));if(preflight.status!=='PASS'||!preflight.sameModuleMainAndWorker||!preflight.oneModulePerBundle)throw Error('210 compile identity not admitted');
const assets=JSON.parse(await readFile('tools/overhaul-loading-208/asset-inventory.json','utf8')).assets,assetBuffers=[];
for(const a of assets){const b=await readFile(a.path);if(hash(b)!==a.sha256)throw Error('210 source asset identity changed');assetBuffers.push(b);}
let browser=null,context=null,page=null,result=null,failure=null;const cleanup=[],errors=[];
const bounded=async(label,fn,ms=3000)=>{let timer;try{await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' bounded close exceeded')),ms);})]);cleanup.push({label,status:'CLOSED'});}catch(e){cleanup.push({label,status:'FAILED',error:String(e)});}finally{clearTimeout(timer);}};
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 context=await browser.newContext();page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',async route=>{const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/__codec210/index')return route.fulfill({contentType:'text/html',body:'<!doctype html><script type="module" src="/__codec210/main.js"></script>'});
  const asset=/^\/__codec210\/asset(\d+)\.glb$/.exec(pathname);if(asset)return route.fulfill({contentType:'model/gltf-binary',body:assetBuffers[Number(asset[1])]});
  if(pathname.startsWith('/__codec210/')&&/^[\w.-]+\.js$/.test(basename(pathname)))return route.fulfill({contentType:'text/javascript',body:await readFile(resolve(bundle,basename(pathname)))});
  return route.abort();
 });
 let timer;try{result=await Promise.race([(async()=>{await page.goto('http://localhost:8799/__codec210/index',{waitUntil:'load',timeout:10000});await page.waitForFunction(()=>typeof window.runCodec210==='function',{timeout:10000});return page.evaluate(assets=>window.runCodec210(assets),assets.map((a,i)=>({...a,url:'/__codec210/asset'+i+'.glb'})));})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('210 work cap22s; reserve6s cleanup inside30')),Math.max(1,22000-(Date.now()-start)));})]);}finally{clearTimeout(timer);}
 if(errors.length)throw Error('210 unexpected pageerror '+errors[0]);
}catch(e){failure={error:String(e),operands:e.operands??null};}
finally{
 if(page)await bounded('worker owner',()=>page.evaluate(()=>window.closeCodec210?.()),1000);
 if(context)await bounded('context',()=>context.close(),2500);
 if(browser)await bounded('browser',()=>browser.close(),2500);
 const after=await verify([...protectedRows,...sourceRows]);
 const receipt={status:failure?'FIRST_ACTUAL_FAILURE_STOP':'PASS',startUTC:new Date(start).toISOString(),endUTC:new Date().toISOString(),elapsedMs:Date.now()-start,failure,result,cleanup,errors,inputsBefore:before,inputsAfter:after,scope:'Actual private numerical resource qualification; no game deployment or WebGL/GPU/steady FPS inference'};
 await writeFile(output+'/evidence.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,elapsedMs:receipt.elapsedMs,resources:result?.rows.length,loaderTasks:result?.loader.tasks,failure}));
 if(failure||after.some(x=>!x.match)||cleanup.some(x=>x.status!=='CLOSED'))process.exitCode=1;
}

import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),packet=path.join(root,'tools/overhaul-legacy-fixture-009');
const seal=JSON.parse(readFileSync(path.join(packet,'seal.json'),'utf8'));
for(const row of seal.rows){const hash=createHash('sha256').update(readFileSync(path.join(root,row.path))).digest('hex');if(hash!==row.sha256)throw new Error(`Frozen row mismatch: ${row.path}`);}
const started=Date.now(),results=[];
for(const name of ['baseline020','current008']){
 const cwd=path.join(root,'.sites-runtime/overhaul-20261010/legacy-fixture-009',name),args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run','--config','vitest.config.ts'];
 const receipt={name,startUtc:new Date().toISOString(),command:[process.execPath,...args],cwd};
 const child=spawn(process.execPath,args,{cwd,stdio:['ignore','pipe','pipe']});let output='',timedOut=false;
 child.stdout.on('data',b=>{output+=b.toString('utf8');});child.stderr.on('data',b=>{output+=b.toString('utf8');});
 const timer=setTimeout(()=>{timedOut=true;execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});},Math.min(26000,56000-(Date.now()-started)));
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});clearTimeout(timer);
 Object.assign(receipt,{pid:child.pid,endUtc:new Date().toISOString(),exitCode:code,timedOut});writeFileSync(path.join(cwd,'stdout.txt'),output);writeFileSync(path.join(cwd,'receipt.json'),JSON.stringify(receipt,null,2));results.push(receipt);
 if(timedOut||!output.includes('Test Files')||!readFileSync(path.join(cwd,'observation.json'),'utf8'))throw new Error(`Probe exception/timeout: ${name}`);
}
writeFileSync(path.join(root,'.sites-runtime/overhaul-20261010/legacy-fixture-009/result.json'),JSON.stringify({startUtc:new Date(started).toISOString(),endUtc:new Date().toISOString(),wallMs:Date.now()-started,status:'DIAGNOSTIC_ONLY_NO_QUALIFICATION',results},null,2));

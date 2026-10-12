import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),packet=path.join(root,'tools/overhaul-legacy-fixture-011');
const runtime=path.join(root,'.sites-runtime/overhaul-20261010/legacy-fixture-011');
const seal=JSON.parse(readFileSync(path.join(packet,'seal.json'),'utf8'));
const started=Date.now(),results=[];
function read(file){return JSON.parse(readFileSync(file,'utf8'));}
function persist(status,error){writeFileSync(path.join(runtime,'result.json'),JSON.stringify({startUtc:new Date(started).toISOString(),endUtc:new Date().toISOString(),wallMs:Date.now()-started,status,error:error?{name:error.name,message:error.message,stack:error.stack}:null,results},null,2));}
try{
  for(const row of seal.rows){const hash=createHash('sha256').update(readFileSync(path.join(root,row.path))).digest('hex');if(hash!==row.sha256)throw new Error(`Frozen row mismatch: ${row.path}`);}
  for(const name of ['baseline020','current008']){
    const cwd=path.join(runtime,name),args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run','--config','vitest.config.ts'];
    const receipt={name,startUtc:new Date().toISOString(),command:[process.execPath,...args],cwd};results.push(receipt);
    const child=spawn(process.execPath,args,{cwd,stdio:['ignore','pipe','pipe']});let output='',timedOut=false,killError=null,spawnError=null;
    const save=()=>{writeFileSync(path.join(cwd,'stdout.txt'),output);writeFileSync(path.join(cwd,'receipt.json'),JSON.stringify(receipt,null,2));};
    child.stdout.on('data',b=>{output+=b.toString('utf8');});child.stderr.on('data',b=>{output+=b.toString('utf8');});
    const timer=setTimeout(()=>{timedOut=true;try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});}catch(error){killError={name:error.name,message:error.message,stack:error.stack};Object.assign(receipt,{timedOut,killError});save();child.kill();}},Math.max(1,Math.min(26000,56000-(Date.now()-started))));
    const code=await new Promise(resolve=>{child.once('error',error=>{spawnError={name:error.name,message:error.message,stack:error.stack};resolve(null);});child.once('close',resolve);});clearTimeout(timer);
    Object.assign(receipt,{pid:child.pid,endUtc:new Date().toISOString(),exitCode:code,timedOut,killError,spawnError});save();
    if(timedOut||spawnError||killError||![0,1].includes(code))throw new Error(`Child runtime/timeout failure: ${name}`);
    const report=read(path.join(cwd,'vitest-report.json')),observer=read(path.join(cwd,'observer-errors.json')),observation=read(path.join(cwd,'observation.json')),errors=read(path.join(cwd,'runtime-errors.json'));
    if(!Array.isArray(observer.fatalErrors)||observer.fatalErrors.length||!Array.isArray(observation.fatalErrors)||observation.fatalErrors.length||!Array.isArray(observation.rows)||!observation.rows.length)throw new Error(`Fatal observer/missing observations: ${name}`);
    if(!['passed','failed'].includes(errors.reason)||!Array.isArray(errors.unhandledErrors)||errors.unhandledErrors.length||!Array.isArray(errors.tasks))throw new Error(`Unhandled/interrupted runtime: ${name}`);
    for(const task of errors.tasks){if(!Array.isArray(task.errors)||task.type!=='test'&&task.errors.length||task.errors.some(error=>error.name!=='AssertionError'))throw new Error(`Unexpected API/hook/runtime error: ${name}/${task.name}`);}
    const tests=report.testResults?.flatMap(file=>file.assertionResults??[]);
    if(report.numTotalTests!==12||!Array.isArray(tests)||tests.length!==12||report.numPendingTests||report.numTodoTests||report.numPendingTestSuites||report.testResults.some(file=>file.message))throw new Error(`Incomplete/hook JSON report: ${name}`);
    for(const test of tests){if(!['passed','failed'].includes(test.status)||!Array.isArray(test.failureMessages)||test.status==='passed'&&test.failureMessages.length||test.status==='failed'&&(!test.failureMessages.length||test.failureMessages.some(message=>!/^AssertionError:/.test(message))))throw new Error(`Non-assertion/unfinished original test: ${name}/${test.fullName}`);}
    if(tests.filter(t=>t.status==='failed').length!==report.numFailedTests||tests.filter(t=>t.status==='passed').length!==report.numPassedTests||code!==(report.numFailedTests?1:0))throw new Error(`Report/exit mismatch: ${name}`);
    Object.assign(receipt,{classification:'ORIGINAL_ASSERTIONS_ONLY',passed:report.numPassedTests,failed:report.numFailedTests});save();
  }
  persist('DIAGNOSTIC_ONLY_NO_QUALIFICATION');
}catch(error){persist('FIRST_PROBE_FAILURE_STOP',error);process.stderr.write(`${error.stack??error}\n`);process.exitCode=1;}

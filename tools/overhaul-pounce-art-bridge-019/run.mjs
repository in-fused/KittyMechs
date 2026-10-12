import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const out=resolve('.sites-runtime/overhaul-20261010/art-bridge-019');await mkdir(out,{recursive:true});
const stages=[
 ['compile',process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','ESNext','--moduleResolution','Bundler','--types','node','tools/overhaul-pounce-art-bridge-019/finish.ts','tools/overhaul-feline57-contract-013/export.ts'],20000],
 ['author','D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe',['--background','--factory-startup','--python-exit-code','1','--python',resolve('assets/source/overhaul-pounce-art-bridge-019/author.py')],90000],
 ['graft',process.execPath,['tools/overhaul-pounce-art-bridge-019/graft.mjs'],20000],
 ['actual-loader',process.execPath,['--import','tsx','tools/overhaul-feline57-contract-013/export.ts','assets/source/overhaul-pounce-art-bridge-019',out,'Pounce_ArtBridge019.raw.glb'],60000],
 ['retained-pose-manifest',process.execPath,['--import','tsx','tools/overhaul-pounce-art-bridge-019/finish.ts'],20000]
];
const start=new Date().toISOString(),receipts=[];
for(const [name,command,args,ms]of stages){const at=new Date().toISOString();const result=await new Promise(done=>{const child=spawn(command,args,{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timeout=false;child.stdout.on('data',x=>stdout+=x.toString());child.stderr.on('data',x=>stderr+=x.toString());const timer=setTimeout(()=>{timeout=true;child.kill();},ms);child.on('error',e=>{clearTimeout(timer);done({name,at,end:new Date().toISOString(),pid:child.pid,code:null,error:String(e),timeout,stdout,stderr});});child.on('close',code=>{clearTimeout(timer);done({name,at,end:new Date().toISOString(),pid:child.pid,code,timeout,stdout,stderr});});});receipts.push(result);await writeFile(resolve(out,`${name}-process.json`),JSON.stringify(result,null,2));if(result.code!==0||result.timeout){process.exitCode=1;break;}}
const protectedRows=JSON.parse(await readFile('tools/overhaul-pounce-art-bridge-019/protected-inputs.json','utf8')).files;
const protectedAfter=[];for(const row of protectedRows){const data=await readFile(row.path),actual=createHash('sha256').update(data).digest('hex');protectedAfter.push({path:row.path,actual,expected:row.sha256,match:actual===row.sha256});if(actual!==row.sha256)process.exitCode=1;}
await writeFile(resolve(out,'process-receipt.json'),JSON.stringify({start,end:new Date().toISOString(),status:process.exitCode?'FIRST_FAILURE_STOP':'SOURCE_ART_BRIDGE_READBACK_ONLY',receipts,protectedAfter,native:false,publicMount:false,completeArtApproval:false},null,2));

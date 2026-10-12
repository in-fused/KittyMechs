import {readFile,writeFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex');
const parent=await readFile('tools/overhaul-startup-220/preimage/GameCanvas211.tsx','utf8');
const candidate=(await readFile('tools/overhaul-startup-220/GameCanvas220.tsx','utf8')).replace(/\r\n|\r/g,'\n');
const undo=candidate.replace('// Private binding defaults to the exact retained57 individual loader key.\nconst selectedPounceURL220 = IDENTITY57_ASSET_URL034;\n\n','').replace('  // Start the selected detailed rig before the fallback hook can suspend.\n  // preload and the later useGLTF consume the same individual cache key.\n  if(initialPublicPounce)useGLTF.preload(selectedPounceURL220);\n\n','').replace('  useGLTF(selectedPounceURL220);','  useGLTF(IDENTITY57_ASSET_URL034);');
const options={loader:'tsx',format:'esm',jsx:'automatic',sourcefile:'GameCanvas.tsx',sourcemap:false};
const a=await transform(parent,options),b=await transform(undo,options);
const receipt={writer:'CLOSED',status:'OPERANDS_BEFORE_ASSERTION',scope:'Actual installed TSX compiler output identity of raw parent and reversed candidate, retaining decoded strings/template literals/JSX text; no whitespace stripping or new candidate changes',parentCompiledSHA256:sha(Buffer.from(a.code)),reversedCandidateCompiledSHA256:sha(Buffer.from(b.code)),equal:a.code===b.code,initialFailedSealSHA256:sha(await readFile('tools/overhaul-startup-220/source-seal.json')),supplementSealSHA256:sha(await readFile('tools/overhaul-startup-220/supplement/source-seal.json')),actualBuild:false,actualCapture:false};
await writeFile('tools/overhaul-startup-220/compiler-identity-receipt.json',JSON.stringify(receipt,null,2)+'\n');
assert.equal(receipt.equal,true,'Raw parent and inverse candidate decoded literal/JSX semantics must match');
await writeFile('tools/overhaul-startup-220/compiler-identity-receipt.json',JSON.stringify({...receipt,status:'PASS'},null,2)+'\n');
const paths=['tools/overhaul-startup-220/compiler-identity.mjs','tools/overhaul-startup-220/compiler-identity-receipt.json','tools/overhaul-startup-220/source-seal.json','tools/overhaul-startup-220/supplement/source-seal.json'],files=[];for(const path of paths){const bytes=await readFile(path);files.push({path,bytes:bytes.length,sha256:sha(bytes)});}
const sealPath='tools/overhaul-startup-220/compiler-identity-seal.json';await writeFile(sealPath,JSON.stringify({writer:'CLOSED',status:'SOURCE_ONLY_COMPILER_IDENTITY_PASS',files},null,2)+'\n');console.log(JSON.stringify({status:'PASS',compiledSHA256:receipt.parentCompiledSHA256,sealSHA256:sha(await readFile(sealPath)),actualBuild:false,actualCapture:false}));

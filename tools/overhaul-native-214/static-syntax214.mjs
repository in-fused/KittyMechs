import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
const files=['nativeOwner214.ts','NativeActor214.tsx','native-owner-fixture214.ts'],rows=[];
for(const file of files){const path='tools/overhaul-native-214/'+file,source=await readFile(path,'utf8'),result=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true}});rows.push({path,diagnostics:(result.diagnostics??[]).map(d=>({code:d.code,category:d.category,text:ts.flattenDiagnosticMessageText(d.messageText,' ')}))});}
const receipt={scope:'STATIC_SYNTAX_ONLY_NO_IMPORT_OR_MODEL_EXECUTION',fullTypecheck:'UNRUN',nativeFixture:'UNRUN',rows};await writeFile('tools/overhaul-native-214/static-syntax214-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));if(rows.some(r=>r.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error)))process.exitCode=1;

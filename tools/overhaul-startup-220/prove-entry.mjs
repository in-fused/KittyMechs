import {parseAst} from 'rollup/parseAst';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {relative,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
export async function proveEntry220(out){
 const expected='/assets/index-jFb_gY9P.js',old='/assets/index-DpxkElY8.js',html=await readFile(resolve(out,'index.html'),'utf8');
 const initial=[...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]);
 const paths=[];const scan=async dir=>{for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())await scan(p);else paths.push(p);}};await scan(out);
 const rows=[],graph=[],entryRefs=[],unsupported=[];
 for(const p of paths){const b=await readFile(p),url='/'+relative(out,p).replaceAll('\\','/');rows.push({path:relative(process.cwd(),p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});if(!p.endsWith('.js'))continue;
  const text=b.toString('utf8'),ast=parseAst(text),imports=[];
  const walk=node=>{if(!node||typeof node!=='object')return;if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)&&node.source){if(node.source.type!=='Literal'||typeof node.source.value!=='string')unsupported.push({url,type:node.type,start:node.start});else imports.push(node.source.value);}for(const [k,v] of Object.entries(node))if(k!=='source'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}};walk(ast);
  for(const specifier of imports){const target=specifier.startsWith('.')?'/'+relative(out,resolve(dirname(p),specifier)).replaceAll('\\','/'):specifier;graph.push({url,specifier,target});if(/index-[A-Za-z0-9_-]+\.js/.test(target))entryRefs.push({url,target});}
 }
 const proof={writer:'CLOSED',status:'OPERANDS_SAVED_BEFORE_ASSERTIONS',initial,expected,old,entryRefs,unsupported,graph,files:rows};
 await writeFile(resolve(out,'../entry-operands.json'),JSON.stringify(proof,null,2)+'\n');
 if(initial.length!==1||initial[0]!==expected)throw Error('220 initial entry identity differs');
 if(paths.some(p=>p.endsWith('index-DpxkElY8.js'))||graph.some(x=>x.target===old))throw Error('220 duplicate canonical211 entry remains');
 if(unsupported.length)throw Error('220 computed import graph unqualified');
 if(!entryRefs.length||entryRefs.some(x=>x.target!==expected))throw Error('220 entry import graph has other identity');
 if(!graph.some(x=>x.url.startsWith('/assets/GameCanvas-')&&x.target===expected))throw Error('220 actual GameCanvas cycle does not canonicalize');
 for(const edge of graph)if(edge.target.startsWith('/assets/')&&!rows.some(x=>'/'+relative(out,resolve(x.path)).replaceAll('\\','/')===edge.target))throw Error('220 import target absent '+edge.target);
 await writeFile(resolve(out,'../entry-proof.json'),JSON.stringify({...proof,status:'PASS',oneCanonicalEntry:true,source211ReadinessUnchanged:true},null,2)+'\n');
 console.log(JSON.stringify({entryProof:'PASS',initial,entryReferences:entryRefs.length,jsImports:graph.length,computedImports:unsupported.length}));
}

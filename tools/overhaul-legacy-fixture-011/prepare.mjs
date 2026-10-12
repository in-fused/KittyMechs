// Filesystem-only preparation/static dependency inventory. Does not load source.
import {existsSync,readdirSync,statSync,readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd(),runtime='.sites-runtime/overhaul-20261010/legacy-fixture-011';
const base='.sites-runtime/overhaul-20261009/preserved-007/files';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const slash=p=>p.replaceAll('\\','/');
const files=dir=>readdirSync(dir).flatMap(name=>{const p=path.join(dir,name);return statSync(p).isDirectory()?files(p):[p];});
const provenance=[],closure=[];
const configs=['package.json','package-lock.json','tsconfig.json','vite.config.ts','vitest.config.ts','eslint.config.js'];
for(const [name,overlay] of [['baseline020','.sites-runtime/overhaul-20261010/handoff-020/files'],['current008','.sites-runtime/overhaul-20261010/handoff-021/files']]){
  const out=path.join(runtime,name);mkdirSync(out,{recursive:true});
  const chosen=new Map();
  for(const source of [base,overlay]){
    for(const dir of ['shared','src'])if(existsSync(path.join(source,dir)))for(const p of files(path.join(source,dir)))chosen.set(slash(path.relative(source,p)),p);
    for(const rel of [...configs,'tests/stance.test.ts'])if(existsSync(path.join(source,rel)))chosen.set(rel,path.join(source,rel));
  }
  for(const [rel,input] of chosen){const target=path.join(out,rel==='vitest.config.ts'?'original-config/vitest.config.ts':rel);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(input,target);provenance.push({tree:name,relative:rel,input:slash(input),copy:slash(target),sha256:hash(input),copySha256:hash(target)});}
  for(const rel of ['observe.ts','fatal-reporter.mjs'])copyFileSync(path.join('tools/overhaul-legacy-fixture-011',rel),path.join(out,rel));
  const diagnosticConfig=readFileSync('.sites-runtime/overhaul-20261010/legacy-fixture-010/baseline020/vitest.config.ts','utf8');writeFileSync(path.join(out,'vitest.config.ts'),diagnosticConfig);
  const queue=['shared/simulation.ts','tests/stance.test.ts','observe.ts'],seen=new Set(),edges=[],external=[],opaque=[];
  while(queue.length){const rel=queue.shift();if(seen.has(rel))continue;seen.add(rel);const p=path.join(out,rel),text=readFileSync(p,'utf8');if(p.endsWith('.json'))continue;
    const specs=[...text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?["']([^"']+)["']/g)].map(m=>m[1]);
    specs.push(...[...text.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g)].map(m=>m[1]));
    if(/\bimport\s*\(\s*[^"'\s]/.test(text))opaque.push(rel);
    for(const spec of specs){if(!spec.startsWith('.')){external.push({from:rel,spec});continue;}const stem=path.resolve(path.dirname(p),spec.split('?')[0]),candidates=[stem,...['.ts','.tsx','.js','.mjs','.cjs','.json'].map(ext=>stem+ext),...['index.ts','index.tsx','index.js','index.mjs'].map(file=>path.join(stem,file))];const actual=candidates.find(f=>existsSync(f)&&statSync(f).isFile());if(!actual)throw new Error(`Missing local import ${name}:${rel}->${spec}`);const target=slash(path.relative(path.resolve(out),actual));if(target.startsWith('../'))throw new Error(`Escaping local import ${name}:${rel}->${spec}`);edges.push({from:rel,spec,to:target,sha256:hash(actual)});queue.push(target);}
  }
  if(opaque.length)throw new Error(`Opaque dynamic local dependencies: ${name}/${opaque.join(',')}`);
  if(!seen.has('src/game/entities/felineMotion.ts'))throw new Error(`Missing actual felineMotion closure: ${name}`);
  closure.push({tree:name,status:'STATIC_LOCAL_IMPORT_CLOSURE_RESOLVED_NOT_EXECUTED',roots:['shared/simulation.ts','tests/stance.test.ts','observe.ts'],modules:[...seen],edges,external,opaque});
}
const tests=provenance.filter(p=>p.relative==='tests/stance.test.ts');if(tests.length!==2||tests[0].sha256!==tests[1].sha256)throw new Error('Historical/current original test bytes differ');
const historical=provenance.find(p=>p.tree==='baseline020'&&p.relative==='shared/simulation.ts');if(historical.sha256!==hash('tools/overhaul-transform-feedback-008/preimages/shared__simulation.ts'))throw new Error('Baseline does not match008 preimage');
const current=provenance.find(p=>p.tree==='current008'&&p.relative==='shared/simulation.ts');if(current.sha256!==hash('shared/simulation.ts'))throw new Error('021 current does not match frozen008');
writeFileSync(path.join(runtime,'provenance.json'),JSON.stringify({utc:new Date().toISOString(),provenance},null,2));
writeFileSync(path.join(runtime,'static-import-closure.json'),JSON.stringify({utc:new Date().toISOString(),closure},null,2));
console.log(JSON.stringify({status:'FILESYSTEM_STATIC_ONLY',files:provenance.length,modules:closure.map(c=>({tree:c.tree,count:c.modules.length})),testsSha256:tests[0].sha256}));

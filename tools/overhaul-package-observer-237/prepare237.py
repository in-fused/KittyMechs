from pathlib import Path
import hashlib,json,subprocess,ast
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;p=r/'tools/overhaul-shader-observer-235';sha=lambda b:hashlib.sha256(b).hexdigest()
def row(q):
 b=q.read_bytes();return {'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':sha(b)}
assert not (f/'source-seal.json').exists()
seal=p/'source-seal.json';assert row(seal)['sha256']=='06e35081f0ae541c95fc0eca7166657896776379b37e7e4b56d70dfa88d8c41b'
for x in json.loads(seal.read_text())['files']:assert row(r/x['path'])==x
old=subprocess.check_output(['git','show','HEAD:package.json'],cwd=r);current=(r/'package.json').read_bytes()
assert sha(old)=='0a61714c93f5cacbf0c5eea21969a534c8b280bed61ca9aa3fac166c4454a0e4' and sha(current)=='a951b2b35d6a86bbf07ffb08eff3ce30f227dbaecce67e4b1d39c4fa445184f3'
a=json.loads(old);b=json.loads(current);oldScripts=a.pop('scripts');newScripts=b.pop('scripts');assert a==b
assert all(newScripts.get(k)==v for k,v in oldScripts.items());extra={k:v for k,v in newScripts.items() if k not in oldScripts}
assert extra=={'storage:check':'pwsh -NoProfile -File tools/storage-retention.ps1 -CheckBudget','storage:clean':'pwsh -NoProfile -File tools/storage-retention.ps1 -Apply -CheckBudget','prebuild':'npm run storage:clean'}
(f/'package-before-build.json').write_bytes(old);(f/'package-concurrent-current.json').write_bytes(current)
(f/'boundary.json').write_text(json.dumps({'writer':'CLOSED','scope':'Package scripts only concurrent boundary; compiled234 bytes unchanged; no npm/build/prebuild/cleanup executed by237','beforeSHA256':sha(old),'currentSHA256':sha(current),'addedScripts':extra,'allOtherFieldsEqual':True,'original235ExitCode':1,'original235Scope':'PRE_BROWSER_INPUT_HASH_REJECTION; zero game shader/native/browser executions'},indent=2),encoding='utf-8')
for name in ['capture.mjs','supervise.py','guards.mjs','network-classification.mjs']:
 raw=(p/name).read_bytes();(f/(name+'.235-preimage')).write_bytes(raw);s='\n'.join(raw.decode().splitlines())+'\n'
 for oldName,new in [('overhaul-shader-observer-235','overhaul-package-observer-237'),('KITTYMECH_235','KITTYMECH_237'),('shader235-observer-source-review','package237-observer-source-review'),('shader235-public','package237-public'),('shader235-supervisor','package237-supervisor'),('Shader235Host','Package237Host'),('Shader235Guest','Package237Guest')]:s=s.replace(oldName,new)
 if name=='supervise.py':ast.parse(s)
 (f/name).write_text(s,encoding='utf-8',newline='\n')
binding=json.loads((p/'binding.json').read_text());rows=binding['files'];count=0
for i,x in enumerate(rows):
 if x['path']=='package.json':rows[i]=row(r/'package.json');count+=1
assert count==1
rows+=json.loads(seal.read_text())['files']+[row(seal)]
for x in rows:assert row(r/x['path'])==x,x['path']
binding.update(scope='237 observer-only package script boundary on unchanged compiled234. Original235 pre-browser rejection retained. Same20s/public/native/shader/canvas/cleanup semantics.',files=list({x['path']:x for x in rows}.values()),packageBoundary=row(f/'boundary.json'))
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
subprocess.run(['node','--check',str(f/'capture.mjs')],cwd=r,check=True)
print(json.dumps({'status':'237_SOURCE_PREPARED_ONLY','packageDelta':'EXACT_ADDED_SCRIPTS_ONLY','protectedFiles':len(binding['files']),'actualJobs':0}))

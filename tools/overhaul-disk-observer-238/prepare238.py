from pathlib import Path
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;p=r/'tools/overhaul-package-observer-237';sha=lambda b:hashlib.sha256(b).hexdigest()
def row(q):
 b=q.read_bytes();return {'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':sha(b)}
assert not (f/'source-seal.json').exists()
seal=p/'source-seal.json';assert row(seal)['sha256']=='8080f3f7ee2b70b46c3928baf39950fdf910d1b0b35eff457c40d4237059c479'
for x in json.loads(seal.read_text())['files']:assert row(r/x['path'])==x
for name in ['capture.mjs','supervise.py','guards.mjs','network-classification.mjs']:
 raw=(p/name).read_bytes();(f/(name+'.237-preimage')).write_bytes(raw);s='\n'.join(raw.decode().splitlines())+'\n'
 for old,new in [('overhaul-package-observer-237','overhaul-disk-observer-238'),('KITTYMECH_237','KITTYMECH_238'),('package237-observer-source-review','disk238-observer-source-review'),('overhaul-20261011/package237-public','shader-startup-238/public'),('overhaul-20261011/package237-supervisor','shader-startup-238/supervisor'),('Package237Host','Disk238Host'),('Package237Guest','Disk238Guest')]:s=s.replace(old,new)
 if name=='supervise.py':ast.parse(s)
 (f/name).write_text(s,encoding='utf-8',newline='\n')
binding=json.loads((p/'binding.json').read_text());rows=binding['files']+json.loads(seal.read_text())['files']+[row(seal)]
for x in rows:assert row(r/x['path'])==x,x['path']
binding.update(scope='238 output-only D-run adapter for unchanged234/237 browser semantics. Original235 pre-browser rejection and236 storage hold retained. No runtime/model/asset/guard/deadline changes.',files=list({x['path']:x for x in rows}.values()),outputRoot={'link':'.sites-runtime/shader-startup-238','target':'D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238','creator':'tools/new-artifact-run.ps1'})
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
subprocess.run(['node','--check',str(f/'capture.mjs')],cwd=r,check=True)
print(json.dumps({'status':'238_SOURCE_PREPARED_ONLY','protectedFiles':len(binding['files']),'actualJobs':0}))

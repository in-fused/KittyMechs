from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
h=json.loads((r/'tools/overhaul-moving-recoil-050/source-handoff.json').read_text(encoding='utf8'))
prior=json.loads((r/'tools/overhaul-root-round-032/readiness044-build-seal.json').read_text())
paths={x['path'] for x in prior['files']}
for key in ['files','ownedPaths','dependenciesReadOnly','protected','readOnlyDependencies']:
 for x in h.get(key,[]):paths.add(x if isinstance(x,str) else x['path'])
paths.update(['tools/overhaul-moving-recoil-050/source-handoff.json','tools/overhaul-moving-recoil-050/source-seal.json','tools/overhaul-root-round-034/prepare-runtime050.py','tools/overhaul-root-round-027/run-seal.py'])
rows=[row(r/p) for p in sorted(paths)]
for name,cmd in [('test',h['rootTestCommand']),('build',['cmd.exe','/d','/c','npm.cmd run build'])]:
 p=Path(__file__).with_name('recoil050-'+name+'-seal.json');assert not p.exists()
 p.write_text(json.dumps({'files':rows,'command':cmd,'scope':'ONE focused real-asset test and conditional ONE build; no automatic retry, no visual approval.'},indent=2))
print(json.dumps({'rows':len(rows),'testCommand':h['rootTestCommand']}))

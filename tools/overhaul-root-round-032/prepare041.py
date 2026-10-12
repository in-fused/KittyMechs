from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
h=json.loads((r/'tools/overhaul-mission-identity-041/source-handoff.json').read_text(encoding='utf8'))
prior=json.loads((r/'tools/overhaul-root-round-031/extraction039-finalbuild-seal.json').read_text())
paths={x['path'] for x in prior['files']}
for name in ['ownedPaths','files','dependenciesReadOnly','protected']:
 for x in h.get(name,[]):paths.add(x['path'])
paths.update(['tools/overhaul-mission-identity-041/source-handoff.json','tools/overhaul-mission-identity-041/source-seal.json','tools/overhaul-root-round-032/prepare041.py'])
rows=[]
for p in sorted(paths):
 b=(r/p).read_bytes();rows.append({'path':p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
test=h['rootTestCommand']
assert isinstance(test,list) and test
for name,cmd in [('test',test),('build',['cmd.exe','/d','/c','npm.cmd run build'])]:
 p=r/f'tools/overhaul-root-round-032/identity041-{name}-seal.json';assert not p.exists()
 p.write_text(json.dumps({'sealedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'command':cmd,'scope':'041 finite authoritative publication identity fix. Meaningful lifecycle tests and ONE build; tests do not approve art/physics/mission. At most one technical repair, no automatic public capture retry.'},indent=2))
print(json.dumps({'rows':len(rows),'testCommand':test}))

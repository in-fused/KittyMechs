from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
h=json.loads((r/'tools/overhaul-squad-extraction-052/source-handoff.json').read_text())
prior=json.loads((r/'tools/overhaul-root-round-032/readiness044-build-seal.json').read_text())
paths={x['path'] for x in prior['files']}
paths.update(x['path'] for x in json.loads((r/'.sites-runtime/overhaul-20261009/build-036/receipt.json').read_text())['files'] if not x['path'].startswith('dist/'))
for key in ['files','dependencies','protected']:
 for x in h.get(key,[]):paths.add(x['path'])
paths.update(['tools/overhaul-squad-extraction-052/source-handoff.json','tools/overhaul-squad-extraction-052/source-seal.json','tools/overhaul-root-round-035/prepare052-final.py','tools/overhaul-root-round-027/run-seal.py'])
rows=[row(r/p) for p in sorted(paths)]
for name,cmd in [('test',h['rootTestCommand']),('build',['cmd.exe','/d','/c','npm.cmd run build'])]:
 p=Path(__file__).with_name('extraction052-'+name+'-final-seal.json');assert not p.exists();p.write_text(json.dumps({'files':rows,'command':cmd,'scope':'Final pre-execution envelope includes declared dependencies and all036 non-dist runtime inputs/current052 helper. Earlier154-row envelopes unexecuted. ONE native test, conditional build; no gameplay approval.'},indent=2))
print(json.dumps({'rows':len(rows),'testCommand':h['rootTestCommand']}))

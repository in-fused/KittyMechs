from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'.sites-runtime/overhaul-20261009/build-043'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((old/'receipt.json').read_text());changed=[]
for x in prior['files']:
 if x['path'].startswith(('src/','shared/','server/')):
  if row(r/x['path'])['sha256']!=x['sha256']:changed.append(x['path'])
assert changed==['shared/simulation.ts'],changed
paths={p for name in ['src','shared','server'] for p in (r/name).rglob('*') if p.is_file()}
paths.update(r/p for p in ['package.json','package-lock.json','tsconfig.json','vite.config.ts','docs/overhaul/critic/coop075-rescue-source-review.md','tools/overhaul-root-round-027/run-seal.py','tools/overhaul-rescue-hull-070/source-seal.json','.sites-runtime/overhaul-20261010/rescue-hull071-tests/process-receipt.json'])
paths.update([Path(__file__),old/'receipt.json'])
(h/'build-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['npm.cmd','run','build'],'scope':'ONE075 rescue-only candidate045: only043 runtime source delta is RoundCylinder restore query. Rejected070 render/071/073 camera excluded. No nativechecks repeated. Actualpublicmission pending.'},indent=2));print(json.dumps({'changed043Source':changed}))

from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
h=json.loads((r/'tools/overhaul-camera-058/source-handoff.json').read_text())
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
rows={x['path']:x for key in ['files','dependencies','protected'] for x in h.get(key,[])}
for p in [Path(__file__),r/'tools/overhaul-camera-058/source-handoff.json',r/'tools/overhaul-camera-058/source-seal.json',r/'docs/overhaul/critic/camera-058-source-review.md',r/'tools/overhaul-root-round-027/run-seal.py',r/'package.json']:
 rows[p.relative_to(r).as_posix()]=row(p)
for x in rows.values():assert row(r/x['path'])==x,x['path']
out=Path(__file__).with_name('test-seal.json');assert not out.exists()
out.write_text(json.dumps({'files':list(rows.values()),'command':h['rootTestCommand'],'scope':'ONE source-approved camera058 focused tests; not gameplay acceptance.'},indent=2),encoding='utf8')
print(row(out))

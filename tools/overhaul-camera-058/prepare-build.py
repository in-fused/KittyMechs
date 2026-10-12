from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
test=json.loads((r/'.sites-runtime/overhaul-20261010/camera058-tests/process-receipt.json').read_text())
assert test['exitCode']==0 and test['failure'] is None and all(x['match'] for x in test['inputsAfter'])
rows={}
for packet in ['tools/overhaul-camera-058/source-handoff.json','tools/overhaul-renderer-report/source-handoff.json']:
 h=json.loads((r/packet).read_text())
 for key in ['files','dependencies','protected']:
  for x in h.get(key,[]):
   if x['path'] in rows:assert rows[x['path']]==x
   rows[x['path']]=x
 rows[packet]=row(r/packet)
old=r/'.sites-runtime/overhaul-20261009/build-039'
for x in json.loads((old/'receipt.json').read_text())['files']:
 p=old/'playable-root'/x['path'];v=row(p);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];rows[v['path']]=v
for p in [Path(__file__),r/'tools/overhaul-root-round-027/run-seal.py',r/'docs/overhaul/critic/camera-058-source-review.md',old/'receipt.json']:
 rows[p.relative_to(r).as_posix()]=row(p)
for x in rows.values():assert row(r/x['path'])==x,x['path']
out=Path(__file__).with_name('build-seal.json');assert not out.exists()
out.write_text(json.dumps({'files':list(rows.values()),'command':['npm.cmd','run','build'],'scope':'ONE camera058 + renderer report build;40focusedcamera/3report checks passed; preserve039. Gait058 unadmitted and excluded.'},indent=2),encoding='utf8')
print(row(out))

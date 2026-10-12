from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
h=json.loads(Path(__file__).with_name('source-handoff.json').read_text());rows={}
for key in ['files','dependencies','protected']:
 for x in h.get(key,[]):rows[x['path']]=x
old=r/'.sites-runtime/overhaul-20261009/build-040'
for x in json.loads((old/'receipt.json').read_text())['files']:
 p=old/'playable-root'/x['path'];v=row(p);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];rows[v['path']]=v
for p in [Path(__file__),Path(__file__).with_name('source-handoff.json'),r/'docs/overhaul/critic/low-pixels-059-source-review.md',r/'tools/overhaul-root-round-027/run-seal.py',old/'receipt.json']:
 rows[p.relative_to(r).as_posix()]=row(p)
for x in rows.values():assert row(r/x['path'])==x,x['path']
for label,key in [('test','rootTestCommand'),('build','rootBuildCommand')]:
 out=Path(__file__).with_name(label+'-seal.json');assert not out.exists();out.write_text(json.dumps({'files':list(rows.values()),'command':h[key],'scope':'ONE059source-approved Low budget checks thenconditionalbuild;040preserved; gait058unadmittedexcluded.'},indent=2),encoding='utf8')
print(len(rows))

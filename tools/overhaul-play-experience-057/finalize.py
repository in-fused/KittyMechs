from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
raw=r/'tools/overhaul-play-experience-057/result-seal.json';assert row(raw)['sha256']=='c393061b3a83509c0522ae572b458df67326abc7e9438354bc63c356d346db1b'
for x in json.loads(raw.read_text())['files']:assert row(r/x['path'])==x,x['path']
review=r/'docs/overhaul/critic/play-experience-057-result-review.md';assert row(review)['sha256']=='ab99a58efd9a1e1d40d3f64d9528e10396cf88142c4cec63738a61965d0697ed'
closure=r/'tools/overhaul-play-experience-057/critic-result-closure.json';assert row(closure)['sha256']=='1d9d5c054e0aac0e25f4561e98b0fec38cb10502562077235a1ad9c175babb1e'
h=json.loads((r/'tools/overhaul-camera-057/source-handoff.json').read_text());c=json.loads((r/'tools/overhaul-render-cull-057/source-seal.json').read_text());rows={x['path']:x for x in h['files']+h['protected']+c['rows']}
for x in rows.values():assert row(r/x['path'])==x,x['path']
paths=[raw,review,Path(__file__),r/'tools/overhaul-camera-057/source-handoff.json',r/'tools/overhaul-render-cull-057/source-seal.json',r/'.sites-runtime/overhaul-20261010/experience057-test/process-receipt.json',r/'.sites-runtime/overhaul-20261010/experience057-test/stdout.txt',r/'.sites-runtime/overhaul-20261010/experience057-build/process-receipt.json',r/'.sites-runtime/overhaul-20261010/experience057-build/stdout.txt',r/'.sites-runtime/overhaul-20261009/build-039/receipt.json',r/'.sites-runtime/overhaul-20261009/build-039/playable-checkpoint.json']
paths.extend([closure,r/'.sites-runtime/overhaul-20261010/live039-server.json'])
for p in paths:rows[p.relative_to(r).as_posix()]=row(p)
out=r/'tools/overhaul-play-experience-057/final-result-seal.json';assert not out.exists();out.write_text(json.dumps({'scope':'057source/technical/exactactualresult/independentreview closure. Fullgoal incomplete; limitationsandverdict remain authoritative.','files':list(rows.values())},indent=2),encoding='utf8');print(json.dumps(row(out)))

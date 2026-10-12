from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2]
seal=json.loads((r/'tools/overhaul-steady-cpu-058/run-seal.json').read_text())
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
for x in seal['files']+seal['protected']:assert row(r/x['path'])==x,x['path']
paths=list((r/'.sites-runtime/overhaul-20261010/steady058-cpu').rglob('*'))+list((r/'.sites-runtime/overhaul-20261010/steady058-cpu-process').rglob('*'))
paths += [r/'.sites-runtime/overhaul-20261010/steady058-cleanup.json',Path(__file__),Path(__file__).with_name('analyze.py'),Path(__file__).with_name('cleanup.ps1')]
out=Path(__file__).with_name('result-seal.json');assert not out.exists()
out.write_text(json.dumps({'scope':'Closed ONE039 CPU observation; sampled browser CPU, not actual IAB/GPU/lag resolution; all410 inputs unchanged.','files':[row(p) for p in paths if p.is_file()]},indent=2),encoding='utf8')
print(row(out))

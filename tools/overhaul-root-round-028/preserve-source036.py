from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];o=r/'.sites-runtime/overhaul-20261010/source036-frozen';o.mkdir(exist_ok=False)
s=json.loads((r/'tools/overhaul-root-round-028/player036-test-seal.json').read_text());rows=s['files']
for x in rows:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'].lower()
 q=o/'files'/x['path'];q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert hashlib.sha256(q.read_bytes()).hexdigest()==x['sha256'].lower()
ps=[p for p in (r/'.sites-runtime/overhaul-20261010/player036-test-process').glob('*') if p.is_file()]
actual=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in ps]
(o/'manifest.json').write_text(json.dumps({'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'actual':actual,'scope':'Exact failed036 source before separate037 corrections. No036build/capture. Originalprocess evidence remains at originalpaths.'},indent=2));print(json.dumps({'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'manifestSHA256':hashlib.sha256((o/'manifest.json').read_bytes()).hexdigest()}))

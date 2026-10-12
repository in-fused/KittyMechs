from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
paths=[]
for job in ['test','build']:
 p=r/f'.sites-runtime/overhaul-20261010/startup055-{job}/process-receipt.json';v=json.loads(p.read_text())
 assert v['exitCode']==0 and v['failure'] is None and v['inclusiveBoundObserved'] and all(x['match'] for x in v['inputsAfter'])
 paths.extend([p,p.parent/'stdout.txt'])
paths.extend([r/'.sites-runtime/overhaul-20261009/build-038/receipt.json',r/'.sites-runtime/overhaul-20261009/build-038/playable-checkpoint.json'])
rows=[]
for p in paths:
 b=p.read_bytes();rows.append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
out=r/'tools/overhaul-startup-rig-055/technical-result-seal.json';assert not out.exists()
out.write_text(json.dumps({'scope':'05510focused tests andbuildpass; no startup/performance/mission approval','files':rows},indent=2),encoding='utf8');print(hashlib.sha256(out.read_bytes()).hexdigest())

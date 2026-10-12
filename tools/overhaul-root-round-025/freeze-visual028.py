from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];folder=r/'tools/overhaul-runtime-art-integration-028';out=r/'.sites-runtime/overhaul-20261010/runtime-art-player-028'
inputs=json.loads((folder/'seal.json').read_text(encoding='utf-8'))['rows']
for row in inputs:
    b=(r/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
rows=[]
for p in sorted(out.rglob('*')):
    if p.is_file():
        b=p.read_bytes();rows.append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
p=folder/'capture-seal.json';assert not p.exists();p.write_text(json.dumps({'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'ORIGINALS_FROZEN_REVIEW_REQUIRED','rows':rows},indent=2),encoding='utf-8')
print(json.dumps({'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))

from pathlib import Path
import hashlib,json,datetime
r=Path(__file__).resolve().parents[2];folder=r/'tools/overhaul-runtime-art-integration-028'
rows=[]
for name in ['seal.json','capture-seal.json']:
    rows.extend(json.loads((folder/name).read_text(encoding='utf-8'))['rows'])
extra=[r/'.sites-runtime/overhaul-20261010/runtime-art-player-028-process/process-receipt.json',r/'docs/overhaul/critic/runtime-art-player-028-result-review.md']
extra+=sorted((r/'.sites-runtime/overhaul-20261010/runtime-art-motion-028').glob('*'))
for p in extra:
    if p.is_file():
        b=p.read_bytes();rows.append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
for row in rows:
    b=(r/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
target=folder/'closure.json';assert not target.exists()
target.write_text(json.dumps({'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'CLOSED_PARTIAL_FUNCTIONAL_PREVIEW_ACCEPTED','jobs':0,'writers':0,'scope':'Complete supported public sequence and unique jump receipt accepted; finished gait/contact/art/performance/Gate1 denied; runtime unchanged027','rows':rows},indent=2),encoding='utf-8')
print(json.dumps({'rows':len(rows),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))

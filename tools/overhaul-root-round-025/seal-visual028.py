from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
folder=r/'tools/overhaul-runtime-art-integration-028';folder.mkdir(exist_ok=False)
prior=json.loads((r/'tools/overhaul-runtime-art-integration-024/seal.json').read_text(encoding='utf-8-sig'))
paths=[x['path'] for x in prior['rows']]+['tools/overhaul-runtime-art-player-028.mjs','tools/overhaul-root-round-025/run-bounded.py','tools/overhaul-root-round-025/prepare-light-capture.py','docs/overhaul/runtime-art-player-028-contract.md','tools/overhaul-player-performance-026/result-seal.json']
rows=[]
for path in dict.fromkeys(paths):
    b=(r/path).read_bytes();rows.append({'path':path,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
p=folder/'seal.json';p.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'ONE fresh lightweight visual observation028, unchanged playable027; previous failures closed; no production edits','maxInclusiveSeconds':120,'rows':rows},indent=2),encoding='utf-8')
print(json.dumps({'rows':len(rows),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))

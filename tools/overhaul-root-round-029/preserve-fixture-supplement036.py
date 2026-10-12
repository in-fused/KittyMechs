from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];h=r/'.sites-runtime/overhaul-20261010/handoff-027';m=json.loads((h/'manifest.json').read_text());b=Path(m['base']);bm=json.loads((b/'manifest.json').read_text());o=r/'.sites-runtime/overhaul-20261010/source036-fixture-supplement';o.mkdir(exist_ok=False);rows=[]
for path in ['tests/feline-strike-input.test.ts','tests/jump-delivery.test.ts']:
 assert not any(x['path']==path for x in m['files'])
 x=next(x for x in bm['files'] if x['path']==path);p=b/'files'/path;assert hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'].lower()
 q=o/'files'/path;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert hashlib.sha256(q.read_bytes()).hexdigest()==x['sha256'].lower();rows.append(x)
j={'savedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'source':str(b),'sourceManifestSHA256':hashlib.sha256((b/'manifest.json').read_bytes()).hexdigest(),'verified027ManifestSHA256':hashlib.sha256((h/'manifest.json').read_bytes()).hexdigest(),'scope':'Exact base fixtures unchanged at verified027 and outside declared036 source edits; closes historical-copy omission without changing036 manifest. No claim these two were in036 listed51 input hashes.'}
(o/'manifest.json').write_text(json.dumps(j,indent=2));print(json.dumps({'files':len(rows),'manifestSHA256':hashlib.sha256((o/'manifest.json').read_bytes()).hexdigest()}))

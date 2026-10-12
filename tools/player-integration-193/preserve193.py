from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-071';assert sha(prior/'manifest.json')=='84af2a4df93f4e3ef961ef0a183399dc207f4e6bcb5051204baf4a50bc9ebcf9'
old=json.loads((prior/'manifest.json').read_text());dest=r/'.sites-runtime/overhaul-20261010/handoff-072'
seal=r/'tools/overhaul-facade-lod-191/source-seal.json';assert sha(seal)=='3205993a8c4cee421e2428910df2d7cd65a28c198c25943de2f82368fe042181'
data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
for x in data['files']:assert sha(r/x['path'])==x['sha256'],x['path']
base=r/'.sites-runtime/overhaul-20261009/build-062';assert sha(base/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
count=0
for x in json.loads((base/'receipt.json').read_text())['files']:
 assert sha(base/'playable-root'/x['path'])==x['sha256']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];count+=1
paths=['docs/overhaul/player-integration-193-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/gpu192-review.md']
for folder in ['tools/overhaul-facade-lod-191','tools/player-performance-192','tools/player-integration-193','.sites-runtime/overhaul-20261010/gpu192-public']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'193 closed:191 unadmitted distant source representation;192 limited GPU callback evidence/independent critic;actual early GameStudio usage audit. Source remains exact062; full goal/human lag incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'runtimeRowsMatched062':count}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-072.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

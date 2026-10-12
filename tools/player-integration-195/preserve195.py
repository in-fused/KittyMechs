from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-072';assert sha(prior/'manifest.json')=='4a5c64e537553bf6277192ac8c83b5ccdf532a676874cc961512788f829a5b9f'
old=json.loads((prior/'manifest.json').read_text());dest=r/'.sites-runtime/overhaul-20261010/handoff-073'
for name,expected in [('tools/overhaul-stance-gait-194/source-seal.json','8c203285e639142da3e80e40de9b485c32dfce2a7a5aeac8722fecf0e1c7263e'),('tools/player-animation-package-196/source-seal.json','a1925217b42ead06214a44ce4da7c7036dfa9a756a880351fc9d08a271225167')]:
 seal=r/name;assert sha(seal)==expected
 data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
 for x in data['files']:assert sha(r/x['path'])==x['sha256'],x['path']
base=r/'.sites-runtime/overhaul-20261009/build-062';assert sha(base/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
count=0
for x in json.loads((base/'receipt.json').read_text())['files']:
 assert sha(base/'playable-root'/x['path'])==x['sha256']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];count+=1
paths=['docs/overhaul/player-integration-195-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/motion194-package196-review.md']
for folder in ['tools/overhaul-stance-gait-194','assets/source/overhaul-stance-gait-194','tools/player-animation-package-196','tools/player-integration-195']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'195 closed:194 authored motion/master/source temporal review and196 exact GLB merge/actual browser cubic source counterexample; independent motion critic. Source remains exact062; no public upgrade; full goal and affected-browser lag incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'runtimeRowsMatched062':count}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-073.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

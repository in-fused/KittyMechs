from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
prior=r/'.sites-runtime/overhaul-20261010/handoff-066'
dest=r/'.sites-runtime/overhaul-20261010/handoff-067'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='bb3b96663d23b75229bee1f20bcc87c51ac20da6334f31391318551579f4d4e0'
old=json.loads((prior/'manifest.json').read_text())
paths=['docs/overhaul/player-integration-184-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md']
assert 'Continuation184 CLOSED' in (r/paths[0]).read_text(encoding='utf8')
for packet in ['overhaul-render-181','overhaul-camera-183']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
 paths.extend(x['path'] for x in data['files'])
 paths.extend(p.relative_to(r).as_posix() for p in seal.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for folder in ['tools/player-integration-184','tools/player-performance-182','.sites-runtime/overhaul-20261010/cpu182-public','.sites-runtime/overhaul-20261010/cpu182-public-observation','.sites-runtime/overhaul-20261010/play184-public','.sites-runtime/overhaul-20261010/play184-public-observation','.sites-runtime/overhaul-20261010/review184-frames','.sites-runtime/overhaul-20261010/playability184-build']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['cpu182-actual-review.md','integration184-source-review.md','integration184-actual-review.md']:
 paths.append('docs/overhaul/critic/'+name)
paths.extend(['docs/overhaul/player-performance-182-handoff.md','docs/overhaul/render-181-handoff.md'])
checkpoint=r/'.sites-runtime/overhaul-20261009/build-062';base=json.loads((r/'.sites-runtime/overhaul-20261009/build-061/receipt.json').read_text());oldhash={x['path']:x['sha256'] for x in base['files']}
paths.extend(p.relative_to(r).as_posix() for p in checkpoint.iterdir() if p.is_file())
for x in json.loads((checkpoint/'receipt.json').read_text())['files']:
 if oldhash.get(x['path'])!=x['sha256']:paths.append((checkpoint/'playable-root'/x['path']).relative_to(r).as_posix())
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation184 CLOSED RETAIN_LIMITED062:181 foliage/183 marker improvements;182CPU/184originalplay and independentactualreview. Fullquality/humanlag INCOMPLETE. Orderedparents through066then067, never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-067.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

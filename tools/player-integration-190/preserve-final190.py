from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-070'
assert sha(prior/'manifest.json')=='23f8fed2f81d49a244623fcd3426bef0b842503adedc67be684db9fad6bb02f5'
old=json.loads((prior/'manifest.json').read_text());dest=r/'.sites-runtime/overhaul-20261010/handoff-071';dest.mkdir(exist_ok=False)
paths=['docs/overhaul/player-integration-190-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','src/game/entities/sourceCoordination164.ts']
paths.extend(p.relative_to(r).as_posix() for p in (r/'tools/player-integration-190').rglob('*') if p.is_file() and '__pycache__' not in p.parts)
rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Final190 handoff and exact062 restoration receipt; parents070 candidate-before-restore then071. Full goal incomplete; human Low lag unresolved.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-071.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

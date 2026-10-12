from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-055';dest=r/'.sites-runtime/overhaul-20261010/handoff-056'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='8471080a51fef1a9c22c85fc468b960711031fc88692107c4ee5c57f4bd8337c'
old=json.loads((prior/'manifest.json').read_text())
paths=['docs/overhaul/player-performance-135-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','shared/ownedCharacterMotion.ts','tests/owned-character-performance135.test.ts']
for folder in ['tools/player-performance-135','tools/overhaul-performance-135']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('*135*') if p.is_file())
for folder in ['motion135-observation','motion135-public','motion135-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
for name in ['receipt.json','playable-checkpoint.json']:
 paths.append(('.sites-runtime/overhaul-20261009/build-055/'+name))
dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'135 guarded movement-cost candidate and actual integration; authoritative disposition is exact135 handoff. Full goal INCOMPLETE. Ordered parents then files; never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2));assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-056.json').write_text(json.dumps(verification,indent=2));print(json.dumps(verification))

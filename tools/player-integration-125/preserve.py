from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-053';dest=r/'.sites-runtime/overhaul-20261010/handoff-054'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=json.loads((prior/'manifest.json').read_text());assert sha(prior/'manifest.json')=='46b8897987d5050462a752b385336287677f8f156bb569c369a9576d65531c9d'
paths=['docs/overhaul/player-integration-125-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','src/game/entities/Identity57Runtime005.ts','src/game/entities/movingRFfeet067.ts','src/game/entities/authoredFootfalls123.ts','src/game/entities/identity57Runtime034Actor.tsx','src/game/GameCanvas.tsx']
paths.extend(p.relative_to(r).as_posix() for p in (r/'src/game/entities').glob('*121*') if p.is_file())
paths.extend(p.relative_to(r).as_posix() for p in (r/'tests').glob('*123*') if p.is_file())
folders=['tools/player-integration-125']+[f'tools/overhaul-anatomy-{name}' for name in ['runtime-123','asset-124','delivery-126','delivery-127','browser-128','batch-129','batch-130','batch-131']]
for folder in folders:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('*') if p.is_file() and any(str(n) in p.name for n in [125,126,127,128,129,130,131]))
paths.extend(p.relative_to(r).as_posix() for p in (r/'public/assets/models').glob('Pounce_Anatomy121*') if p.is_file())
for folder in ['anatomy124-optimizer','anatomy126-delivery','anatomy127-delivery','anatomy130-batch','anatomy131-batch','anatomy125-observation','anatomy125-public','anatomy125-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010').glob('anatomy12*.json') if p.is_file())
for name in ['receipt.json','playable-checkpoint.json']:
 p=r/'.sites-runtime/overhaul-20261009/build-053'/name
 if p.exists():paths.append(p.relative_to(r).as_posix())
dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'125 actual authored footfall/browser45 integration and packaging attempts; consult exact125 handoff for live disposition. Goal INCOMPLETE. Restore ordered parents then files; never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2));assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-054.json').write_text(json.dumps(verification,indent=2));print(json.dumps(verification))

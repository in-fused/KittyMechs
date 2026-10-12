from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-050'
old=json.loads((prior/'manifest.json').read_text());dest=r/'.sites-runtime/overhaul-20261010/handoff-051';dest.mkdir(exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=['src/game/rendering/modelPaths.ts','src/game/GameCanvas.tsx','src/game/entities/identity57Runtime005.ts','src/game/entities/identity57Runtime034Actor.tsx','src/game/entities/identity57Runtime106Asset.ts','src/game/entities/identity57Runtime106Manifest.json','public/assets/models/Pounce_Motion106.glb','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/player-recovery-110-handoff.md']
for folder in ['assets/source/overhaul-pounce-motion-106','tools/overhaul-motion-106','tools/overhaul-motion-root-108','tools/overhaul-coop-integration-107','tools/player-lag-109']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file())
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('*') if p.is_file() and any(x in p.name for x in ['106','107','109','110']))
rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'106 authored fullbody/109 graft/plainURL/110 gameplay result and exact finite handoff. Goal incomplete. Restore base then ordered parents then files; never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2));assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-051.json').write_text(json.dumps(verification,indent=2));print(json.dumps(verification))

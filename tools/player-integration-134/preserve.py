from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-054';dest=r/'.sites-runtime/overhaul-20261010/handoff-055'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=json.loads((prior/'manifest.json').read_text());assert sha(prior/'manifest.json')=='e32ecdde2f4d0e94ca681f35819db12e7e825a8ebd9686ec07c45d07d2a08f2c'
paths=['docs/overhaul/player-integration-134-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/performance134-audit.md','src/game/entities/movingRFfeet067.ts','tests/contact-lifecycle132.test.ts']
for folder in ['tools/player-integration-134','tools/overhaul-contact-132','tools/overhaul-coop-133']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('*') if p.is_file() and any(str(n) in p.name for n in [132,133,134]))
for folder in ['contact134-observation','contact134-public','contact134-review','coop134-observation','coop134-public','coop134-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
for name in ['receipt.json','playable-checkpoint.json']:
 p=r/'.sites-runtime/overhaul-20261009/build-054'/name
 if p.exists():paths.append(p.relative_to(r).as_posix())
dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'132 contact lifecycle +133 ground mission planner +134 integrated actual checks. Consult exact134 handoff for authoritative live disposition; goal INCOMPLETE. Restore ordered parents then files; never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2));assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-055.json').write_text(json.dumps(verification,indent=2));print(json.dumps(verification))

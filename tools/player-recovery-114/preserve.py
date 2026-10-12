from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-051'
old=json.loads((prior/'manifest.json').read_text());dest=r/'.sites-runtime/overhaul-20261010/handoff-052'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name in ['motion112-output-review.md','aim114-source-review.md','coop111-result-review.md']:
 assert 'CLOSED' in (r/'docs/overhaul/critic'/name).read_text(encoding='utf8')
assert 'CLOSED' in (r/'tools/overhaul-coop-controller-115/HANDOFF.md').read_text(encoding='utf8')
dest.mkdir(exist_ok=False)
paths=['src/game/camera/viewAim.ts','tests/overhaul-view-aim.test.ts','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/player-recovery-114-handoff.md','docs/overhaul/performance114-source-diagnosis.md']
for folder in ['assets/source/overhaul-pounce-motion-112','tools/overhaul-motion-112','tools/overhaul-coop-integration-111','tools/overhaul-coop-controller-115','tools/player-recovery-114']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('*') if p.is_file() and any(x in p.name for x in ['111','112','114']))
for folder in ['motion112-author','motion112-views','motion112-source-views','coop111-observation','coop111-public']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'111 actual incomplete mission +112 editable authored source and actual presentation +114 unshipped aim fix +115 unrun controller source + exact critic/handoff/evidence. Live051 remains limited. Restore orderedparents thenfiles; never028. Goal incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2));assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-052.json').write_text(json.dumps(verification,indent=2));print(json.dumps(verification))

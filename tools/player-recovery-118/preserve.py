from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-052';dest=r/'.sites-runtime/overhaul-20261010/handoff-053'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=json.loads((prior/'manifest.json').read_text())
for name in ['coop116-result-review.md','anatomy121-output-review.md','performance122-source-review.md']:
 assert 'CLOSED' in (r/'docs/overhaul/critic'/name).read_text(encoding='utf8')
for name in ['anatomy121-author','anatomy121-views','coop116-observation']:
 rec=json.loads((r/'.sites-runtime/overhaul-20261010'/name/'process-receipt.json').read_text());assert rec['exitCode'] is not None
dest.mkdir(exist_ok=False)
assert 'CLOSED' in (r/'tools/overhaul-performance-122/HANDOFF.md').read_text(encoding='utf8')
paths=['docs/overhaul/player-recovery-118-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/coop116-causal-diagnosis.md','src/game/camera/visualEnvelope.ts','src/game/camera/weightedVisualEnvelope007.ts']
paths.extend(p.relative_to(r).as_posix() for p in (r/'tests').glob('*122*') if p.is_file())
for folder in ['assets/source/overhaul-pounce-anatomy-119','assets/source/overhaul-pounce-anatomy-121','tools/overhaul-coop-integration-116','tools/overhaul-anatomy-117','tools/overhaul-anatomy-119','tools/overhaul-anatomy-121','tools/overhaul-performance-122','tools/player-recovery-118']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('*') if p.is_file() and any(x in p.name for x in ['115','116','119','121','122']))
for folder in ['coop116-observation','coop116-public','coop116-review','anatomy121-author','anatomy121-views','anatomy121-source-views']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010').glob('coop116*.json') if p.is_file())
rows=[]
for name in sorted(set(paths)):
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'116 actual incomplete mission/checkpoint +117 anatomical diagnosis +119 unrun denied source +121 actual authored master/output review +118 exact handoff. Live052 limited aim/control/checkpoint; anatomy unshipped. Restore orderedparents thenfiles; never028. Goal incomplete.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2));assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-053.json').write_text(json.dumps(verification,indent=2));print(json.dumps(verification))

from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
prior=r/'.sites-runtime/overhaul-20261010/handoff-049'
old=json.loads((prior/'manifest.json').read_text())
dest=r/'.sites-runtime/overhaul-20261010/handoff-050';dest.mkdir(exist_ok=False)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
paths=['src/game/world/cityPresentation.ts','src/game/camera/CameraRig.tsx','tests/city-presentation.test.ts','docs/overhaul/player-lag-105-handoff.md','docs/overhaul/critic/coop104-source-review.md','docs/overhaul/critic/client105-camera-cost-diagnosis.md','docs/overhaul/critic/player-lag-105-source-review.md','docs/overhaul/critic/player-lag-105-play-review.md']
for folder in ['tools/player-lag-105','tools/overhaul-coop-controller-103','tools/overhaul-coop-integration-104']:
    paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file())
rows=[]
for name in sorted(set(paths)):
    p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
    assert sha(p)==sha(q)
    rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'105 retainedLIMITED050 sources;103/104 heldUNRUN; actual lag and fullgoal incomplete. Restore base then ordered parents then files, never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2))
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
verification={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-050.json').write_text(json.dumps(verification,indent=2))
print(json.dumps(verification))

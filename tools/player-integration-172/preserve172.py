from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-063';dest=r/'.sites-runtime/overhaul-20261010/handoff-064'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='928e3f2df557466478ceba644dcb2e2259ca4c57d869560d05784537942989bc'
old=json.loads((prior/'manifest.json').read_text());paths=['docs/overhaul/player-integration-172-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md'];assert 'Continuation172 CLOSED' in (r/paths[0]).read_text(encoding='utf8')
for packet in ['overhaul-squad-168','overhaul-profile-169','overhaul-coop-170','overhaul-cycle-171']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text());assert data['writer']=='CLOSED';paths.extend(x['path'] for x in data['files']);paths.extend(p.relative_to(r).as_posix() for p in seal.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'tools/player-integration-172').rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['playability168-source-review.md','profile169-failure-review.md','playability171-source-review.md','playability172-observer-review.md','playability172-actual-review.md','coop173-phased-contract-review.md']:paths.append('docs/overhaul/critic/'+name)
for folder in ['profile169-public','profile169-observation','playability172-build','playability172-public','playability172-public-observation','playability172-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
b=r/'.sites-runtime/overhaul-20261009/build-061';paths.extend((b/name).relative_to(r).as_posix() for name in ['receipt.json','playable-checkpoint.json'])
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation172 CLOSED PROGRESS. Exact061 clock/camera limitedretention;170INFEASIBLEunadmitted. Humanlag/fullfinitegoal incomplete. Sources/preimages/originalprofile+playvideo/verdicts preserved. Orderedparents through063 then064,never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']};(r/'.sites-runtime/overhaul-20261010/continuation-verification-064.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

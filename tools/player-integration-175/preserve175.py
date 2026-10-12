from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
prior=r/'.sites-runtime/overhaul-20261010/handoff-064'
dest=r/'.sites-runtime/overhaul-20261010/handoff-065'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='b398b05ea5ff5a3fc27dfd348b01380ed0209281d6540518383d6bb4fae94582'
old=json.loads((prior/'manifest.json').read_text())
paths=['docs/overhaul/player-integration-175-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md']
assert 'Continuation175 CLOSED' in (r/paths[0]).read_text(encoding='utf8')
for packet in ['overhaul-coop-173','overhaul-motion-174','overhaul-motion-audit-176']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
 paths.extend(x['path'] for x in data['files'])
 paths.extend(p.relative_to(r).as_posix() for p in seal.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for folder in ['tools/player-integration-175','assets/source/overhaul-pounce-motion-174','.sites-runtime/overhaul-20261010/coop173-public','.sites-runtime/overhaul-20261010/coop173-public-observation']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['playability173-source-review.md','coop173-rescue-contract-review.md','coop173-revive-commit-review.md','motion174-failure-review.md','playability175-actual-review.md']:
 paths.append('docs/overhaul/critic/'+name)
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation175 CLOSED. Retained limited061;173 actual first outcome and independent review;174 failed unadmitted authored export;176 read-only interpolation counterexample. Human extremeLowest lag and full finite goal INCOMPLETE. Orderedparents through064 then065,never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-065.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

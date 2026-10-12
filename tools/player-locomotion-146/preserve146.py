from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2]
prior=r/'.sites-runtime/overhaul-20261010/handoff-058';dest=r/'.sites-runtime/overhaul-20261010/handoff-059'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='b827a606711ed5bf1c2b44691f8d12344980a01cc887f2bea2f0c85cbe841918'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
handoff=r/'docs/overhaul/player-locomotion-146-handoff.md';assert 'Continuation146 CLOSED' in handoff.read_text(encoding='utf8')
paths=[handoff.relative_to(r).as_posix(),'docs/overhaul/resource-limit-handoff-20261010.md']
for packet in ['overhaul-locomotion-143','overhaul-render-timeline-144','overhaul-training-worker-145']:
 d=json.loads((r/'tools'/packet/'source-seal.json').read_text(encoding='utf8'));assert d['writer']=='CLOSED'
 paths.extend(x['path'] for x in d['files'])
for folder in ['tools/player-locomotion-146','tools/overhaul-locomotion-143','tools/overhaul-render-timeline-144','tools/overhaul-training-worker-145','tools/overhaul-coop-145','assets/source/overhaul-locomotion-143']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['playability146-source-review.md','playability146-build-addendum.md','playability146-gameplay-review.md','playability146-temporal-addendum.md']:
 p=r/'docs/overhaul/critic'/name
 if p.exists():paths.append(p.relative_to(r).as_posix())
for folder in ['solo146-baseline','solo146-baseline-observation','playability146-build-observation','playability146-public','playability146-public-observation','playability146-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
for name in ['receipt.json','playable-checkpoint.json']:
 p=r/'.sites-runtime/overhaul-20261009/build-057'/name
 if p.exists():paths.append(p.relative_to(r).as_posix())
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation146 CLOSED coordinated locomotion/timeline/Solo worker candidate and actual independent gate; exact146 handoff controls public acceptance. Full overhaul and affected-human lag INCOMPLETE. Ordered parents then059; never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-059.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

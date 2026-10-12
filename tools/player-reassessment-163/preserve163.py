from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-061';dest=r/'.sites-runtime/overhaul-20261010/handoff-062';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='e0440a410866fcca9169220577117ffd7f2fbcb810066265086eccb448843fa0'
old=json.loads((prior/'manifest.json').read_text());paths=['docs/overhaul/player-reassessment-163-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/playability163-design-review.md']
assert 'Continuation163 CLOSED' in (r/paths[0]).read_text(encoding='utf8')
assert 'CLOSED' in (r/paths[2]).read_text(encoding='utf8')
for packet in ['overhaul-motion-160','overhaul-coop-162']:
 seal=r/'tools'/packet/'source-seal.json';d=json.loads(seal.read_text());assert d['writer']=='CLOSED';paths.extend(x['path'] for x in d['files'] if (r/x['path']).exists())
for folder in ['tools/overhaul-motion-160','tools/overhaul-coop-162','tools/player-reassessment-163']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation163 CLOSED bounded underlying-motion and arrival-corridor diagnosis; no new playable or gameplay admission. Exact critic/handoff define remaining work. Public limited058, source155 rejected. Ordered parents through061 then062, never028. Full finite goal/human lag INCOMPLETE.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']};(r/'.sites-runtime/overhaul-20261010/continuation-verification-062.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

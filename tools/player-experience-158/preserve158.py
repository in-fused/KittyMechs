from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-060';dest=r/'.sites-runtime/overhaul-20261010/handoff-061';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='177a4d1ed660d355b5c9cb196a58ef962e099b0d92c5bfe850984368a59bcf83'
old=json.loads((prior/'manifest.json').read_text());paths=[]
assert 'Continuation158 CLOSED' in (r/'docs/overhaul/player-experience-158-handoff.md').read_text(encoding='utf8')
paths+=['docs/overhaul/player-experience-158-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md']
for packet in ['overhaul-locomotion-155','overhaul-coop-156','overhaul-coop-159']:
 seal=r/'tools'/packet/'source-seal.json';d=json.loads(seal.read_text());assert d['writer']=='CLOSED';paths.extend(x['path'] for x in d['files'] if (r/x['path']).exists())
for folder in ['tools/overhaul-locomotion-155','tools/overhaul-coop-156','tools/overhaul-coop-159','tools/player-experience-157','tools/player-experience-158']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('playability15*.md'))
for folder in ['experience157-default-camera','experience157-observation','coop159-public','coop159-public-observation','playability159-review','playability158-build-observation','playability158-public','playability158-public-observation','playability158-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
for name in ['receipt.json','playable-checkpoint.json','acceptance158.json']:
 p=r/'.sites-runtime/overhaul-20261009/build-059'/name
 if p.exists():paths.append(p.relative_to(r).as_posix())
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation158 CLOSED. Exact handoff and independent actual158 review control public retention. Source155 replaces154 in mutable source; prior154/preimages058 retained. Actual159 partial combat/checkpoint only, full mission incomplete. Ordered parents through060 then061, never028. Full finite goal/human lag INCOMPLETE.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']};(r/'.sites-runtime/overhaul-20261010/continuation-verification-061.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

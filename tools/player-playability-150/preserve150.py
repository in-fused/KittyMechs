from pathlib import Path
import json,hashlib,shutil,datetime
r=Path(__file__).resolve().parents[2]
prior=r/'.sites-runtime/overhaul-20261010/handoff-059';dest=r/'.sites-runtime/overhaul-20261010/handoff-060'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='25e731e6966ccb11556013743361bf105d88139c01dec192433fdfd60ee49e67'
old=json.loads((prior/'manifest.json').read_text());paths=[]
handoff=r/'docs/overhaul/player-playability-150-handoff.md'
assert 'Continuation150 CLOSED' in handoff.read_text(encoding='utf8')
paths += [handoff.relative_to(r).as_posix(),'docs/overhaul/resource-limit-handoff-20261010.md']
for packet in ['overhaul-locomotion-147','overhaul-locomotion-152','overhaul-locomotion-154','overhaul-coop-151','overhaul-coop-153']:
 seal=r/'tools'/packet/'source-seal.json';d=json.loads(seal.read_text());assert d['writer']=='CLOSED'
 paths.extend(x['path'] for x in d['files'] if (r/x['path']).exists())
for folder in ['tools/player-playability-150','tools/overhaul-locomotion-147','tools/overhaul-locomotion-152','tools/overhaul-locomotion-154','tools/overhaul-coop-151','tools/overhaul-coop-153']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('playability15*.md'))
for folder in ['playability150-profile','playability150-profile-observation','coop151-public','coop151-public-observation','playability150-coop-review','coop153-public','coop153-public-observation','playability153-coop-review','playability154-build-observation','playability154-public','playability154-public-observation','playability154-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file() and not p.name.startswith('temporal-0'))
for name in ['receipt.json','playable-checkpoint.json','acceptance150.json']:
 p=r/'.sites-runtime/overhaul-20261009/build-058'/name
 if p.exists():paths.append(p.relative_to(r).as_posix())
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation150 CLOSED. Exact handoff and independent actual154 review control public retention. Source154 deliberately replaces rejected143 contact; explicit zero-contact policy. Ordered parents through059 then060, never028. Full finite goal and human lag INCOMPLETE.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-060.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

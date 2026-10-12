from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];prior=r/'.sites-runtime/overhaul-20261010/handoff-062';dest=r/'.sites-runtime/overhaul-20261010/handoff-063'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='e493084d1ac3939a18926efaabc6e291d60d3436bfa89f2973fb07a72122a0e1'
old=json.loads((prior/'manifest.json').read_text());paths=['docs/overhaul/player-integration-166-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md']
assert 'Continuation166 CLOSED' in (r/paths[0]).read_text(encoding='utf8')
for packet in ['overhaul-locomotion-164','overhaul-coop-165','overhaul-camera-167']:
 seal=r/'tools'/packet/'source-seal.json';d=json.loads(seal.read_text());assert d['writer']=='CLOSED';paths.extend(x['path'] for x in d['files'])
 paths.extend(p.relative_to(r).as_posix() for p in seal.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'tools/player-integration-166').rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.extend(p.relative_to(r).as_posix() for p in (r/'docs/overhaul/critic').glob('playability16*-*review.md') if any(n in p.name for n in ['164','165','166','167']))
for folder in ['playability166-build','playability166-public','playability166-public-observation','playability166-review','coop165-public','coop165-public-observation','coop165b-public-observation','coop165-review']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
b=r/'.sites-runtime/overhaul-20261009/build-060'
if b.exists():paths.extend((b/name).relative_to(r).as_posix() for name in ['receipt.json','playable-checkpoint.json'])
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation166 CLOSED. Exact handoff/critic decide public retention.164 incomplete fixture preserved;165 full co-op and human lag/full finite goal incomplete. Source, preimages and original media preserved. Ordered parents through062 then063, never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']};(r/'.sites-runtime/overhaul-20261010/continuation-verification-063.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

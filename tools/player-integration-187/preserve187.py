from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
prior=r/'.sites-runtime/overhaul-20261010/handoff-067'
dest=r/'.sites-runtime/overhaul-20261010/handoff-068'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'manifest.json')=='d6615bcc314ee677f0091a17fc3b0c928541883809984e4cfba478652e4a944b'
old=json.loads((prior/'manifest.json').read_text())
paths=['docs/overhaul/player-integration-187-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md']
assert 'Continuation187 CLOSED' in (r/paths[0]).read_text(encoding='utf8')
for packet in ['overhaul-contact-185','overhaul-city-lod-186']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
 paths.extend(x['path'] for x in data['files'])
 paths.extend(p.relative_to(r).as_posix() for p in seal.parent.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for folder in ['tools/player-integration-187']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['contact185-source-review.md']:
 paths.append('docs/overhaul/critic/'+name)
dest.mkdir(exist_ok=False);rows=[];seen=set()
for name in sorted(set(paths)):
 if name.casefold() in seen:continue
 seen.add(name.casefold());p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
 assert sha(p)==sha(q);rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Continuation187 CLOSED; rejected185source candidate and actualcounterexamples preserved BEFORE source restoration;186negativeLOD. Limited062retained/fullquality/humanlagINCOMPLETE. Parents through067then068,never028.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes']}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-068.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

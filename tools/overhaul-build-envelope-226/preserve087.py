from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261011/handoff-086';assert sha(prior/'manifest.json')=='9a0a222cfab8472c9ecf599bc7a593010d1be35aae18ec7b53bdc857700dc931'
old=json.loads((prior/'manifest.json').read_text())
for row in old['files']:assert sha(prior/'files'/row['path'])==row['sha256']
paths=['docs/overhaul/player-integration-226-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','tools/player-integration-193/plugin-usage-audit193.json']
for folder in ['tools/overhaul-startup-220','tools/overhaul-pack-221','tools/overhaul-native-integration-222','tools/overhaul-loader-wrapper-223','tools/overhaul-pack-closure-224','tools/overhaul-native-admission-225','tools/overhaul-build-envelope-226','.sites-runtime/overhaul-20261011/native225-private','.sites-runtime/overhaul-20261011/build-supervisor226']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['startup220-source-review.md','pack221-actual-review.md','native222-integration-source-review.md','native225-admission-source-review.md','native226-build-review.md']:paths.append('docs/overhaul/critic/'+name)
dest=r/'.sites-runtime/overhaul-20261011/handoff-087';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;digest=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)==digest,name
 rows.append({'path':name,'bytes':q.stat().st_size,'sha256':digest})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'scope':'CLOSED220-226 private source/actual pack/failed decoder/explicit later closure/build/critics. Public062 unchanged; full goal and human lag INCOMPLETE. No active observer capture.','files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows)}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'publicPlayable':'LIMITED062','fullGoal':'ACTIVE_INCOMPLETE'}
(r/'.sites-runtime/overhaul-20261011/continuation-verification-087.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

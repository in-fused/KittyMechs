from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261010/handoff-073';assert sha(prior/'manifest.json')=='1d07d28d3c8bb6f60a21b71fd01172e16b947d81ed70243f798306f44ba0f9a2'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256']
base=r/'.sites-runtime/overhaul-20261009/build-062';assert sha(base/'receipt.json')=='5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c'
count=0
for x in json.loads((base/'receipt.json').read_text())['files']:
 assert sha(base/'playable-root'/x['path'])==x['sha256']
 if x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];count+=1
dest=r/'.sites-runtime/overhaul-20261010/handoff-074';dest.mkdir(exist_ok=False);rows=[]
for name in ['docs/overhaul/player-integration-195-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','tools/player-integration-195/preserve-final195.py','.sites-runtime/overhaul-20261010/continuation-verification-073.json']:
 p=r/name;q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(p)==sha(q)
 rows.append({'path':name,'bytes':p.stat().st_size,'sha256':sha(p)})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Final195 UTF-8 documentation/resource-pointer correction after073 source snapshot; full objective incomplete, source exact062.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');assert all(sha(dest/'files'/x['path'])==x['sha256'] for x in rows)
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'runtimeRowsMatched062':count,'prior073Verified':True}
(r/'.sites-runtime/overhaul-20261010/continuation-verification-074.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

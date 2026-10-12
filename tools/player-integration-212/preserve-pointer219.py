from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
prior=r/'.sites-runtime/overhaul-20261011/handoff-085'
assert sha(prior/'manifest.json')=='7da285951ca593d420e5d6cca1fe29f18a4ea69c3f0d81309fdeb85d74cac15e'
old=json.loads((prior/'manifest.json').read_text(encoding='utf8'))
for x in old['files']:assert sha(prior/'files'/x['path'])==x['sha256'],x['path']
assert sha(r/'docs/overhaul/critic/native218-source-review.md')=='6f635e02f56bb34e67333999f0e8264baa49581c82930cf7f7221b42b4ecf28c'
names=['docs/overhaul/critic/native218-source-review.md','docs/overhaul/player-integration-219-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','.sites-runtime/overhaul-20261011/continuation-verification-085.json','tools/player-integration-212/preserve-pointer219.py']
dest=r/'.sites-runtime/overhaul-20261011/handoff-086';dest.mkdir(exist_ok=False);rows=[]
for name in names:
 p=r/name;before=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert before==sha(p)==sha(q),name
 rows.append({'path':name,'bytes':q.stat().st_size,'sha256':before})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows),'scope':'Final219 exact pointers and CLOSED218 conditional independent source review. All agents idle, no actualjob/publicupgrade. Limited062 retained. Fullgoal/humanlag INCOMPLETE.'}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'fullGoal':'ACTIVE_INCOMPLETE','publicPlayable':'LIMITED062'}
(r/'.sites-runtime/overhaul-20261011/continuation-verification-086.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

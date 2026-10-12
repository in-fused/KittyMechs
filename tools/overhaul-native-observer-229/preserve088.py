from pathlib import Path
import hashlib,json,shutil,datetime
r=Path(__file__).resolve().parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();prior=r/'.sites-runtime/overhaul-20261011/handoff-087'
assert sha(prior/'manifest.json')=='8559dff469f227648d86de9bf5edafdea2581b0673c5df96375e652d2d1875d7';old=json.loads((prior/'manifest.json').read_text())
for row in old['files']:assert sha(prior/'files'/row['path'])==row['sha256']
paths=['docs/overhaul/player-integration-231-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/startup229-design-reassessment.md','docs/overhaul/critic/native228-observer-source-review.md','docs/overhaul/critic/native228-actual-review.md']
for folder in ['tools/overhaul-native-observer-227','tools/overhaul-native-observer-228','tools/overhaul-native-observer-229','tools/overhaul-native-idle-230','.sites-runtime/overhaul-20261011/native228-public','.sites-runtime/overhaul-20261011/native228-supervisor']:
 paths.extend(p.relative_to(r).as_posix() for p in (r/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
dest=r/'.sites-runtime/overhaul-20261011/handoff-088';dest.mkdir(exist_ok=False);rows=[]
for name in sorted(set(paths)):
 p=r/name;digest=sha(p);q=dest/'files'/name;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);assert sha(q)==sha(p)==digest,name;rows.append({'path':name,'bytes':q.stat().st_size,'sha256':digest})
manifest={**old,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parents':old['parents']+[{'path':str(prior),'manifestSHA256':sha(prior/'manifest.json')}],'scope':'CLOSED227-230 source, failedactual228 plus actualcritic/correct boundary/laterclosure/230idlefix/229startupdesign. Public062unchanged; no activewriter/job. FullgoalINCOMPLETE.','files':rows,'count':len(rows),'bytes':sum(x['bytes'] for x in rows)}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');out={'status':'VERIFIED','overlay':str(dest),'manifestSHA256':sha(dest/'manifest.json'),'count':len(rows),'bytes':manifest['bytes'],'publicPlayable':'LIMITED062','fullGoal':'ACTIVE_INCOMPLETE'}
(r/'.sites-runtime/overhaul-20261011/continuation-verification-088.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

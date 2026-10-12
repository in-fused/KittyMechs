from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-045';new=r/'.sites-runtime/overhaul-20261009/build-046'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='2dfc9912c42a7f8dbe4658b4debe97440290a314cf265dc49410bbb389b911ed'
v=json.loads((r/'.sites-runtime/overhaul-20261010/performance086-build/process-receipt.json').read_text());assert v['exitCode']==0 and v['failure'] is None and [x['path'] for x in v['inputsAfter'] if not x['match']]==['docs/overhaul/critic/performance085-source-review.md']
s=json.loads((r/'tools/overhaul-performance-integration-086/build-seal.json').read_text()); administrative='docs/overhaul/critic/performance085-source-review.md'; before=r/'tools/overhaul-performance-integration-086/early-review085.md'; after=r/administrative
assert sha(before)==next(x['sha256'] for x in s['files'] if x['path']==administrative)
assert sha(after)=='0f66010072da4aab1ecd6a10e898e19076c02dbc94257eccbc0806540eb11417'
assert 'APPROVE' in (r/'docs/overhaul/critic/performance086-build-review.md').read_text(encoding='utf8')
assert all(sha(r/x['path'])==x['sha256'] and (r/x['path']).stat().st_size==x['bytes'] for x in s['files']+s.get('protected',[]) if x['path']!=administrative)
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']}
paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.add('src/game/entities/animatedEnemyBounds081.ts');paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)]
assert [x['path'] for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'] not in mapping or mapping[x['path']]['sha256']!=x['sha256'])]==['src/game/entities/Actors.tsx','src/game/entities/animatedEnemyBounds081.ts']
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'Frozen046 candidate enemy-only final-pose conservative mesh culling. Unadmitted pending actual performance/visual critic. Fullgoal incomplete.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable045Hardlinks':links,'changedCopies':copies,'receiptSHA256':sha(new/'receipt.json'),'parentReceiptSHA256':sha(old/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))

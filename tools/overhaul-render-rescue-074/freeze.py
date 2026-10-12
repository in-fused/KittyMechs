from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-043';new=r/'.sites-runtime/overhaul-20261009/build-044'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='0cacbbd7c6c17d6c7bacb4aead027cd26812a640361f6cf25a78cfb3f855165d'
v=json.loads((r/'.sites-runtime/overhaul-20261010/render-rescue074-build/process-receipt.json').read_text());assert v['exitCode']==0 and v['failure'] is None and all(x['match'] for x in v['inputsAfter'])
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']};paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)];new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'Frozen044 candidate070 emptybatch rendering/rescue roundhull. Original043 camera. Public play/critic pending; userlag/fullgoal INCOMPLETE.','files':rows},indent=2));dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'UTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable043Hardlinks':links,'changedCopies':copies,'receiptSHA256':sha(new/'receipt.json'),'parentReceiptSHA256':sha(old/'receipt.json')};(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))

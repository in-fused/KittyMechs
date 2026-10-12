from pathlib import Path
import json,hashlib,os,shutil,datetime
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-036';new=r/'.sites-runtime/overhaul-20261009/build-037'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='1022aa38c1dd3a29ed0214ca30ad56f8571c3f9a1bd19f3578a99eba63aca0c6'
prior=json.loads((old/'receipt.json').read_text());mapping={x['path']:x for x in prior['files']}
paths={x['path'] for x in prior['files'] if not x['path'].startswith('dist/')}
paths.update(p.relative_to(r).as_posix() for p in (r/'dist').rglob('*') if p.is_file())
h=json.loads((r/'tools/overhaul-squad-extraction-052/source-handoff.json').read_text())
for x in h['files']:
 if x['path'].startswith(('src/','public/','shared/','server/')):paths.add(x['path'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths)]
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'Frozen037 squad-extraction052 candidate, publicmission unqualified.','files':rows},indent=2))
dest=new/'playable-root';dest.mkdir();links=copies=copybytes=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'])
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/x['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1;copybytes+=x['bytes']
 assert sha(target)==x['sha256'] and target.stat().st_size==x['bytes']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
o={'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable036Hardlinks':links,'changedCopies':copies,'copiedBytes':copybytes,'receiptSHA256':sha(new/'receipt.json'),'parentReceiptSHA256':sha(old/'receipt.json'),'scope':'Immutable checkpoints; no mutable source/dist hardlinks. Candidate unqualified.'}
(new/'playable-checkpoint.json').write_text(json.dumps(o,indent=2));print(json.dumps(o))

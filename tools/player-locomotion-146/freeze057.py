from pathlib import Path
import hashlib,json,os,shutil
from closed_inputs import verified_input
r=Path(__file__).resolve().parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=r/'.sites-runtime/overhaul-20261009/build-056'
new=r/'.sites-runtime/overhaul-20261009/build-057'
assert sha(old/'receipt.json')=='64e158e208f75d4829a40afdaf6e4de1285149b307d7653807e33391ef5bce20'
prior=json.loads((old/'receipt.json').read_text(encoding='utf8'))
mapping={x['path'].casefold():x for x in prior['files']}
admitted={}
for packet in ['overhaul-locomotion-143','overhaul-render-timeline-144','overhaul-training-worker-145']:
 seal=r/'tools'/packet/'source-seal.json'
 data=json.loads(seal.read_text(encoding='utf8'));assert data['writer']=='CLOSED'
 for x in data['files']:
  p=verified_input(r,packet,x)
  if p==r/x['path'] and x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
review=r/'docs/overhaul/critic/playability146-source-review.md'
assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')}
paths.update({k:x['path'] for k,x in admitted.items()})
for p in (r/'dist').rglob('*'):
 if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':sha(r/p)} for p in sorted(paths.values())]
changed=[x for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'].casefold() not in mapping or mapping[x['path'].casefold()]['sha256']!=x['sha256'])]
assert changed and all(x['path'].casefold() in admitted and admitted[x['path'].casefold()]['sha256']==x['sha256'] for x in changed),[x['path'] for x in changed]
new.mkdir(exist_ok=False)
(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED057 coordinated143 locomotion,144 slow-frame timeline,145 Solo Worker. Actual gameplay critic required; human lag and full overhaul incomplete.','files':rows},indent=2),encoding='utf8')
dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/previous['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable056Hardlinks':links,'changedCopies':copies,'changedSource':[x['path'] for x in changed],'receiptSHA256':sha(new/'receipt.json')}
(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

from pathlib import Path
import hashlib,json,sys,subprocess,os,shutil
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
old=r/'.sites-runtime/overhaul-20261009/build-060';new=r/'.sites-runtime/overhaul-20261009/build-061'
def inputs():
 files=[];admitted={};protected=[]
 for packet,sealsha,reviewname in [('overhaul-squad-168','a715f9ea3234ee08311224f07ad73cd0d95ed0766d34d71bed226beb598d6a7c','playability168-source-review.md'),('overhaul-cycle-171','e2b6038786f3c96d7ca973b94a453f15557c4c7af9cbe5ef8bed0e9fcb70bcd2','playability171-source-review.md')]:
  seal=r/'tools'/packet/'source-seal.json';assert sha(seal)==sealsha;data=json.loads(seal.read_text());assert data['writer']=='CLOSED';files.append(row(seal))
  review=r/'docs/overhaul/critic'/reviewname;assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8');files.append(row(review))
  for x in data['files']:
   p=r/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'],x['path'];files.append(row(p))
   if x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
 assert sha(old/'receipt.json')=='a17e8ae25f8f136e5a7d9ab145448f8fa977d41882e4d17cc5b2a24fa784867b'
 prior=json.loads((old/'receipt.json').read_text())
 for n in ['058','059','060']:
  f=r/f'.sites-runtime/overhaul-20261009/build-{n}';protected.append(row(f/'receipt.json'))
  for x in json.loads((f/'receipt.json').read_text())['files']:
   p=f/'playable-root'/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'];protected.append(row(p))
 for x in prior['files']:
  if x['path'].startswith('dist/'):continue
  actual=row(r/x['path'])
  if actual['sha256']!=x['sha256']:assert admitted.get(x['path'].casefold(),{}).get('sha256')==actual['sha256'],x['path']
  files.append(actual)
 files.extend(row(p) for p in [h/'build172.py',r/'tools/overhaul-root-round-027/run-seal.py'])
 return files,protected,admitted,prior
mode=sys.argv[1]
if mode=='prepare':
 files,protected,_,_=inputs();p=h/'build172-seal.json';assert not p.exists()
 p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-integration-172/build172.py','run'],'scope':'ONE assembled168 safe squad deployment plus171 coherent authored cycle. Source-only admission; actual review required. Protect frozen058/059/060.'},indent=2),encoding='utf8');print('Build172 prepared')
elif mode=='run':raise SystemExit(subprocess.call(['cmd','/c','npm','run','build'],cwd=r))
elif mode=='freeze':
 job=json.loads((r/'.sites-runtime/overhaul-20261010/playability172-build/process-receipt.json').read_text());assert job['exitCode']==0 and job['inclusiveBoundObserved'] and all(x['match'] for x in job['inputsAfter'])
 _,_,admitted,prior=inputs();mapping={x['path'].casefold():x for x in prior['files']}
 paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update({k:x['path'] for k,x in admitted.items()})
 for p in (r/'dist').rglob('*'):
  if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
 rows=[{'path':name,'bytes':(r/name).stat().st_size,'sha256':sha(r/name)} for name in sorted(paths.values())]
 changed=[x for x in rows if x['path'].startswith(('src/','shared/','server/')) and mapping.get(x['path'].casefold(),{}).get('sha256')!=x['sha256']]
 assert len(changed)==6 and all(admitted.get(x['path'].casefold(),{}).get('sha256')==x['sha256'] for x in changed)
 new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED061:168 native safe squad deployment/restore and171 all-positive authored gait clock. Actual retention required; contact/art/humanlag/fullscope incomplete.','files':rows},indent=2),encoding='utf8');dest=new/'playable-root';dest.mkdir();links=copies=0
 for x in rows:
  target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
  if previous and previous['sha256']==x['sha256']:os.link(old/'playable-root'/previous['path'],target);links+=1
  else:shutil.copy2(r/x['path'],target);copies+=1
  assert sha(target)==x['sha256']
 result={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable060Hardlinks':links,'changedCopies':copies,'changedSource':[x['path'] for x in changed],'receiptSHA256':sha(new/'receipt.json')}
 (new/'playable-checkpoint.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
else:raise ValueError(mode)

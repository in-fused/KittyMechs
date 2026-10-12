from pathlib import Path
import hashlib,json,sys,subprocess,os,shutil
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
old=r/'.sites-runtime/overhaul-20261009/build-058';new=r/'.sites-runtime/overhaul-20261009/build-060'
expected={'164':'7cedb3a799aa37e50f5e377e920718a04a393ec57ef6680e62164236b8f1d25d','167':'560cba9b161d5317ad252f9005ba0e75b92c69a0fcceee4721f897ba3e53cf4a'}
def inputs(reviewsha):
 review=r/'docs/overhaul/critic/playability164-source-review.md'
 assert sha(review)==reviewsha and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8') and 'CLOSED' in review.read_text(encoding='utf8')
 camera=r/'docs/overhaul/critic/playability167-camera-source-review.md'
 assert sha(camera)=='1dcf4281b18e4eef0363608ec4840ee6dd548301f90314e41e74a780bfc8c873'
 files=[row(p) for p in [review,camera,h/'build166.py',r/'tools/overhaul-root-round-027/run-seal.py']];admitted={}
 for n,folder in [('164','overhaul-locomotion-164'),('167','overhaul-camera-167')]:
  p=r/'tools'/folder/'source-seal.json';assert sha(p)==expected[n];data=json.loads(p.read_text());assert data['writer']=='CLOSED';files.append(row(p))
  for x in data['files']:
   p=r/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'],x['path'];files.append(row(p))
   if x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
 assert sha(old/'receipt.json')=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
 prior=json.loads((old/'receipt.json').read_text());protected=[]
 for n in ['058','059']:
  f=r/f'.sites-runtime/overhaul-20261009/build-{n}';protected.append(row(f/'receipt.json'))
  for x in json.loads((f/'receipt.json').read_text())['files']:
   p=f/'playable-root'/x['path'];assert sha(p)==x['sha256'];protected.append(row(p))
 for x in prior['files']:
  if x['path'].startswith('dist/'):continue
  p=r/x['path'];actual=row(p)
  if actual['sha256']!=x['sha256']:assert admitted.get(x['path'].casefold(),{}).get('sha256')==actual['sha256'],x['path']
  files.append(actual)
 return files,protected,admitted,prior
mode=sys.argv[1]
if mode=='prepare':
 files,protected,_,_=inputs(sys.argv[2]);p=h/'build166-seal.json';assert not p.exists()
 p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-integration-166/build166.py','run'],'scope':'ONE assembled164/167 production build. No movement/art/contact/human-lag acceptance. Frozen058/059 protected.'},indent=2),encoding='utf8');print('Build166 prepared')
elif mode=='run':raise SystemExit(subprocess.call(['cmd','/c','npm','run','build'],cwd=r))
elif mode=='freeze':
 job=json.loads((r/'.sites-runtime/overhaul-20261010/playability166-build/process-receipt.json').read_text());assert job['exitCode']==0 and job['inclusiveBoundObserved'] and all(x['match'] for x in job['inputsAfter'])
 files,_,admitted,prior=inputs(sys.argv[2]);mapping={x['path'].casefold():x for x in prior['files']}
 paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update({k:x['path'] for k,x in admitted.items()})
 for p in (r/'dist').rglob('*'):
  if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
 rows=[{'path':name,'bytes':(r/name).stat().st_size,'sha256':sha(r/name)} for name in sorted(paths.values())]
 changed=[x for x in rows if x['path'].startswith(('src/','shared/','server/')) and mapping.get(x['path'].casefold(),{}).get('sha256')!=x['sha256']]
 assert changed and all(admitted.get(x['path'].casefold(),{}).get('sha256')==x['sha256'] for x in changed)
 new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED060:164 final limb roles/current footprint support/affine sole evaluation and167 shared zoom. First fixture failure preserved. Actual critic retention required; contact/art/humanlag/full scope incomplete.','files':rows},indent=2),encoding='utf8');dest=new/'playable-root';dest.mkdir();links=copies=0
 for x in rows:
  target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
  if previous and previous['sha256']==x['sha256']:os.link(old/'playable-root'/previous['path'],target);links+=1
  else:shutil.copy2(r/x['path'],target);copies+=1
  assert sha(target)==x['sha256']
 result={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable058Hardlinks':links,'changedCopies':copies,'changedSource':[x['path'] for x in changed],'receiptSHA256':sha(new/'receipt.json')}
 (new/'playable-checkpoint.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
else:raise ValueError(mode)

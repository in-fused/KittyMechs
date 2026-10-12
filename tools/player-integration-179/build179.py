from pathlib import Path
import hashlib,json,sys,subprocess,os,shutil
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
old=r/'.sites-runtime/overhaul-20261009/build-061';new=r/'.sites-runtime/overhaul-20261009/build-062'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
def inputs():
 assert sha(old/'receipt.json')=='0f85163eac0dbc7047caf84ae725b094f38b1ca3ceccc3ee0bfbb9b4bb612215'
 seal=r/'tools/overhaul-render-178/source-seal.json';d=json.loads(seal.read_text());assert d['writer']=='CLOSED'
 review=r/'docs/overhaul/critic/render178-source-review.md';assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
 admitted={};files=[row(p) for p in [seal,review,h/'build179.py',r/'tools/overhaul-root-round-027/run-seal.py']]
 for x in d['files']:
  p=r/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'],x['path'];files.append(row(p))
  if x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
 assert admitted,'No playable source improvement'
 prior=json.loads((old/'receipt.json').read_text());protected=[row(old/'receipt.json')]
 for x in prior['files']:
  p=old/'playable-root'/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'];protected.append(row(p))
  if x['path'].startswith('dist/'):continue
  actual=row(r/x['path'])
  if actual['sha256']!=x['sha256']:assert admitted.get(x['path'].casefold(),{}).get('sha256')==actual['sha256'],x['path']
  files.append(actual)
 return files,protected,admitted,prior
mode=sys.argv[1]
if mode=='prepare':
 seal=r/'tools/overhaul-render-178/source-seal.json';review=r/'docs/overhaul/critic/render178-source-review.md'
 assert sha(seal)==sys.argv[2] and sha(review)==sys.argv[3]
 files,protected,_,_=inputs();p=h/'build179-seal.json';assert not p.exists()
 p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-integration-179/build179.py','run'],'scope':'ONE admitted178 presentation optimization. Preserve immutable061/native gameplay/art assets. Actual gameplay and performance review required; severe human lag unresolved.'},indent=2),encoding='utf8');print('Prepared179')
elif mode=='run':raise SystemExit(subprocess.call(['cmd','/c','npm','run','build'],cwd=r))
elif mode=='freeze':
 job=json.loads((r/'.sites-runtime/overhaul-20261010/playability179-build/process-receipt.json').read_text());assert job['exitCode']==0 and job['inclusiveBoundObserved'] and all(x['match'] for x in job['inputsAfter'])
 _,_,admitted,prior=inputs();mapping={x['path'].casefold():x for x in prior['files']}
 paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update({k:x['path'] for k,x in admitted.items()})
 for p in (r/'dist').rglob('*'):
  if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
 rows=[{'path':name,'bytes':(r/name).stat().st_size,'sha256':sha(r/name)} for name in sorted(paths.values())]
 changed=[x for x in rows if x['path'].startswith(('src/','shared/','server/')) and mapping.get(x['path'].casefold(),{}).get('sha256')!=x['sha256']]
 assert changed and all(admitted.get(x['path'].casefold(),{}).get('sha256')==x['sha256'] for x in changed)
 new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED062:178 presentation rendering candidate. Actual review required; human lag/full scope incomplete.','files':rows},indent=2),encoding='utf8');dest=new/'playable-root';dest.mkdir();links=copies=0
 for x in rows:
  target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
  if previous and previous['sha256']==x['sha256']:os.link(old/'playable-root'/previous['path'],target);links+=1
  else:shutil.copy2(r/x['path'],target);copies+=1
  assert sha(target)==x['sha256']
 result={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable061Hardlinks':links,'changedCopies':copies,'changedSource':[x['path'] for x in changed],'receiptSHA256':sha(new/'receipt.json')}
 (new/'playable-checkpoint.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
else:raise ValueError(mode)

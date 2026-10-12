from pathlib import Path
import hashlib,json,os,shutil
r=Path(__file__).resolve().parents[2];old=r/'.sites-runtime/overhaul-20261009/build-057';new=r/'.sites-runtime/overhaul-20261009/build-058'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(old/'receipt.json')=='22038154e3e158699f38cfbfb7f928794ea1cf7fb0f81a6b374f22074a77b393'
run=json.loads((r/'.sites-runtime/overhaul-20261010/playability154-build-observation/process-receipt.json').read_text(encoding='utf8'));assert run['exitCode']==0 and run['inclusiveBoundObserved'] and all(x['match'] for x in run['inputsAfter'])
review=r/'docs/overhaul/critic/playability154-source-addendum.md';assert sha(review)=='442be44cb490e4aa72c548165f9fd5f5d281f60f3f5e487435414a9313f0096d' and 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
prior=json.loads((old/'receipt.json').read_text(encoding='utf8'));mapping={x['path'].casefold():x for x in prior['files']};admitted={}
data=json.loads((r/'tools/overhaul-locomotion-154/source-seal.json').read_text(encoding='utf8'));assert data['writer']=='CLOSED'
for x in data['files']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
 if x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
paths={x['path'].casefold():x['path'] for x in prior['files'] if not x['path'].startswith('dist/')};paths.update({k:x['path'] for k,x in admitted.items()})
for p in (r/'dist').rglob('*'):
 if p.is_file():name=p.relative_to(r).as_posix();paths[name.casefold()]=name
rows=[{'path':name,'bytes':(r/name).stat().st_size,'sha256':sha(r/name)} for name in sorted(paths.values())]
changed=[x for x in rows if x['path'].startswith(('src/','shared/','server/')) and (x['path'].casefold() not in mapping or mapping[x['path'].casefold()]['sha256']!=x['sha256'])]
assert changed and all(x['path'].casefold() in admitted and admitted[x['path'].casefold()]['sha256']==x['sha256'] for x in changed)
new.mkdir(exist_ok=False);(new/'receipt.json').write_text(json.dumps({'scope':'UNADMITTED058 explicit authored-source154 presentation. Contact143/147/152 rejected; contact/convincingmovement/art/bodyclearance/humanlag/co-op/fullgoal incomplete. Timeline144/Worker145 bundled but require actual gate.','files':rows},indent=2),encoding='utf8')
dest=new/'playable-root';dest.mkdir();links=copies=0
for x in rows:
 target=dest/x['path'];target.parent.mkdir(parents=True,exist_ok=True);previous=mapping.get(x['path'].casefold())
 if previous and previous['sha256']==x['sha256']:
  source=old/'playable-root'/previous['path'];assert sha(source)==x['sha256'];os.link(source,target);links+=1
 else:shutil.copy2(r/x['path'],target);copies+=1
 assert sha(target)==x['sha256']
assert all(sha(old/'playable-root'/x['path'])==x['sha256'] for x in prior['files'])
out={'verified':True,'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'immutable057Hardlinks':links,'changedCopies':copies,'changedSource':[x['path'] for x in changed],'receiptSHA256':sha(new/'receipt.json')}
(new/'playable-checkpoint.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out))

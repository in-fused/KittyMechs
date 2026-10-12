from pathlib import Path
import hashlib,json,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'.sites-runtime/overhaul-20261009/build-058'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
review=r/'docs/overhaul/critic/playability155-source-review.md'
assert sha(review)=='7aacb8db970ffe8c4a0ee11aa580f1395066c12cf7253d1aaa7910b7ffd75ae0' and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
run=json.loads((r/'.sites-runtime/overhaul-20261010/coop159-public-observation/process-receipt.json').read_text())
assert run['inclusiveBoundObserved'] and all(x['match'] for x in run['inputsAfter'])
assert sha(old/'receipt.json')=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
prior=json.loads((old/'receipt.json').read_text());files=[row(p) for p in [review,h/'prepare-build158.py',h/'build158-launch.py',r/'tools/overhaul-root-round-027/run-seal.py']];admitted={}
seal=r/'tools/overhaul-locomotion-155/source-seal.json';assert sha(seal)=='210db53611d60202ff00f83fba550c8f192896ac3b108e33ba13b1f1ef5c0664'
data=json.loads(seal.read_text());assert data['writer']=='CLOSED';files.append(row(seal))
for x in data['files']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path'];files.append(row(p))
 if x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
for x in prior['files']:
 if x['path'].startswith('dist/'):continue
 actual=row(r/x['path'])
 if actual['sha256']!=x['sha256']:assert x['path'].casefold() in admitted and admitted[x['path'].casefold()]['sha256']==actual['sha256'],x['path']
 files.append(actual)
protected=[row(old/'playable-root'/x['path']) for x in prior['files']]+[row(old/'receipt.json')]
p=h/'build158-seal.json';assert not p.exists();p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-experience-158/build158-launch.py'],'scope':'ONE full155 candidate build after159 terminal. Preserve058. Source/skin cost, movement/contact/art/humanlag/fullscope not approved by build.'},indent=2),encoding='utf8')
print('ONE158 production candidate build sealed after159 terminal')

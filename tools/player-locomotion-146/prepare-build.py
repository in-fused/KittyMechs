from pathlib import Path
import hashlib,json,sys
from closed_inputs import verified_input
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
old=r/'.sites-runtime/overhaul-20261009/build-056'
assert sha(old/'receipt.json')=='64e158e208f75d4829a40afdaf6e4de1285149b307d7653807e33391ef5bce20'
review=r/'docs/overhaul/critic/playability146-source-review.md'
assert 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
files=[row(p) for p in [review,h/'build-launch.py',h/'prepare-build.py',h/'closed_inputs.py',r/'tools/overhaul-root-round-027/run-seal.py']]
admitted={}
for packet in ['overhaul-locomotion-143','overhaul-render-timeline-144','overhaul-training-worker-145']:
 seal=r/'tools'/packet/'source-seal.json';data=json.loads(seal.read_text(encoding='utf8'));assert data['writer']=='CLOSED';files.append(row(seal))
 for x in data['files']:
  p=verified_input(r,packet,x);files.append(row(p))
  if p==r/x['path'] and x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
prior=json.loads((old/'receipt.json').read_text(encoding='utf8'))
for x in prior['files']:
 if x['path'].startswith('dist/'):continue
 p=r/x['path'];actual=row(p)
 if actual['sha256']!=x['sha256']:assert x['path'].casefold() in admitted and admitted[x['path'].casefold()]['sha256']==actual['sha256'],x['path']
 files.append(actual)
protected=[row(old/'playable-root'/x['path']) for x in prior['files']]+[row(old/'receipt.json')]
out=h/'build-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':files,'protected':protected,'command':[sys.executable,'tools/player-locomotion-146/build-launch.py'],'scope':'ONE assembled candidate full production build; no source edits.180s inclusive root; immutable056 preserved.'},indent=2),encoding='utf8')
print('146 full production build sealed')

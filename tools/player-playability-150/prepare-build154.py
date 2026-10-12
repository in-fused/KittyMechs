from pathlib import Path
import hashlib,json,sys
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'.sites-runtime/overhaul-20261009/build-057'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
review=r/'docs/overhaul/critic/playability154-source-review.md';final=r/'docs/overhaul/critic/playability154-source-addendum.md';text=final.read_text(encoding='utf8');assert 'CLOSED' in text and 'APPROVE_ONE_PUBLIC_GATE' in text
assert sha(review)=='8dd32cae92effa789ac342794eda5cba47b670b8ff91af2484580e2c3e472856' and sha(final)=='442be44cb490e4aa72c548165f9fd5f5d281f60f3f5e487435414a9313f0096d'
assert sha(old/'receipt.json')=='22038154e3e158699f38cfbfb7f928794ea1cf7fb0f81a6b374f22074a77b393'
prior=json.loads((old/'receipt.json').read_text(encoding='utf8'));files=[row(p) for p in [review,final,h/'prepare-build154.py',h/'build154-launch.py',r/'tools/overhaul-root-round-027/run-seal.py']];admitted={}
seal=r/'tools/overhaul-locomotion-154/source-seal.json';data=json.loads(seal.read_text(encoding='utf8'));assert data['writer']=='CLOSED';files.append(row(seal))
for x in data['files']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path'];files.append(row(p))
 if x['path'].startswith(('src/','shared/','server/')):admitted[x['path'].casefold()]=x
for x in prior['files']:
 if x['path'].startswith('dist/'):continue
 p=r/x['path'];actual=row(p)
 if actual['sha256']!=x['sha256']:assert x['path'].casefold() in admitted and admitted[x['path'].casefold()]['sha256']==actual['sha256'],x['path']
 files.append(actual)
protected=[row(old/'playable-root'/x['path']) for x in prior['files']]+[row(old/'receipt.json')]
accepted=r/'.sites-runtime/overhaul-20261009/build-056';baseline=json.loads((accepted/'receipt.json').read_text(encoding='utf8'));assert sha(accepted/'receipt.json')=='64e158e208f75d4829a40afdaf6e4de1285149b307d7653807e33391ef5bce20'
for x in baseline['files']:
 p=accepted/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
out=h/'build154-seal.json';assert not out.exists();out.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-playability-150/build154-launch.py'],'scope':'ONE full154 source-animation candidate build from rejected057 source base. Contact143/147/152 rejected;144timeline/145worker need actual gate. Preserve live056. No quality/lag/fullgoal approval from build.'},indent=2),encoding='utf8')
print('154 full production build sealed after source review; 056/057 preserved')

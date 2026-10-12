from pathlib import Path
import hashlib,json,re,sys,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
frozen=r/'.sites-runtime/overhaul-20261009/build-056'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
def verify(x):
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path'];return p
review=r/'docs/overhaul/critic/playability150-design-review.md'
assert sha(review)=='cdfac6d61e5c15edd9b67a7e72cf7ac32c25f196416c0a6e81c7dcef3c6e6cde'
assert '**APPROVE ONE mission observation in principle**' in review.read_text(encoding='utf8')
files=[row(review)]
for name in ['source-seal.json','protected-inputs.json']:
 p=r/'tools/overhaul-coop-151'/name;data=json.loads(p.read_text(encoding='utf8'));assert data['writer']=='CLOSED';files.append(row(p))
 for x in data['files']:files.append(row(verify(x)))
seen=set()
def imports(p):
 p=p.resolve()
 if p in seen:return
 seen.add(p);files.append(row(p))
 if p.suffix not in ['.ts','.tsx','.mjs','.js']:return
 text=p.read_text(encoding='utf8')
 for name in re.findall(r'(?:from\s*|import\s*)[\x22\x27](\.[^\x22\x27]+)[\x22\x27]',text):
  q=p.parent/name
  choices=[q]+[Path(str(q)+s) for s in ['.ts','.tsx','.mjs','.js','.json']]+[q/'index.ts',q/'index.js']
  actual=next((c for c in choices if c.is_file()),None);assert actual,name;imports(actual)
imports(r/'tools/overhaul-coop-151/mission-capture.mjs')
for p in [h/'prepare-coop.py',h/'coop-launch.py',r/'tools/overhaul-root-round-033/run-mission-seal045.py',r/'package.json',r/'package-lock.json']:files.append(row(p))
receipt=json.loads((frozen/'receipt.json').read_text(encoding='utf8'))
assert sha(frozen/'receipt.json')=='64e158e208f75d4829a40afdaf6e4de1285149b307d7653807e33391ef5bce20'
protected=[row(frozen/'receipt.json')]
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
 for current in seen:
  if current.relative_to(r).as_posix()==x['path']:assert sha(current)==x['sha256'],x['path']
def fetch(path):return urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:
 assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
unique={x['path']:x for x in files}
out=h/'coop-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':list(unique.values()),'protected':protected,'command':[sys.executable,'tools/player-playability-150/coop-launch.py'],'scope':'ONE new151 ordinary mission on unchanged public056,420s work30s cleanup450s inclusive480s root. First rejection stops. Latejoin absent; full cooperative qualification remains incomplete.'},indent=2),encoding='utf8')
print('151 fresh frozen056 HTTP identity, source/imports and first-failure gate sealed')

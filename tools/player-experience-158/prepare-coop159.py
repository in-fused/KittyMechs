from pathlib import Path
import hashlib,json,re,sys,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;frozen=r/'.sites-runtime/overhaul-20261009/build-058'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
review=r/'docs/overhaul/critic/playability159-source-review.md'
expected=sys.argv[1];assert re.fullmatch('[a-f0-9]{64}',expected) and sha(review)==expected
text=review.read_text(encoding='utf8');assert 'CLOSED' in text and 'APPROVE_ONE_PUBLIC_GATE' in text
files=[row(review)];seen=set()
def imports(p):
 p=p.resolve()
 if p in seen:return
 seen.add(p);files.append(row(p))
 if p.suffix not in ['.ts','.tsx','.mjs','.js']:return
 for name in re.findall(r'(?:from\s*|import\s*)[\x22\x27](\.[^\x22\x27]+)[\x22\x27]',p.read_text(encoding='utf8')):
  q=p.parent/name;choices=[q]+[Path(str(q)+s) for s in ['.ts','.tsx','.mjs','.js','.json']]+[q/'index.ts',q/'index.js']
  actual=next((c for c in choices if c.is_file()),None);assert actual,name;imports(actual)
seal=r/'tools/overhaul-coop-159/source-seal.json';assert sha(seal)=='5a2dfa04d30801448cef1069f282e4c79fd9f68dfcdad516dd33de2d551ebf0d'
for name in ['source-seal.json','protected-inputs.json']:
 p=r/'tools/overhaul-coop-159'/name;data=json.loads(p.read_text(encoding='utf8'));assert data['writer']=='CLOSED';files.append(row(p))
 for x in data['files']:
  p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path'];files.append(row(p))
imports(r/'tools/overhaul-coop-159/mission-capture.mjs')
files.extend(row(p) for p in [h/'prepare-coop159.py',h/'coop159-launch.py',r/'tools/overhaul-root-round-033/run-mission-seal045.py',r/'package.json',r/'package-lock.json'])
assert sha(frozen/'receipt.json')=='34d18375f05622f2eedbc269419ede6359b843e3a23b62d38d772478563717cf'
receipt=json.loads((frozen/'receipt.json').read_text());protected=[row(frozen/'receipt.json')]
for x in receipt['files']:
 p=frozen/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
 for current in seen:
  if current.relative_to(r).as_posix()==x['path']:assert sha(current)==x['sha256'],x['path']
fetch=lambda path:urllib.request.urlopen('http://localhost:8799'+path,timeout=5).read()
health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0
html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(frozen/'playable-root/dist/index.html').read_bytes()
p=h/'coop159-seal.json';assert not p.exists()
p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-experience-158/coop159-launch.py'],'scope':'ONE coordinated atomic optical/native feedback159 ordinary mission on retained058. Unchanged420work30cleanup450child480root. Fullgoal/humanlag/contact remain INCOMPLETE; firstfailureSTOP no replay.'},indent=2),encoding='utf8')
print('ONE159 source/immutable retained058 actual gate freshly sealed')

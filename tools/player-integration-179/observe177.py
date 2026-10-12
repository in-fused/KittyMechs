from pathlib import Path
import hashlib,json,re,sys,urllib.request,os,subprocess
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;b=r/'.sites-runtime/overhaul-20261009/build-061'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
receipt='0f85163eac0dbc7047caf84ae725b094f38b1ca3ceccc3ee0bfbb9b4bb612215'
assert sha(b/'receipt.json')==receipt
mode=sys.argv[1]
if mode=='run':
 env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=receipt;env['KITTYMECH_BUILD_ROOT']=str(b)
 raise SystemExit(subprocess.call(['node','--import','tsx','tools/overhaul-coop-177/mission-capture.mjs'],cwd=r,env=env))
assert mode=='prepare';review=r/sys.argv[2];assert sha(review)==sys.argv[3] and 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
seal=r/'tools/overhaul-coop-177/source-seal.json';assert sha(seal)==sys.argv[4];data=json.loads(seal.read_text());assert data['writer']=='CLOSED'
files=[row(p) for p in [review,seal,h/'observe177.py',r/'package.json',r/'package-lock.json',r/'tools/overhaul-root-round-033/run-mission-seal045.py']];protected=[];seen=set()
for x in data['files']+data.get('protected',[]):
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'],x['path'];files.append(row(p))
 if p.suffix=='.json' and 'protected-input' in p.name:
  for dependency in json.loads(p.read_text()).get('files',[]):
   q=r/dependency['path'];assert q.stat().st_size==dependency['bytes'] and sha(q)==dependency['sha256'],dependency['path'];files.append(row(q))
def imports(p):
 p=p.resolve()
 if p in seen:return
 seen.add(p);files.append(row(p))
 if p.suffix not in ['.ts','.tsx','.mjs','.js']:return
 for name in re.findall(r'(?:from\s*|import\s*)[\x22\x27](\.[^\x22\x27]+)[\x22\x27]',p.read_text(encoding='utf8')):
  q=p.parent/name;actual=next((c for c in [q]+[Path(str(q)+s) for s in ['.ts','.tsx','.mjs','.js','.json']]+[q/'index.ts',q/'index.js'] if c.is_file()),None);assert actual,name;imports(actual)
imports(r/'tools/overhaul-coop-177/mission-capture.mjs')
for name in ['playability172-actual-review.md','coop173-phased-contract-review.md','coop173-rescue-contract-review.md']:
 p=r/'docs/overhaul/critic'/name;assert 'CLOSED' in p.read_text(encoding='utf8');files.append(row(p))
assert 'RETAIN_LIMITED061' in (r/'docs/overhaul/critic/playability172-actual-review.md').read_text(encoding='utf8')
for n in ['058','059','060','061']:
 f=r/f'.sites-runtime/overhaul-20261009/build-{n}';protected.append(row(f/'receipt.json'))
 for x in json.loads((f/'receipt.json').read_text())['files']:
  p=f/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
  if n=='061' and x['path'].startswith(('shared/','server/')):assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read();health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
p=h/'coop177-seal.json';assert not p.exists();p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-integration-179/observe177.py','run'],'scope':'ONE distinct occupancy177 ordinary two-client mission against exactretained061 parent. Original20ready420work30cleanup450child480root/count/geometry/lifecycle criteria. FirstfailureSTOP; no replay or guarantee fullquality.'},indent=2),encoding='utf8');print('Prepared177 ONE exact061 mission; launchonlyaftercurrentPID/idle/heavyrenderterminal verification')

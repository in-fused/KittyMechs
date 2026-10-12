from pathlib import Path
import hashlib,json,re,sys,urllib.request,os,subprocess
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
b=r/'.sites-runtime/overhaul-20261009/build-061';mode=sys.argv[1]
if mode=='run':
 env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=sha(b/'receipt.json');env['KITTYMECH_BUILD_ROOT']=str(b/'playable-root')
 raise SystemExit(subprocess.call(['node','tools/player-integration-172/play172.mjs'],cwd=r,env=env))
assert mode=='prepare';review=r/'docs/overhaul/critic/playability172-observer-review.md';assert sha(review)==sys.argv[2] and 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
files=[row(p) for p in [review,h/'observe172.py',r/'package.json',r/'package-lock.json',r/'tools/overhaul-root-round-027/run-seal.py']];protected=[];seen=set()
def imports(p):
 p=p.resolve()
 if p in seen:return
 seen.add(p);files.append(row(p))
 if p.suffix not in ['.ts','.tsx','.mjs','.js']:return
 for name in re.findall(r'(?:from\s*|import\s*)[\x22\x27](\.[^\x22\x27]+)[\x22\x27]',p.read_text(encoding='utf8')):
  q=p.parent/name;actual=next((c for c in [q]+[Path(str(q)+s) for s in ['.ts','.tsx','.mjs','.js','.json']]+[q/'index.ts',q/'index.js'] if c.is_file()),None);assert actual,name;imports(actual)
imports(h/'play172.mjs')
for name in ['playability168-source-review.md','playability171-source-review.md']:
 p=r/'docs/overhaul/critic'/name;assert 'CLOSED' in p.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in p.read_text(encoding='utf8');files.append(row(p))
checkpoint=json.loads((b/'playable-checkpoint.json').read_text());assert sha(b/'receipt.json')==checkpoint['receiptSHA256'];files.append(row(b/'playable-checkpoint.json'))
for n in ['058','059','060','061']:
 f=r/f'.sites-runtime/overhaul-20261009/build-{n}';protected.append(row(f/'receipt.json'))
 for x in json.loads((f/'receipt.json').read_text())['files']:
  p=f/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
  if n=='061' and x['path'].startswith(('src/','shared/','server/')):assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read();health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
p=h/'player172-seal.json';assert not p.exists();p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-integration-172/observe172.py','run'],'scope':'ONE actual immutable061 sustained authoredcycle/publictoggle integration observation;130s root,100swork20cleanup120inclusivechild. Firstfailurestop, independentactualreview required; humanlag/art/contact/fullscope incomplete.'},indent=2),encoding='utf8');print('Prepared172 on exact immutable061')

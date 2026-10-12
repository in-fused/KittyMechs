from pathlib import Path
import hashlib,json,re,sys,urllib.request,os,subprocess
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
row=lambda p:{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
mode=sys.argv[1];kind=sys.argv[2]
assert kind in ['player','coop']
if mode=='run':
 b=r/'.sites-runtime/overhaul-20261009/build-060';env=dict(os.environ);env['KITTYMECH_BUILD_RECEIPT']=sha(b/'receipt.json');env['KITTYMECH_BUILD_ROOT']=str(b/'playable-root')
 command=['node','--import','tsx','tools/overhaul-coop-165/mission-capture.mjs'] if kind=='coop' else ['node','tools/player-integration-166/play166.mjs']
 raise SystemExit(subprocess.call(command,cwd=r,env=env))
assert mode=='prepare';expected=sys.argv[3];assert re.fullmatch('[a-f0-9]{64}',expected)
review=r/'docs/overhaul/critic'/('playability165-source-review.md' if kind=='coop' else 'playability166-observer-review.md')
assert sha(review)==expected and 'CLOSED' in review.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in review.read_text(encoding='utf8')
files=[row(review),row(h/'observe166.py'),row(r/'package.json'),row(r/'package-lock.json')];seen=set()
if kind=='player':
 source=r/'docs/overhaul/critic/playability164-source-review.md';assert 'CLOSED' in source.read_text(encoding='utf8') and 'APPROVE_ONE_PUBLIC_GATE' in source.read_text(encoding='utf8');files.append(row(source))
def imports(p):
 p=p.resolve()
 if p in seen:return
 seen.add(p);files.append(row(p))
 if p.suffix not in ['.ts','.tsx','.mjs','.js']:return
 for name in re.findall(r'(?:from\s*|import\s*)[\x22\x27](\.[^\x22\x27]+)[\x22\x27]',p.read_text(encoding='utf8')):
  q=p.parent/name;choices=[q]+[Path(str(q)+s) for s in ['.ts','.tsx','.mjs','.js','.json']]+[q/'index.ts',q/'index.js']
  actual=next((c for c in choices if c.is_file()),None);assert actual,name;imports(actual)
imports(r/('tools/overhaul-coop-165/mission-capture.mjs' if kind=='coop' else 'tools/player-integration-166/play166.mjs'))
if kind=='coop':
 seal=r/'tools/overhaul-coop-165/source-seal.json';assert sha(seal)=='4220df6674155992a1387a26bc080014be9cfebd6c608eff25c89e8bdf9a784d'
 for name in ['source-seal.json','protected-inputs.json']:
  p=seal.parent/name;data=json.loads(p.read_text());assert data['writer']=='CLOSED';files.append(row(p))
  for x in data['files']:
   p=r/x['path'];assert sha(p)==x['sha256'] and p.stat().st_size==x['bytes'],x['path'];files.append(row(p))
 actual=r/'docs/overhaul/critic/playability166-actual-review.md';assert 'RETAIN_LIMITED' in actual.read_text(encoding='utf8') and 'CLOSED' in actual.read_text(encoding='utf8');files.append(row(actual))
supervisor=r/('tools/overhaul-root-round-033/run-mission-seal045.py' if kind=='coop' else 'tools/overhaul-root-round-027/run-seal.py');files.append(row(supervisor))
b=r/'.sites-runtime/overhaul-20261009/build-060';checkpoint=json.loads((b/'playable-checkpoint.json').read_text());assert sha(b/'receipt.json')==checkpoint['receiptSHA256'];files.append(row(b/'playable-checkpoint.json'));protected=[]
for n in ['058','059','060']:
 f=r/f'.sites-runtime/overhaul-20261009/build-{n}';protected.append(row(f/'receipt.json'))
 for x in json.loads((f/'receipt.json').read_text())['files']:
  p=f/'playable-root'/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256'];protected.append(row(p))
  if n=='060' and (x['path'].startswith(('src/','shared/','server/')) or any(c.relative_to(r).as_posix()==x['path'] for c in seen)):
   assert sha(r/x['path'])==x['sha256'];files.append(row(r/x['path']))
fetch=lambda p:urllib.request.urlopen('http://localhost:8799'+p,timeout=5).read();health=json.loads(fetch('/health'));assert health['rooms']==health['players']==0;html=fetch('/')
for meta in [b'<meta name="kittymech-arena" content="same-origin"/>',b'<meta name="kittymech-client-report" content="local"/>']:assert meta in html;html=html.replace(meta,b'')
assert html==(b/'playable-root/dist/index.html').read_bytes()
p=h/(kind+'166-seal.json');assert not p.exists();p.write_text(json.dumps({'files':list({x['path']:x for x in files}.values()),'protected':protected,'command':[sys.executable,'tools/player-integration-166/observe166.py','run',kind],'scope':'ONE actual immutable060 '+kind+' observation. Preserve first failure. Independent review required; human lag/contact/art/full scope remain incomplete.'},indent=2),encoding='utf8');print('Prepared '+kind+'166 on exact immutable060')

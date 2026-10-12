from pathlib import Path
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;p=r/'tools/overhaul-disk-observer-238';sha=lambda b:hashlib.sha256(b).hexdigest()
def row(q):
 b=q.read_bytes();return {'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':sha(b)}
assert not (f/'source-seal.json').exists()
parentSeal=p/'source-seal.json';assert row(parentSeal)['sha256']=='7e643680d986e64d0f1ea5237bea1dbb2fb7162d1e4465208b8c9b44f988c89d'
base=json.loads((p/'binding.json').read_text());rows=base['files']+json.loads(parentSeal.read_text())['files']+[row(parentSeal)]
seal=r/'tools/overhaul-shader-variant-240/source-seal.json';assert row(seal)['sha256']=='1377451f62ba9f12a610476f7411b22c6330d0635b049693b2da26610a87d09a';new=json.loads(seal.read_text());assert new['writer']=='CLOSED';rows+=new['files']+[row(seal)]
helper=r/'tools/overhaul-shader-variant-240/shaderStartup240.tsx';assert helper.exists() and helper.relative_to(r).as_posix() in {x['path'] for x in new['files']}
for x in rows:assert row(r/x['path'])==x,x['path']
old=r/'tools/overhaul-startup-integration-234/supervise234.py';raw=old.read_bytes();(f/'supervise234-preimage.py').write_bytes(raw);s='\n'.join(raw.decode().splitlines())+'\n'
for a,b in [('KITTYMECH_234_BUILD_APPROVED','KITTYMECH_241_BUILD_APPROVED'),('overhaul-20261011/startup234-supervisor','shader-startup-238/build241-supervisor'),('tools/overhaul-startup-integration-234/binding.json','tools/overhaul-program-integration-241/binding.json'),('tools/overhaul-startup-integration-234/build234.mjs','tools/overhaul-program-integration-241/build241.mjs'),('overhaul-20261011/startup234-private','shader-startup-238/private241')]:s=s.replace(a,b)
a="out.mkdir(exist_ok=False);start=time.monotonic()";assert s.count(a)==1;s=s.replace(a,"assert (r/'.sites-runtime/shader-startup-238').is_junction() and (r/'.sites-runtime/shader-startup-238').resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve(),'241 D output run junction changed'\nout.mkdir(exist_ok=False);start=time.monotonic()")
ast.parse(s);(f/'supervise241.py').write_text(s,encoding='utf-8',newline='\n')
for q in f.iterdir():
 if q.is_file() and q.name not in ['binding.json','source-seal.json']:rows.append(row(q))
rows=list({x['path']:x for x in rows}.values());previous=json.loads((r/'tools/overhaul-startup-integration-234/binding.json').read_text())
binding={'writer':'CLOSED','scope':'ONE_PRIVATE241 source240 fullscene actualprogram readiness correction; exact232canvas230animation221asset unchanged; explicit237package scripts boundary/no npm buildhooks; fresh D currentrun','files':rows,'helper':row(helper),'canvas':previous['canvas'],'owner':previous['owner'],'packageBoundary':base['packageBoundary']}
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
print(json.dumps({'status':'241_SOURCE_PREPARED_ONLY','files':len(rows),'helperSHA256':binding['helper']['sha256'],'actualJobs':0}))

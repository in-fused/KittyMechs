from pathlib import Path
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;g=r/'tools/overhaul-grounded-motion-253'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert not (f/'binding.json').exists()
assert json.loads((g/'source-seal.json').read_text())['writer']=='CLOSED'
rows=json.loads((r/'tools/overhaul-program-integration-241/binding.json').read_text())['files']
for x in rows:assert row(r/x['path'])==x,x['path']
rows+=json.loads((g/'source-seal.json').read_text())['files']+[row(g/'source-seal.json')]
overrides=[]
for canonical,path in [('src/game/GameCanvas.tsx','tools/overhaul-shader-startup-232/GameCanvas232.tsx'),('tools/overhaul-shader-startup-232/shaderStartup232.tsx','tools/overhaul-shader-variant-240/shaderStartup240.tsx'),('tools/overhaul-native-integration-222/nativeOwner218.ts','tools/overhaul-grounded-motion-253/nativeOwner253.ts'),('tools/overhaul-native-integration-222/NativeActor222.tsx','tools/overhaul-grounded-motion-253/NativeActor253.tsx')]:
 x=row(r/path);overrides.append({'canonical':canonical,**x});rows.append(x)
for p in sorted(f.iterdir()):
 if p.is_file() and p.name not in ['binding.json','source-seal.json']:rows.append(row(p))
rows=list({x['path']:x for x in rows}.values())
binding={'writer':'CLOSED','scope':'One252 grounded ordinary motion integration: material-point world planting and authored recovery; actual gameplay/contact quality pending; original221 resource caveat retained','files':rows,'overrides':overrides}
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
for name in ['prepare252.py','supervise252.py']:ast.parse((f/name).read_text())
for name in ['plugin252.mjs','build252.mjs']:subprocess.run(['node','--check',str(f/name)],cwd=r,check=True)
files=[row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name!='source-seal.json']
(f/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':binding['scope'],'files':files},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','protectedInputs':len(rows),'overrides':overrides,'sealSHA256':row(f/'source-seal.json')['sha256']}))

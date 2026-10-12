from pathlib import Path
import json,hashlib,subprocess,ast
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;run=r/'.sites-runtime/shader-startup-238';build=run/'private252'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert run.is_junction() and run.resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
assert not (f/'binding.json').exists()
receipt=json.loads((run/'build252-supervisor/process-receipt.json').read_text());assert receipt['exitCode']==0 and receipt['protectedMatch'] and receipt['finalOriginalIdentitiesRetired']
for folder in [build,run/'build252-supervisor']:
 assert not (folder/'output-seal.json').exists()
 files=[row(p) for p in sorted(folder.rglob('*')) if p.is_file()]
 (folder/'output-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'One private252 diagnostic build only; no gameplay/contact quality acceptance','files':files},indent=2),encoding='utf-8')
base=json.loads((r/'tools/overhaul-program-observer-242/binding.json').read_text());integration=json.loads((r/'tools/overhaul-grounded-integration-252/binding.json').read_text())
rows=integration['files']+json.loads((r/'tools/overhaul-grounded-integration-252/source-seal.json').read_text())['files']
outputs=[row(p) for p in sorted((build/'dist').rglob('*')) if p.is_file()]
rows+=outputs+[row(build/'output-seal.json'),base['retainedIndex'],base['delivery']['asset']]
for p in sorted(f.iterdir()):
 if p.is_file() and p.name not in ['binding.json','source-seal.json']:rows.append(row(p))
rows.append(row(r/'docs/overhaul/critic/player-controls251-observer-source-review.md'))
rows=list({x['path']:x for x in rows}.values())
for x in rows:assert row(r/x['path'])==x,x['path']
binding={'writer':'CLOSED','scope':'ONE distinct251 actual controls/R/steering +250 planted motion observation, qualitypending; original242 failure unchanged','dist':(build/'dist').relative_to(r).as_posix(),'buildSeal':row(build/'output-seal.json'),'retainedIndex':base['retainedIndex'],'delivery':base['delivery'],'output':str((run/'public251').absolute()),'outputs':outputs,'files':rows}
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
ast.parse((f/'supervise251.py').read_text());subprocess.run(['node','--check',str(f/'capture251.mjs')],cwd=r,check=True)
files=[row(p) for p in sorted(f.iterdir()) if p.is_file() and p.name!='source-seal.json']
(f/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':binding['scope'],'files':files},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','sourceSeal':row(f/'source-seal.json'),'buildSeal':binding['buildSeal'],'inputs':len(rows),'output':binding['output']}))

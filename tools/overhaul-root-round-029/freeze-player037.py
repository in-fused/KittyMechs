from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
s=json.loads((r/'tools/overhaul-input-correction-037/implementation-seal.json').read_text(encoding='utf8'))
paths={x['path'] for x in s.get('files',[])+s.get('protected',[])}
for x in s.get('files',[])+s.get('protected',[]):
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'].lower(),x['path']
old=json.loads((r/'tools/overhaul-root-round-028/player036-build-seal.json').read_text())
paths.update(x['path'] for x in old['files'])
paths.update(['tools/overhaul-art-player-037.mjs','tools/overhaul-root-round-029/freeze-player037.py','tools/overhaul-input-correction-037/implementation-seal.json','docs/overhaul/next-bounded-player-work-036.md'])
raw=s['rootCheck']['command'];assert raw.startswith('npx vitest run ')
paths.update(p for p in raw.split() if p.startswith('tests/') and p.endswith('.ts'))
paths.add('.sites-runtime/overhaul-20261010/source036-fixture-supplement/manifest.json')
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
testCommand=['cmd.exe','/d','/c',raw.replace('npx vitest','node_modules\\.bin\\vitest.cmd',1)]
for mode,command,cap in [('test',testCommand,90),('build',['cmd.exe','/d','/c','npm.cmd run build'],180),('capture',['node','tools/overhaul-art-player-037.mjs'],150)]:
 o=r/f'tools/overhaul-root-round-029/player037-{mode}-seal.json';assert not o.exists();o.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'command':command,'inclusiveCapSeconds':cap,'scope':'ONE conditional pause037 and strike-intent036 integrated validation; first genuine failure closes packet'},indent=2),encoding='utf8');print(json.dumps({'mode':mode,'rows':len(rows),'sha256':hashlib.sha256(o.read_bytes()).hexdigest()}))

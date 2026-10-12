from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
old=json.loads((r/'tools/overhaul-root-round-031/extraction039-test-seal.json').read_text())
permitted={'tests/overhaul-support.test.ts','tests/overhaul-density-clearance.test.ts'}
paths={x['path'] for x in old['files']}
for x in old['files']:
 if x['path'] not in permitted: assert hashlib.sha256((r/x['path']).read_bytes()).hexdigest()==x['sha256'],x['path']
paths.update(['tools/overhaul-extraction-039/structure-correction-b-seal.json','tools/overhaul-extraction-039/structure-correction-b-handoff.md','tools/overhaul-art-player-039.mjs','tools/overhaul-root-round-031/seal039b.py','docs/overhaul/extraction-039-integration.md'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
for mode,cmd,cap in [('test',old['command'],180),('build',['cmd.exe','/d','/c','npm.cmd run build'],180),('capture',['node','tools/overhaul-art-player-039.mjs'],150)]:
 p=r/f'tools/overhaul-root-round-031/extraction039b-{mode}-seal.json';assert not p.exists()
 p.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'command':cmd,'inclusiveCapSeconds':cap,'scope':'039 final bounded harness correction; original failures preserved; no more automatic repairs and no gameplay approval from tests'},indent=2))
print(json.dumps({'rows':len(rows)}))

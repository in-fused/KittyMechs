from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
paths={x['path'] for x in json.loads((r/'tools/overhaul-root-round-030/player038-finaltest-seal.json').read_text())['files']}
paths.update(x['path'] for x in json.loads((r/'tools/overhaul-extraction-039/art-source-seal.json').read_text())['rows'])
paths.update(x['path'] for x in json.loads((r/'tools/overhaul-extraction-039/art-correction-b-seal.json').read_text())['rows'])
h=json.loads((r/'tools/overhaul-extraction-039/structure-handoff.json').read_text())
for x in h.get('files',h.get('rows',[])): paths.add(x['path'])
paths.update(['shared/rainlineExtraction039.ts','shared/overhaulDistrict.ts','shared/layout.ts','src/game/world/World.tsx','src/game/world/overhaulDistrictArt.tsx','src/game/world/overhaulIdentityArt.tsx','tests/rainline-extraction-039.test.ts','tests/overhaul-support.test.ts','tests/overhaul-density-clearance.test.ts','public/assets/overhaul/extraction039/Rainline_Extraction039.glb','assets/source/overhaul-extraction-art-039/Rainline_Extraction039.blend','assets/source/overhaul-extraction-art-039/export-receipt.json','tools/overhaul-extraction-039/output-inspection.json','tools/overhaul-root-round-031/integrate039.py','tools/overhaul-root-round-031/prepare039.py'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
for mode,cmd in [('test',['cmd.exe','/d','/c','node_modules\\.bin\\vitest.cmd run tests/rainline-extraction-039.test.ts tests/extraction039-art.test.ts tests/overhaul-support.test.ts tests/overhaul-density-clearance.test.ts --maxWorkers=1 --no-file-parallelism']),('build',['cmd.exe','/d','/c','npm.cmd run build'])]:
 p=r/f'tools/overhaul-root-round-031/extraction039-{mode}-seal.json';assert not p.exists()
 p.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'command':cmd,'inclusiveCapSeconds':180,'scope':'039 one integrated validation; max two technical repairs total, first author RNA repair already used; no gameplay acceptance from tests'},indent=2))
print(json.dumps({'frozenRows':len(rows)}))

from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
paths=['shared/rainlineStreetPopulation030.ts','shared/data/rainlineStreetPopulation030.json','shared/rainlineStreetAdmission.ts','shared/rainlineStreetPopulation002.ts','shared/data/rainlineStreetAdmission001.json','src/game/world/rainlineStreetArt.tsx','tools/overhaul-root-round-026/plan-street030.ts','tools/overhaul-root-round-026/street030-plan.json','tools/overhaul-street-player-030.mjs','tools/overhaul-play-ready.mjs','docs/overhaul/rainline-street-030-plan.md']
paths+=list(str(p.relative_to(r)).replace('\\','/') for p in (r/'public/assets/overhaul/rainline-street-v1').rglob('*') if p.is_file())
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in paths]
o=r/'tools/overhaul-root-round-026/street030-seal.json'
assert not o.exists()
o.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'commands':['npm.cmd run build','node tools/overhaul-street-player-030.mjs'],'buildCapSeconds':180,'captureCapSeconds':120,'scope':'One root serial build then fresh ordinary route capture, independent review required'},indent=2),encoding='utf8')
print(json.dumps({'files':len(rows),'sha256':hashlib.sha256(o.read_bytes()).hexdigest()}))

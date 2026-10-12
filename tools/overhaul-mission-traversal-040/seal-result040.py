from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
paths=set()
for folder in ['mission040-native-process','mission-traversal-040-native','mission040-public-process','mission-traversal-040-public','mission-traversal-040-motion']:
 paths.update(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
paths.update(['.sites-runtime/overhaul-20261009/build-032/receipt.json','.sites-runtime/overhaul-20261009/build-032/playable-checkpoint.json','tools/overhaul-mission-traversal-040/source-handoff.json'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
p=r/'tools/overhaul-mission-traversal-040/result-seal.json';assert not p.exists()
p.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'040 twelve native diagnostic comparisons completed; public mission stopped staging same-tick mismatch, no mission completion or promotion, no retry. Actual raw receipts/videos/native evidence preserved.'},indent=2))
print(json.dumps({'rows':len(rows),'bytes':sum(x['bytes'] for x in rows)}))


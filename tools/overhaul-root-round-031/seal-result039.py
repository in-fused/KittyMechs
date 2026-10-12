from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
paths=set()
for folder in ['extraction039-author-process','extraction039-author-b-process','extraction039-test-process','extraction039b-test-process','extraction039-build-process','extraction039-capture-process','art-player-039','art-motion-039']:
 paths.update(p.relative_to(r).as_posix() for p in (r/'.sites-runtime/overhaul-20261010'/folder).rglob('*') if p.is_file())
paths.update(['.sites-runtime/overhaul-20261009/build-032/receipt.json','.sites-runtime/overhaul-20261009/build-032/playable-checkpoint.json','tools/overhaul-extraction-039/output-inspection.json'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
p=r/'tools/overhaul-root-round-031/extraction039-result-seal.json';assert not p.exists()
p.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'039 actual FAILED test and FAILED diagnostic capture preserved; no promotion, retry or gameplay acceptance; author a semantic failure despite exit0, b actual successful outputs'},indent=2))
print(json.dumps({'rows':len(rows),'bytes':sum(x['bytes'] for x in rows)}))

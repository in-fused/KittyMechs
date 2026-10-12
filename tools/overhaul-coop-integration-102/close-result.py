from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
paths={p for n in ['overhaul-coop-controller-101','overhaul-coop-integration-102'] for p in (r/'tools'/n).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='result-seal.json'}
paths.update(r/p for p in ['docs/overhaul/coop-source-102-handoff.md','docs/overhaul/resource-limit-handoff-20261010.md','docs/overhaul/critic/coop102-source-review.md','.sites-runtime/overhaul-20261010/coop102-final-inventory.json','.sites-runtime/overhaul-20261009/build-049/receipt.json'])
source=json.loads((r/'tools/overhaul-coop-controller-101/source-seal.json').read_text());paths.update(r/x['path'] for x in source['files'])
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
rows=[row(p) for p in sorted(paths)];p=h/'result-seal.json';assert not p.exists();p.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'101-102 CLOSED source gate DENY beforejobs. Impossible failed-state ACK and partialbrowsercleanup rejected; allstagesUNRUN. Live049 unchangedLIMITED, fullgoalINCOMPLETE. Distinct source correction required.'},indent=2));print(json.dumps({'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))

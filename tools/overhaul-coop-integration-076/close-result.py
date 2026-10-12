from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
paths={p for n in ['coop076-public','coop076-process','coop076-syntax'] for p in (r/'.sites-runtime/overhaul-20261010'/n).rglob('*') if p.is_file()}
paths.update(r/p for p in ['docs/overhaul/critic/coop076-play-review.md','docs/overhaul/critic/coop076-source-review.md','.sites-runtime/overhaul-20261010/coop076-inventory.json','.sites-runtime/overhaul-20261010/live045-before076-http-verification.json','tools/overhaul-coop-play-076/source-seal.json','tools/overhaul-coop-play-076/source-handoff.json'])
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]
p=h/'result-seal.json';assert not p.exists();p.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'076 CLOSED one26.859s public waypoint observation. Critic accepts ONLY observed far/near rested distances within1.1m;33 pulses. No production change/fullmission/animation/performance/userlag approval. Full goal ACTIVE/INCOMPLETE.'},indent=2));print(json.dumps({'files':len(rows),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))

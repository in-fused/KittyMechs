from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
paths={p for n in ['performance079-containment'] for p in (r/'.sites-runtime/overhaul-20261010'/n).rglob('*') if p.is_file()}
paths.update(r/p for p in ['tools/overhaul-performance-079/containment-result.json','tools/overhaul-performance-079/source-seal.json','docs/overhaul/critic/performance079-source-review.md','docs/overhaul/critic/performance079-result-review.md','docs/overhaul/performance-077-diagnosis.md','docs/overhaul/performance-079-fixture-source-handoff.md'])
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]
p=h/'result-seal.json';assert not p.exists();p.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'079 CLOSED corrected loader fixture stopped at attached skin inverse cache guard. Baseline/build/candidate UNRUN, live045 unchanged. One separately gated081 lifecycle correction permitted; if its fixture fails retire direction. Fullgoal/userlag INCOMPLETE.'},indent=2));print(json.dumps({'files':len(rows),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))

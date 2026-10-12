from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
paths={p for n in ['performance084-baseline-process','performance084-baseline','performance084-build'] for p in (r/'.sites-runtime/overhaul-20261010'/n).rglob('*') if p.is_file()}
paths.update(r/p for p in ['tools/overhaul-performance-081/containment-result.json','tools/overhaul-performance-081/source-seal.json','docs/overhaul/critic/performance083-source-review.md','docs/overhaul/critic/performance084-result-review.md','docs/overhaul/performance-077-diagnosis.md','docs/overhaul/performance-081-source-handoff.md'])
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)]
p=h/'closed084-result-seal.json';assert not p.exists();p.write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'084 CLOSED baseline completed six prototype-on/off phases67samples; build stopped TS2322 nullable savedSphere declaration mismatch15.235s exit2. No freeze046/candidate/swap. Unqualifiedperformance/camera/userlag; fullgoal INCOMPLETE. Distinct085type-only source mustreceive newgatebeforeONEbuild/candidate, nofixture/baseline reruns.'},indent=2));print(json.dumps({'files':len(rows),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))

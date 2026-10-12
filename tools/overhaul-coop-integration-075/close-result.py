from pathlib import Path
import hashlib,json,datetime
r=Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
folders=[r/'.sites-runtime/overhaul-20261010'/n for n in ['coop075-build','coop075-syntax','coop075-process','coop075-derivatives','coop075-public']]
paths={p for d in folders for p in d.rglob('*') if p.is_file()}
paths.update(r/p for p in ['.sites-runtime/overhaul-20261009/build-045/receipt.json','.sites-runtime/overhaul-20261010/live045-http-verification.json','docs/overhaul/critic/coop075-rescue-source-review.md','docs/overhaul/critic/coop075-harness-review.md','docs/overhaul/critic/coop075-play-review.md','docs/overhaul/coop075-route-failure-audit.md','tools/overhaul-coop-play-075/route-audit.json','tools/overhaul-coop-play-075/source-seal.json','tools/overhaul-coop-play-075/source-handoff.json'])
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(paths)]
out={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'CLOSED_PARTIAL_FAILURE','verdict':'RETAIN045_LIMITED; DENY full mission and presentation approval','files':rows,'scope':'One 388.844s failed normal co-op attempt within original 480s supervisor. Actual west checkpoint, 422 delivered input ACKs, 4262 matching publications. No public revival, east/core/extraction/win/retry. Late braking audit, no proven production physics defect. Severe actual user lag unresolved. Full finite goal ACTIVE/INCOMPLETE.'}
p=r/'tools/overhaul-coop-integration-075/result-seal.json';assert not p.exists();p.write_text(json.dumps(out,indent=2));print(json.dumps({'files':len(rows),'sha256':sha(p),'status':out['status']}))

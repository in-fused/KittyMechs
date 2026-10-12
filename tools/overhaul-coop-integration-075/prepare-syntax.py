from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;a=r/'tools/overhaul-coop-play-075'
s=json.loads((a/'source-seal.json').read_text());s['command']=['node','--check','tools/overhaul-coop-play-075/mission-capture.mjs']
for p in [Path(__file__),r/'docs/overhaul/critic/coop075-harness-review.md']:
 b=p.read_bytes();s['files'].append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(h/'syntax-seal.json').write_text(json.dumps(s,indent=2))

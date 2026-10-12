from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;a=r/'tools/overhaul-coop-play-075';root=r/'.sites-runtime/overhaul-20261009/build-045'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
source=json.loads((a/'source-seal.json').read_text());assert all(row(r/x['path'])['sha256']==x['sha256'] for x in source['files'])
paths={r/x['path'] for x in source['files']};paths.update([Path(__file__),h/'launch.py',root/'receipt.json',root/'playable-checkpoint.json',r/'docs/overhaul/critic/coop075-rescue-source-review.md',r/'docs/overhaul/critic/coop075-harness-review.md',r/'tools/overhaul-root-round-033/run-mission-seal045.py'])
protected=[row(root/'playable-root'/x['path']) for x in json.loads((root/'receipt.json').read_text())['files']]
(h/'play-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'protected':protected,'command':['python','tools/overhaul-coop-integration-075/launch.py'],'scope':'ONE045 normal fulltwo-clientmission with075 publicdriver:420work+30cleanup450child, unchanged480root. Stopfirstfailure, no injectedstate/retry. Lowbothpages, actualsendACK/ray observed.'},indent=2));print('Closed075driver+045checkpoint sealed for ONE capture, unrun.')

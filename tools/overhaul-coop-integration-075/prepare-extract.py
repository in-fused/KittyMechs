from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;o=r/'.sites-runtime/overhaul-20261010/coop075-public';e=json.loads((o/'evidence.json').read_text())
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[Path(e['hostVideo']),Path(e['guestVideo']),o/'evidence.json',h/'extract-review.py',Path(__file__),r/'.sites-runtime/overhaul-20261010/coop075-process/process-receipt.json']
(h/'extract-seal.json').write_text(json.dumps({'files':[row(p) for p in paths],'command':['python','tools/overhaul-coop-integration-075/extract-review.py'],'scope':'ONE sparse actualvideo derivative job, no capture or game rerun.'},indent=2))

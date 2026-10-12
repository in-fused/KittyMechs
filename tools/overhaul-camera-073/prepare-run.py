from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
s=json.loads((h/'source-seal.json').read_text());s['command']=s['rootCommand']
for p in [Path(__file__),r/'tools/overhaul-camera-072/cover-result.json',r/'.sites-runtime/overhaul-20261010/camera072-cover/process-receipt.json']:
 b=p.read_bytes();s['files'].append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(h/'run-seal.json').write_text(json.dumps(s,indent=2))
wrapper=(r/'tools/overhaul-moving-r-065/run-once.py').read_text().replace('moving-r065-curve','camera073-cover');(h/'run-once.py').write_text(wrapper)

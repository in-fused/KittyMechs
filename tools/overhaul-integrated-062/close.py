from pathlib import Path
import hashlib,json,datetime,urllib.request
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((h/'play-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files'])
paths=[p for n in ['integrated062-play','integrated062-play-process','integrated062-build'] for p in (r/'.sites-runtime/overhaul-20261010'/n).rglob('*') if p.is_file()]
paths.extend([Path(__file__),r/'.sites-runtime/overhaul-20261010/live042-http-verification.json'])
out=h/'result-seal.json';assert not out.exists();out.write_text(json.dumps({'files':[row(p) for p in paths],'scope':'First062 observation failed before gameplay on observer response shape. Actual correct058E asset in diagnostics[], no game pageerrors. No movement/UI quality approval.'},indent=2),encoding='utf8');print(row(out))

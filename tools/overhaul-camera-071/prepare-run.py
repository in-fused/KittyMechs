from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;s=json.loads((h/'source-seal.json').read_text());assert s['writer']=='CLOSED'
review=r/'docs/overhaul/critic/camera-071-source-review.md';assert review.is_file()
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s['command']=s['rootCommand'];s['files'].extend([row(review),row(Path(__file__))])
(h/'run-seal.json').write_text(json.dumps(s,indent=2),encoding='utf8')
wrapper=(r/'tools/overhaul-moving-r-065/run-once.py').read_text().replace('moving-r065-curve','camera071-cover')
(h/'run-once.py').write_text(wrapper,encoding='utf8');print('ONE inclusive10s camera fixture prepared, not run.')

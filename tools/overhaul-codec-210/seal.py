from pathlib import Path
import json,hashlib
r=Path('.');p=r/'tools/overhaul-codec-210';bundle=r/'.sites-runtime/overhaul-20261011/codec210-private'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
files=sorted(x for x in p.iterdir() if x.is_file() and x.name!='source-seal.json')+sorted(x for x in bundle.rglob('*') if x.is_file())
(p/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'One private actual codec qualification, no production/runtime changes','files':[row(x) for x in files]},indent=2)+'\n',encoding='utf-8');print(row(p/'source-seal.json'))

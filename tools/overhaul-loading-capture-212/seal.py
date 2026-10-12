from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-212'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
files=sorted(x for x in p.iterdir() if x.is_file() and x.name!='source-seal.json')
(p/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'STATIC_UNRUN_REQUIRES_ROOT_ACTUAL_GATE','files':[row(x) for x in files]},indent=2)+'\n',encoding='utf-8');print(row(p/'source-seal.json'))

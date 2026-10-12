from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-213'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
files=sorted(x for x in p.rglob('*') if x.is_file() and x.name!='source-seal.json' and '__pycache__' not in x.parts)+[p/'preimage/source-seal.json']
(p/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'STATIC_ONLY_UNRUN','files':[row(x) for x in files]},indent=2)+'\n',encoding='utf-8');print(row(p/'source-seal.json'))

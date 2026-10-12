from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-entry-215'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
(p/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','scope':'Fixed private entry identity only; source211 unchanged','files':[row(x) for x in sorted(p.rglob('*')) if x.is_file() and x.name!='source-seal.json' and '__pycache__' not in x.parts]},indent=2)+'\n',encoding='utf-8');print(row(p/'source-seal.json'))

from pathlib import Path
import hashlib,json
p=Path('tools/overhaul-startup-220');files=[]
for x in sorted(p.rglob('*')):
 if x.is_file() and '__pycache__' not in x.parts and x.name!='source-seal.json':
  b=x.read_bytes();files.append({'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
s=p/'source-seal.json';s.write_text(json.dumps({'writer':'CLOSED','files':files},indent=2)+'\n',encoding='utf-8');print(json.dumps({'writer':'CLOSED','files':len(files),'sealSHA256':hashlib.sha256(s.read_bytes()).hexdigest(),'candidateSHA256':hashlib.sha256((p/'GameCanvas220.tsx').read_bytes()).hexdigest()}))

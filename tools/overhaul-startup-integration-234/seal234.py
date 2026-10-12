from pathlib import Path
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent
assert not (f/'source-seal.json').exists()
binding=json.loads((f/'binding.json').read_text())
for row in binding['files']:
 b=(r/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],row['path']
for name in ['prepare234.py','supervise234.py','seal234.py']:ast.parse((f/name).read_text())
for name in ['build234.mjs','plugin234.mjs']:subprocess.run(['node','--check',str(f/name)],cwd=r,check=True)
rows=[]
for p in sorted(f.iterdir()):
 if p.is_file() and p.name!='source-seal.json':
  b=p.read_bytes();rows.append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
out=f/'source-seal.json';out.write_text(json.dumps({'writer':'CLOSED','scope':'PRIVATE234_SOURCE_ONLY_UNADMITTED; independent gate pending; no build/GPU/public mutation','files':rows},indent=2),encoding='utf-8')
print(json.dumps({'status':'SOURCE_CLOSED','files':len(rows),'sealSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'actualJobs':0}))

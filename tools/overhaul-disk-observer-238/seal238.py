from pathlib import Path
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;assert not (f/'source-seal.json').exists()
for x in json.loads((f/'binding.json').read_text())['files']:
 b=(r/x['path']).read_bytes();assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'],x['path']
for name in ['prepare238.py','supervise.py','seal238.py']:ast.parse((f/name).read_text())
for name in ['capture.mjs','guards.mjs','network-classification.mjs']:subprocess.run(['node','--check',str(f/name)],cwd=r,check=True)
rows=[]
for p in sorted(f.iterdir()):
 if p.is_file() and p.name!='source-seal.json':
  b=p.read_bytes();rows.append({'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
out=f/'source-seal.json';out.write_text(json.dumps({'writer':'CLOSED','scope':'ONE238_OUTPUT_ONLY_D_RUN_ADAPTER_SOURCE; independent gate pending; no actual browser','files':rows},indent=2),encoding='utf-8');print(json.dumps({'status':'SOURCE_CLOSED','files':len(rows),'sealSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'actualJobs':0}))

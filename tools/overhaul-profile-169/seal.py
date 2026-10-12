from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();review=r/'docs/overhaul/critic/profile169-failure-review.md'
assert sha(review)=='1c17f2d730f001987c907a0128fbe1c8ef5db0da9be4f15fbc837ff7d662dd41' and 'CLOSED' in review.read_text(encoding='utf8')
folders=[h,r/'.sites-runtime/overhaul-20261010/profile169-public',r/'.sites-runtime/overhaul-20261010/profile169-observation'];paths=[review]+[p for f in folders for p in f.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='source-seal.json']
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(set(paths))]
p=h/'source-seal.json';assert not p.exists();p.write_text(json.dumps({'writer':'CLOSED','status':'FIRST_GENUINE_FAILURE_STOP','scope':'Read-only failed169 originalmainV8profiles/guarderror afterOFFtoggle and independentreview. No gamepatch, no benchmark/IAB/GPU/worker qualification.','files':rows},indent=2),encoding='utf8');print(json.dumps({'files':len(rows),'sealSHA256':sha(p)}))

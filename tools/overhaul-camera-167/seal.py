from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[p for p in h.rglob('*') if p.is_file() and p.name!='source-seal.json' and '__pycache__' not in p.parts]+[r/'src/state/store.ts',r/'src/ui/Settings.tsx',r/'src/game/camera/CameraRig.tsx']
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(paths)]
p=h/'source-seal.json';assert not p.exists();p.write_text(json.dumps({'writer':'CLOSED','scope':'Shared camera distance fixes preview wheel mismatch. Source/store check only, actual camera and human lag unqualified.','files':rows},indent=2));print(sha(p))

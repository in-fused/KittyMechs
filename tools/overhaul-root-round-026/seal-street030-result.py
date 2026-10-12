from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];paths=[]
for folder in ['.sites-runtime/overhaul-20261010/street-player-030','.sites-runtime/overhaul-20261010/street-motion-030','.sites-runtime/overhaul-20261010/street030-build-process','.sites-runtime/overhaul-20261010/street030-capture-process']:
 paths += [p for p in (r/folder).glob('*') if p.is_file()]
paths += [r/'.sites-runtime/overhaul-20261009/build-028/receipt.json']
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
o=r/'tools/overhaul-root-round-026/street030-result-seal.json';assert not o.exists();o.write_text(json.dumps({'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'Frozen actual artifacts awaiting independent gameplay/art result'},indent=2),encoding='utf8');print(json.dumps({'files':len(rows),'sha256':hashlib.sha256(o.read_bytes()).hexdigest()}))

from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2];folder=r/'assets/source/overhaul-pounce-art-detail-034';paths=[p for p in folder.iterdir() if p.is_file() and p.name!='author.py']
paths+=[r/'.sites-runtime/overhaul-20261010/art-detail-034-author-process/process-receipt.json',r/'.sites-runtime/overhaul-20261010/art-detail-034-author-process/stdout.txt']
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
o=r/'tools/overhaul-pounce-art-detail-034/result-seal.json';assert not o.exists();o.write_text(json.dumps({'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'scope':'Actual material-only author outputs; original geometry/clips retained, no art/gameplay admission'},indent=2),encoding='utf8');print(json.dumps({'files':len(rows),'bytes':sum(x['bytes'] for x in rows),'sha256':hashlib.sha256(o.read_bytes()).hexdigest()}))

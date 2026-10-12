from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2];stage=sys.argv[1]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
folders={'technical':['.sites-runtime/overhaul-20261010/extraction052-test','.sites-runtime/overhaul-20261010/extraction052-build'],'public':['.sites-runtime/overhaul-20261010/coop-play-053-public','.sites-runtime/overhaul-20261010/coop-play-053-process','.sites-runtime/overhaul-20261010/coop-play-053-motion']}[stage]
paths=[p for f in folders for p in (r/f).rglob('*') if p.is_file()]+[Path(__file__)]
p=Path(__file__).with_name('extraction052-'+stage+'-result-seal.json');assert not p.exists();o={'files':[row(p) for p in paths],'scope':'Exact one bounded052/053 '+stage+' outcome; not gameplay approval.'};p.write_text(json.dumps(o,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in o['files']),'sha256':row(p)['sha256']}))

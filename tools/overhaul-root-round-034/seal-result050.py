from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
stage=sys.argv[1]
folders={'processor':['assets/source/overhaul-moving-recoil-050','.sites-runtime/overhaul-20261010/moving-recoil-050-processor'],'technical':['.sites-runtime/overhaul-20261010/moving-recoil-050-test','.sites-runtime/overhaul-20261010/moving-recoil-050-build'],'public':['.sites-runtime/overhaul-20261010/player050-candidate','.sites-runtime/overhaul-20261010/player050-candidate-process','.sites-runtime/overhaul-20261010/player050-candidate-motion']}[stage]
paths=[p for folder in folders for p in (r/folder).rglob('*') if p.is_file()]+[Path(__file__)]
out=Path(__file__).with_name('recoil050-'+stage+'-result-seal.json');assert not out.exists()
o={'files':[row(p) for p in paths],'scope':'Preserved ONE bounded050 '+stage+' results; sealed evidence is not gameplay approval.'}
out.write_text(json.dumps(o,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in o['files']),'sha256':row(out)['sha256']}))

from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;root=r/'.sites-runtime/overhaul-20261009/build-043'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert hashlib.sha256((root/'receipt.json').read_bytes()).hexdigest()=='0cacbbd7c6c17d6c7bacb4aead027cd26812a640361f6cf25a78cfb3f855165d'
paths={root/'playable-root'/x['path'] for x in json.loads((root/'receipt.json').read_text())['files']};paths.update([root/'receipt.json',h/'capture.mjs',Path(__file__),r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py'])
(h/'run-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['node','tools/overhaul-profile-069/capture.mjs','.sites-runtime/overhaul-20261010/profile069-play'],'scope':'One043 public ordinary CPU profile only; candidate not changed.'},indent=2),encoding='utf8');print('Profile069 source and frozen043 sealed.')

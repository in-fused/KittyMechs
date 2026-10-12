from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;root=r/'.sites-runtime/overhaul-20261009/build-044'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths={root/'playable-root'/x['path'] for x in json.loads((root/'receipt.json').read_text())['files']};paths.update([root/'receipt.json',h/'capture.mjs',Path(__file__),r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-root-round-027/run-seal.py'])
(h/'play-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['node','tools/overhaul-render-rescue-074/capture.mjs','.sites-runtime/overhaul-20261010/render-rescue074-play'],'scope':'ONE frozen044 ordinary Low/Pounce intact/public facade removal/ruin review. Firstfailurestop; no retry.'},indent=2))

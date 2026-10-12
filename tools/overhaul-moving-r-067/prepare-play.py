from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'.sites-runtime/overhaul-20261009/build-043'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
digest=hashlib.sha256((old/'receipt.json').read_bytes()).hexdigest()
s=(r/'tools/overhaul-observer-063/launch-play.py').read_text().replace('build-042','build-043').replace('e849a169d97519e5546ea33ad8dcc5d474132a1c3f53e2185147b879800338ee',digest).replace('tools/overhaul-observer-063/capture.mjs','tools/overhaul-moving-r-067/capture.mjs').replace('observer063-play','moving-r067-play');(h/'launch-play.py').write_text(s,encoding='utf8')
s=(r/'tools/overhaul-integrated-062/switch.ps1').read_text().replace('348836','350256').replace('live041-stop-for042','live042-stop-for043').replace('owned040server','owned042server');(h/'switch043.ps1').write_text(s,encoding='utf8')
s=(r/'tools/overhaul-integrated-062/verify-http.py').read_text().replace('build-042','build-043').replace('live042','live043').replace('ActualHTTP042','ActualHTTP043');(h/'verify-http043.py').write_text(s,encoding='utf8')
paths={old/'playable-root'/x['path'] for x in json.loads((old/'receipt.json').read_text())['files']}
paths.update([old/'receipt.json',h/'capture.mjs',h/'launch-play.py',Path(__file__),r/'tools/overhaul-root-round-027/run-seal.py',r/'tools/overhaul-play-ready.mjs',r/'docs/overhaul/critic/moving-r-067-check-review.md'])
(h/'play-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['python','tools/overhaul-moving-r-067/launch-play.py'],'scope':'ONE043 actual publicLow/newPounce standing/moving/back/turn/R. No IAB or performance claim from automated Edge.'},indent=2),encoding='utf8')
print('One043 play seal/switch/HTTP verifier ready; no launch.')

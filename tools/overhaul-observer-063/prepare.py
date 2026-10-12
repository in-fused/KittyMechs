from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
old=r/'tools/overhaul-integrated-062/capture.mjs';s=old.read_text().replace('Integrated062','Observer063')
s=s.replace("e.samples.at(-1).owner?.assetSHA256", "e.samples.at(-1).owner?.diagnostics?.find(d=>d.actor===e.samples.at(-1).snapshot.localActorId)?.assetSHA256")
# Explicit fallback to the single connected local pilot identity exposed by input, not any other rig.
s=s.replace("e.samples.at(-1).snapshot.localActorId", "e.samples.at(-1).input.lastSent.localId")
(h/'capture.mjs').write_text(s,encoding='utf8')
s=(r/'tools/overhaul-integrated-062/launch-play.py').read_text().replace('tools/overhaul-integrated-062/capture.mjs','tools/overhaul-observer-063/capture.mjs').replace('integrated062-play','observer063-play');(h/'launch-play.py').write_text(s,encoding='utf8')
build=r/'.sites-runtime/overhaul-20261009/build-042';paths={build/'playable-root'/x['path'] for x in json.loads((build/'receipt.json').read_text())['files']};paths.update([build/'receipt.json',old,h/'capture.mjs',h/'launch-play.py',Path(__file__),r/'tools/overhaul-root-round-027/run-seal.py',r/'tools/overhaul-play-ready.mjs',r/'tools/overhaul-integrated-062/result-seal.json'])
(h/'play-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['python','tools/overhaul-observer-063/launch-play.py'],'scope':'Proposed one distinct observer shape repair. No game edits. Requires independent source approval before execution; preserve062failure.'},indent=2),encoding='utf8')
print('proposed063 observer prepared, not executed')

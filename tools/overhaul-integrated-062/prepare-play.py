from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=(r/'tools/overhaul-low-pixels-059/capture.mjs').read_text().replace('LowBudget059','Integrated062').replace('now-start>=12000','now-start>=22000')
s=s.replace("await page.keyboard.press('KeyR');await segment('upright'", "await segment('left',['KeyA'],2000);await segment('right',['KeyD'],2000);await segment('turn-left',['KeyJ','KeyW'],2000);await segment('turn-right',['KeyL','KeyW'],2000);await page.keyboard.press('KeyR');await segment('upright'")
s=s.replace("await read();\n const frames", "await read();if(e.samples.at(-1).owner?.assetSHA256!=='381f13348fa5a10b67c23be01844de50e89802738cb8ab13282267685644e7f9')throw Error('Wrong gait asset owner');\n const frames")
(h/'capture.mjs').write_text(s,encoding='utf8')
s=(r/'tools/overhaul-low-pixels-059/launch-play.py').read_text().replace('build-041','build-042').replace('5d8ceac51465cf20ae96e3c1c96d777595d0bb1ae3ff44d6160c0465e143eb10','e849a169d97519e5546ea33ad8dcc5d474132a1c3f53e2185147b879800338ee').replace('tools/overhaul-low-pixels-059/capture.mjs','tools/overhaul-integrated-062/capture.mjs').replace('low059-play','integrated062-play');(h/'launch-play.py').write_text(s,encoding='utf8')
old=r/'.sites-runtime/overhaul-20261009/build-042';paths={old/'playable-root'/x['path'] for x in json.loads((old/'receipt.json').read_text())['files']};paths.update([old/'receipt.json',h/'capture.mjs',h/'launch-play.py',Path(__file__),r/'tools/overhaul-root-round-027/run-seal.py',r/'tools/overhaul-play-ready.mjs'])
(h/'play-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['python','tools/overhaul-integrated-062/launch-play.py'],'scope':'ONE actual042 publicLow/newPounce forward/back/lateral/turn/R +report spacing; no camera steep-pitch retry or IAB/performance claim.'},indent=2),encoding='utf8')
s=(r/'tools/overhaul-low-pixels-059/switch041.ps1').read_text().replace('349436','348836').replace('live040-stop-for041','live041-stop-for042').replace('idle040','idle041');(h/'switch.ps1').write_text(s,encoding='utf8')
s=(r/'tools/overhaul-low-pixels-059/verify-http041.py').read_text().replace('build-041','build-042').replace('live041','live042').replace('ActualHTTP041','ActualHTTP042');(h/'verify-http.py').write_text(s,encoding='utf8')
print('one-play seal and switch ready')

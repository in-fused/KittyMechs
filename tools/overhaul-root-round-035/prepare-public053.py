from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
build=r/'.sites-runtime/overhaul-20261009/build-037';receipt=build/'receipt.json';protected=[]
for x in json.loads(receipt.read_text())['files']:
 v=row(build/'playable-root'/x['path']);assert v['sha256']==x['sha256'] and v['bytes']==x['bytes'];protected.append(v)
paths=['tools/overhaul-coop-play-053/mission-capture.mjs','tools/overhaul-coop-play-053/observer-handoff.json','tools/overhaul-root-round-035/prepare-observer053.py','tools/overhaul-root-round-035/prepare-public053.py','tools/overhaul-root-round-035/launch053.py','tools/overhaul-root-round-033/run-mission-seal045.py','tools/overhaul-play-ready.mjs','tools/overhaul-pilot-aim.ts','tools/overhaul-squad-policy.ts','tools/overhaul-squad-extraction-052/source-handoff.json','tools/overhaul-squad-extraction-052/source-seal.json']
files=[row(r/p) for p in paths]+[row(receipt),row(build/'playable-checkpoint.json')]
o={'files':files,'protected':protected,'command':['python','tools/overhaul-root-round-035/launch053.py'],'scope':'ONE new037 squad-extraction052 full-required publicmission candidate; both own videos, unchanged20sreadiness420work30cleanup480root. Firstfailurestop/no retry. No native injections or approval from tests.'}
p=Path(__file__).with_name('coop053-public-seal.json');assert not p.exists();p.write_text(json.dumps(o,indent=2));print(json.dumps({'files':len(files),'protected':len(protected),'sealSHA256':row(p)['sha256'],'candidateReceiptSHA256':row(receipt)['sha256']}))

from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=r/'tools/overhaul-anatomy-121/source-seal.json';assert sha(source)=='6d20177d032d74df9818503a2640ed18e3cda829832683b2fa16903148794dd1'
s=json.loads(source.read_text());assert s['writer']=='CLOSED' and s['execution']=='UNRUN'
review=r/'docs/overhaul/critic/anatomy121-source-review.md';assert sha(review)=='d24f2d2b2ba043fa69a96618ef2c6265b31113cc8016a29c1a7cdac55add27c5'
protected=json.loads((r/'tools/overhaul-anatomy-121/protected-inputs.json').read_text())['files']
rows=s['files']+protected
for x in rows:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
terminal=json.loads((r/'.sites-runtime/overhaul-20261010/coop116-observation/process-receipt.json').read_text());assert terminal['exitCode']==1 and terminal['failure'] is None and terminal['inclusiveBoundObserved'] and all(x['match'] for x in terminal['inputsAfter'])
e=json.loads((r/'.sites-runtime/overhaul-20261010/coop116-public/evidence.json').read_text());assert e['status']=='FIRST_GENUINE_FAILURE_STOP'
assert len(e['cleanup'])==8 and all(x['status']=='CLOSED_OR_COMPLETED' for x in e['cleanup'])
assert not e['resourceInventory']['hostBrowserConnected'] and not e['resourceInventory']['guestBrowserConnected']
folder=r/'assets/source/overhaul-pounce-anatomy-121'
for name in ['Pounce_Motion121.blend','Pounce_Motion121.temporary.glb','author-receipt.json','pose-readback.jsonl','intentional-weight-ledger119.json']:
 assert not (folder/name).exists(),name
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
out=h/'author-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':rows+[row(source),row(review),row(Path(__file__)),row(r/'tools/overhaul-root-round-027/run-seal.py')],'command':['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--threads','2','--python-exit-code','1','--python',str(folder/'author.py')],'scope':'ONE180s inclusive121 anatomical source-author/export after terminal116; firstfailureSTOP, no public/runtime mutation/replay'},indent=2))
print('121 source author sealed; inclusive180s,116 terminal')

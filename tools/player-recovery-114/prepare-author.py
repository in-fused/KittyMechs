from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
source=r/'tools/overhaul-motion-112/source-seal.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(source)=='c2e12c3e7ec453f4e8ab743e4437837ac23ceab390685960418b412fed9ee8e0'
s=json.loads(source.read_text());assert s['writer']=='CLOSED'
review=r/'docs/overhaul/critic/motion112-source-review.md'
assert sha(review)=='4b635b3accb0ceadb85d9c355aee83dbd89f54eaf06612f42097af27d6143fde'
for x in s['files']:
 p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
folder=r/'assets/source/overhaul-pounce-motion-112'
for name in ['Pounce_Motion112.blend','Pounce_Motion112.temporary.glb','author-receipt.json','authored-motion-records.json','pose-readback.jsonl','preservation.json']:
 assert not (folder/name).exists(),name
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
out=h/'author-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':s['files']+[row(source),row(review),row(Path(__file__)),row(r/'tools/overhaul-root-round-027/run-seal.py')],'command':['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--threads','2','--python-exit-code','1','--python',str(folder/'author.py')],'scope':'ONE180s inclusive source-author/export; first failure STOP, no public/runtime mutation or replay'},indent=2))
print('112 fresh source author sealed; inclusive180s')

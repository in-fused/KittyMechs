from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
h=r/'tools/overhaul-moving-recoil-050/processor-handoff.json';m=json.loads(h.read_text())
files=[row(h),row(r/'tools/overhaul-moving-recoil-050/processor-seal.json'),row(r/m['files'][0]['path']),row(Path(__file__)),row(r/'tools/overhaul-root-round-027/run-seal.py')];assert files[2]['sha256']==m['files'][0]['sha256']
protected=[row(r/p) for p in ['assets/source/overhaul-moving-recoil-048/Pounce_MovingRecoil048.raw.glb','assets/source/overhaul-moving-recoil-048/Pounce_MovingRecoil048.blend','assets/source/overhaul-moving-recoil-048/author-receipt.json','assets/source/overhaul-moving-recoil-048/author.py','assets/source/overhaul-pounce-art-detail-034/Pounce_ArtDetail034.glb']]
assert protected[0]['sha256']==m['sourceRawSHA256']
seal={'files':files,'protected':protected,'command':m['command'],'scope':'ONE050 strict packaging pass of048raw with explicit source-time-origin contract, no Blenderretry;30s cap; originalfailedraw/editablemaster/034 unchanged. No shipping admission beforeactualPASS.'}
p=Path(__file__).with_name('recoil050-processor-seal.json');assert not p.exists();p.write_text(json.dumps(seal,indent=2));print(row(p))

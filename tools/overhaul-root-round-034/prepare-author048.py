from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
h=r/'tools/overhaul-moving-recoil-048/author-handoff.json';m=json.loads(h.read_text())
files=[row(h),row(r/'tools/overhaul-moving-recoil-048/author-seal.json'),row(r/m['files'][0]['path']),row(Path(__file__)),row(r/'tools/overhaul-root-round-027/run-seal.py')]
assert files[2]['sha256']==m['files'][0]['sha256']
protected=[row(r/'assets/source/overhaul-pounce-art-detail-034/Pounce_ArtDetail034.blend'),row(r/'assets/source/overhaul-pounce-art-detail-034/Pounce_ArtDetail034.glb')]
assert protected[0]['sha256']==m['sourceMasterSHA256'] and protected[1]['sha256']==m['sourceModelSHA256']
s={'files':files,'protected':protected,'command':m['command'],'scope':'ONE independent-source-gated localBlender048 author;120s supervisor, failurepreserved/no retry; original034 master/model untouched. No shipping admission.'}
p=Path(__file__).with_name('recoil048-author-seal.json');assert not p.exists();p.write_text(json.dumps(s,indent=2));print(row(p))

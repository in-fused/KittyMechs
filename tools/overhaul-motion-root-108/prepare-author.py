from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
source=r/'tools/overhaul-motion-106/source-seal.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(source)=='d3ee6fcc41b722ee53f171d8d1009e41764ebd4b63dd04c7e7348090e27c5912'
s=json.loads(source.read_text());assert s['writer']=='CLOSED' and s['rootBlenderMaxSeconds']==180
review=r/'docs/overhaul/critic/motion106-source-review.md'
v=review.read_text(encoding='utf-8');assert 'APPROVE' in v and 'CLOSED' in v
for x in s['files']:
    p=r/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
def row(p):return {'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
out=h/'author-seal.json';assert not out.exists()
out.write_text(json.dumps({'files':s['files']+[row(source),row(review),row(Path(__file__)),row(r/'tools/overhaul-root-round-027/run-seal.py')],'command':['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--threads','2','--python-exit-code','1','--python',str(r/'assets/source/overhaul-pounce-motion-106/author.py')],'scope':'ONE180s inclusive source-author/export; no public/runtime mutation or automatic replay'},indent=2))
print('106 source author sealed, inclusive180s')

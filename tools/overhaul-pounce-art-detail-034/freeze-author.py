from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
def row(p):return {'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()}
protected=[row(p) for p in ['public/assets/models/Pounce_ArtBridge019.glb','assets/source/overhaul-pounce-art-bridge-019/Pounce_ArtBridge019.blend','src/game/entities/identity57Runtime019Manifest.json']]
owned=[row(p) for p in ['assets/source/overhaul-pounce-art-detail-034/author.py','docs/overhaul/pounce-art-detail-034-plan.md']]
o=r/'tools/overhaul-pounce-art-detail-034/author-seal.json';assert not o.exists();o.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':owned,'protected':protected,'inclusiveCapSeconds':120,'command':['D:/KittyMechTools/blender-4.5.14-windows-x64/blender.exe','--background','--factory-startup','--python-exit-code','1','--python',str(r/'assets/source/overhaul-pounce-art-detail-034/author.py')]},indent=2),encoding='utf8');print(json.dumps({'rows':len(owned)+len(protected),'sha256':hashlib.sha256(o.read_bytes()).hexdigest()}))

from pathlib import Path
import json,struct,hashlib
r=Path(__file__).resolve().parents[2];rows=[]
for name in ['public/assets/models/Pounce_Motion106.glb','public/assets/models/Pounce_Anatomy121.glb']:
 raw=(r/name).read_bytes();length=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+length]);rows.append({'path':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'nodes':len(j.get('nodes',[])),'meshes':len(j.get('meshes',[])),'primitives':sum(len(m['primitives']) for m in j.get('meshes',[])),'materials':len(j.get('materials',[])),'actions':len(j.get('animations',[]))})
out={'scope':'Actual asset structure only; no rendered drawcall/FPS/affectedhuman measurement','assets':rows};(r/'.sites-runtime/overhaul-20261010/anatomy125-asset-inventory.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))

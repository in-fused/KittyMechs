import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LEGACY=ROOT.parent/'KittyMech'
results={}
for label,relative in [('environment','Art/Environment/Rainline_v1/Rainline_Kit.blend'),('feline','Art/Validation/Locomotion/feline-003/Pounce-Feline.blend'),('enemies','Art/Enemies/v001/enemy-industrial-v001.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(LEGACY/relative))
    results[label]={'objects':[{'name':o.name,'type':o.type,'location':list(o.location),'dimensions':list(o.dimensions),'hidden':o.hide_get(),'render_hidden':o.hide_render,'collections':[c.name for c in o.users_collection],'parent':o.parent.name if o.parent else None} for o in bpy.data.objects], 'actions':[{'name':a.name,'range':list(a.frame_range)} for a in bpy.data.actions], 'fps':bpy.context.scene.render.fps}
(ROOT/'docs/legacy-asset-inspection.json').write_text(json.dumps(results,indent=2))
print('INSPECTED', {k:{'objects':len(v['objects']),'actions':v['actions']} for k,v in results.items()})

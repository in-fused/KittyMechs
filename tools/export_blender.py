"""Export only into KittyMech-Web, from preserved local copies. Never saves source .blend."""
import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source/legacy'
OUT=ROOT/'assets/runtime/models'
OUT.mkdir(parents=True,exist_ok=True)

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False); obj.hide_viewport=False; obj.hide_render=False; obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]

def export(name,objects,animations=False):
    select(objects)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,
        export_animations=animations,export_animation_mode='ACTIONS',export_force_sampling=True,
        export_skins=True,export_yup=True,export_apply=False,export_cameras=False,export_lights=False)
    print('EXPORTED',name,flush=True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'Rainline_v1/Rainline_Kit.blend'))
for obj in list(bpy.data.objects):
    if obj.name.startswith('SM_Rain'):
        export(obj.name,[obj])

bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'feline-003/Pounce-Feline.blend'))
rig=bpy.data.objects['KittyMech_Rig']
for action in list(bpy.data.actions):
    if not action.name.startswith('Feline'):
        bpy.data.actions.remove(action)
rig.animation_data.action=bpy.data.actions['FelineIdle']
for lod in range(3):
    export('Pounce_Feline'+('' if lod==0 else '_LOD'+str(lod)),[rig,bpy.data.objects['SK_Pounce_LOD'+str(lod)]],True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'Bastion/SK_Bastion.blend'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.data.objects if o.name=='SK_Bastion_LOD0')
export('Bastion',[rig,mesh],True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'v001/enemy-industrial-v001.blend'))
for kind,offset in [('Scout',-235),('Mortar',235),('Anchor',0)]:
    objects=[o for o in bpy.data.objects if o.name.startswith('SM_'+kind)]
    # This authoring scene is centimetres; normalize to metre-scale GLB and -Z forward.
    for obj in objects:
        obj.location.y-=offset
        obj.location*=.01
        obj.scale*=.01
    export(kind,objects)
(OUT/'export-receipt.json').write_text(json.dumps({'tool':'Blender '+bpy.app.version_string,'source':'preserved local legacy copies','files':[p.name for p in OUT.glob('*.glb')],'units':'metres','up':'Y'},indent=2))

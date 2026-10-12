"""Read-only packed-source/material/UV confirmation for the private derivative."""
import bpy, json, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/source/bastion-art-v1'
path=OUT/'Bastion_Quadruped.art-v1.blend'
bpy.ops.wm.open_mainfile(filepath=str(path))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
images=[]
for image in bpy.data.images:
    if image.source!='FILE':continue
    assert image.packed_file, image.name
    images.append({'name':image.name,'size':list(image.size),'colorSpace':image.colorspace_settings.name,'packedBytes':len(image.packed_file.data),'packedSha256':hashlib.sha256(image.packed_file.data).hexdigest()})
assert len(images)==3 and all(i['size']==[1024,1024] for i in images)
assert len(rig.data.bones)==25 and len(bpy.data.actions)==32
assert mesh.data.uv_layers.active and len(mesh.data.uv_layers.active.data)==len(mesh.data.loops)
materials=[]
for m in mesh.data.materials:
    maps=[n for n in m.node_tree.nodes if n.type=='TEX_IMAGE']
    assert len(maps)==3
    materials.append({'name':m.name,'maps':[n.image.name for n in maps]})
paint=next(m for m in mesh.data.materials if m.name=='FelinePBR_Paint')
tint=next(n for n in paint.node_tree.nodes if n.type=='MIX_RGB')
assert tint.blend_type=='MULTIPLY' and all(abs(a-b)<1e-6 for a,b in zip(tint.inputs[2].default_value,[.29,.38,.42,1]))
receipt={'passed':True,'source':str(path.relative_to(ROOT)),'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'retainedBones':25,'retainedActions':32,'uv0Loops':len(mesh.data.uv_layers.active.data),'packedImages':images,'materials':materials,'paintTintLinear':[.29,.38,.42,1],'scope':'Read-only actual saved Blender derivative: packed original1024 masters, linear normal/ORM versus sRGB albedo, complete UV0 and explicit paint multiplication. Exact animation/bind/sole proof is separate.'}
(OUT/'editable-source-receipt.json').write_text(json.dumps(receipt,indent=2))
print('BASTION_EDITABLE_SOURCE_PASS',json.dumps({'images':len(images),'bones':25,'clips':32,'UVLoops':receipt['uv0Loops']}),flush=True)

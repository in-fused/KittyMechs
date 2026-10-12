"""One read-only sampled source presentation job; never saves or exports master."""
import bpy,pathlib,json,hashlib
from mathutils import Vector
r=pathlib.Path(__file__).resolve().parents[2]
master=r/'assets/source/overhaul-pounce-motion-112/Pounce_Motion112.blend'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=sha(master);out=r/'.sites-runtime/overhaul-20261010/motion112-source-views';out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(master));scene=bpy.context.scene
rigs=[o for o in bpy.data.objects if o.type=='ARMATURE'];assert len(rigs)==1;rig=rigs[0]
samples=[('FelineGallop',p) for p in [.0,.16,.32,.48,.64,.80,.93]]+[('FelineUprightWalkLong',p) for p in [0,.25,.5,.75]]+[('FelineWalk',p) for p in [0,.33,.66]]
records={x['name']:x for x in json.loads((master.parent/'authored-motion-records.json').read_text())}
for t in rig.animation_data.nla_tracks:t.mute=True
def pose(name,p):
 rig.animation_data.action=bpy.data.actions[name]
 frame=1+p*(records[name]['frames']-1);scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
points=[]
for name,p in samples:
 pose(name,p);deps=bpy.context.evaluated_depsgraph_get()
 for o in scene.objects:
  if o.type=='MESH' and not o.hide_render:
   ev=o.evaluated_get(deps);points.extend(ev.matrix_world@Vector(v) for v in ev.bound_box)
low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(low+high)/2
scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=16
scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('SourceReview');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.035,.045,.055,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5;scene.world=world
for index,(offset,power) in enumerate([((-4,-4,6),1700),((4,3,5),2100),((3,-4,3),850)]):
 light=bpy.data.lights.new('ReviewLight'+str(index),'AREA');light.energy=power;light.size=5
 obj=bpy.data.objects.new(light.name,light);scene.collection.objects.link(obj);obj.location=center+Vector(offset);obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
camera=bpy.data.cameras.new('SourceReviewCamera');obj=bpy.data.objects.new(camera.name,camera);scene.collection.objects.link(obj);scene.camera=obj
obj.location=center+Vector((8,-5,3.5));obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=(high-low).length*1.15
rows=[]
for i,(name,p) in enumerate(samples):
 pose(name,p);file=out/f'{i:02d}-{name}-{p:.2f}.png';scene.render.filepath=str(file);bpy.ops.render.render(write_still=True)
 rows.append({'path':str(file),'sha256':sha(file),'clip':name,'phase':p,'frame':scene.frame_current+scene.frame_subframe})
 (out/'views.json').write_text(json.dumps(rows,indent=2))
assert sha(master)==before
(out/'receipt.json').write_text(json.dumps({'masterSHA256':before,'unchanged':True,'samples':rows,'scope':'SOURCE_PRESENTATION_ONLY; no native movement/contact/R or gameplay qualification'},indent=2))

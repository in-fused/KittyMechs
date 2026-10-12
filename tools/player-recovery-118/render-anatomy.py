"""ONE read-only saved121 presentation: gait, idle, retained combat/climb skin."""
import bpy,pathlib,json,hashlib
from mathutils import Vector
r=pathlib.Path(__file__).resolve().parents[2];master=r/'assets/source/overhaul-pounce-anatomy-121/Pounce_Motion121.blend'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=sha(master);out=r/'.sites-runtime/overhaul-20261010/anatomy121-source-views';out.mkdir(exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(master));scene=bpy.context.scene
rigs=[o for o in bpy.data.objects if o.type=='ARMATURE'];assert len(rigs)==1;rig=rigs[0]
actions={a.name:a for a in bpy.data.actions};records={x['name']:x for x in json.loads((master.parent/'authored-motion-records.json').read_text())}
retained=['FelineIdle','FelineUprightIdle','FelineRearLaunch','FelineLandingRecovery','FelineHit','FelineUprightHit','FelinePairImpactAttacker','FelinePairPinVictim']
assert all(n in actions for n in retained),list(actions)
climbs=sorted(n for n in actions if any(k in n for k in ['Cling','Climb','Grab','Mantle','Roof']))
(out/'inventory.json').write_text(json.dumps({'actions':{n:list(a.frame_range) for n,a in actions.items()},'retainedSampled':retained,'climbSampled':climbs,'climbMissing':not bool(climbs),'scope':'Actual saved-master inventory; no invented missing actions'},indent=2))
samples=[('FelineGallop',p) for p in [0,.16,.32,.48,.64,.8,.93]]+[('FelineUprightWalkLong',p) for p in [0,.25,.5,.75]]+[('FelineWalk',p) for p in [0,.33,.66]]+[(n,.5) for n in retained+climbs]
for t in rig.animation_data.nla_tracks:t.mute=True
def pose(name,p):
 rig.animation_data.action=actions[name]
 if name in records:frame=1+p*(records[name]['frames']-1)
 else:a,b=actions[name].frame_range;frame=a+p*(b-a)
 scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update();return frame
points=[]
for name,p in samples:
 pose(name,p);deps=bpy.context.evaluated_depsgraph_get()
 for o in scene.objects:
  if o.type=='MESH' and not o.hide_render:
   ev=o.evaluated_get(deps);points.extend(ev.matrix_world@Vector(v) for v in ev.bound_box)
low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(low+high)/2
scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=16
scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
world=bpy.data.worlds.new('AnatomyReview');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.035,.045,.055,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5;scene.world=world
for index,(offset,power) in enumerate([((-4,-4,6),1700),((4,3,5),2100),((3,-4,3),850)]):
 light=bpy.data.lights.new('ReviewLight'+str(index),'AREA');light.energy=power;light.size=5
 obj=bpy.data.objects.new(light.name,light);scene.collection.objects.link(obj);obj.location=center+Vector(offset);obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
camera=bpy.data.cameras.new('AnatomyCamera');obj=bpy.data.objects.new(camera.name,camera);scene.collection.objects.link(obj);scene.camera=obj;camera.type='ORTHO';camera.ortho_scale=(high-low).length*1.1
rows=[]
for i,(name,p) in enumerate(samples):
 frame=pose(name,p)
 for view,offset in [('side',(8,0,1.5)),('threequarter',(8,-5,3.5))]:
  obj.location=center+Vector(offset);obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler();file=out/f'{i:02d}-{name}-{p:.2f}-{view}.png';scene.render.filepath=str(file);bpy.ops.render.render(write_still=True)
  rows.append({'path':str(file),'sha256':sha(file),'clip':name,'phase':p,'frame':frame,'view':view,'headMatrixArmature':[list(x) for x in rig.pose.bones['head'].matrix]})
  (out/'views.json').write_text(json.dumps(rows,indent=2))
assert sha(master)==before
(out/'receipt.json').write_text(json.dumps({'masterSHA256':before,'unchanged':True,'samples':rows,'climbMissing':not bool(climbs),'scope':'SOURCE_PRESENTATION_ONLY; no native movement/contact/R/gameplay or missing-action qualification'},indent=2))

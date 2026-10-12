import bpy,json,pathlib,math,traceback
from mathutils import Vector,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'tools/overhaul-motion-174';OUT=HERE/'preview';OUT.mkdir(exist_ok=True);bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/overhaul-pounce-motion-174/Pounce_Motion174.blend'));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for o in list(bpy.data.objects):
 if o.type not in ('MESH','ARMATURE') or o.type=='MESH' and not o.get('source_owner'):o.hide_render=True
mount=bpy.data.objects.new('Preview_RuntimeScale174',None);bpy.context.collection.objects.link(mount);basis=rig.matrix_world.copy();rig.parent=mount;rig.matrix_parent_inverse.identity();rig.matrix_basis=basis;mount.scale=(.8,.8,.8);scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=560;scene.render.resolution_y=420;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD';scene.world.color=(.72,.76,.8)
bpy.ops.mesh.primitive_plane_add(size=12,location=(0,0,0));floor=bpy.context.object;floor.name='Preview_SourceFloor_Only';m=bpy.data.materials.new('174_Floor');m.diffuse_color=(.38,.42,.46,1);floor.data.materials.append(m)
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4.7;scene.camera=camera
records=json.loads((ROOT/'assets/source/overhaul-pounce-motion-174/authored-motion-records174.json').read_text());byname={r['name']:r for r in records};rows=[]
def phase_pose(name,phase):
 record=byname[name];a=bpy.data.actions[name];rig.animation_data.action=a;raw=phase
 if record['sourceOffsets']:raw=(phase-record['sourceOffsets']['HL'])%1
 frame=record['frames'][0]+raw*(record['frames'][1]-record['frames'][0]);scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update();return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
def arc_pose(u):
 a=bpy.data.actions['FelineTransitionArc106'];rig.animation_data.action=a;first,last=a.frame_range;f=first+u*(last-first);scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update();return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
def mixed(u):
 quad=phase_pose('FelineTrot',.32);upright=phase_pose('FelineUprightStride',.32);arc=arc_pose(u);rig.animation_data.action=bpy.data.actions['FelineTransitionBase106'];scene.frame_set(1);bpy.context.view_layer.update();reference={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones};rig.animation_data.action=None
 for b in rig.pose.bones:
  p,q,s=quad[b.name];p2,q2,s2=upright[b.name];pa,qa,sa=arc[b.name];pr,qr,sr=reference[b.name];b.location=p.lerp(p2,u)+(pa-pr);b.rotation_mode='QUATERNION';b.rotation_quaternion=q.slerp(q2,u)@(qr.inverted()@qa);b.scale=s.lerp(s2,u)
 bpy.context.view_layer.update()
error=None
try:
 for name in ['FelineWalk','FelineGallop','FelineUprightStride','R-up','R-down']:
  phases=[0,.2,.4,.6,.8] if name.startswith('R-') else [0,.125,.25,.375,.5,.625,.75,.875]
  for i,phase in enumerate(phases):
   if name.startswith('R-'):mixed(phase if name=='R-up' else 1-phase)
   else:phase_pose(name,phase)
   for view,location in [('side',(5,0,1.5)),('front',(0,-6,1.5))]:
    camera.location=location;direction=Vector((0,0,1.1))-camera.location;camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();path=OUT/f'{name}-{view}-{i:02}.png';scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);rows.append({'name':name,'view':view,'phase':phase,'path':path.relative_to(ROOT).as_posix(),'scale':.8,'floorZ':0,'scope':'Blender Workbench source temporal pose; R uses2 source gaits and neutral additive local task; not runtime/native contact certification'})
except Exception as e:error={'message':str(e),'traceback':traceback.format_exc()}
(HERE/'preview-receipt174.json').write_text(json.dumps({'writer':'CLOSED','error':error,'rows':rows},indent=2),encoding='utf8')
if error:raise RuntimeError(error['message'])

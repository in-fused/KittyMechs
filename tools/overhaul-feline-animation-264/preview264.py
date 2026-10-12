"""Sequential exported-quaternion replay on exact editable source geometry."""
import bpy,json,pathlib,math,struct,traceback
from mathutils import Vector,Quaternion,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'assets/source/overhaul-feline-animation-264';OUT=ROOT/'.sites-runtime/shader-startup-238/animation264/preview';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(HERE/'Pounce_Feline264.blend'));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for o in bpy.data.objects:
 if o.type not in ('MESH','ARMATURE') or o.type=='MESH' and not o.get('source_owner'):o.hide_render=True
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=384;scene.render.resolution_y=288;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD';scene.world.color=(.63,.69,.75)
bpy.ops.mesh.primitive_plane_add(size=12,location=(0,0,0));mat=bpy.data.materials.new('264_Source_floor');mat.diffuse_color=(.31,.35,.39,1);bpy.context.object.data.materials.append(mat)
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4.3;scene.camera=camera
data=(HERE/'Pounce_Feline264.glb').read_bytes();size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);bin=data[28+size:];nodes={n['name']:n for n in doc['nodes'] if 'name' in n};samples=json.loads((HERE/'samples264.json').read_text());records=json.loads((HERE/'motion-contract264.json').read_text())['records'];byname={r['name']:r for r in records};rows=[];error=None
def accessor(index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0);return list(struct.unpack_from('<'+'f'*(a['count']*n),bin,start)),n
def evaluate(a,t):
 out={}
 for ch in a['channels']:
  if ch['target']['path']!='rotation':continue
  name=doc['nodes'][ch['target']['node']]['name'];s=a['samplers'][ch['sampler']];clock,_=accessor(s['input']);q,_=accessor(s['output']);i=max(0,min(len(clock)-2,next((j-1 for j,v in enumerate(clock) if v>=t),len(clock)-2)));u=max(0,min(1,(t-clock[i])/(clock[i+1]-clock[i])));qa=Quaternion((q[4*i+3],*q[4*i:4*i+3]));qb=Quaternion((q[4*i+7],*q[4*i+4:4*i+7]));out[name]=qa.slerp(qb,u)
 return out
try:
 for name in ('FelineWalk','FelineGallop','FelineUprightStride','FelinePrepareUp264','FelinePrepareDown264'):
  action=next(a for a in doc['animations'] if a['name']==name);source=bpy.data.actions[name];first,last=source.frame_range
  for i in range(8):
   # Compare actual written keys, rather than Blender component-linear versus
   # delivery shortest-arc interpolation at unrelated between-key clocks.
   sample=samples[name][round(i*(len(samples[name])-1)/7)];f=sample['frame'];u=(f-first)/(last-first);scene.frame_set(int(f),subframe=f-int(f));rig.animation_data.action=source
   slots=list(source.slots)
   if len(slots)==1:rig.animation_data.action_slot=slots[0]
   bpy.context.view_layer.update();expected={b.name:b.matrix.copy() for b in rig.pose.bones};rootpos=rig.pose.bones['root'].location.copy();rig.animation_data.action=None
   delivered=evaluate(action,f/60)
   for b in rig.pose.bones:
    r=nodes[b.name].get('rotation',[0,0,0,1]);rq=Quaternion((r[3],*r[:3]));b.rotation_mode='QUATERNION';b.location=(0,0,0);b.scale=(1,1,1);b.rotation_quaternion=rq.inverted()@delivered[b.name]
   rig.pose.bones['root'].location=rootpos;bpy.context.view_layer.update()
   residual=max(abs(b.matrix[j][k]-expected[b.name][j][k]) for b in rig.pose.bones for j in range(4) for k in range(4))
   if residual>2e-5:raise RuntimeError('EXPORTED_QUATERNION_SOURCE_REPLAY:'+str(residual))
   for view,loc in (('side',(6,-.25,2.0)),('front',(0,-6,2.0))):
    camera.location=loc;camera.rotation_euler=(Vector((0,-.25,1.25))-camera.location).to_track_quat('-Z','Y').to_euler();path=OUT/f'{name}-{view}-{i:02}.png';scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);rows.append({'name':name,'view':view,'index':i,'frame':f,'seconds':f/60,'progress':u,'exportSourceMatrixResidual':residual,'path':str(path.relative_to(ROOT)).replace('\\','/'),'contactQualified':False})
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
(HERE/'preview-receipt264.json').write_text(json.dumps({'writer':'CLOSED','error':error,'rows':rows,'scope':'EXPORTED264_ROTATIONS_REPLAYED_ON_SOURCE202_RIG_MESH; retained221root/nonrotation sampling and actualSourceTask253 composition NOT claimed','contactQualified':False,'qualityApproved':False,'publicApproved':False},indent=2))
if error:raise RuntimeError(error['message'])

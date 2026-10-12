import bpy,json,pathlib,math,traceback,struct
from mathutils import Vector,Quaternion,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'tools/overhaul-anatomy-motion-202';OUT=HERE/'preview';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend'));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for o in list(bpy.data.objects):
 if o.type not in ('MESH','ARMATURE') or o.type=='MESH' and not o.get('source_owner'):o.hide_render=True
basis=rig.matrix_world.copy();mount=bpy.data.objects.new('Preview_RuntimeScale202',None);bpy.context.collection.objects.link(mount);rig.parent=mount;rig.matrix_parent_inverse.identity();rig.matrix_basis=basis;mount.scale=(.8,.8,.8)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=448;scene.render.resolution_y=336;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD';scene.world.color=(.72,.76,.8)
bpy.ops.mesh.primitive_plane_add(size=16,location=(0,-2,0));floor=bpy.context.object;floor.name='202_SOURCE_ONLY_floor';mat=bpy.data.materials.new('202_floor');mat.diffuse_color=(.38,.42,.46,1);floor.data.materials.append(mat)
stripe=bpy.data.materials.new('202_source_metric_grid');stripe.diffuse_color=(.59,.64,.67,1)
for i in range(-24,25):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,i*.25,.001));o=bpy.context.object;o.name='202_quarter_metre_floor_grid';o.scale=(8,.008,.001);o.data.materials.append(stripe)
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4.1;scene.camera=camera
records=json.loads((ROOT/'assets/source/overhaul-anatomy-motion-202/authored-motion-records202.json').read_text());byname={r['name']:r for r in records};rows=[];error=None;clock=[]
REST={b.name:b.matrix_local.copy() for b in rig.data.bones};FOOT={}
bpy.context.view_layer.update()
for limb in ('FL','FR','HL','HR'):
 paw=rig.data.bones[limb+'_paw'];family={paw.name}|{b.name for b in paw.children_recursive};points=[]
 for o in (o for o in bpy.data.objects if o.type=='MESH' and o.get('source_owner')):
  transform=rig.matrix_world.inverted()@o.matrix_world
  for v in o.data.vertices:
   w=[(o.vertex_groups[g.group].name,float(g.weight)) for g in v.groups if o.vertex_groups[g.group].name in REST and g.weight>0]
   if sum(weight for n,weight in w if n in family)>.99:points.append((transform@v.co,w))
 if not points:raise RuntimeError('202_PREVIEW_NO_COMPLETE_FOOT:'+limb)
 FOOT[limb]=points

def setframe(f):
 value=struct.unpack('<f',struct.pack('<f',f))[0];i=math.floor(value);scene.frame_set(i,subframe=value-i);bpy.context.view_layer.update();return scene.frame_current_final

def capture():return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
def phase_pose(name,phi):
 r=byname[name];rig.animation_data.action=bpy.data.actions[name];raw=(phi-r['sourceOffsets']['HL'])%1 if r['sourceOffsets'] else phi;planned=r['frames'][0]+raw*(r['frames'][1]-r['frames'][0]);actual=setframe(planned);clock.append({'name':name,'canonicalPhase':phi,'plannedFrame':planned,'actualFrame':actual});return capture()
def arc_pose(u):
 rig.animation_data.action=bpy.data.actions['FelineTransitionArc106'];first,last=rig.animation_data.action.frame_range;setframe(first+u*(last-first));return capture()
def mixed(phi,u,direction):
 stance=u if direction==1 else 1-u;quad=phase_pose('FelineTrot',phi);up=phase_pose('FelineUprightStride',phi);arc=arc_pose(u);rig.animation_data.action=bpy.data.actions['FelineTransitionBase106'];setframe(1);reference=capture();rig.animation_data.action=None;weight=math.sin(math.pi*stance)
 for b in rig.pose.bones:
  p,q,s=quad[b.name];p2,q2,s2=up[b.name];pa,qa,sa=arc[b.name];pr,qr,sr=reference[b.name];b.location=p.lerp(p2,stance)+(pa-pr)*weight;b.rotation_mode='QUATERNION';b.rotation_quaternion=q.slerp(q2,stance)@Quaternion().slerp(qr.inverted()@qa,weight);b.scale=s.lerp(s2,stance)
 bpy.context.view_layer.update();return stance

def diagnostic(selection,stance=None):
 maps={n:rig.pose.bones[n].matrix@REST[n].inverted() for n in REST};feet=[]
 for limb,points in FOOT.items():
  minimum=min((rig.matrix_world@sum(((maps[n]@v)*w for n,w in influences),Vector((0,0,0)))).z for v,influences in points)
  roles=[]
  for name,phi,weight in selection:
   if weight<=0:continue
   r=byname[name];q=(phi-r['sourceOffsets']['HL']+r['sourceOffsets'][limb])%1;roles.append({'clip':name,'weight':weight,'sourceLocalPhase':q,'role':'unloaded-forelimb' if limb in r['unloadedLimbs'] else 'stance' if q<r['sourceDuty'] else 'recovery'})
  feet.append({'limb':limb,'wholePadSourceFloorGap':minimum,'completeFootVertices':len(points),'roles':roles,'sourceLoadedAllPositive':all(x['role']=='stance' for x in roles),'sourceForeUnloading':stance is not None and limb.startswith('F') and stance>0,'nativeContact':'UNQUALIFIED'})
 return feet

try:
 evidence=json.loads((HERE/'browser-decode202-evidence.json').read_text());poses=evidence['measurement']['previewPoses'];conversion=Matrix(((-.8,0,0,0),(0,0,.8,0),(0,.8,0,0),(0,0,0,1))).inverted();rest={b.name:b.matrix_local.copy() for b in rig.data.bones};rig.animation_data.action=None
 for item in poses:
  name=item['name'];phase=item['phase'];stance=item['stance'];desired={};mount.location=(0,0,0);bpy.context.view_layer.update()
  for bone in item['bones']:
   raw=bone['matrixWorld'];world=Matrix([[raw[c*4+r] for c in range(4)] for r in range(4)]);desired[bone['name']]=basis.inverted()@conversion@world
  # Browser outputs include .8 and exact loaded rest; converter removes only
  # declared source basis. No Blender foot/body retargeting of captured poses.
  for bone in rig.data.bones:
   base=desired[bone.parent.name]@rest[bone.parent.name].inverted()@rest[bone.name] if bone.parent else rest[bone.name];local=base.inverted()@desired[bone.name]
   operand={'name':name,'phase':phase,'bone':bone.name,'localTranslation':list(local.translation),'localScale':list(local.to_scale())};clock.append(operand)
   if (bone.name!='root' and local.translation.length>2e-5) or max(abs(x-1) for x in local.to_scale())>2e-5:raise RuntimeError('202_PREVIEW_DECODED_BASIS_FIXED_LOCAL_GUARD:'+bone.name)
   rig.pose.bones[bone.name].matrix_basis=local
  bpy.context.view_layer.update();residual=max(abs(rig.pose.bones[n].matrix[r][c]-m[r][c]) for n,m in desired.items() for r in range(4) for c in range(4));clock.append({'name':name,'phase':phase,'decodedArmatureMatrixResidual':residual});
  if residual>2e-5:raise RuntimeError('202_PREVIEW_DECODED_BONE_MATRIX_REPLAY')
  carrier=-item['carrierDistance'];mount.location.y=carrier;bpy.context.view_layer.update();feet=item['diagnostic']['feet'];index=sum(x['name']==name and x['view']=='side' for x in rows)
  for view,loc in [('side',(5,carrier,1.6)),('front',(0,carrier-6,1.6))]:
   camera.location=loc;camera.rotation_euler=(Vector((0,carrier,1.0))-camera.location).to_track_quat('-Z','Y').to_euler();path=OUT/f'{name}-{view}-{index:02}.png';scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
   rows.append({'name':name,'view':view,'canonicalPhase':phase,'stance':stance,'carrierY':carrier,'path':path.relative_to(ROOT).as_posix(),'outerScale':.8,'immutableRigObjectMatrix':[list(r) for r in basis],'feet':feet,'scope':'EXACT_BROWSER_CUBIC_SOURCE_TASK202_POSE_on_NEW_EDITABLE_MASTER_source_plane_NOT_native_contact'})
except Exception as e:error={'message':str(e),'traceback':traceback.format_exc()}
(HERE/'preview-receipt202.json').write_text(json.dumps({'writer':'CLOSED','error':error,'rows':rows,'sampleClock':clock,'floorZ':0,'renderSize':[448,336],'master':'assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend','runtimeScale':.8,'geometry':'unchangedDetailed121EditableSource','contactQualified':False},indent=2))
if error:raise RuntimeError(error['message'])

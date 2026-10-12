import bpy,json,pathlib,math,traceback,struct
from mathutils import Vector,Quaternion,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'tools/overhaul-stance-gait-194';OUT=HERE/'preview';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/overhaul-stance-gait-194/Pounce_Motion194.blend'));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for o in list(bpy.data.objects):
 if o.type not in ('MESH','ARMATURE') or o.type=='MESH' and not o.get('source_owner'):o.hide_render=True
basis=rig.matrix_world.copy();mount=bpy.data.objects.new('Preview_RuntimeScale194',None);bpy.context.collection.objects.link(mount);rig.parent=mount;rig.matrix_parent_inverse.identity();rig.matrix_basis=basis;mount.scale=(.8,.8,.8)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=448;scene.render.resolution_y=336;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.background_type='WORLD';scene.world.color=(.72,.76,.8)
bpy.ops.mesh.primitive_plane_add(size=16,location=(0,-2,0));floor=bpy.context.object;floor.name='194_SOURCE_ONLY_floor';mat=bpy.data.materials.new('194_floor');mat.diffuse_color=(.38,.42,.46,1);floor.data.materials.append(mat)
stripe=bpy.data.materials.new('194_source_metric_grid');stripe.diffuse_color=(.59,.64,.67,1)
for i in range(-24,25):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,i*.25,.001));o=bpy.context.object;o.name='194_quarter_metre_floor_grid';o.scale=(8,.008,.001);o.data.materials.append(stripe)
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4.1;scene.camera=camera
records=json.loads((ROOT/'assets/source/overhaul-stance-gait-194/authored-motion-records194.json').read_text());byname={r['name']:r for r in records};rows=[];error=None;clock=[]
REST={b.name:b.matrix_local.copy() for b in rig.data.bones};FOOT={}
bpy.context.view_layer.update()
for limb in ('FL','FR','HL','HR'):
 paw=rig.data.bones[limb+'_paw'];family={paw.name}|{b.name for b in paw.children_recursive};points=[]
 for o in (o for o in bpy.data.objects if o.type=='MESH' and o.get('source_owner')):
  transform=rig.matrix_world.inverted()@o.matrix_world
  for v in o.data.vertices:
   w=[(o.vertex_groups[g.group].name,float(g.weight)) for g in v.groups if o.vertex_groups[g.group].name in REST and g.weight>0]
   if sum(weight for n,weight in w if n in family)>.99:points.append((transform@v.co,w))
 if not points:raise RuntimeError('194_PREVIEW_NO_COMPLETE_FOOT:'+limb)
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
 names=['FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride','R-up','R-down']
 for name in names:
  carrier=0
  for i in range(8):
   phi=i/7;stance=None
   if name.startswith('R-'):
    stance=mixed(phi,i/7,1 if name=='R-up' else -1);native=byname['FelineTrot']['nativeDistancePerCycle']*(1-stance)+byname['FelineUprightStride']['nativeDistancePerCycle']*stance
    if i:carrier-=native/7
    selection=[('FelineTrot',phi,1-stance),('FelineUprightStride',phi,stance)]
   else:
    phase_pose(name,phi);native=byname[name]['nativeDistancePerCycle'];carrier=-native*phi;selection=[(name,phi,1)]
   mount.location.y=carrier;bpy.context.view_layer.update();feet=diagnostic(selection,stance)
   for view,loc in [('side',(5,carrier,1.6)),('front',(0,carrier-6,1.6))]:
    camera.location=loc;camera.rotation_euler=(Vector((0,carrier,1.0))-camera.location).to_track_quat('-Z','Y').to_euler();path=OUT/f'{name}-{view}-{i:02}.png';scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    rows.append({'name':name,'view':view,'canonicalPhase':phi,'stance':stance,'carrierY':carrier,'nativeDistanceCurrent':native,'path':path.relative_to(ROOT).as_posix(),'outerScale':.8,'immutableRigObjectMatrix':[list(r) for r in basis],'feet':feet,'scope':'NEW194_SOURCE_ONLY_MASTER_UNADMITTED_flat_source_floor_NOT_delivered_GLTF_NOT_native_support_NOT_contact'})
except Exception as e:error={'message':str(e),'traceback':traceback.format_exc()}
(HERE/'preview-receipt194.json').write_text(json.dumps({'writer':'CLOSED','error':error,'rows':rows,'sampleClock':clock,'floorZ':0,'renderSize':[448,336],'master':'assets/source/overhaul-stance-gait-194/Pounce_Motion194.blend','runtimeScale':.8,'geometry':'unchangedDetailed121EditableSource','contactQualified':False},indent=2))
if error:raise RuntimeError(error['message'])

import ast,bpy,datetime,hashlib,json,math,pathlib,traceback
from mathutils import Matrix,Vector,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'assets/source/overhaul-pounce-motion-174';TOOLS=ROOT/'tools/overhaul-motion-174';MASTER=ROOT/'assets/source/overhaul-pounce-anatomy-121/Pounce_Motion121.blend';OUTPUT=ROOT/'public/assets/overhaul/pounce-motion-174/Pounce_Motion174.glb'
FPS=60;RIG=None;REST={};CURRENT=None;records=[];error=None;rowsCount=0

def extract(p,names):
 text=p.read_text(encoding='utf8');tree=ast.parse(text);data={n.name:ast.get_source_segment(text,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names};assert set(data)==set(names);return '\n\n'.join(data[n] for n in names)
def save(n,v):(HERE/n).write_text(json.dumps(v,indent=2,allow_nan=False),encoding='utf8')
def rows(m):return [list(map(float,r)) for r in m]
def emit(v):
 global rowsCount
 rowsCount+=1
 if v['maxMatrixComponentResidual']>2e-5:raise RuntimeError('174_EVALUATED_POSE_MISMATCH')
def action_hash(a):
 return hashlib.sha256(repr([(c.data_path,c.array_index,[(list(k.co),list(k.handle_left),list(k.handle_right),k.interpolation) for k in c.keyframe_points]) for c in a.fcurves]).encode()).hexdigest()
def write_pose(poses):
 if set(poses)!=set(REST):raise RuntimeError('174_EXACT57_POSE_REQUIRED')
 for b in RIG.data.bones:
  base=poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local
  basis=base.inverted()@poses[b.name]
  if (b.name!='root' and basis.to_translation().length>2e-5) or max(abs(float(x)-1) for x in basis.to_scale())>2e-5:raise RuntimeError('174_FIXED_JOINT_TRANSLATION_OR_SCALE:'+b.name)
  RIG.pose.bones[b.name].matrix_basis=basis
 bpy.context.view_layer.update()
def foot_min(poses,limb):
 maps={n:poses[n]@REST[n].inverted() for n in FOOT_BONES[limb]};return min((RIG.matrix_world@sum(((maps[n]@v)*w for n,w in influences),Vector((0,0,0)))).z for v,influences in FOOT_VERTICES[limb])
def retarget(poses,limb,dz):
 old={n:m.copy() for n,m in poses.items()};u=limb+'_upper';l=limb+'_lower';p=limb+'_paw';hip=parent_base(u,poses).translation;goal=old[p].translation+Vector((0,0,dz));parent=RIG.data.bones[u].parent.name;pole=poses[parent]@REST[parent].inverted()@RIG.data.bones[l].head_local
 if limb.startswith('F'):
  knee=solve_two(hip,goal,RIG.data.bones[u].length,RIG.data.bones[l].length,pole,limb);poses[u]=chain_bone(u,hip,knee);poses[l]=chain_bone(l,knee,goal)
 else:
  h=limb+'_hock';delta=old[p].translation-old[h].translation;hock=goal-delta;knee=solve_two(hip,hock,RIG.data.bones[u].length,RIG.data.bones[l].length,pole,limb);poses[u]=chain_bone(u,hip,knee);poses[l]=chain_bone(l,knee,hock);poses[h]=chain_bone(h,hock,goal)
 poses[p]=Matrix.Translation(goal)@old[p].to_quaternion().to_matrix().to_4x4()
 changed={u,l,p} if limb.startswith('F') else {u,l,p,limb+'_hock'}
 for b in RIG.data.bones:
  if b.name not in changed and b.parent and b.parent.name.startswith(limb+'_'):poses[b.name]=poses[b.parent.name]@old[b.parent.name].inverted()@old[b.name]

try:
 protected=json.loads((TOOLS/'protected-inputs174.json').read_text())['files']
 if any(hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()!=r['sha256'] for r in protected):raise RuntimeError('174_PROTECTED_INPUT_CHANGED')
 if OUTPUT.exists() or (HERE/'Pounce_Motion174.blend').exists():raise RuntimeError('174_FRESH_OUTPUT_REQUIRED')
 bpy.ops.wm.open_mainfile(filepath=str(MASTER));RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');REST={b.name:b.matrix_local.copy() for b in RIG.data.bones};assert len(REST)==57
 exec(compile(extract(ROOT/'assets/source/overhaul-pounce-art-detail-034/author.py',['fingerprint']),'174-fingerprint','exec'))
 exec(compile(extract(ROOT/'assets/source/overhaul-pounce-gait-058/author.py',['scalar','materials']),'174-materials','exec'))
 before=fingerprint();materialBefore=json.loads(json.dumps(materials(),allow_nan=False));exec(compile(extract(ROOT/'assets/source/overhaul-pounce-identity57-animation-source-004/author.py',['trans','rotation','chain_bone','solve_two','parent_base']),'004-strict-chain','exec'))
 exec(compile((ROOT/'assets/source/overhaul-pounce-pose-owner-027/single_pose_owner.py').read_text(),'027-single-owner','exec'))
 # Load only primitive trajectory helpers from121; never execute old author.
 exec(compile(extract(ROOT/'assets/source/overhaul-pounce-anatomy-121/author.py',['smoother','swing']),'121-C2-recovery','exec'))
 exec(compile((HERE/'choreography174.py').read_text(),'174-functional-tasks','exec'))
 FOOT_VERTICES={};FOOT_BONES={}
 for limb in ('FL','FR','HL','HR'):
  paw=RIG.data.bones[limb+'_paw'];family={paw.name}|{b.name for b in paw.children_recursive};points=[];used=set()
  for o in (o for o in bpy.data.objects if o.type=='MESH' and o.get('source_owner')):
   transform=RIG.matrix_world.inverted()@o.matrix_world
   for v in o.data.vertices:
    influences=[(o.vertex_groups[g.group].name,float(g.weight)) for g in v.groups if o.vertex_groups[g.group].name in REST and g.weight>0]
    if sum(w for n,w in influences if n in family)>.99:points.append((transform@v.co,influences));used.update(n for n,w in influences)
  if not points:raise RuntimeError('174_NO_ACTUAL_COMPLETE_FOOT_SKIN:'+limb)
  FOOT_VERTICES[limb]=points;FOOT_BONES[limb]=used
 specs=[('FelineWalk','walk'),('FelineTrot','trot'),('FelineGallop','gallop'),('FelineUprightWalkLong','upright'),('FelineUprightStride','uprightFast'),('FelineTransitionArc106','arc')];selected={n for n,k in specs};original={a.name:action_hash(a) for a in bpy.data.actions if a.name not in selected};ranges={n:list(bpy.data.actions[n].frame_range) for n,k in specs}
 RIG.animation_data.action=None
 for t in RIG.animation_data.nla_tracks:t.mute=True
 for t in list(RIG.animation_data.nla_tracks):
  if any(s.action and s.action.name in selected for s in t.strips):RIG.animation_data.nla_tracks.remove(t)
 for a in list(bpy.data.actions):
  if a.name in selected:bpy.data.actions.remove(a,do_unlink=True)
  else:a.use_fake_user=True
 bpy.context.scene.render.fps=FPS;bpy.context.scene.render.fps_base=1
 for name,kind in specs:
  firstFrame,lastFrame=map(int,ranges[name]);count=lastFrame-firstFrame;action=bpy.data.actions.new(name);action.use_fake_user=True;first=None;last=None;padRows=[]
  for i in range(count+1):
   begin_solver(RIG);frame=firstFrame+i;bpy.context.scene.frame_set(frame);phase=i/count;desired,record=transition_arc(phase) if kind=='arc' else choreograph(kind,phase);CURRENT={'name':name,'frame':frame,'phase':phase}
   if kind!='arc':
    duty,offsets=TABLE[kind];stride=NATIVE_DISTANCE[kind]*duty/.8
    for limb in ('FL','FR','HL','HR'):
     if kind.startswith('upright') and limb.startswith('F'):continue
     height=swing(phase+offsets[limb],duty,stride,.24 if kind=='gallop' else .17 if kind.startswith('upright') else .13)[1]
     for attempt in range(4):
      correction=height-foot_min(desired,limb)
      if abs(correction)<=2e-5:break
      retarget(desired,limb,correction)
     residual=foot_min(desired,limb)-height
     if abs(residual)>2e-5:raise RuntimeError('174_SOURCE_PAD_TRAJECTORY_NOT_SOLVED:'+limb+':'+str(residual))
     padRows.append({'phase':phase,'limb':limb,'intent':'stance' if (phase+offsets[limb])%1<duty else 'recovery','ankle':list(desired[limb+'_paw'].translation),'sourcePadHeight':foot_min(desired,limb),'desiredHeight':height,'residual':residual,'sourceFloorOnly':True})
   rootLaw=record['rootMotion'];actual=desired['root'].translation-REST['root'].translation
   if (actual-Vector(rootLaw['armatureOffset'])).length>2e-5 or max(abs(float(desired['root'][r][c]-REST['root'][r][c])) for r in range(3) for c in range(3))>2e-5:raise RuntimeError('174_DECLARED_ROOT_LAW_MISMATCH')
   write_pose(desired);validate_evaluated(RIG,desired,emit,'detached174');key_owned(RIG,action,frame,desired,emit);RIG.animation_data.action=None;first=first or {n:m.copy() for n,m in desired.items()};last=desired
  residual=max(abs(float(first[n][r][c]-last[n][r][c])) for n in REST for r in range(4) for c in range(4))
  if residual>2e-5:raise RuntimeError('174_CYCLE_OR_ARC_CLOSURE:'+name)
  records.append({'name':name,'kind':kind,'frames':[firstFrame,lastFrame],'cycleStart':firstFrame/FPS,'cycleEnd':lastFrame/FPS,'nativeDistancePerCycle':NATIVE_DISTANCE.get(kind),'sourceDuty':TABLE[kind][0] if kind in TABLE else None,'sourceOffsets':TABLE[kind][1] if kind in TABLE else None,'unloadedLimbs':['FL','FR'] if kind.startswith('upright') else [],'closure':residual,'padRows':padRows,'nativeContact':'UNQUALIFIED'})
 for name,kind in specs:t=RIG.animation_data.nla_tracks.new();t.name=name;t.strips.new(name,1,bpy.data.actions[name]);t.mute=True
 RIG.animation_data.action=None
 for b in RIG.pose.bones:b.matrix_basis=Matrix.Identity(4)
 bpy.context.view_layer.update();after=fingerprint()
 if before!=after or json.loads(json.dumps(materials(),allow_nan=False))!=materialBefore:raise RuntimeError('174_GEOMETRY_REST_WEIGHTS_UV_MATERIAL_CHANGED')
 if any(action_hash(bpy.data.actions[n])!=h for n,h in original.items()):raise RuntimeError('174_RETAINED_ACTION_CURVE_CHANGED')
 save('authored-motion-records174.json',records);save('preservation174.json',{'before':before,'after':after,'materialsEqual':True,'retainedActionHashes':original,'sourceMasterSHA256':hashlib.sha256(MASTER.read_bytes()).hexdigest(),'scaleContract':.8,'sourceUnits':'metres Zup, runtime scale.8 and Y-up conversion','footVertices':{n:len(v) for n,v in FOOT_VERTICES.items()}})
 bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_Motion174.blend'))
 actual=[o for o in bpy.data.objects if o.type=='MESH' and o.get('source_owner')]
 if len(actual)!=255:raise RuntimeError('174_EXACT255_SOURCE_PARTS')
 for o in bpy.context.selected_objects:o.select_set(False)
 for o in actual:o.hide_set(False);o.select_set(True)
 RIG.select_set(True);bpy.context.view_layer.objects.active=RIG
 bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_attributes=True)
 if fingerprint()!=before or len(bpy.data.actions)!=45:raise RuntimeError('174_POST_EXPORT_PRESERVATION_OR_CATALOG')
except Exception as e:error={'message':str(e),'traceback':traceback.format_exc(),'clock':CURRENT}
finally:
 save('author-receipt174.json',{'writer':'CLOSED','status':'FIRST_AUTHOR_FAILURE_STOP' if error else 'SOURCE_AND_PRIVATE_EXPORT_UNADMITTED','error':error,'recordsCompleted':len(records),'evaluatedRows':rowsCount,'protectedAfter':[{'path':r['path'],'match':hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()==r['sha256']} for r in protected]})
if error:raise RuntimeError(error['message'])

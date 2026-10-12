"""202 single bounded NEW master author. Invocation requires root job approval.
Private source/export only. --python-exit-code 1 required by run202.py.
"""
import sys,ast,bpy,json,math,pathlib,hashlib,traceback,struct
from mathutils import Matrix,Vector,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'assets/source/overhaul-anatomy-motion-202';TOOLS=ROOT/'tools/overhaul-anatomy-motion-202';sys.path.insert(0,str(HERE))
from anatomy202 import BASIS202,AXIAL202,ADDED202,install_anatomy202,retarget_complete_world_pose202,ipsilateral_elbow_pole202
from choreography202 import TABLE202,NATIVE_DISTANCE202,pose_tasks202,fore_gesture202,scapular_angle202
from armor202 import armor202,body_objects202,mesh_fingerprint202
MASTER=ROOT/'assets/source/overhaul-phase-transition-197/Pounce_Motion197.blend';OUTPUT=TOOLS/'output/Pounce_Anatomy202.glb';FPS=60;CURRENT=None;requests=[];records=[];evaluated=[];error=None;RIG=None;OLD=None;REST={};OLDREST={};protected=[]
def save(name,obj,folder=HERE):(folder/name).write_text(json.dumps(obj,indent=2,allow_nan=False),encoding='utf8')
def emit(row):
 # Each guard receives its exact operands FIRST. Avoid all-geometry/frame logs.
 requests.append({'clock':CURRENT,'operands':row})
def rows(m):return [list(r) for r in m]
def frame202(frame):
 f=struct.unpack('<f',struct.pack('<f',frame))[0];i=math.floor(f);bpy.context.scene.frame_set(i,subframe=f-i);s=bpy.context.scene;emit({'stage':'published-clock','planned':frame,'f32':f,'integer':s.frame_current,'subframe':s.frame_subframe,'actual':s.frame_current_final})
 if s.frame_current!=i or s.frame_subframe!=struct.unpack('<f',struct.pack('<f',f-i))[0] or s.frame_current_final!=f:raise RuntimeError('202_PUBLISHED_FRAME_CLOCK')
 return f

def extract(path,names):
 text=path.read_text(encoding='utf8');tree=ast.parse(text);data={n.name:ast.get_source_segment(text,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names}
 if set(data)!=set(names):raise RuntimeError('202_SEALED_SOURCE_FUNCTION_MISSING')
 return '\n\n'.join(data[n] for n in names)
def source_world202(action,frame):
 bind_action202(OLD,action);actualFrame=frame202(frame);bpy.context.view_layer.update()
 p=[0.,0.,0.];q=[1.,0.,0.,0.];s=[1.,1.,1.];properties={'location':p,'rotation_quaternion':q,'scale':s}
 for c in action.fcurves:
  for prop,values in properties.items():
   if c.data_path=='pose.bones["root"].'+prop:values[c.array_index]=float(c.evaluate(actualFrame))
 expected=Matrix.LocRotScale(Vector(p),Quaternion(q),Vector(s));actual=OLD.pose.bones['root'].matrix_basis;residual=max(abs(expected[i][j]-actual[i][j]) for i in range(4) for j in range(4));emit({'stage':'reference-root-evaluation-before-guard','action':action.name,'frame':actualFrame,'expectedRootBasis':rows(expected),'actualRootBasis':rows(actual),'actualRootPose':rows(OLD.pose.bones['root'].matrix),'residual':residual,'actualSlot':getattr(getattr(OLD.animation_data,'action_slot',None),'identifier',None)})
 if residual>2e-5:raise RuntimeError('202_REFERENCE_ROOT_ACTION_NOT_EVALUATED')
 return {b.name:b.matrix.copy() for b in OLD.pose.bones}
def action_hash202(a):return hashlib.sha256(repr([(c.data_path,c.array_index,[(list(k.co),list(k.handle_left),list(k.handle_right),k.interpolation) for k in c.keyframe_points]) for c in a.fcurves]).encode()).hexdigest()

def bind_action202(obj,action):
 slots=list(getattr(action,'slots',[]));compatible=[s for s in slots if s.target_id_type=='OBJECT'];matching=[s for s in compatible if s.identifier=='OB'+RIG.name];selected=compatible[0] if len(compatible)==1 else matching[0] if len(matching)==1 else None
 operand={'stage':'action-slot-before-binding','object':obj.name,'action':action.name,'slots':[{'identifier':s.identifier,'targetType':s.target_id_type,'handle':s.handle} for s in slots],'compatible':len(compatible),'matchingSourceRig':len(matching),'beforeSlot':getattr(getattr(obj.animation_data,'action_slot',None),'identifier',None),'beforeRootBasis':rows(obj.pose.bones['root'].matrix_basis),'beforeRootPose':rows(obj.pose.bones['root'].matrix)};emit(operand)
 if selected is None and not getattr(action,'is_action_legacy',False) and not getattr(action,'is_empty',False):raise RuntimeError('202_SOURCE_ACTION_SLOT_AMBIGUOUS_OR_UNAVAILABLE')
 obj.animation_data.action=action
 if selected is not None:obj.animation_data.action_slot=selected
 actual=getattr(obj.animation_data,'action_slot',None);emit({'stage':'action-slot-after-binding','object':obj.name,'action':action.name,'selectedSlot':selected.identifier if selected else None,'actualSlot':actual.identifier if actual else None,'legacyOrEmpty':selected is None})
 if selected is not None and (actual is None or actual.handle!=selected.handle):raise RuntimeError('202_SOURCE_ACTION_SLOT_NOT_BOUND')
def write202(desired):
 if set(desired)!=set(REST):raise RuntimeError('202_EXACT61_DESIRED_OWNER')
 begin_solver(RIG)
 for b in RIG.data.bones:
  base=desired[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local;local=base.inverted()@desired[b.name];operand={'stage':'local-before-guard','bone':b.name,'translation':list(local.translation),'scale':list(local.to_scale())}
  if b.name=='root':operand['declaredSourceRootMatrix']=rows(desired[b.name])
  if (b.name!='root' and local.translation.length>2e-5) or max(abs(x-1) for x in local.to_scale())>2e-5:emit(operand);raise RuntimeError('202_FIXED_LOCAL_TRANSLATION_SCALE:'+b.name)
  RIG.pose.bones[b.name].matrix_basis=local
 bpy.context.view_layer.update()
def verify202(desired,stage):
 actual={b.name:b.matrix.copy() for b in RIG.pose.bones};residual={n:max(abs(actual[n][i][j]-m[i][j]) for i in range(4) for j in range(4)) for n,m in desired.items()};row={'stage':stage,'clock':CURRENT,'maxResidual':max(residual.values()),'worst':max(residual,key=residual.get)};evaluated.append(row)
 if row['maxResidual']>2e-5:emit({'stage':stage,'desired':{n:rows(m) for n,m in desired.items()},'actual':{n:rows(m) for n,m in actual.items()},'residual':residual});raise RuntimeError('202_EVALUATED_SOURCE_REPLAY')
def key202(action,frame,desired):
 RIG.animation_data.action=action
 for b in RIG.pose.bones:
  b.rotation_mode='QUATERNION'
  for prop in ('location','rotation_quaternion','scale'):b.keyframe_insert(prop,frame=frame,group=b.name)
 bpy.context.view_layer.update();verify202(desired,'owned-key');frame202(frame+1);frame202(frame);verify202(desired,'same-clock-replay');RIG.animation_data.action=None

def ordinary202(old,kind,canonicalPhase):
 desired=retarget_complete_world_pose202(old,OLDREST,REST,lambda x:None);stance=1 if kind.startswith('upright') else 0
 task=pose_tasks202(kind,canonicalPhase,stance,REST,emit,{'pelvis':old['pelvis'],'chest':old['chest'],'body':old['root']})
 points=[Vector(task['fixedRestLengthGoals'][n]) for n in AXIAL202]
 for name,a,b in zip(AXIAL202[:-1],points,points[1:]):desired[name]=chain_bone(name,a,b)
 desired['chest']=Matrix.Translation(points[-1])@old['chest'].to_quaternion().to_matrix().to_4x4()
 # New scapular carrier owns a real moved shoulder on its fixed span.
 for limb in ('FL','FR'):
  name=limb+'_scapula202';base=parent_base(name,desired);angle=scapular_angle202(kind,canonicalPhase,limb);origin=base.translation;axis=(old['chest'].to_3x3()@OLDREST['chest'].to_3x3().inverted()@Vector(BASIS202['lateral'])).normalized();desired[name]=Matrix.Translation(origin)@rotation(axis,angle)@Matrix.Translation(-origin)@base;emit({'stage':'scapula-before-chain','limb':limb,'phase':canonicalPhase,'angle':angle,'posedAxis':list(axis),'matrix':rows(desired[name]),'sourceSide':BASIS202['side'][limb]})
 # Follow current parents while retaining original source local gesture, head
 # gaze, digit/tail detail. Solver overrides only selected limb chain members.
 fixed=set(AXIAL202)|set(ADDED202)|{'root'}
 for b in RIG.data.bones:
  if b.name in fixed:continue
  parent=b.parent.name if b.parent else None
  if b.name in old and parent in old:desired[b.name]=desired[parent]@old[parent].inverted()@old[b.name]
  elif b.name in old:desired[b.name]=parent_base(b.name,desired)@REST[b.name].inverted()@old[b.name]
 for limb in ('FL','FR','HL','HR'):
  u,l,p=limb+'_upper',limb+'_lower',limb+'_paw';hip=parent_base(u,desired).translation;goal=old[p].translation.copy();pawRotation=old[p].to_quaternion().to_matrix().to_4x4();pole=ipsilateral_elbow_pole202(limb,hip,RIG.data.bones[u].length,old['root']) if limb.startswith('F') else old[l].translation+(hip-old[u].translation)
  if limb.startswith('F') and stance:
   fore=fore_gesture202(limb,canonicalPhase,hip,RIG.data.bones[u].length,RIG.data.bones[l].length,old['root'],emit);goal=Vector(fore['wrist']);pole=Vector(fore['elbow'])
   # Forward claw/sole normal outside the sternum; preserve paw rest orientation.
   side=BASIS202['side'][limb];normal=Vector((side*.45,0,math.sqrt(1-.45*.45)));forward=Vector(BASIS202['forward']);right=normal.cross(forward).normalized();pawRotation=Matrix(((right.x,-forward.x,normal.x),(right.y,-forward.y,normal.y),(right.z,-forward.z,normal.z))).to_4x4()@REST[p].to_quaternion().to_matrix().to_4x4()
  third=Vector((0,0,0)) if limb.startswith('F') else old[p].translation-old[limb+'_hock'].translation;end=goal-third;lengths=[RIG.data.bones[u].length,RIG.data.bones[l].length];emit({'stage':'limb-before-fixed-reach','limb':limb,'hip':list(hip),'ankle':list(goal),'endpoint':list(end),'pole':list(pole),'l1':lengths[0],'l2':lengths[1],'minimum':abs(lengths[0]-lengths[1])+1e-6,'maximum':sum(lengths)-1e-6,'distance':(end-hip).length,'role':task['roles'][limb],'sourceFrame':task['sourceFrame']})
  knee=solve_two(hip,end,*lengths,pole,limb);desired[u]=chain_bone(u,hip,knee);desired[l]=chain_bone(l,knee,end)
  if not limb.startswith('F'):desired[limb+'_hock']=chain_bone(limb+'_hock',end,goal)
  desired[p]=Matrix.Translation(goal)@pawRotation
  for b in RIG.data.bones:
   if b.name in old and b.name not in ADDED202 and b.name.startswith(limb+'_') and b.name not in (u,l,p,limb+'_hock') and b.parent and b.parent.name in old:desired[b.name]=desired[b.parent.name]@old[b.parent.name].inverted()@old[b.name]
  if limb.startswith('F') and stance:
   elbow=desired[l].translation;sternum=desired['chest'].translation;out=(elbow-sternum).x*BASIS202['side'][limb];emit({'stage':'ipsilateral-before-guard','limb':limb,'elbow':list(elbow),'sternum':list(sternum),'sourceOutboardDistance':out})
   if out<=0:raise RuntimeError('202_UP_ELBOW_CROSSES_STERNUM:'+limb)
 return desired,task

try:
 protected=json.loads((TOOLS/'protected-inputs202.json').read_text())['files']
 if any(hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest()!=x['sha256'] for x in protected):raise RuntimeError('202_PROTECTED_INPUT_CHANGED')
 if OUTPUT.exists() or (HERE/'Pounce_Anatomy202.blend').exists():raise RuntimeError('202_FRESH_DESTINATION_ONLY')
 OUTPUT.parent.mkdir(exist_ok=True);bpy.ops.wm.open_mainfile(filepath=str(MASTER));RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');RIG.animation_data.action=None
 for t in RIG.animation_data.nla_tracks:t.mute=True
 for b in RIG.pose.bones:b.matrix_basis=Matrix.Identity(4)
 bpy.context.view_layer.update();OLD=RIG.copy();OLD.data=RIG.data.copy();OLD.name='202_PRIVATE_OLD57';bpy.context.collection.objects.link(OLD);OLD.animation_data_clear();OLD.animation_data_create();OLDREST={b.name:b.matrix_local.copy() for b in OLD.data.bones}
 originals={a.name:a for a in bpy.data.actions};originalHashes={n:action_hash202(a) for n,a in originals.items()};ranges={n:list(a.frame_range) for n,a in originals.items()}
 if len(originals)!=45:raise RuntimeError('202_ACTUAL45_MASTER_ACTIONS')
 install_anatomy202(RIG,emit);REST={b.name:b.matrix_local.copy() for b in RIG.data.bones};armor=armor202(RIG,emit);save('armor-ledger202.json',armor)
 exec(compile(extract(ROOT/'assets/source/overhaul-pounce-identity57-animation-source-004/author.py',['trans','rotation','chain_bone','solve_two','parent_base']),'004-fixed-chain','exec'));exec(compile((ROOT/'assets/source/overhaul-pounce-pose-owner-027/single_pose_owner.py').read_text(),'027-single-owner','exec'))
 # Preserve all original basis curves. New identity carriers algebraically
 # restore the old proximal-parent mapping; actual world evaluation proves it.
 for name,a in originals.items():a.name='202_PRIVATE_SOURCE_'+name
 for t in list(RIG.animation_data.nla_tracks):RIG.animation_data.nla_tracks.remove(t)
 specs={'FelineWalk':'walk','FelineTrot':'trot','FelineGallop':'gallop','FelineUprightWalkLong':'upright','FelineUprightStride':'uprightFast'};selected=set(specs)|{'FelineTransitionArc106'};compat=[]
 for name,source in originals.items():
  first,last=ranges[name]
  if name not in selected:
   action=source.copy();action.name=name;action.use_fake_user=True;bind_action202(RIG,action)
   for f in (first,last):
    frame202(f)
    for n in ADDED202:
     p=RIG.pose.bones[n];p.rotation_mode='QUATERNION';p.matrix_basis=Matrix.Identity(4)
     for prop in ('location','rotation_quaternion','scale'):p.keyframe_insert(prop,frame=f,group=n)
   for f in sorted({first,last,(first+last)/2,first+(last-first)*.23,first+(last-first)*.71}):
    CURRENT={'name':name,'frame':f,'owner':'COMPLETE_CRITICAL_ORIGINAL_SOURCE'};old=source_world202(source,f);bind_action202(RIG,action);frame202(f);bpy.context.view_layer.update();desired=retarget_complete_world_pose202(old,OLDREST,REST,lambda x:None);verify202(desired,'complete-world-retarget');compat.append({'name':name,'frame':f,'oldWorld':{n:rows(m) for n,m in old.items()},'maxResidual':evaluated[-1]['maxResidual']})
   RIG.animation_data.action=None;records.append({'name':name,'frames':[first,last],'retainedSemantic':'actual39complete-world-retarget','sourceCurveHash':originalHashes[name]});continue
  action=bpy.data.actions.new(name);action.use_fake_user=True;keyTimes=sorted({float(k.co.x) for c in source.fcurves for k in c.keyframe_points}|{first,last});firstPose=None;lastPose=None
  for f in keyTimes:
   frame=frame202(f);raw=(frame-first)/(last-first);kind=specs.get(name);canonical=(raw+TABLE202[kind][1]['HL'])%1 if kind else raw;CURRENT={'name':name,'frame':frame,'canonicalPhase':canonical,'kind':kind,'owner':'202_SOURCE_TASKS'}
   if kind:old=source_world202(source,frame);desired,task=ordinary202(old,kind,canonical)
   else:desired={n:m.copy() for n,m in REST.items()};task={'neutralArc':True,'owner':'ORDINARY_TASKS_NO_ADDITIVE_ARC'}
   write202(desired);verify202(desired,'detached');key202(action,frame,desired);firstPose=firstPose or {n:m.copy() for n,m in desired.items()};lastPose=desired
  residual=max(abs(firstPose[n][i][j]-lastPose[n][i][j]) for n in REST for i in range(4) for j in range(4));emit({'stage':'cycle-before-guard','name':name,'residual':residual})
  if residual>2e-5:raise RuntimeError('202_CYCLE_CLOSURE:'+name)
  records.append({'name':name,'frames':[first,last],'cycleStart':first/FPS,'cycleEnd':last/FPS,'nativeDistancePerCycle':NATIVE_DISTANCE202.get(kind),'sourceDuty':TABLE202[kind][0] if kind else None,'sourceOffsets':TABLE202[kind][1] if kind else None,'unloadedLimbs':['FL','FR'] if kind and kind.startswith('upright') else [],'closure':residual,'nativeContact':False})
 for name,source in originals.items():
  if action_hash202(source)!=originalHashes[name]:raise RuntimeError('202_OLD_PRIVATE_ACTION_CHANGED')
 OLD.animation_data.action=None;bpy.data.objects.remove(OLD,do_unlink=True)
 for source in originals.values():bpy.data.actions.remove(source,do_unlink=True)
 if len(bpy.data.actions)!=45:raise RuntimeError('202_EXACT45_OUTPUT_ACTIONS')
 for a in bpy.data.actions:t=RIG.animation_data.nla_tracks.new();t.name=a.name;t.strips.new(a.name,1,a);t.mute=True
 RIG.animation_data.action=None
 for b in RIG.pose.bones:b.matrix_basis=Matrix.Identity(4)
 bpy.context.view_layer.update();save('authored-motion-records202.json',records);save('complete-action-world202.json',compat);save('rig-profile202.json',{'bones':{b.name:{'parent':b.parent.name if b.parent else None,'rest':rows(b.matrix_local),'length':b.length} for b in RIG.data.bones},'sourceBodyObject':rows(RIG.matrix_world),'basis':BASIS202,'native':False});save('preservation202.json',{'originalWorldRest':{n:rows(m) for n,m in OLDREST.items()},'newWorldRest':{n:rows(m) for n,m in REST.items()},'originalActions':originalHashes,'geometry':armor,'nativePhysics':'unchanged'})
 bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_Anatomy202.blend'))
 # NEW packing copy only: retain editable separate source armor in saved master.
 copies=[]
 for o in body_objects202(RIG):
  c=o.copy();c.data=o.data.copy();bpy.context.collection.objects.link(c);c.name='202_PACK_'+o.name;copies.append(c)
 for o in bpy.context.selected_objects:o.select_set(False)
 for o in copies:o.select_set(True)
 bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();packed=bpy.context.object;packed.name='202_DetailedSingleSkin';packed['source_owner']='202_61_detailed_source';packed.select_set(True);RIG.select_set(True);bpy.context.view_layer.objects.active=RIG;bpy.context.scene.render.fps=60;bpy.context.scene.render.fps_base=1
 bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=False,export_frame_range=False,export_attributes=True,export_optimize_animation_size=False)
 # GLB primary semantics await actual decoder. Static chunk count is not admission.
 data=OUTPUT.read_bytes();size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);active=[]
 def visit(i):
  n=doc['nodes'][i]
  if 'mesh' in n:active.append(doc['meshes'][n['mesh']])
  for c in n.get('children',[]):visit(c)
 for i in doc['scenes'][doc.get('scene',0)]['nodes']:visit(i)
 primitives=sum(len(m['primitives']) for m in active);vertices=sum(doc['accessors'][p['attributes']['POSITION']]['count'] for m in active for p in m['primitives']);indices=sum(doc['accessors'][p['indices']]['count'] for m in active for p in m['primitives']);emit({'stage':'decoded-counts-before-guard','primitives':primitives,'vertices':vertices,'indices':indices,'clips':len(doc.get('animations',[])),'skinJoints':[len(s['joints']) for s in doc['skins']]})
 if primitives>5 or vertices>33027 or indices>160023 or len(doc.get('animations',[]))!=45 or any(len(s['joints'])!=61 for s in doc['skins']):raise RuntimeError('202_DELIVERY_BUDGET_OR61_45_CONTRACT')
 save('export-contract202.json',{'asset':str(OUTPUT.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'primitives':primitives,'vertices':vertices,'indices':indices,'clips':[a['name'] for a in doc['animations']],'status':'PRIVATE_SOURCE_UNADMITTED'})
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc(),'clock':CURRENT}
finally:
 save('source-operands202.json',requests);save('evaluated-pose202.json',evaluated);save('author-receipt202.json',{'writer':'CLOSED','error':error,'status':'FIRST_AUTHOR_FAILURE_STOP' if error else 'PRIVATE_SOURCE_EXPORT_UNADMITTED','records':len(records),'evaluated':len(evaluated),'protectedAfter':[{'path':p['path'],'match':hashlib.sha256((ROOT/p['path']).read_bytes()).hexdigest()==p['sha256']} for p in protected]})
if error:raise RuntimeError(error['message'])

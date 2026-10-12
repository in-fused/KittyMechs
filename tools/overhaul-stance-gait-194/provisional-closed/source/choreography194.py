"""194 authored gait/forearm counterbalance task owner. Armature-space goals; native contact unqualified.
Loaded into the isolated author namespace, never imported by the game.
"""
NATIVE_DISTANCE={'walk':.7777777777777777,'trot':1.3548387096774195,'gallop':2.4358974358974357,'upright':1.0625,'uprightFast':2.1533333333333333}
TABLE={'walk':(.72,{'FL':0,'FR':.5,'HL':.75,'HR':.25}),
 'trot':(.62,{'FL':0,'FR':.5,'HL':.54,'HR':.04}),
 'gallop':(.26,{'FL':.52,'FR':.45,'HL':.94,'HR':.87}),
 'upright':(.64,{'FL':.5,'FR':0,'HL':0,'HR':.5}),
 'uprightFast':(.64,{'FL':.5,'FR':0,'HL':0,'HR':.5})}

def root_visual_law121(mode,kind,phase,reference=False):
 """Declared SOURCE ARMATURE offset; independent of the returned pose matrices.
 Native carrier/hull/COM remains outside this visual-only law.
 """
 if not math.isfinite(phase) or not 0<=phase<=1:raise RuntimeError('121_INVALID_ROOT_LAW_PHASE')
 if mode=='gait':
  duty,offsets=TABLE[kind]
  supports={name:math.sin(math.pi*((phase+offset)%1)/duty)**2 if (phase+offset)%1<duty else 0 for name,offset in offsets.items()}
  if kind.startswith('upright'):supports['FL']=supports['FR']=0
  fore=(supports['FL']+supports['FR'])*.5;hind=(supports['HL']+supports['HR'])*.5
  lateral=(supports['HR']+supports['FR']-supports['HL']-supports['FL'])*.5
  offset=[.022*lateral,0,-.035*(fore+hind)+(.045 if kind=='gallop' else .012)*math.cos(4*math.pi*phase)]
 elif mode=='arc':
  if kind!='neutral-anatomical-task-transfer121':raise RuntimeError('121_INVALID_ROOT_ARC_KIND')
  if reference or phase<=.08 or phase>=.93:load=0
  else:x=(phase-.08)/(.93-.08);load=64*x**3*(1-x)**3
  offset=[0,0,0] # Arc cannot independently load/drop phase-owned hind support.
 else:raise RuntimeError('121_UNKNOWN_ROOT_LAW')
 return {'law':'VISUAL_ROOT_SOURCE_ARMATURE_OFFSET121','mode':mode,'kind':kind,'phase':phase,'reference':bool(reference),
  'armatureOffset':offset,'rotation':'EXACT_REST_3X3','scale':[1,1,1],'carrierAuthority':'UNCHANGED_NATIVE_CARRIER_ONCE'}

def at_origin(base,orientation):
 return trans(base.translation)@orientation

def task_rotation(name,pitch=0,roll=0,yaw=0):
 # Absolute armature task, NOT an extra rotation inherited from the parent.
 return rotation((0,0,1),yaw)@rotation((0,1,0),roll)@rotation((1,0,0),pitch)@REST[name].to_quaternion().to_matrix().to_4x4()

def level_gaze():
 # Actual muzzle axis from retained head rest, source anatomical forward -Y.
 b=RIG.data.bones['head'];axis=(b.tail_local-b.head_local).normalized()
 return axis.rotation_difference(Vector((0,-1,0))).to_matrix().to_4x4()@REST['head'].to_quaternion().to_matrix().to_4x4()

def ready_wrist(limb):
 # Map source claw-forward -Y and sole-up +Z to forward and inward palm.
 # A true wrist task independent of ground contact or the gait duty clock.
 side=-1 if limb=='FL' else 1
 forward=Vector((0,-1,0));normal=Vector((-side,0,0));right=normal.cross(forward).normalized()
 dest=Matrix(((right.x,-forward.x,normal.x),(right.y,-forward.y,normal.y),(right.z,-forward.z,normal.z))).to_4x4()
 return dest@REST[limb+'_paw'].to_quaternion().to_matrix().to_4x4()

def gallop_tasks(phase):
 # Explicit anatomical events: gather, hind propulsion, fore extension, load.
 # Values are ABSOLUTE pelvis/ribcage tasks, not cancelling local Euler sums.
 keys=[(0,.24,-.20),(.25,-.18,-.06),(.45,-.10,.19),(.64,.17,.07),(1,.24,-.20)]
 for a,b in zip(keys,keys[1:]):
  if a[0]<=phase<=b[0]:
   q=smoother((phase-a[0])/(b[0]-a[0]))
   return a[1]+(b[1]-a[1])*q,a[2]+(b[2]-a[2])*q
 raise RuntimeError('INVALID_GALLOP_TASK_PHASE')

def choreograph(kind,phase):
 up=kind.startswith('upright');gallop=kind=='gallop';duty,offsets=TABLE[kind]
 local={n:(phase+o)%1 for n,o in offsets.items()}
 support={n:math.sin(math.pi*p/duty)**2 if p<duty else 0 for n,p in local.items()}
 if up:support['FL']=support['FR']=0 # Fore gesture never implies planted support.
 fore=(support['FL']+support['FR'])*.5;hind=(support['HL']+support['HR'])*.5
 lateral=(support['HR']+support['FR']-support['HL']-support['FL'])*.5
 diagonal=(support['FL']+support['HR']-support['FR']-support['HL'])*.5
 if gallop:pelvisPitch,ribPitch=gallop_tasks(phase)
 elif up:
  # Load-bearing pelvis reacts to the actual alternating hind event; ribcage
  # counter-rotates around the arm recovery instead of a frozen guard.
  pelvisPitch=-.27-.055*(support['HL']+support['HR'])
  ribPitch=-1.10+.085*(support['HL']+support['HR'])
 else:pelvisPitch,ribPitch=-.085*(hind-fore),.11*(hind-fore)
 pelvicYaw=-.085*diagonal if not up else -.055*math.sin(2*math.pi*phase)
 ribYaw=(-pelvicYaw*.7 if not up else .12*math.sin(2*math.pi*phase))
 poses={};requests={};rootMotion=root_visual_law121('gait',kind,phase)
 for name in ('root','pelvis','spine','chest','head','launcher'):
  base=parent_base(name,poses)
  if name=='root':base=trans(rootMotion['armatureOffset'])@base
  if name=='pelvis':base=at_origin(base,task_rotation(name,pelvisPitch,.024*lateral,pelvicYaw))
  if name=='spine':base=at_origin(base,task_rotation(name,(pelvisPitch+ribPitch)*.5,-.012*lateral,(pelvicYaw+ribYaw)*.5))
  if name=='chest':base=at_origin(base,task_rotation(name,ribPitch,-.018*lateral,ribYaw))
  if name=='head':base=at_origin(base,rotation((0,0,1),ribYaw*.15)@level_gaze())
  poses[name]=base
 stride=NATIVE_DISTANCE[kind]*duty/.8
 for limb in ('FL','FR','HL','HR'):
  front=limb.startswith('F');side=-1 if limb.endswith('L') else 1
  upper=limb+'_upper';lower=limb+'_lower';paw=limb+'_paw'
  hip=parent_base(upper,poses).translation
  sweep,height,toe,intent=swing(phase+offsets[limb],duty,stride,.24 if gallop else .17 if up else .13)
  goal=REST[paw].translation+Vector((0,sweep,height))
  orientation=rotation((1,0,0),toe)@REST[paw].to_quaternion().to_matrix().to_4x4()
  if front and up:
   # Sternum task plus opposed fore reach/retract, rather than a hip-relative cup.
   beat=math.sin(2*math.pi*(phase+(0 if limb=='FL' else .5)))
   sternum=poses['chest'].translation
   # Forward is anatomical/world source -Y; shoulders remain original pivots.
   # A locomotor reach/retract loop: advance the hand while the opposite
   # hind loads; elbow folds below the shoulder on return. The hand is
   # independently unloaded, with wrist release through the return arc.
   return_arc=(1-math.cos(2*math.pi*(phase+(0 if limb=='FL' else .5))))*.5
   goal=sternum+Vector((side*(.42+.10*return_arc),-.23-.34*beat,-.23+.15*return_arc))
   orientation=rotation((1,0,0),-.42*return_arc)@rotation((0,0,1),side*.20*beat)@ready_wrist(limb)
   intent='unloaded-functional-fore-gesture'
  # Transport the source anatomical elbow plane with the current parent task.
  parent=RIG.data.bones[upper].parent.name
  delta=poses[parent]@REST[parent].inverted()
  pole=delta@RIG.data.bones[lower].head_local
  if front:
   knee=solve_two(hip,goal,RIG.data.bones[upper].length,RIG.data.bones[lower].length,pole,limb)
   poses[upper]=chain_bone(upper,hip,knee);poses[lower]=chain_bone(lower,knee,goal)
  else:
   hockName=limb+'_hock';d=RIG.data.bones[paw].head_local-RIG.data.bones[hockName].head_local
   if intent=='swing':d=rotation((1,0,0),-.18*math.sin(math.pi*(local[limb]-duty)/(1-duty))).to_3x3()@d
   hock=goal-d;knee=solve_two(hip,hock,RIG.data.bones[upper].length,RIG.data.bones[lower].length,pole,limb)
   poses[upper]=chain_bone(upper,hip,knee);poses[lower]=chain_bone(lower,knee,hock);poses[hockName]=chain_bone(hockName,hock,goal)
  poses[paw]=trans(goal)@orientation
  requests[limb]={'hip':list(hip),'ankle':list(goal),'intent':intent,'nativeContact':'UNQUALIFIED'}
 for b in RIG.data.bones:
  if b.name in poses:continue
  poses[b.name]=parent_base(b.name,poses)
  if b.name.startswith('tail_'):
   lag=int(b.name[-1])*.32
   poses[b.name]=poses[b.name]@rotation((1,0,0),.09*math.sin(2*math.pi*phase-lag) if gallop else -.03*math.cos(2*math.pi*phase-lag))@rotation((0,0,1),-.6*pelvicYaw)
  if '_digit_' in b.name or '_claw_' in b.name:
   limb=b.name[:2]
   curl=.06+.22*(1-math.cos(2*math.pi*(phase+(0 if limb=='FL' else .5))))*.5 if up and limb.startswith('F') else .10*math.sin(math.pi*(local[limb]-duty)/(1-duty))**2 if local[limb]>duty else 0
   poses[b.name]=poses[b.name]@rotation((1,0,0),curl)
 return poses,{'kind':kind,'phase':phase,'support':support,'requests':requests,'sourceDuty':duty,'sourceOffsets':offsets,'nativeDistancePerCycle':NATIVE_DISTANCE[kind],'axialTasks':{'pelvisAbsolutePitch':pelvisPitch,'ribcageAbsolutePitch':ribPitch},'rootMotion':rootMotion,'contactQualification':'AUTHORED_FOOTFALL_ONLY'}

def transition_arc(u,reference=False):
 # Neutral-endpoint additive transfer. Actual live stance tasks own the gait.
 poses={};rootMotion=root_visual_law121('arc','neutral-anatomical-task-transfer121',u,reference)
 def stage(a,b):
  if reference or u<=a or u>=b:return 0
  x=(u-a)/(b-a);return 64*x**3*(1-x)**3
 pelvis=0;rib=-.075*stage(.30,.93) # Hind load remains owned by live gait tasks.
 for b in RIG.data.bones:
  base=parent_base(b.name,poses)
  if b.name=='root':base=trans(rootMotion['armatureOffset'])@base
  if b.name in ('pelvis','spine','chest'):
   pitch={'pelvis':pelvis,'spine':(pelvis+rib)*.5,'chest':rib}[b.name]
   base=at_origin(base,task_rotation(b.name,pitch))
  if b.name=='head':base=at_origin(base,REST['head'].to_quaternion().to_matrix().to_4x4())
  if b.name.startswith('tail_'):base=base@rotation((1,0,0),-.04*stage(.16,.92))
  # Wrist unlock precedes torso transfer, then fingers reopen and return to
  # neutral at both arc endpoints. This is an unloaded additive task, not a
  # hidden planted forepaw or a replacement of the live hind gait.
  if b.name in ('FL_paw','FR_paw'):base=base@rotation((1,0,0),-.24*stage(.10,.62))
  if b.name.startswith(('FL_digit_','FR_digit_')):base=base@rotation((1,0,0),-.16*stage(.12,.72))
  poses[b.name]=base
 return poses,{'kind':'neutral-anatomical-task-transfer121','fraction':u,'reference':reference,'rootMotion':rootMotion,'nativeContact':'UNQUALIFIED'}

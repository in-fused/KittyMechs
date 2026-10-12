"""One authorized fixed-rig motion revision; no runtime or original packet writes."""
import bpy, json, math, pathlib, hashlib, traceback, ast, struct, copy
from mathutils import Matrix, Vector, Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2]
HERE=ROOT/'assets/source/overhaul-feline-animation-264'
SCRATCH=ROOT/'.sites-runtime/shader-startup-238/animation264'
MASTER=ROOT/'assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend'
BASE=ROOT/'tools/overhaul-pack-221/output/Pounce_Anatomy221.glb'
NAMES={'FelineWalk':'walk','FelineTrot':'trot','FelineGallop':'gallop','FelineUprightWalkLong':'upright','FelineUprightStride':'uprightFast'}
sys_path=ROOT/'assets/source/overhaul-anatomy-motion-202'
import sys
sys.path.insert(0,str(sys_path))
from choreography202 import TABLE202,NATIVE_DISTANCE202
rows=[];error=None;keyOperands=[]
def dump(name,value): (HERE/name).write_text(json.dumps(value,indent=2,allow_nan=False))
def digest(a): return hashlib.sha256(repr([(c.data_path,c.array_index,[(list(k.co),list(k.handle_left),list(k.handle_right),k.interpolation,k.easing) for k in c.keyframe_points]) for c in a.fcurves]).encode()).hexdigest()
def profile(): return {b.name:{'parent':b.parent.name if b.parent else None,'matrix':[list(r) for r in b.matrix_local],'length':b.length} for b in RIG.data.bones}
def bind(a):
 RIG.animation_data.action=a
 slots=[s for s in a.slots if s.target_id_type=='OBJECT']
 if len(slots)==1:RIG.animation_data.action_slot=slots[0]
 elif not a.is_action_legacy and not a.is_empty:raise RuntimeError('AMBIGUOUS_ACTION_SLOT:'+a.name)
def frame(f): bpy.context.scene.frame_set(int(f),subframe=f-int(f));bpy.context.view_layer.update()
def capture(): return {b.name:b.matrix_basis.copy() for b in RIG.pose.bones}
def world(): return {b.name:b.matrix.copy() for b in RIG.pose.bones}
def local_to_world(local):
 out={}
 for b in RIG.data.bones:
  base=out[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local
  out[b.name]=base@local[b.name]
 return out
def pivot(m,axis,angle):return Matrix.Translation(m.translation)@Quaternion(Vector(axis),angle).to_matrix().to_4x4()@Matrix.Translation(-m.translation)@m
def source(a,f):bind(a);frame(f);return capture(),world()
def key(a,f,desired):
 bind(a);frame(f)
 operand={'action':a.name,'requestedFrame':f,'actualSceneFrame':bpy.context.scene.frame_current_final,'evaluatedResidual':None}
 keyOperands.append(operand)
 for b in RIG.data.bones:
  base=desired[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local
  local=base.inverted()@desired[b.name]
  if (b.name!='root' and local.translation.length>2e-5) or max(abs(x-1) for x in local.to_scale())>2e-5:
   operand.update({'bone':b.name,'desiredBasis':[list(r) for r in local],'desiredMatrix':[list(r) for r in desired[b.name]],'evaluatedMatrix':[list(r) for r in RIG.pose.bones[b.name].matrix],'translation':list(local.translation),'scale':list(local.to_scale())});raise RuntimeError('FIXED_BASIS:'+b.name)
  p=RIG.pose.bones[b.name];p.rotation_mode='QUATERNION';p.matrix_basis=local
  p.keyframe_insert('rotation_quaternion',frame=f,group=b.name)
  # Preserve original root position animation rather than synthesizing contact.
  if b.name=='root':p.keyframe_insert('location',frame=f,group=b.name)
 bpy.context.view_layer.update()
 worst,n,i,j=max((abs(RIG.pose.bones[n].matrix[i][j]-m[i][j]),n,i,j) for n,m in desired.items() for i in range(4) for j in range(4));operand['evaluatedResidual']=worst
 if worst>2e-5:
  actual=RIG.pose.bones[n].matrix;operand.update({'bone':n,'matrixCell':[i,j],'desiredMatrix':[list(r) for r in desired[n]],'evaluatedMatrix':[list(r) for r in actual],'desiredWorldQuaternion':list(desired[n].to_quaternion()),'evaluatedWorldQuaternion':list(actual.to_quaternion()),'actualSceneFrameAfter':bpy.context.scene.frame_current_final,'actualAction':RIG.animation_data.action.name});raise RuntimeError('EVALUATED_POSE_REPLAY')
 return {b.name:list(b.rotation_quaternion) for b in RIG.pose.bones},worst
def ordinary(a,f,kind,phi):
 local,old=source(a,f);p=2*math.pi*phi;upright=kind.startswith('upright');gallop=kind=='gallop'
 # Paired axial flexion, yaw and roll transfer load without root/body offsets.
 # Gait event clocks/duty/distances remain the authoritative source202 contract.
 lateral=.045*math.sin(p) if not gallop else .025*math.sin(p)
 axial={'pelvis':(-.075*math.cos(p) if gallop else .035*math.cos(2*p)),
        'lumbar202':(.105*math.cos(p+.35) if gallop else .065*math.sin(p)),
        'spine':(-.025*math.cos(p) if gallop else -.035*math.sin(p)),
        'thorax202':(-.11*math.cos(p-.45) if gallop else -.07*math.sin(p+.35)),
        'chest':(.055*math.cos(p-.45) if gallop else .035*math.sin(p+.35))}
 for name,angle in axial.items():
  rest=RIG.data.bones[name].matrix_local.to_3x3();axis=rest.inverted()@Vector((1,0,0));local[name]=local[name]@Quaternion(axis,angle).to_matrix().to_4x4()
 for name,sign in [('pelvis',1),('chest',-.7)]:
  rest=RIG.data.bones[name].matrix_local.to_3x3();local[name]=local[name]@Quaternion(rest.inverted()@Vector((0,0,1)),sign*lateral).to_matrix().to_4x4()
 for limb in ('FL','FR'):
  n=limb+'_scapula202';side=-1 if limb=='FL' else 1;q=(phi-TABLE202[kind][1]['HL']+TABLE202[kind][1][limb])%1
  rest=RIG.data.bones[n].matrix_local.to_3x3();local[n]=local[n]@Quaternion(rest.inverted()@Vector((1,0,0)),(.15 if upright else .13)*math.cos(2*math.pi*q)).to_matrix().to_4x4()
 desired=local_to_world(local)
 for limb in ('FL','FR','HL','HR'):
  fore=limb.startswith('F');side=-1 if limb.endswith('L') else 1;u,l,paw=limb+'_upper',limb+'_lower',limb+'_paw';hip=parent_base(u,desired).translation
  if upright and fore:
   # Flexed active counterbalance: a low outboard elbow and high forward wrist.
   swing=math.sin(p+(0 if limb=='FL' else math.pi));upper=Vector((side*(.33+.03*math.cos(p)), -.34-.18*swing,-.72+.10*swing)).normalized()
   lower=Vector((side*.19,-.77+.13*swing,.60+.18*swing)).normalized()
   knee=hip+upper*RIG.data.bones[u].length;goal=knee+lower*RIG.data.bones[l].length
   desired[u]=chain_bone(u,hip,knee);desired[l]=chain_bone(l,knee,goal)
   orient=pivot(old[paw],(1,0,0),.20*swing).to_quaternion().to_matrix().to_4x4()
  else:
   goal=old[paw].translation.copy();q=(phi-TABLE202[kind][1]['HL']+TABLE202[kind][1][limb])%1
   goal.y+=(.09 if fore else .06)*math.sin(2*math.pi*q)
   third=Vector((0,0,0)) if fore else old[paw].translation-old[limb+'_hock'].translation
   end=goal-third;pole=old[l].translation+(hip-old[u].translation)+Vector((side*.035,0,0))
   knee=solve_two(hip,end,RIG.data.bones[u].length,RIG.data.bones[l].length,pole,limb)
   desired[u]=chain_bone(u,hip,knee);desired[l]=chain_bone(l,knee,end)
   if not fore:desired[limb+'_hock']=chain_bone(limb+'_hock',end,goal)
   recovery=max(0,math.sin(math.pi*max(0,(q-TABLE202[kind][0])/(1-TABLE202[kind][0]))))
   orient=pivot(old[paw],(1,0,0),-.22*recovery).to_quaternion().to_matrix().to_4x4()
  desired[paw]=Matrix.Translation(goal)@orient
  for b in RIG.data.bones:
   if b.name.startswith(limb+'_') and b.name not in (u,l,paw,limb+'_hock',limb+'_scapula202'):
    desired[b.name]=parent_base(b.name,desired)@local[b.name]
 # Head aim remains source world aim despite the active trunk; tail remains source.
 desired['head']=Matrix.Translation(parent_base('head',desired).translation)@old['head'].to_quaternion().to_matrix().to_4x4()
 for b in RIG.data.bones:
  if b.name not in ('head',) and b.parent and b.parent.name=='head':desired[b.name]=parent_base(b.name,desired)@local[b.name]
 return desired
def read_glb(path):
 data=path.read_bytes();jlen=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+jlen]),data[28+jlen:]
def accessor(doc,bin,index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];assert a['componentType']==5126 and not v.get('byteStride');start=v.get('byteOffset',0)+a.get('byteOffset',0);return bin[start:start+a['count']*n*4]
try:
 if hashlib.sha256(MASTER.read_bytes()).hexdigest()!='7f83683dc332e6075c1965ed4d393ae1a4be72d747c92771fc5cff0fffa55857':raise RuntimeError('SEALED_SOURCE_CHANGED')
 bpy.ops.wm.open_mainfile(filepath=str(MASTER));RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');RIG.animation_data.action=None
 for t in RIG.animation_data.nla_tracks:t.mute=True
 before=profile();assert len(before)==61
 originals={a.name:a for a in bpy.data.actions};assert len(originals)==45
 retained={n:digest(a) for n,a in originals.items() if n not in NAMES and n!='FelineTransitionArc106'};assert len(retained)==39
 txt=(ROOT/'assets/source/overhaul-pounce-identity57-animation-source-004/author.py').read_text();tree=ast.parse(txt)
 exec('\n'.join(ast.get_source_segment(txt,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('trans','chain_bone','solve_two','parent_base')))
 records=json.loads((sys_path/'authored-motion-records202.json').read_text());byname={r['name']:r for r in records};samples={};newactions={}
 for name,kind in NAMES.items():
  src=originals[name];src.name='264_PRIVATE_SOURCE_'+name;new=bpy.data.actions.new(name);new.use_fake_user=True;newactions[name]=new;first,last=byname[name]['frames'];samples[name]=[]
  for i in range(33):
   raw=i/32;f=first+raw*(last-first);phi=(raw+TABLE202[kind][1]['HL'])%1;desired=ordinary(src,f,kind,phi);qs,residual=key(new,f,desired);samples[name].append({'frame':f,'seconds':f/60,'q':qs,'residual':residual})
  for c in new.fcurves:
   for k in c.keyframe_points:k.interpolation='LINEAR'
  a=samples[name][0]['q'];z=samples[name][-1]['q'];closure=max(min(max(abs(x-y) for x,y in zip(a[n],z[n])),max(abs(x+y) for x,y in zip(a[n],z[n]))) for n in a)
  if closure>2e-5:raise RuntimeError('CYCLE_CLOSURE:'+name)
  rows.append({'name':name,'samples':33,'closure':closure,'sourceRecord':byname[name],'owner':'264_FIXED_RIG_QUATERNION_CHOREOGRAPHY'})
 # Separate directional preparation is sampled by a future ordinary owner.
 # It does not replace native locomotion or commit loaded support.
 quad=source(newactions['FelineTrot'],byname['FelineTrot']['frames'][0])[0];up=source(newactions['FelineUprightWalkLong'],byname['FelineUprightWalkLong']['frames'][0])[0]
 for direction in ('Up','Down'):
  name='FelinePrepare'+direction+'264';a=bpy.data.actions.new(name);a.use_fake_user=True;newactions[name]=a;samples[name]=[]
  for i in range(25):
   u=i/24;f=1+u*48;local={}
   # Down: reach/open wrist while torso holds, then hinge and settle fore load.
   # Up: shift pelvis and flex forelimbs before the chest rises.
   body=max(0,min(1,(u-.28)/.72));body=body*body*(3-2*body);stance=body if direction=='Up' else 1-body
   fore=max(0,min(1,u/.62));fore=fore*fore*(3-2*fore);forestance=fore if direction=='Up' else 1-fore
   for b in RIG.data.bones:
    weight=forestance if b.name.startswith(('FL_','FR_')) else stance
    p1,q1,s1=quad[b.name].decompose();p2,q2,s2=up[b.name].decompose();local[b.name]=Matrix.LocRotScale(p1,q1.slerp(q2,weight),s1)
   # A pre-load shoulder roll transfers to flexing elbows before torso descent.
   for limb in ('FL','FR'):
    n=limb+'_scapula202';axis=RIG.data.bones[n].matrix_local.to_3x3().inverted()@Vector((1,0,0));local[n]=local[n]@Quaternion(axis,-.13*math.sin(math.pi*u)).to_matrix().to_4x4()
   qs,residual=key(a,f,local_to_world(local));samples[name].append({'frame':f,'seconds':f/60,'q':qs,'residual':residual})
  for c in a.fcurves:
   for k in c.keyframe_points:k.interpolation='LINEAR'
  rows.append({'name':name,'samples':25,'sourceOnly':True,'requiresDirectionAwareOrdinaryConsumer':True})
 for name in NAMES:bpy.data.actions.remove(originals[name],do_unlink=True)
 if profile()!=before or any(digest(bpy.data.actions[n])!=h for n,h in retained.items()):raise RuntimeError('RIG_OR_COMPLETE39_CHANGED')
 # Save real editable source actions; all original39 still exist byte-for-value.
 RIG.animation_data.action=None
 for b in RIG.pose.bones:b.matrix_basis=Matrix.Identity(4)
 bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_Feline264.blend'))
 # Preserve actual221 complete39 and entire binary prefix. Append ONLY new
 # quaternion accessors, retaining exact221 geometry, rest, translation/scales.
 doc,bin=read_glb(BASE);base_doc=copy.deepcopy(doc);parts=[bin];cursor=len(bin);node={n.get('name'):i for i,n in enumerate(doc['nodes'])};restq={n:Quaternion((doc['nodes'][node[n]].get('rotation',[0,0,0,1])[3],*doc['nodes'][node[n]].get('rotation',[0,0,0,1])[:3])) for n in before}
 def append(values,kind,count):
  global cursor
  data=struct.pack('<'+'f'*len(values),*values);pad=(-cursor)%4
  if pad:parts.append(bytes(pad));cursor+=pad
  v=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':cursor,'byteLength':len(data)});parts.append(data);cursor+=len(data);idx=len(doc['accessors']);doc['accessors'].append({'bufferView':v,'componentType':5126,'count':count,'type':kind});return idx
 for name,poses in samples.items():
  if name in NAMES:
   animation=next(a for a in doc['animations'] if a['name']==name);animation['channels']=[c for c in animation['channels'] if c['target']['path']!='rotation']
  else:animation={'name':name,'samplers':[],'channels':[]};doc['animations'].append(animation)
  clock=append([p['seconds'] for p in poses],'SCALAR',len(poses));doc['accessors'][clock]['min']=[poses[0]['seconds']];doc['accessors'][clock]['max']=[poses[-1]['seconds']]
  for bone in before:
   values=[];previous=None
   for p in poses:
    q=restq[bone]@Quaternion(p['q'][bone]);q.normalize()
    if previous is not None and previous.dot(q)<0:q.negate()
    previous=q.copy();values.extend([q.x,q.y,q.z,q.w])
   out=append(values,'VEC4',len(poses));si=len(animation['samplers']);animation['samplers'].append({'input':clock,'output':out,'interpolation':'LINEAR'});animation['channels'].append({'sampler':si,'target':{'node':node[bone],'path':'rotation'}})
 newbin=b''.join(parts);newbin+=bytes((-len(newbin))%4);doc['buffers'][0]['byteLength']=len(newbin)
 preserved=[a for a in base_doc['animations'] if a['name'] not in NAMES and a['name']!='FelineTransitionArc106']
 if len(preserved)!=39 or any(next(x for x in doc['animations'] if x['name']==a['name'])!=a for a in preserved) or newbin[:len(bin)]!=bin:raise RuntimeError('ACTUAL221_COMPLETE39_BYTE_RETENTION')
 for k in base_doc:
  if k not in ('animations','buffers','bufferViews','accessors') and doc[k]!=base_doc[k]:raise RuntimeError('NON_ANIMATION_JSON_CHANGED:'+k)
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);out=struct.pack('<IIIII',0x46546c67,2,28+len(j)+len(newbin),len(j),0x4e4f534a)+j+struct.pack('<II',len(newbin),0x004e4942)+newbin
 path=HERE/'Pounce_Feline264.glb';path.write_bytes(out)
 dump('motion-contract264.json',{'writer':'CLOSED','source202DoesNotContain209InterpolationChange':True,'exportBase':str(BASE.relative_to(ROOT)),'exportBaseSHA':hashlib.sha256(BASE.read_bytes()).hexdigest(),'complete39CurveHashes':retained,'actual221Complete39JSONAndBinaryValuesPreserved':True,'rig':before,'records':rows,'clips':len(doc['animations']),'source202OriginalRigMeshUnchanged':True,'contactQualified':False,'qualityApproved':False,'publicApproved':False,'exportSHA':hashlib.sha256(out).hexdigest()})
 dump('samples264.json',samples)
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
finally:dump('author-receipt264.json',{'writer':'CLOSED','error':error,'records':rows,'keyOperands':keyOperands,'contactQualified':False,'qualityApproved':False,'publicApproved':False})
if error:raise RuntimeError(error['message'])

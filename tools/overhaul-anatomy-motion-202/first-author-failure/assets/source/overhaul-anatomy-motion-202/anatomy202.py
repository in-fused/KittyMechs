"""202 STATIC PREP. Importable source functions; no scene/job entry point.
Only caller-approved NEW master may invoke install_anatomy202.
"""
import math,json,pathlib
from mathutils import Vector,Matrix
BASIS202=json.loads((pathlib.Path(__file__).with_name('anatomical-basis202.json')).read_text(encoding='utf8'))
ADDED202=('lumbar202','thorax202','FL_scapula202','FR_scapula202')
AXIAL202=('pelvis','lumbar202','spine','thorax202','chest')

def side202(limb):return BASIS202['side'][limb]
def bone_record202(rig):
 return {b.name:{'parent':b.parent.name if b.parent else None,'matrix':[list(r) for r in b.matrix_local],'head':list(b.head_local),'tail':list(b.tail_local),'length':b.length} for b in rig.data.bones}

def install_anatomy202(rig,emit):
 import bpy
 before=bone_record202(rig)
 if len(before)!=57 or any(n in before for n in ADDED202):raise RuntimeError('202_EXPECT_RETAINED57_NEW_DESTINATION')
 limbLengths={n:r['length'] for n,r in before.items() if n.startswith(('FL_','FR_','HL_','HR_'))}
 bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT');bones=rig.data.edit_bones
 for proximal,distal,newName in [('pelvis','spine','lumbar202'),('spine','chest','thorax202')]:
  a,b=bones[proximal],bones[distal];originalTail=a.tail.copy();mid=a.head.lerp(b.head,.5)
  row={'operation':'split-axial-span','proximal':proximal,'distal':distal,'new':newName,'start':list(a.head),'mid':list(mid),'end':list(b.head),'oldTail':list(originalTail)};emit(row)
  if (originalTail-b.head).length>2e-5:raise RuntimeError('202_AXIAL_SPAN_NOT_CONTIGUOUS')
  new=bones.new(newName);new.head=mid;new.tail=b.head;new.roll=a.roll;new.parent=a;new.use_connect=True;a.tail=mid;b.parent=new;b.use_connect=True
 for limb in ('FL','FR'):
  upper=bones[limb+'_upper'];chest=bones['chest'];shoulder=upper.head.copy();attachment=shoulder-chest.head
  # Pivot lies on the retained rib envelope, behind the shoulder, rather than
  # rotating an upper-arm-only joint in place. All coordinates derived from rest.
  pivot=chest.head.lerp(shoulder,.5)-Vector(BASIS202['forward'])*attachment.length*.25
  name=limb+'_scapula202';emit({'operation':'scapular-carrier','name':name,'proximal':list(pivot),'distalOldShoulder':list(shoulder),'oldParent':upper.parent.name,'length':(shoulder-pivot).length,'sourceSide':side202(limb)})
  new=bones.new(name);new.head=pivot;new.tail=shoulder;new.roll=upper.roll;new.parent=chest;upper.parent=new;upper.use_connect=True
 bpy.ops.object.mode_set(mode='OBJECT');after=bone_record202(rig);emit({'operation':'anatomy-rest-before-guard','before':before,'after':after})
 if len(after)!=61 or set(after)-set(before)!=set(ADDED202):raise RuntimeError('202_EXACT61_DECLARED_BONE_BUDGET')
 for name,old in before.items():
  # Old world-rest heads/orientations remain. Axial edit-bone display lengths
  # change intentionally; limb segment lengths and source joint frames do not.
  residual=max(abs(old['matrix'][i][j]-after[name]['matrix'][i][j]) for i in range(4) for j in range(4))
  if residual>2e-5:raise RuntimeError('202_OLD_WORLD_REST_FRAME_CHANGED:'+name)
 for name,length in limbLengths.items():
  if abs(after[name]['length']-length)>2e-5:raise RuntimeError('202_FIXED_LIMB_LENGTH_CHANGED:'+name)
 return before,after

def retarget_complete_world_pose202(oldPose,oldRest,newRest,emit):
 """Old semantic action world poses remain the goal, not copied local curves.
 New carriers follow their old proximal owner; new local channels are derived
 by the single pose writer and checked/replayed against these world operands.
 """
 if set(oldPose)!=set(oldRest) or set(newRest)-set(oldRest)!=set(ADDED202):raise RuntimeError('202_RETARGET_TOPOLOGY')
 desired={n:m.copy() for n,m in oldPose.items()}
 for name,proximal in [('lumbar202','pelvis'),('thorax202','spine'),('FL_scapula202','chest'),('FR_scapula202','chest')]:desired[name]=oldPose[proximal]@oldRest[proximal].inverted()@newRest[name]
 emit({'operation':'retarget-request-before-evaluation','requestedOldWorld':{n:[list(r) for r in m] for n,m in oldPose.items()},'requestedNewWorld':{n:[list(r) for r in m] for n,m in desired.items()}})
 return desired

def ipsilateral_elbow_pole202(limb,hip,upperLength,bodyFrame):
 # One SOURCE side convention for author/Idle/R. Caller transports directions
 # through the source-body frame, never applies a world-X sign independently.
 lateral=bodyFrame.to_3x3()@Vector(BASIS202['lateral']);lateral.normalize()
 up=bodyFrame.to_3x3()@Vector(BASIS202['up']);up.normalize()
 return hip+lateral*(side202(limb)*upperLength*.75)-up*(upperLength*.5)

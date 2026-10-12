"""202 phase/task STATIC RECIPE, no entry point or independent additive Arc.
Explicit gait event sequence is CALLED by pose_tasks202, not a dead helper.
"""
import math
from mathutils import Vector
from anatomy202 import BASIS202,AXIAL202,side202
NATIVE_DISTANCE202={'walk':.7777777777777777,'trot':1.3548387096774195,'gallop':2.4358974358974357,'upright':1.0625,'uprightFast':2.1533333333333333}
TABLE202={'walk':(.72,{'FL':0,'FR':.5,'HL':.75,'HR':.25}),'trot':(.62,{'FL':0,'FR':.5,'HL':.54,'HR':.04}),'gallop':(.26,{'FL':.52,'FR':.45,'HL':.94,'HR':.87}),'upright':(.64,{'FL':.5,'FR':0,'HL':0,'HR':.5}),'uprightFast':(.64,{'FL':.5,'FR':0,'HL':0,'HR':.5})}
# These are NEW anatomical shapes (fixed-segment projected chord ratios),
# not coefficients pasted onto retained57 Euler curves. No segment is scaled.
SHAPES202={'gather':{'lumbarChord':.88,'thoraxChord':.93,'lumbarBend':1,'thoraxBend':-1},'hind-propulsion':{'lumbarChord':.99,'thoraxChord':.985,'lumbarBend':1,'thoraxBend':-1},'fore-reaching':{'lumbarChord':.995,'thoraxChord':.995,'lumbarBend':1,'thoraxBend':-1},'fore-load-absorption':{'lumbarChord':.95,'thoraxChord':.90,'lumbarBend':1,'thoraxBend':-1}}
def smooth202(x):return x*x*x*(10+x*(-15+6*x))
def source_events202(kind):
 duty,offsets=TABLE202[kind];touch={n:(offsets['HL']-offsets[n])%1 for n in offsets};release={n:(p+duty)%1 for n,p in touch.items()}
 return {'touch':touch,'release':release,'duty':duty,'offsets':offsets,'nativeDistancePerCycle':NATIVE_DISTANCE202[kind],'clock':'canonical171 HL touch phase; all positive contributors preserved'}
def gallop_sequence202(phase):
 events=source_events202('gallop');p=phase%1;hindEnd=max(events['release'][n] for n in ('HL','HR'));foreStart=min(events['touch'][n] for n in ('FL','FR'));foreEnd=max(events['release'][n] for n in ('FL','FR'))
 keys=[(0,'gather'),(hindEnd,'hind-propulsion'),(foreStart,'fore-reaching'),(foreEnd,'fore-load-absorption'),(1,'gather')]
 for a,b in zip(keys,keys[1:]):
  if a[0]<=p<=b[0]:
   u=smooth202((p-a[0])/(b[0]-a[0]));shape={n:SHAPES202[a[1]][n]*(1-u)+SHAPES202[b[1]][n]*u for n in SHAPES202[a[1]]};return {'from':a[1],'to':b[1],'u':u,'shape':shape,'events':events,'phase':p,'keyBoundaries':keys}
 raise RuntimeError('202_CALLED_GALLOP_SEQUENCE_OUTSIDE_PHASE')
def fixed_pair202(start,axis,normal,l1,l2,chordRatio,limb,emit):
 chord=(l1+l2)*chordRatio;minimum=abs(l1-l2)+1e-6;maximum=l1+l2-1e-6;request={'task':limb,'start':list(start),'axis':list(axis),'normal':list(normal),'l1':l1,'l2':l2,'chord':chord,'minimum':minimum,'maximum':maximum};emit(request)
 if not minimum<chord<maximum:raise RuntimeError('202_AXIAL_TASK_UNREACHABLE')
 along=(l1*l1-l2*l2+chord*chord)/(2*chord);rise2=l1*l1-along*along
 if rise2<=0:raise RuntimeError('202_AXIAL_NO_CURVATURE')
 return start+axis*along+normal*math.sqrt(rise2),start+axis*chord

def pose_tasks202(kind,canonicalPhase,stance,rest,emit,poseFrame,foreFrames=None):
 """SOLE ordinary owner entry: calls event sequence before axial/limb tasks.
 Author/compiler will consume these goals once, then source-plane calibrate
 actual complete pads and verify fixed chains. No whole-pose Arc overlay.
 """
 events=source_events202(kind);event=gallop_sequence202(canonicalPhase) if kind=='gallop' else {'events':events,'phase':canonicalPhase%1,'shape':None,'from':'alternating-load','to':'alternating-recovery'}
 roles={n:'unloaded' if kind.startswith('upright') and n.startswith('F') else 'stance' if (canonicalPhase-events['offsets']['HL']+o)%1<events['duty'] else 'recovery' for n,o in events['offsets'].items()}
 # Keep phase/load operands even before any future solver request can reject.
 task={'kind':kind,'canonicalPhase':canonicalPhase,'stance':stance,'event':event,'roles':roles,'anatomicalBasis':BASIS202,'contactQualified':False,'fixedRestLengthGoals':{},'sourceOnly':True};emit(task)
 # Record ACTUAL posed pelvis/chest/stance basis before requesting hinges.
 sourceFrame={'pelvis':[list(r) for r in poseFrame['pelvis']], 'chest':[list(r) for r in poseFrame['chest']], 'body':[list(r) for r in poseFrame['body']], 'stance':stance};task['sourceFrame']=sourceFrame;emit({'stage':'actual-source-frame-before-axial-solve','frame':sourceFrame,'event':event})
 if kind=='gallop':shape=event['shape']
 else:
  q=canonicalPhase%1;load=math.sin(2*math.pi*q)**2
  # New split-pair geometry carries gait load; original posed body axis supplies
  # upright posture. No unrotated-rest spine task or extra root translation.
  shape={'lumbarChord':.98-.02*load,'thoraxChord':.98-.018*(1-load)} if kind.startswith('upright') else {'lumbarChord':.988-.008*load,'thoraxChord':.988-.008*(1-load)}
 start=poseFrame['pelvis'].translation.copy();chord=poseFrame['chest'].translation-start
 restAxis=(rest['chest'].translation-rest['pelvis'].translation).normalized();restNormal=Vector(BASIS202['up']);restNormal-=restAxis*restNormal.dot(restAxis)
 # Transport the declared dorsal hemisphere by the ACTUAL posed pelvis
 # deformation. Upright root-up is not a hinge normal: it can be axial.
 deformation=poseFrame['pelvis'].to_3x3()@rest['pelvis'].to_3x3().inverted();transported=deformation@restNormal;axis=chord.normalized();normal=transported-axis*transported.dot(axis)
 emit({'stage':'posed-hinge-normal-before-guard','chordLength':chord.length,'restAxis':list(restAxis),'restNormal':list(restNormal),'transportedNormal':list(transported),'projectedNormal':list(normal),'projectionNorm':normal.length,'deformation':[list(r) for r in deformation]})
 if chord.length<1e-8 or restNormal.length<1e-8 or normal.length<1e-8:raise RuntimeError('202_AXIAL_POSED_FRAME_DEGENERATE')
 normal.normalize();l=[(rest[b].translation-rest[a].translation).length for a,b in zip(AXIAL202,AXIAL202[1:])]
 lumbar,spine=fixed_pair202(start,axis,normal,l[0],l[1],shape['lumbarChord'],'lumbar',emit);thorax,chest=fixed_pair202(spine,axis,-normal,l[2],l[3],shape['thoraxChord'],'thorax',emit)
 task['fixedRestLengthGoals']={n:list(p) for n,p in zip(AXIAL202,[start,lumbar,spine,thorax,chest])}
 if foreFrames is not None and (kind.startswith('upright') or stance>0):task['fore']={limb:fore_gesture202(limb,canonicalPhase,**foreFrames[limb],emit=emit) for limb in ('FL','FR')}
 return task


def fore_gesture202(limb,canonicalPhase,hip,upperLength,lowerLength,bodyFrame,emit):
 """Two actual fixed segments define elbow AND wrist. Endpoint alone cannot
 select the wrong quad-derived elbow branch. Source hemisphere is declared.
 """
 phase=2*math.pi*(canonicalPhase+(0 if limb=='FL' else .5))
 reach=(1-math.cos(phase))*.5
 lateral=(bodyFrame.to_3x3()@Vector(BASIS202['lateral'])).normalized()*side202(limb)
 forward=(bodyFrame.to_3x3()@Vector(BASIS202['forward'])).normalized()
 up=(bodyFrame.to_3x3()@Vector(BASIS202['up'])).normalized()
 lateralFraction=.25;forwardFraction=.25+.25*reach;down=math.sqrt(1-lateralFraction*lateralFraction-forwardFraction*forwardFraction)
 elbow=hip+(lateral*lateralFraction+forward*forwardFraction-up*down)*upperLength
 # Wrist returns forward/up from a LOW ipsilateral elbow, never routes through
 # sternum/face. Full jaw/armor bounds still need actual primary skin validation.
 foreDirection=(forward*(.45+.25*reach)+up*(.35-.15*reach)+lateral*.12).normalized()
 wrist=elbow+foreDirection*lowerLength
 task={'limb':limb,'phase':canonicalPhase,'reachRetract':reach,'hip':list(hip),'elbow':list(elbow),'wrist':list(wrist),'sourceSide':side202(limb),'upperLength':upperLength,'lowerLength':lowerLength,'owner':'202_SOURCE_ELBOW_AND_WRIST_TASK','nativeContact':False};emit(task)
 return task


def scapular_angle202(kind,canonicalPhase,limb):
 events=source_events202(kind);q=(canonicalPhase-events['offsets']['HL']+events['offsets'][limb])%1
 # Protraction peaks BEFORE source fore touch; retraction during source loading.
 return .22*math.sin(2*math.pi*(q+.25))

"""Local editable Pounce successor; run with Blender --background --python this file.
Original masters are read-only. No external imagery, services, or downloaded content.
"""
import bpy, math, json, hashlib, importlib.util
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/overhaul-pounce-v1'
OUT = ROOT / 'public/assets/overhaul/pounce-v1'
SOURCE.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
MASTER = ROOT / 'assets/source/pounce-art-v1/Pounce_Quadruped.art-v1.blend'
LEGACY = ROOT / 'public/assets/models/Pounce_Quadruped.glb'
hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [MASTER, LEGACY]}
spec = importlib.util.spec_from_file_location('feline_helpers', ROOT/'tools/build_feline_mech.py')
helper = importlib.util.module_from_spec(spec); spec.loader.exec_module(helper)
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for obj in list(bpy.data.objects):
    if obj != rig: bpy.data.objects.remove(obj, do_unlink=True)
rig.name = 'Pounce_Overhaul_Rig'; rig.data.name = 'Pounce_Overhaul_Skeleton'
rig.animation_data.action = None; helper.reset(rig)
parts=[]; mats={}
def material(name, color, metal=.75, rough=.32, glow=0):
    m=bpy.data.materials.new('POV1_'+name); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Metallic'].default_value=metal
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Emission Color'].default_value=(*color,1)
    bs.inputs['Emission Strength'].default_value=glow; mats[name]=m
material('Armor',(.050,.095,.105),.50,.38)
material('Edge',(.30,.40,.39),.70,.35)
material('Mechanism',(.055,.075,.085),.86,.28)
material('Rubber',(.017,.025,.029),.08,.63)
material('Copper',(.75,.31,.065),.78,.31)
material('Optic',(.03,.8,.72),.35,.23,2)
material('Canopy',(.085,.30,.28),.52,.12)
material('Pilot',(.72,.38,.12),.05,.65)

def bind(obj,bone,mat):
    obj.data.materials.append(mats[mat]); obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    obj.vertex_groups.new(name='part:'+obj.name).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    parts.append(obj); return obj
def mesh(name,verts,faces,bone,mat,smooth=True):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o)
    for p in data.polygons:p.use_smooth=smooth
    return bind(o,bone,mat)
def ell(name,p,size,bone,mat,segments=20,rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=p)
    o=bpy.context.object; o.name=name; o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for f in o.data.polygons:f.use_smooth=True
    return bind(o,bone,mat)
def tube(name,points,r,bone,mat,n=10):
    pts=[Vector(p) for p in points]; verts=[]; faces=[]
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        q=tangent.to_track_quat('Z','Y'); radius=r[i] if isinstance(r,(list,tuple)) else r
        for j in range(n):verts.append(p+q@Vector((radius*math.cos(j*math.tau/n),radius*math.sin(j*math.tau/n),0)))
    for i in range(len(pts)-1):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(range(n-1,-1,-1)),tuple((len(pts)-1)*n+j for j in range(n))])
    return mesh(name,verts,faces,bone,mat)
def torus(name,p,major,minor,bone,mat,axis='X'):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,location=p,major_radius=major,minor_radius=minor)
    o=bpy.context.object;o.name=name;o.rotation_euler=(0,math.pi/2,0) if axis=='X' else (math.pi/2,0,0) if axis=='Y' else (0,0,0)
    for f in o.data.polygons:f.use_smooth=True
    return bind(o,bone,mat)
def shell(name,p,size,bone,mat='Armor',axis=None):
    # Longitudinal loft gives an asymmetric curved armor plate, not a beveled cube.
    p=Vector(p);w,l,h=size; verts=[];faces=[]; n=16
    profiles=[(-.5,.30,.52),(-.43,.77,.86),(-.23,1,1),(.13,.98,.99),(.36,.76,.77),(.5,.26,.4)]
    q=Vector((0,1,0)).rotation_difference(Vector(axis).normalized()) if axis is not None else Matrix.Identity(3).to_quaternion()
    for y,rw,rh in profiles:
        for j in range(n):
            a=j*math.tau/n;z=math.sin(a)*h*.5*rh
            # Slightly flatter belly preserves an athletic tucked underside.
            if z<0:z*=.75
            verts.append(p+q@Vector((math.cos(a)*w*.5*rw,y*l,z)))
    for i in range(len(profiles)-1):
        for j in range(n):a=i*n+j; b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(range(n-1,-1,-1)),tuple((len(profiles)-1)*n+j for j in range(n))])
    return mesh(name,verts,faces,bone,mat)
def plate(name,p,size,bone,mat='Edge',rot=0):
    o=shell(name,p,size,bone,mat);o.rotation_euler.z=rot;return o

# New anatomy follows retained rest-space pivots and retains one-bone rigid armor weighting.
shell('Tucked rib drive',(0,.06,1.54),(.92,1.5,.42),'spine','Mechanism')
shell('Thoracic dorsal keel',(0,-.20,1.88),(1.13,1.50,.50),'spine')
shell('Lumbar split pelvis',(0,.88,1.66),(1.27,.95,.63),'pelvis')
shell('Broad athletic scapular chest',(0,-.90,1.72),(1.52,.97,.66),'chest')
for s in [-1,1]:
    shell('Curved shoulder mantle '+str(s),(s*.73,-.87,1.87),(.65,1.05,.60),'chest','Edge')
    shell('Swept thigh cowl '+str(s),(s*.83,.92,1.62),(.54,.86,.63),'pelvis')
    # Three separated flank lamellae reveal a dark mechanical seam.
    for i in range(3):
        shell('Flank rib lamella '+str(s)+'-'+str(i),(s*.57,.31-i*.32,1.66),(.22,.31,.51),'spine')
        tube('Copper rib inset '+str(s)+'-'+str(i),[(s*.68,.21-i*.32,1.81),(s*.69,.31-i*.32,1.73),(s*.65,.35-i*.32,1.55)],.014,'spine','Copper',6)
    tube('Shoulder perimeter seam '+str(s),[(s*.92,-1.23,1.91),(s*1.02,-1.04,2.04),(s*1.00,-.75,2.10),(s*.89,-.49,1.97)],.018,'chest','Mechanism',8)
    tube('Hip perimeter seam '+str(s),[(s*.95,.60,1.73),(s*1.04,.86,1.84),(s*.99,1.16,1.70)],.018,'pelvis','Copper',8)
    # Turbines are contained within the hip sweep, with concentric rings and blades.
    shell('Rear launch turbine cowl '+str(s),(s*.72,1.12,1.63),(.40,.75,.43),'pelvis','Mechanism')
    torus('Turbine exhaust lip '+str(s),(s*.73,1.48,1.62),.145,.026,'pelvis','Edge','Y')
    torus('Turbine emissive annulus '+str(s),(s*.73,1.48,1.62),.106,.012,'pelvis','Optic','Y')
    for j in range(8):
        a=j*math.tau/8
        tube('Turbine vane '+str(s)+'-'+str(j),[(s*.73+math.cos(a)*.035,1.49,1.62+math.sin(a)*.035),(s*.73+math.cos(a+.25)*.12,1.49,1.62+math.sin(a+.25)*.12)],.009,'pelvis','Mechanism',6)
    # Low shoulder carbines remain recognizable but do not dominate the back line.
    b='weapon_L' if s<0 else 'weapon_R'
    shell('Compact repeater receiver '+str(s),(s*.56,-1.09,2.02),(.19,.44,.17),b,'Mechanism')
    tube('Repeater barrel '+str(s),[(s*.56,-1.13,2.02),(s*.56,-1.65,2.02)],.045,b,'Edge')
    torus('Muzzle ring '+str(s),(s*.56,-1.65,2.02),.053,.010,b,'Mechanism','Y')
    tube('Dorsal copper rail '+str(s),[(s*.31,.90,1.98),(s*.34,.48,2.07),(s*.34,-.24,2.10)],.019,'spine','Copper',8)
for i in range(4):
    shell('Separated dorsal vertebra '+str(i),(0,.78-i*.28,2.025),(.48,.25,.14),'spine','Edge')
shell('Panther tapered skull',(0,-1.50,1.88),(.91,.97,.56),'head')
shell('Panther articulated lower jaw',(0,-1.88,1.64),(.59,.57,.21),'head','Mechanism')
shell('Panther divided muzzle',(0,-1.95,1.77),(.58,.45,.24),'head','Edge')
ell('Triangular nose sensor',(0,-2.17,1.82),(.11,.05,.075),'head','Mechanism',12,6)
for s in [-1,1]:
    shell('Swept cheek fairing '+str(s),(s*.38,-1.76,1.80),(.23,.55,.29),'head')
    tube('Angular brow seam '+str(s),[(s*.16,-1.93,2.025),(s*.32,-1.92,2.035),(s*.44,-1.78,2.01)],.024,'head','Mechanism',8)
    tube('Narrow feline optic '+str(s),[(s*.19,-1.97,1.995),(s*.32,-1.958,2.005),(s*.405,-1.865,1.98)],.018,'head','Optic',8)
    # Folded triangular ear armor gives a readable feline silhouette at play distance.
    x=s*.35
    mesh('Panther folded ear '+str(s),[(x-.16,-1.37,2.12),(x+.16,-1.37,2.12),(x+s*.035,-1.31,2.48),(x-.13,-1.17,2.13),(x+.13,-1.17,2.13),(x+s*.035,-1.21,2.44),(x,-1.42,2.24)],[(0,1,6),(1,2,6),(2,0,6),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'head','Armor',False)
    mesh('Panther triangular ear inset '+str(s),[(x-.085,-1.389,2.18),(x+.085,-1.389,2.18),(x+s*.020,-1.335,2.39)],[(0,1,2)],'head','Copper',False)
    for j in range(2):
        tube('Sensor whisker '+str(s)+'-'+str(j),[(s*.38,-2.035,1.78),(s*.53,-2.13,1.80+j*.06),(s*.70,-2.14+j*.10,1.82+j*.06)],.009,'head','Edge',6)
# Canopy and tiny feline pilot are retained design cues, authored anew.
torus('Cockpit segmented rim',(0,-.47,2.075),.37,.055,'chest','Mechanism','Z')
ell('Compact canopy',(0,-.47,2.18),(.315,.40,.29),'chest','Canopy')
# A visible pilot bust sits above the opaque canopy lower shell.
ell('Tiny amber feline pilot head',(0,-.53,2.375),(.10,.11,.09),'chest','Pilot',16,8)
for s in [-1,1]:
    shell('Pilot ear '+str(s),(s*.07,-.52,2.45),(.07,.055,.09),'chest','Pilot')
    ell('Pilot eye '+str(s),(s*.035,-.633,2.39),(.011,.009,.014),'chest','Mechanism',8,4)

feet={label:rig.data.bones[label+'_paw'].head_local.copy() for label in ['FL','FR','HL','HR']}
for label,foot in feet.items():
    hip=rig.data.bones[label+'_upper'].head_local.copy();knee=rig.data.bones[label+'_lower'].head_local.copy();s=-1 if label[1]=='L' else 1
    upper=label+'_upper';lower=label+'_lower';paw=label+'_paw';front=label[0]=='F'
    ell(label+' exposed shoulder bearing',hip,(.23,.25,.23),upper,'Mechanism')
    torus(label+' concentric shoulder collar',hip+Vector((s*.22,0,0)),.18,.030,upper,'Edge')
    torus(label+' drive collar seal',hip+Vector((s*.24,0,0)),.105,.018,upper,'Copper')
    tube(label+' upper structural bone',[hip,knee],.12,upper,'Mechanism')
    shell(label+' long curved upper armor',(hip+knee)/2,(.37 if front else .46,(hip-knee).length*.94,.33 if front else .40),upper,axis=knee-hip)
    ell(label+' knee ball',knee,(.155,.17,.16),lower,'Mechanism')
    torus(label+' exposed knee disk',knee+Vector((s*.145,0,0)),.12,.024,lower,'Edge')
    tube(label+' lower frame',[knee,foot],.075,lower,'Mechanism')
    shell(label+' curved shin armor',(knee+foot)/2,(.245,(knee-foot).length*.74,.25),lower,axis=foot-knee)
    offset=Vector((s*.13,.035,0));axis=(foot-knee).normalized()
    tube(label+' hydraulic barrel',[knee+offset,knee+offset+axis*.43],.039,lower,'Edge')
    tube(label+' hydraulic polished ram',[knee+offset+axis*.39,foot+offset-axis*.10],.022,lower,'Copper')
    # Paw has a broad central metacarpal, four offset armored digits and hooked claws.
    shell(label+' central paw palm',(foot.x,foot.y-.10,.135),(.48,.50,.22),paw,'Rubber')
    shell(label+' metacarpal guard',(foot.x,foot.y-.095,.22),(.43,.35,.15),paw)
    for toe in range(4):
        dx=(toe-1.5)*.11;y=foot.y-.28+abs(toe-1.5)*.045
        shell(label+' digit '+str(toe)+' knuckle',(foot.x+dx,y,.16),(.102,.25,.16),paw,'Edge')
        tube(label+' digit '+str(toe)+' joint seam',[(foot.x+dx-.044,y-.035,.223),(foot.x+dx+.044,y-.035,.223)],.008,paw,'Mechanism',6)
        tube(label+' hooked claw '+str(toe),[(foot.x+dx,y-.10,.15),(foot.x+dx,y-.16,.14),(foot.x+dx,y-.22,.09),(foot.x+dx,y-.235,.035)],[.035,.028,.018,.002],paw,'Edge',8)
    shell(label+' dewclaw socket',(foot.x-s*.24,foot.y,.22),(.105,.18,.15),paw,'Mechanism')
    tube(label+' dewclaw',[(foot.x-s*.25,foot.y-.015,.22),(foot.x-s*.29,foot.y-.10,.15),(foot.x-s*.29,foot.y-.15,.10)],[.025,.017,.002],paw,'Copper',8)
    tube(label+' paw status light',[(foot.x-.13,foot.y-.10,.295),(foot.x+.13,foot.y-.10,.295)],.012,paw,'Optic',6)
for i in range(5):
    bone=rig.data.bones['tail_'+str(i)];a=bone.head_local;b=bone.tail_local;bn=bone.name
    tube('Tail tapered vertebral core '+str(i),[a,b],[.095-i*.01,.085-i*.01],bn,'Mechanism')
    shell('Tail floating curved scale '+str(i),(a+b)/2,(.24-i*.026,(b-a).length*.80,.20-i*.021),bn,axis=b-a)
    torus('Tail articulation collar '+str(i),a,.105-i*.011,.014,bn,'Copper','Y')
ell('Tail signal tip',rig.data.bones['tail_4'].tail_local,(.055,.095,.06),'tail_4','Optic',12,6)

bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object
body.name='Pounce_Overhaul_Armor';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
body.parent=rig;mod=body.modifiers.new('Rigid articulated skeletal skin','ARMATURE');mod.object=rig
# Remove helper component groups from export after keeping named editable groups in blend.
scene=bpy.context.scene;scene.render.fps=60
def reset():helper.reset(rig)
def shift_core(delta):
    # Capture world-space matrices before applying parent transforms; each core shifts once.
    captured={bn:rig.pose.bones[bn].matrix.copy() for bn in ['pelvis','spine','chest','head']}
    for bn,m in captured.items():
        m.translation+=Vector(delta);rig.pose.bones[bn].matrix=m;bpy.context.view_layer.update()
def legs(targets):
    for label,target in targets.items():helper.ik(rig,label+'_upper',label+'_lower',label+'_paw',Vector(target),Vector((0,1 if label[0]=='F' else -1,0)))
def smooth(x):return max(0,min(1,x))**2*(3-2*max(0,min(1,x)))
def quad():reset();legs(feet)
def upright(amount=1):helper.upright_pose(rig,'Pounce',(1,1.04,1),feet,amount)
def launch(t):
    quad()
    # Both rear feet remain planted through the crouch; extension precedes release.
    if t<.24:
        c=math.sin(t/.24*math.pi/2);shift_core((0,.12*c,-.34*c));legs(feet)
    elif t<.40:
        x=smooth((t-.24)/.16);shift_core((0,.12*(1-x)-.10*x,-.34*(1-x)+.12*x));legs(feet)
    else:
        a=smooth((t-.40)/.18);height=.20+.48*math.sin((t-.40)/.60*math.pi)
        shift_core((0,-.16*a,height));targets={}
        for k,f in feet.items():targets[k]=f+Vector((0,-.28 if k[0]=='F' else .17,.45*a))
        legs(targets)
    for i in range(5):rig.pose.bones['tail_'+str(i)].rotation_quaternion=Matrix.Rotation(-.12*math.sin(t*math.pi),4,'X').to_quaternion()
def recovery(t):
    quad();amount=math.sin(t*math.pi)**2;shift_core((0,-.05*amount,-.25*amount));legs(feet)
    rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(.10*amount,4,'X').to_quaternion()
def tackle(t):
    # Shared .72-second contact event on the 1.5-second pair timeline.
    if t<.32:launch(t/.32*.40)
    else:
        quad();fly=math.sin(min(1,(t-.32)/.46)*math.pi);recoil=max(0,1-abs(t-.48)/.2)
        shift_core((0,-.37*fly,.12+.16*fly if t<.78 else -.16*math.sin((t-.78)/.22*math.pi)))
        targets={}
        for k,f in feet.items():targets[k]=f+Vector((0,-.80*recoil if k[0]=='F' else .23*fly,.68*recoil if k[0]=='F' else .32*fly))
        legs(targets)
        if t>.93:quad()
def victim_tackle(t):
    quad();hit=smooth((t-.48)/.10)*(1-smooth((t-.70)/.30))
    shift_core((0,.18*hit,-.29*hit));legs({k:f+Vector((0,.10*hit if k[0]=='F' else 0,.02*hit)) for k,f in feet.items()})
    rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(-.25*hit,4,'X').to_quaternion()
def strike(t,victim=False):
    reset();upright();pulse=math.sin(max(0,min(1,(t-.18)/.60))*math.pi)**2
    if victim:
        hit=smooth((t-.48)/.08)*(1-smooth((t-.70)/.30));shift_core((0,.15*hit,-.11*hit));rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(-.23*hit,4,'X').to_quaternion()
    else:
        target=rig.pose.bones['FL_paw'].head.copy()+Vector((.18*pulse,-.76*pulse,-.22*pulse))
        legs({'FL':target});rig.pose.bones['chest'].rotation_quaternion=rig.pose.bones['chest'].rotation_quaternion@Matrix.Rotation(.14*pulse,4,'Y').to_quaternion()
clips={}
def bake(name,duration,pose,events,loop=False):
    old=bpy.data.actions.get(name)
    if old:bpy.data.actions.remove(old)
    action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;end=round(duration*60)
    for frame in range(end+1):
        scene.frame_set(frame);reset();pose(frame/end);bpy.context.view_layer.update()
        for b in rig.pose.bones:
            b.keyframe_insert('location',frame=frame);b.keyframe_insert('rotation_quaternion',frame=frame);b.keyframe_insert('scale',frame=frame)
    clips[name]={'duration':duration,'loop':loop,'events':events,'frames':[0,end]}
bake('PounceTransformUp',1.0,lambda t:upright(smooth(t)),{'stanceUpright':1.0})
bake('PounceTransformDown',1.0,lambda t:upright(1-smooth(t)),{'stanceQuad':1.0})
bake('FelineRearLaunch',.9,launch,{'rearLoad':.216,'rearExtend':.27,'takeoff':.36,'airborne':.522})
bake('FelineLandingRecovery',.6,recovery,{'pawContact':0,'maxCompression':.3,'recover':.6})
bake('PounceTackleAttacker',1.5,tackle,{'rearLoad':.12,'takeoff':.48,'pairContact':.72,'release':1.17,'recover':1.5})
bake('PounceTackleVictim',1.5,victim_tackle,{'pairContact':.72,'release':1.17,'recover':1.5})
bake('PounceClawAttacker',1.1,lambda t:strike(t),{'pairContact':.528,'release':.858,'recover':1.1})
bake('PounceClawVictim',1.1,lambda t:strike(t,True),{'pairContact':.528,'release':.858,'recover':1.1})
def pair_pose(t,role,phase):
    quad()
    if phase=='impact':amount=smooth(t/.43);settle=math.sin(t*math.pi)*.04
    elif phase=='pin':amount=1;settle=.012*math.sin(t*math.tau)
    else:amount=1-smooth(t);settle=0
    if role=='attacker':
        shift_core((0,-.08*amount,.035*amount+settle))
        targets={k:f.copy() for k,f in feet.items()}
        for k in ['FL','FR']:
            s=-1 if k[1]=='L' else 1
            targets[k]=feet[k].lerp(Vector((s*.56,-1.93,1.72)),amount)
        legs(targets)
        rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(.10*amount,4,'X').to_quaternion()
    else:
        shift_core((0,.05*amount,-.12*amount+settle))
        legs(feet);rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(-.16*amount,4,'X').to_quaternion()
    for i in range(5):rig.pose.bones['tail_'+str(i)].rotation_quaternion=Matrix.Rotation((.06*amount+.008*math.sin(t*math.tau-i*.5)),4,'Z').to_quaternion()
for role in ['Attacker','Victim']:
    bake('FelinePairImpact'+role,17/60,lambda t,r=role:pair_pose(t,r.lower(),'impact'),{'pairContact':7/60,'pinReady':17/60})
    bake('FelinePairPin'+role,.8,lambda t,r=role:pair_pose(t,r.lower(),'pin'),{'hold':0},True)
    bake('FelinePairRelease'+role,.35,lambda t,r=role:pair_pose(t,r.lower(),'release'),{'release':0,'locomotionReady':.35})
# Keep useful authored source motions, but omit obsolete old transform/ability/grab actions.
keep=['FelineIdle','FelineWalk','FelineTrot','FelineGallop','FelineTurnLeft','FelineTurnRight','FelineAir','FelineCling','FelineClimb','FelineMantle','FelinePulse','FelineMissile','FelineHit','FelineDeath','FelineCombatBase','FelineUprightIdle','FelineUprightWalkLong','FelineUprightStride','FelineUprightTurnLeft','FelineUprightTurnRight','FelineUprightAir','FelineUprightCombatBase','FelineUprightPulse','FelineUprightMissile','FelineUprightHit','FelineUprightDeath']
for action in list(bpy.data.actions):
    if action.name not in clips and action.name not in keep:bpy.data.actions.remove(action)
for name in keep:
    a=bpy.data.actions[name];start,end=a.frame_range
    clips[name]={'duration':round((end-start)/60,6),'loop':any(x in name for x in ['Idle','Walk','Stride','Trot','Gallop','Turn','Cling','Climb','Air']),'frames':[int(start),int(end)],'events':{},'provenance':'retained source action'}

# Geometry and kinematic receipts include actual evaluated vertices, not object bounds alone.
reset();rig.animation_data.action=None;bpy.context.view_layer.update()
rest=[v.co.copy() for v in body.data.vertices];lo=[min(v[i] for v in rest) for i in range(3)];hi=[max(v[i] for v in rest) for i in range(3)]
receipt={'schema':1,'status':'CANDIDATE_REQUIRES_RUNTIME_REVIEW','sourceHashes':hashes,'rig':'Pounce_Overhaul_Rig','mesh':'Pounce_Overhaul_Armor','axis':{'sourceUp':'+Z','sourceForward':'-Y','gltfUp':'+Y','gltfForward':'+Z'},'units':'meters','recommendedRuntimeScale':.8,'restMin':lo,'restMax':hi,'restDimensions':[hi[i]-lo[i] for i in range(3)],'vertices':len(body.data.vertices),'triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'materials':len(body.data.materials),'bones':{b.name:{'head':list(b.head_local),'tail':list(b.tail_local),'parent':b.parent.name if b.parent else None} for b in rig.data.bones},'clips':clips,'evaluatedSamples':{}}
receipt['pairAssembly']={'victimOffsetSource':[0,-3.2,0],'victimYawRadians':math.pi,'victimOffsetRuntimeScale08':[0,0,2.56],'impactSeconds':17/60,'contactSeconds':7/60,'pinLoopSeconds':.8,'releaseSeconds':.35,'rootMotion':False,'stance':'quadruped'}
for name in ['PounceTransformUp','FelineRearLaunch','FelineLandingRecovery','PounceTackleAttacker','PounceTackleVictim','PounceClawAttacker','PounceClawVictim','FelinePairImpactAttacker','FelinePairImpactVictim','FelinePairPinAttacker','FelinePairPinVictim','FelinePairReleaseAttacker','FelinePairReleaseVictim']:
    action=bpy.data.actions[name];rig.animation_data.action=action;start,end=action.frame_range;worst=0;floor=99;top=-99;reach=0
    for frame in range(int(start),int(end)+1):
        scene.frame_set(frame);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
        floor=min(floor,min(v.co.z for v in me.vertices));top=max(top,max(v.co.z for v in me.vertices));ev.to_mesh_clear()
        for k in feet:
            a=rig.pose.bones[k+'_upper'];b=rig.pose.bones[k+'_lower'];c=rig.pose.bones[k+'_paw']
            worst=max(worst,abs((a.head-b.head).length-a.bone.length),abs((b.head-c.head).length-b.bone.length));reach=max(reach,(a.head-c.head).length/(a.bone.length+b.bone.length))
    receipt['evaluatedSamples'][name]={'floor':floor,'top':top,'limbLengthError':worst,'maxReachRatio':reach}
receipt['originalHashesStillMatch']=all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
(SOURCE/'asset-receipt.json').write_text(json.dumps(receipt,indent=2))
(OUT/'pounce-contract.json').write_text(json.dumps(receipt,indent=2))

rig.animation_data.action=bpy.data.actions['FelineIdle'];scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'Pounce_Overhaul_v1.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(SOURCE/'Pounce_Overhaul_v1.raw.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True,export_extras=False)

# Ordinary play-distance review cameras. No high-resolution beauty/turntable acceptance.
material('Floor',(.065,.085,.088),.1,.68)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.005));floor_obj=bpy.context.object;floor_obj.name='REVIEW_floor';floor_obj.data.materials.append(mats['Floor'])
world=scene.world or bpy.data.worlds.new('Review world');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.14,.17,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
for i,(loc,power,size) in enumerate([((3,-4,7),1300,5),((-4,-1,4),800,4),((0,4,6),1100,3)]):
    d=bpy.data.lights.new('REVIEW_light'+str(i),'AREA');o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('REVIEW_gameCamera');cam=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='PERSP';d.lens=48
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.view_settings.view_transform='AgX'
def render(name,clip,frame,loc=(5,-7,4.0),target=(0,-.1,1.3)):
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(SOURCE/(name+'.png'));bpy.ops.render.render(write_still=True)
render('review-quad-game-camera','FelineIdle',1)
render('review-upright-game-camera','FelineUprightIdle',1,(5,-7,4.8),(0,0,1.6))
render('review-transform-midpoint','PounceTransformUp',30,(5,-7,4.6),(0,0,1.6))
render('review-rear-leg-load','FelineRearLaunch',14)
render('review-rear-leg-release','FelineRearLaunch',30)
# Synchronized victim clone is a source-only review fixture, excluded from export.
victim=rig.copy();victim.data=rig.data.copy();victim.name='REVIEW_PairedVictimRig';bpy.context.collection.objects.link(victim);victim.animation_data_create();victim.animation_data.action=bpy.data.actions['FelinePairPinVictim'];victim.location=(0,-3.2,0);victim.rotation_euler.z=math.pi
vm=body.copy();vm.data=body.data.copy();vm.name='REVIEW_PairedVictimArmor';bpy.context.collection.objects.link(vm);vm.parent=victim;vm.modifiers[0].object=victim
render('review-paired-tackle-contact','FelinePairPinAttacker',24,(7,-8,5),(0,-1.0,1.3))
victim.hide_render=True;vm.hide_render=True
rig.animation_data.action=bpy.data.actions['FelineIdle'];scene.frame_set(1)
scene['candidate_status']='CANDIDATE: game-camera snapshots are evidence, runtime review still required'
scene['paired_tackle_origin_offset']='victim (0,-3.2,0) source meters; yaw pi; .72 sec shared contact'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'Pounce_Overhaul_v1.blend'),compress=True)
print('POUNCE_OVERHAUL_COMPLETE',json.dumps({'triangles':receipt['triangles'],'vertices':receipt['vertices'],'clips':len(clips),'originalHashesStillMatch':receipt['originalHashesStillMatch']}),flush=True)

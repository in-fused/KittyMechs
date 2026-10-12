"""One fixed geometry, one measured source-armature skeletal action author."""
import pathlib
HERE=pathlib.Path(__file__).resolve().parent
exec(compile((HERE/'source_helpers.py').read_text(encoding='utf8'),'source_helpers.py','exec'))
from mathutils import Quaternion
SOURCE=ROOT/'assets/source/overhaul-feline-identity-complete-source-003'
MASTER=SOURCE/'Pounce_Identity003.blend'
PROTECTED={str(MASTER):'398a93ecc1c2730488e39ba8c0376eae81a0630c0de9241283255629682fcfd4',str(SOURCE/'Pounce_Identity003.raw.glb'):'c16163532550febf23c4697a9a244ce1102714c1fe05f7483593bdd842a6a267'}
PROTECTED.update({str(SOURCE/'source-profile.json'):'fb3baee63d25fdd805021957077c2a09d7ba82d9c353603eaffdfe90c2ab46f5',str(SOURCE/'full.png'):'e9d738dda596b43d31cbd792a3fb366c8a3a3857c1081a7c26c4891e9a5c51ee',str(SOURCE/'paw.png'):'735bed608f97b4043ded14dbabd95513f1ce0933def8fd87c566063fd7f80e78',str(SOURCE/'sole.png'):'f742ba67aef2e305bfa3e4e901768936c0b87a002d3ea007887e80e839f01916'})
FPS=60;ACTIONS=[];RAW=[];ISSUES=[];POSES={};REST={};SLOTS=[];SOURCE_PROFILE=None;CURRENT=None

def fingerprint():
    packet={'carrierWorld':rows(RIG.matrix_world),'carrierBasis':rows(RIG.matrix_basis),'rest':{b.name:{'parent':b.parent.name if b.parent else None,'matrix':rows(b.matrix_local),'head':list(b.head_local),'tail':list(b.tail_local)} for b in RIG.data.bones},'materials':[],'meshes':[]}
    for m in MATS:
        p=m.node_tree.nodes.get('Principled BSDF');packet['materials'].append({'name':m.name,'color':list(p.inputs['Base Color'].default_value),'metal':p.inputs['Metallic'].default_value,'rough':p.inputs['Roughness'].default_value,'emit':p.inputs['Emission Strength'].default_value})
    for o in sorted((o for o in bpy.data.objects if o.get('source_owner')),key=lambda o:o.name):
        packet['meshes'].append({'name':o.name,'v':[list(v.co) for v in o.data.vertices],'f':[list(f.vertices) for f in o.data.polygons],'uv':[[list(x.uv) for x in uv.data] for uv in o.data.uv_layers],'weights':[[[o.vertex_groups[g.group].name,g.weight] for g in v.groups] for v in o.data.vertices],'materials':[m.name for m in o.data.materials],'object':rows(o.matrix_basis),'parent':o.parent.name if o.parent else None,'owner':o['source_owner']})
    return hashlib.sha256(json.dumps(packet,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def trans(v):return Matrix.Translation(Vector(v))
def rotation(axis,angle):return Quaternion(Vector(axis),angle).to_matrix().to_4x4()
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
def chain_bone(name,a,b):
    rest=RIG.data.bones[name];d=Vector(b)-Vector(a);old=rest.tail_local-rest.head_local
    if abs(d.length-rest.length)>2e-5:raise RuntimeError('FIXED_CHAIN_LENGTH:'+name)
    q=old.normalized().rotation_difference(d.normalized());return trans(a)@q.to_matrix().to_4x4()@rest.matrix_local.to_quaternion().to_matrix().to_4x4()

def solve_two(hip,end,l1,l2,pole,limb):
    d=Vector(end)-Vector(hip);r=d.length
    if r>=l1+l2-1e-6 or r<=abs(l1-l2)+1e-6:raise RuntimeError('REQUESTED_CHAIN_UNREACHABLE:'+limb+':'+str(r))
    direction=d/r;a=(l1*l1-l2*l2+r*r)/(2*r);height=math.sqrt(max(0,l1*l1-a*a));p=Vector(pole)-Vector(hip);p-=direction*p.dot(direction)
    if p.length<1e-8:raise RuntimeError('BEND_POLE_DEGENERATE:'+limb)
    return Vector(hip)+direction*a+p.normalized()*height

def parent_base(name,poses):
    b=RIG.data.bones[name]
    return poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local.copy()

def gait(phase,duty,stride,lift):
    p=phase%1
    if p<duty:return stride*(.5-p/duty),0,'stance'
    s=(p-duty)/(1-duty);return stride*(-.5+ease(s)),lift*math.sin(math.pi*s)**2,'swing'

def parameters(kind,t,duration,side=0,role=None,beat=None):
    f=t/duration;u=0;body=0;stride=0;lift=0;duty=.65;cycle=f;wall=False;air=False;pair=False
    if kind=='idle':body=.008*math.sin(2*math.pi*f)
    elif kind in ('walk','trot','gallop','turn'):
        stride={'walk':.70,'trot':1.05,'gallop':1.5833333333333333,'turn':.48}[kind];lift={'walk':.13,'trot':.17,'gallop':.24,'turn':.18}[kind];duty=.72 if kind=='walk' else .52 if kind=='gallop' else .62;body=.018*math.sin(4*math.pi*f)
    elif kind in ('uprightIdle','uprightWalk','uprightTurn'):u=1;stride=(1.7226666666666668 if duration<.35 else .85) if kind=='uprightWalk' else .30 if kind=='uprightTurn' else 0;lift=.17;duty=.64;body=.012*math.sin(4*math.pi*f)
    elif kind in ('rise','fall'):
        progress=ease((f-.17)/.83);u=progress if kind=='rise' else 1-progress;stride=.28;lift=.10;duty=.65;cycle=f*1.5
    elif kind in ('air','uprightAir'):u=1 if kind=='uprightAir' else 0;air=True;body=.04
    elif kind=='landing':body=-.055*math.sin(math.pi*f)**2
    elif kind in ('grab','cling','climb','mantle'):u=.92;wall=True;body=.08*math.sin(2*math.pi*f) if kind=='climb' else 0
    elif kind=='pair':u=1 if side else 0;pair=True;body=(-.34 if role=='victim' else -.085)*(math.sin(math.pi*f)**2 if beat=='impact' else .8 if beat in ('pin','claw') else 1-ease(f))
    elif kind in ('strike','hit','death'):u=1 if side else 0;body=-.025*math.sin(math.pi*f)
    return {'u':u,'bob':body,'stride':stride,'lift':lift,'duty':duty,'cycle':cycle,'wall':wall,'air':air,'pair':pair,'fraction':f}

def pose(kind,t,duration,side=0,role=None,beat=None):
    global CURRENT
    previous=CURRENT
    p=parameters(kind,t,duration,side,role,beat);u=p['u'];f=p['fraction'];poses={};contacts={};requests={limb:{'status':'NOT_YET_PLANNED','requestedAnkleArmatureSource':None,'hipArmatureSource':None,'jointsArmatureSource':None} for limb in ('FL','FR','HL','HR')}
    CURRENT={'kind':kind,'time':t,'duration':duration,'fraction':f,'u':u,'carrierWorld':rows(RIG.matrix_world),'requests':requests,'commit':'UNCOMMITTED until all fixed chains succeed','precedingCommittedClock':None if previous is None else {'kind':previous['kind'],'time':previous['time'],'duration':previous['duration']},'actualPriorFullPose':{b.name:rows(b.matrix) for b in RIG.pose.bones}}
    for name in ('root','pelvis','spine','chest','head','launcher'):
        base=parent_base(name,poses)
        if name=='root':base=trans((0,0,p['bob']))@base
        if name in ('pelvis','spine','chest'):
            angle={'pelvis':-.27,'spine':-.43,'chest':-.40}[name]*u
            if kind=='pair' and role=='victim':angle+=(-.12 if name=='pelvis' else .16)*math.sin(math.pi*f)
            base=trans(base.translation)@rotation((1,0,0),angle)@trans(-base.translation)@base
            if kind=='pair' and role=='victim' and name=='pelvis':base=trans(base.translation)@rotation((0,1,0),.28*(1 if beat in ('pin','claw') else math.sin(math.pi*f)))@trans(-base.translation)@base
        if name=='head':base=trans(base.translation)@REST[name].to_quaternion().to_matrix().to_4x4()@rotation((0,0,1),side*.08*math.sin(2*math.pi*f))
        poses[name]=base
    for limb in ('FL','FR','HL','HR'):
        fore=limb.startswith('F');sign=-1 if limb.endswith('L') else 1;up=limb+'_upper';lo=limb+'_lower';paw=limb+'_paw';hip=parent_base(up,poses).translation;restPaw=REST[paw].translation.copy();target=restPaw.copy();orientation=REST[paw].to_quaternion().to_matrix().to_4x4();phase=p['cycle']+({'FL':0,'FR':.5,'HL':.75,'HR':.25}[limb] if kind=='walk' else {'FL':0,'FR':.5,'HL':.5,'HR':0}[limb]);dy,dz,contact=gait(phase,p['duty'],p['stride'],p['lift'])
        target.y+=dy;target.z+=dz
        if kind in ('uprightWalk','uprightTurn'):phase=p['cycle']+(0 if limb=='HL' else .5);dy,dz,contact=gait(phase,p['duty'],p['stride'],p['lift']);target=restPaw+Vector((0,dy,dz))
        if fore and u>0:
            # Explicit fore unload while body begins at rest, then hip-relative reachable guard. No fixed-world R target.
            if kind in ('rise','fall'):
                release=ease(f/.17) if kind=='rise' else 1-ease((f-.83)/.17)
                relative=restPaw-REST[up].translation;guard=Vector((sign*.07,-.29,-.38));blend=ease(u/.40);target=hip+relative.lerp(guard,blend);target.z+=.10*release*(1-blend);contact='unloaded-transition'
            else:target=hip+Vector((sign*.07,-.29,-.38));contact='unloaded-guard'
            orientation=rotation((1,0,0),-.50*u)@orientation
        if p['air']:
            target=hip+Vector((sign*.03,-.13,-.78 if fore else -.90));contact='air';orientation=rotation((1,0,0),-.18)@orientation
        if p['wall']:
            target=Vector((restPaw.x,-.42+(REST[paw].translation.z-.018),2.20 if fore else .76));contact='wall';orientation=rotation((1,0,0),-math.pi/2)@orientation
            if kind=='climb':target.z+=.11*math.sin(2*math.pi*(f+(0 if limb in ('FL','HR') else .5)));contact='wall-stance-or-reach'
            if kind=='mantle' and fore:target=Vector((restPaw.x,-.48,2.38+.12*ease(f)));orientation=REST[paw].to_quaternion().to_matrix().to_4x4();contact='authored-roof-reach'
        if p['pair'] and fore:
            if role=='attacker':target=hip+Vector((sign*.03,-.64,-.52));target.y-=.16*math.sin(math.pi*f) if beat in ('impact','claw') else 0;contact='paired-reach-UNPROVEN'
            else:target=restPaw+Vector((0,.07,.07*math.sin(math.pi*f)));contact='victim-brace'
        if kind=='strike' and fore and limb=='FR':target=hip+Vector((.05,-.47-.24*math.sin(math.pi*f),-.52));contact='strike-unloaded'
        if kind=='death':target=restPaw+Vector((sign*.09,.07,.12*ease(f)));contact='down-unproven'
        requests[limb]={'status':'REQUEST_ISSUED_NOT_COMMITTED','requestedAnkleArmatureSource':list(target),'hipArmatureSource':list(hip),'jointsArmatureSource':None,'contactIntent':contact,'nativeContact':'UNQUALIFIED'}
        if fore:
            knee=solve_two(hip,target,RIG.data.bones[up].length,RIG.data.bones[lo].length,RIG.data.bones[lo].head_local+(hip-REST[up].translation),limb)
            poses[up]=chain_bone(up,hip,knee);poses[lo]=chain_bone(lo,knee,target);joints=[hip,knee,target]
        else:
            hockName=limb+'_hock';d=RIG.data.bones[paw].head_local-RIG.data.bones[hockName].head_local;hock=target-d
            knee=solve_two(hip,hock,RIG.data.bones[up].length,RIG.data.bones[lo].length,RIG.data.bones[lo].head_local+(hip-REST[up].translation),limb)
            poses[up]=chain_bone(up,hip,knee);poses[lo]=chain_bone(lo,knee,hock);poses[hockName]=chain_bone(hockName,hock,target);joints=[hip,knee,hock,target]
        poses[paw]=trans(target)@orientation;contacts[limb]=contact;requests[limb]={'status':'PLANNED','requestedAnkleArmatureSource':list(target),'hipArmatureSource':list(hip),'jointsArmatureSource':[list(x) for x in joints],'contactIntent':contact,'nativeContact':'UNQUALIFIED'}
    for b in RIG.data.bones:
        if b.name in poses:continue
        poses[b.name]=parent_base(b.name,poses)
        if b.name.startswith('tail_'):poses[b.name]=poses[b.name]@rotation((0,0,1),.055*math.sin(2*math.pi*f+int(b.name[-1])*.5)+side*.065)
        if '_claw_' in b.name and (p['wall'] or kind=='strike' or p['pair']):poses[b.name]=poses[b.name]@rotation((1,0,0),.25*(math.sin(math.pi*f) if kind=='strike' else 1))
    # Matrices are armature absolute targets; convert to skeleton-local basis once. Never premultiply carrier on bones.
    for b in RIG.data.bones:
        base=poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local
        RIG.pose.bones[b.name].matrix_basis=base.inverted()@poses[b.name]
    bpy.context.view_layer.update()
    CURRENT={'kind':kind,'time':t,'duration':duration,'fraction':f,'u':u,'carrierWorld':rows(RIG.matrix_world),'requests':requests,'poseArmatureSource':{b.name:rows(b.matrix) for b in RIG.pose.bones},'contacts':contacts,'basis':'skeletonlocal once; actual armature poses; carrier once','commit':'ALL_FIXED_CHAINS_COMMITTED'}
    return CURRENT

def clips():
    c=[('FelineIdle','idle',1.2),('FelineWalk','walk',1.0),('FelineTrot','trot',.42),('FelineGallop','gallop',.16),('FelineTurnLeft','turn',.75,1),('FelineTurnRight','turn',.75,-1),('FelineTransformUp','rise',.7),('FelineTransformDown','fall',.7),('FelineUprightIdle','uprightIdle',1.2),('FelineUprightWalk','uprightWalk',.7),('FelineUprightStride','uprightWalk',.28),('FelineUprightWalkLong','uprightWalk',.6),('FelineUprightTurnLeft','uprightTurn',.75,1),('FelineUprightTurnRight','uprightTurn',.75,-1),('FelineAir','air',.7),('FelineUprightAir','uprightAir',.7),('FelineLandingRecovery','landing',.4),('FelineGrab','grab',.35),('FelineCling','cling',.8),('FelineClimb','climb',.75),('FelineMantle','mantle',.65)]
    for upright in (0,1):
        prefix='FelineUpright' if upright else 'Feline'
        for name,kind,d in [('CombatBase','uprightIdle' if upright else 'idle',.8),('Pulse','strike',.32),('Missile','strike',.45),('RearLaunch','strike',.7),('Hit','hit',.4),('Death','death',.85),('Down','death',.7)]:c.append((prefix+name,kind,d,upright))
        for beat,d in [('Impact',.28),('Pin',.8),('Claw',.24),('Release',.35),('Escape',.35)]:
            for role in ('Attacker','Victim'):c.append((prefix+'Pair'+beat+role,'pair',d,upright,role.lower(),beat.lower()))
    return c

def key_pose(action,frame):
    for b in RIG.pose.bones:
        b.rotation_mode='QUATERNION';b.keyframe_insert('location',frame=frame,group=b.name);b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name);b.keyframe_insert('scale',frame=frame,group=b.name)

def actual_floor(label):
    g=geometry();lowest=min((v[2],o['object'],i,v) for o in g for i,v in enumerate(o['verticesWorldSource']))
    if lowest[0]<-1e-5:raise RuntimeError('ACTUAL_POSE_BELOW_FLOOR:'+label+':'+str(lowest))
    return g

def render_evidence():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('MotionSourceWorld');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.025,.036,.045,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.30;scene.world=world
    for name,loc,power,size in [('Key',(-4,-4,6),1600,4),('Fill',(4,-3,3),1000,5),('Rim',(3,4,4),2200,4)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('MotionEvidence');camera=bpy.data.objects.new('MotionEvidence',d);scene.collection.objects.link(camera);scene.camera=camera;d.type='ORTHO';d.ortho_scale=5.1;camera.location=(4.3,-5.5,3.4);camera.rotation_euler=(Vector((0,.2,1.3))-camera.location).to_track_quat('-Z','Y').to_euler()
    names=[('quad','FelineTrot',.18),('movingR','FelineTransformUp',.35),('upright','FelineUprightStride',.12),('pounce','FelinePairImpactAttacker',.18)];evidence=[];failureBasis={b.name:b.matrix_basis.copy() for b in RIG.pose.bones}
    for label,name,t in names:
        a=bpy.data.actions.get(name);frame=round(t*FPS)+1;authored=any(r['action']==name and r['frame']==frame for r in RAW)
        if a is not None and authored:RIG.animation_data.action=a;scene.frame_set(frame);status='ACTUAL_SOURCE_POSE_ONLY'
        else:
            RIG.animation_data.action=None
            for b in RIG.pose.bones:b.matrix_basis=failureBasis[b.name]
            status='REQUESTED_PHASE_MISSING; image is actual preceding committed failure pose, not invented requested phase'
        bpy.context.view_layer.update();write(label+'-actual-geometry.json',geometry());write(label+'-actual-pose.json',{'requestedAction':name,'requestedTime':t,'actualAction':name if authored else None,'actualTime':(frame-1)/FPS if authored else None,'frame':frame if authored else None,'status':status,'firstFailureClock':CURRENT if not authored else None,'root':rows(RIG.matrix_world),'pose':{b.name:rows(b.matrix) for b in RIG.pose.bones}});scene.render.filepath=str(HERE/(label+'.png'));bpy.ops.render.render(write_still=True);evidence.append({'label':label,'action':name if authored else None,'frame':frame if authored else None,'status':status})
    write('selected-pose-evidence.json',evidence)

def animation_export():
    # One GLB export of the existing geometry with all actually authored action tracks.
    export_mesh()
    o=bpy.data.objects['Pounce_IdentityAnimation004_Export'];o.hide_render=True
    readback()
    raw=(HERE/'Pounce_IdentityAnimation004.raw.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);inventory=[{'name':a.get('name'),'channels':len(a['channels']),'samplers':len(a['samplers'])} for a in doc.get('animations',[])];write('actual-animation-inventory.json',inventory)
    missing={a['name'] for a in ACTIONS if a['complete']}-{a['name'] for a in inventory}
    if missing:raise RuntimeError('ACTUAL_EXPORTED_AUTHORED_ACTIONS_MISSING:'+str(sorted(missing)))

START=utc();status='SOURCE_FAILURE_STOP';error=None;before=None;entered=False
try:
    if {p:sha(p) for p in PROTECTED}!=PROTECTED:raise RuntimeError('PROTECTED_MASTER_CHANGED')
    bpy.ops.wm.open_mainfile(filepath=str(MASTER));RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');MATS=[bpy.data.materials[n] for n in ('FelinePBR_Identity003_Gunmetal','FelinePBR_Identity003_DeepTealCeramic','FelinePBR_Identity003_Graphite','FelinePBR_Identity003_AmberOptic')]
    SOURCE_PROFILE=json.loads((SOURCE/'source-profile.json').read_text());PADS=SOURCE_PROFILE['pads'];PARTS=SOURCE_PROFILE['parts'];REST={b.name:b.matrix_local.copy() for b in RIG.data.bones};before=fingerprint();write('input-geometry-fingerprint.json',{'method':'rest,parent,mesh vertices/faces/UV/allweights/materialname/PBR/objectbasis; pose excluded','before':before})
    bpy.context.scene.render.fps=FPS;RIG.animation_data_create()
    for spec in clips():
        name,kind,duration=spec[:3];side=spec[3] if len(spec)>3 else 0;role=spec[4] if len(spec)>4 else None;beat=spec[5] if len(spec)>5 else None;action=bpy.data.actions.new(name);RIG.animation_data.action=action;count=max(3,round(duration*FPS));actualDuration=count/FPS;record={'name':name,'kind':kind,'durationIntent':duration,'actualDuration':actualDuration,'frames':count+1,'complete':False,'nativeSupport':'UNQUALIFIED','rootMotion':'no horizontal carrier track'};ACTIONS.append(record)
        for i in range(count+1):
            t=i/FPS;frame=i+1;state=pose(kind,t,actualDuration,side,role,beat);RAW.append({'action':name,'frame':frame,**state});key_pose(action,frame)
            if i in (0,count//2,count) and kind not in ('air','uprightAir','death','grab','cling','climb','mantle'):actual_floor(name+':'+str(frame))
        record['complete']=True;track=RIG.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);track.mute=True;SLOTS.append(track)
    status='AUTHORED_SOURCE_ACTIONS_ONLY'
except Exception as exc:error={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc()}
finally:
    try:
        write('actual-action-records.json',ACTIONS);write('matching-clock-pose-requests.json',RAW);write('first-source-failure.json',{'error':error,'current':CURRENT});write('actual-full-geometry.json',geometry() if RIG else []);write('source-profile.json',{'preservedSource':SOURCE_PROFILE,'actions':ACTIONS,'current':CURRENT,'scope':'SOURCE DIAGNOSTIC ONLY; no native contact/forces/climb/pair acceptance'})
        if RIG:
            after=fingerprint();write('geometry-before-after.json',{'before':before,'after':after,'matches':before==after});bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_IdentityAnimation004.blend'));render_evidence();animation_export()
    except Exception as exc:
        write('preservation-error.json',{'message':str(exc),'traceback':traceback.format_exc()})
        if error is None:error={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc()};status='SOURCE_PRESERVATION_FAILURE_STOP'
    write('receipt.json',{'startedUtc':START,'closedUtc':utc(),'status':status,'error':error,'oneAttempt':True,'actionsComplete':sum(x['complete'] for x in ACTIONS),'protectedBefore':PROTECTED,'protectedAfter':{p:sha(p) for p in PROTECTED},'motionNativeArtRuntime':'UNQUALIFIED'})
if error:raise RuntimeError(error['message'])

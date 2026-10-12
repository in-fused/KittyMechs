"""New browser-native quadruped chassis. Meter-scale, physically articulated, editable source.
Legacy kit identity and tiny-pilot idea are retained; geometry and cat anatomy are newly authored.
"""
import bpy, math, json, sys
from mathutils import Vector, Matrix
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/runtime/models';SOURCE=ROOT/'assets/source/feline-web';SOURCE.mkdir(parents=True,exist_ok=True)
parts=[];materials={}
GAIT_STYLE={
    'Pounce':{'strides':(.72,1.1,1.66),'duties':(.7,.55,.44),'lifts':(.2,.3,.43),'spring':.075},
    'Bastion':{'strides':(.64,.94,1.32),'duties':(.78,.65,.54),'lifts':(.17,.22,.27),'spring':.035},
    'Lynx':{'strides':(.86,1.24,1.85),'duties':(.67,.52,.4),'lifts':(.23,.34,.37),'spring':.055},
    'Caracal':{'strides':(.7,1.04,1.5),'duties':(.75,.6,.5),'lifts':(.18,.24,.32),'spring':.045},
}
TURN_STYLE={
    'Pounce':{'arc':.62,'duty':.72,'duration':1,'lift':.22,'lead':.045,'offsets':{'FL':0,'HR':.25,'FR':.5,'HL':.75}},
    'Bastion':{'arc':.44,'duty':.82,'duration':1.3,'lift':.16,'lead':.026,'offsets':{'FL':0,'HL':.25,'FR':.5,'HR':.75}},
    'Lynx':{'arc':.72,'duty':.68,'duration':.85,'lift':.24,'lead':.06,'offsets':{'FL':0,'HR':.08,'FR':.5,'HL':.58}},
    'Caracal':{'arc':.52,'duty':.78,'duration':1.1,'lift':.19,'lead':.035,'offsets':{'FL':0,'HR':.3,'FR':.55,'HL':.8}},
}

# Upright stride sweeps are in source rig meters, not a playback-rate cap.
# The four retained scenes receive only these new actions.
UPRIGHT_STYLE={
    'Pounce':{'strides':(1.15,1.48),'duties':(.70,.57),'lift':(.18,.23),'shift':.045,'lower':.04,'wave':.015,'lead':.035,'arc':.38,'turnDuty':.72},
    'Bastion':{'strides':(1.,1.18),'duties':(.78,.70),'lift':(.13,.17),'shift':.022,'lower':.035,'wave':.009,'lead':.02,'arc':.28,'turnDuty':.82},
    'Lynx':{'strides':(1.40,1.60),'duties':(.68,.46),'lift':(.20,.26),'shift':.050,'lower':.055,'wave':.020,'lead':.045,'arc':.44,'turnDuty':.68},
    'Caracal':{'strides':(1.15,1.38),'duties':(.74,.66),'lift':(.16,.20),'shift':.030,'lower':.04,'wave':.012,'lead':.025,'arc':.34,'turnDuty':.76},
}
UPRIGHT_NEW=['FelineUprightWalkLong','FelineUprightStride','FelineUprightTurnLeft','FelineUprightTurnRight']

def upright_step(p,stride,duty):
    if p<duty:return -stride/2+stride*p/duty,0
    t=(p-duty)/(1-duty);smooth=t*t*(3-2*t)
    # Hermite endpoint tangents match the constant stance sweep. Paw world
    # velocity is continuous at takeoff/touchdown; the lift has zero slope.
    return stride/2-stride*smooth+stride*(1-duty)/duty*(2*t*t*t-3*t*t+t),math.sin(t*math.pi)**2

def upright_motion_pose(rig,kind,proportions,feet,phase,gait=0,direction=0):
    upright_pose(rig,kind,proportions,feet,1,0)
    style=UPRIGHT_STYLE[kind]
    matrices={name:rig.pose.bones[name].matrix.copy() for name in ['pelvis','spine','chest','head']}
    guard={label:rig.pose.bones[label+'_paw'].head.copy() for label in ['FL','FR']}
    wave=math.sin(phase*math.tau);fast=gait==1 and direction==0
    lower=style['lower']*(1 if fast else .45)
    offset=Vector((-style['shift']*wave,0,-lower+style['wave']*math.cos(phase*math.tau*2)))
    for i,name in enumerate(['pelvis','spine','chest','head']):
        matrix=matrices[name];position=matrix.translation.copy()+offset
        # Chest/guard counterbalance the supporting hip. Head leads a turn.
        lead=direction*style['lead']*(.35+i*.3) if direction else style['lead']*wave*(.5 if i==0 else -.35)
        matrix=Matrix.Rotation(lead,4,'Z')@matrix;matrix.translation=position
        rig.pose.bones[name].matrix=matrix;bpy.context.view_layer.update()
    for label,foot in feet.items():
        if label[0]=='F':
            target=guard[label]+offset;target.y+=style['lead']*wave*(-1 if label=='FL' else 1)
        else:
            mirrored=label if direction>=0 else label[0]+('R' if label[1]=='L' else 'L')
            p=(phase-(0 if mirrored=='HL' else .5))%1;target=foot.copy()
            if direction:
                sweep,lift=upright_step(p,style['arc'],style['turnDuty'])
                target=Matrix.Rotation(-direction*sweep,4,'Z')@target;target.z+=style['lift'][0]*lift
            else:
                sweep,lift=upright_step(p,style['strides'][gait],style['duties'][gait]);target.y+=sweep;target.z+=style['lift'][gait]*lift
        ik(rig,label+'_upper',label+'_lower',label+'_paw',target,Vector((0,1 if label[0]=='F' else -1,.2 if label[0]=='F' else 0)))
        if label[0]=='F':
            # Keep the original raised guard pad orientation.
            paw=rig.pose.bones[label+'_paw'];matrix=Matrix.Rotation(-.72,4,'X')@paw.matrix;position=paw.head.copy();matrix.translation=position;paw.matrix=matrix;bpy.context.view_layer.update()
        elif direction:
            matrix=Matrix.Rotation(-direction*sweep,4,'Z')@rig.data.bones[label+'_paw'].matrix_local;matrix.translation=rig.pose.bones[label+'_paw'].head.copy();rig.pose.bones[label+'_paw'].matrix=matrix;bpy.context.view_layer.update()
    for i in range(5):
        rig.pose.bones['tail_'+str(i)].rotation_quaternion=(Matrix.Rotation(.018*math.sin(phase*math.tau-i*.4),4,'X')@Matrix.Rotation(-direction*style['lead']*(1.4-i*.15)-style['shift']*.7*wave,4,'Z')).to_quaternion()
    bpy.context.view_layer.update()

def append_existing_upright(kind):
    if kind.startswith('Sentinel_'):raise ValueError('upright append is players only')
    filename=kind+'_Quadruped';bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(filename+'.blend')))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
    feet={label:rig.data.bones[label+'_paw'].head_local.copy() for label in ['FL','FR','HL','HR']}
    proportions=(.78,1.08,1.16) if kind=='Lynx' else (1.12,.93,.95) if kind=='Bastion' else (.98,.94,1.05) if kind=='Caracal' else (1,1.04,1)
    for index,name in enumerate(UPRIGHT_NEW):
        old=bpy.data.actions.get(name)
        if old:bpy.data.actions.remove(old)
        action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
        duration=1.2 if index==0 else .9 if index==1 else 1.1;end=round(duration*60)
        for frame in range(end+1):
            bpy.context.scene.frame_set(frame);reset(rig);upright_motion_pose(rig,kind,proportions,feet,frame/end,index if index<2 else 0,1 if index==2 else -1 if index==3 else 0)
            for bone in rig.pose.bones:
                bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
    upright_motion_receipt(rig,mesh,kind)
    rig.animation_data.action=bpy.data.actions['FelineIdle'];bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(filename+'.blend')))
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/(filename+'.glb')),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True)
    print('APPENDED UPRIGHT MOTION',kind,flush=True)

def upright_motion_receipt(rig,mesh,kind):
    scale={'Pounce':.8,'Bastion':.95,'Lynx':.76,'Caracal':.84}[kind];style=UPRIGHT_STYLE[kind]
    cosmetic=mesh.vertex_groups.get('FelineCosmeticBounds');excluded=cosmetic.index if cosmetic else -1
    groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
    physical=[v.index for v in mesh.data.vertices if not any(g.group==excluded for g in v.groups)]
    physical_set=set(physical);core={v.index for v in mesh.data.vertices if v.index in physical_set and any(g.group in groups for g in v.groups)};records=[]
    for name in UPRIGHT_NEW:
        action=bpy.data.actions[name];rig.animation_data.action=action;start,end=map(round,action.frame_range)
        record={'clip':name,'duration':(end-start)/60,'height':0,'sideExtent':0,'coreHeight':0,'coreRadius':0,'floor':100,'limbLengthError':0,'maxSupportReach':0,'rootTranslation':0,'rootRotation':0,'pelvisVerticalRange':0,'pelvisLateralRange':0};lo=Vector((100,100,100));hi=-lo
        for frame in range(start,end+1):
            bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
            for index in physical:
                p=deformed.vertices[index].co*scale;record['floor']=min(record['floor'],p.z);record['height']=max(record['height'],p.z);record['sideExtent']=max(record['sideExtent'],abs(p.x))
                if index in core:record['coreHeight']=max(record['coreHeight'],p.z);record['coreRadius']=max(record['coreRadius'],math.hypot(p.x,p.y))
            evaluated.to_mesh_clear();pelvis=rig.pose.bones['pelvis'].head*scale;lo=Vector(tuple(min(lo[i],pelvis[i]) for i in range(3)));hi=Vector(tuple(max(hi[i],pelvis[i]) for i in range(3)))
            record['rootTranslation']=max(record['rootTranslation'],rig.pose.bones['root'].location.length);record['rootRotation']=max(record['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
            for label in ['FL','FR','HL','HR']:
                upper=rig.pose.bones[label+'_upper'];lower=rig.pose.bones[label+'_lower'];paw=rig.pose.bones[label+'_paw'];a=rig.data.bones[label+'_upper'].length;b=rig.data.bones[label+'_lower'].length
                record['limbLengthError']=max(record['limbLengthError'],abs((upper.head-lower.head).length-a)*scale,abs((lower.head-paw.head).length-b)*scale)
                if label[0]=='H':record['maxSupportReach']=max(record['maxSupportReach'],(upper.head-paw.head).length/(a+b))
        record['pelvisVerticalRange']=hi.z-lo.z;record['pelvisLateralRange']=hi.x-lo.x;records.append(record)
    (SOURCE/('upright-locomotion-bounds-'+kind.lower()+'.json')).write_text(json.dumps({'name':kind,'scale':scale,'profile':style,'coreIncludes':'source-tagged physical pelvis/spine/chest/head/weapons/launcher; cosmetic appendages excluded','clips':records},indent=2))
    path=SOURCE/('rig-bounds-'+kind.lower()+'.json');receipt=json.loads(path.read_text());receipt['clips']=[r for r in receipt['clips'] if r['clip'] not in UPRIGHT_NEW]+records;path.write_text(json.dumps(receipt,indent=2))
    print('UPRIGHT BOUNDS',kind,json.dumps(records),flush=True)

def audit_upright_composition(kind):
    """Separate receipt: preserves every older quad/combat/turn audit."""
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(kind+'_Quadruped.blend')))
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
    scale={'Pounce':.8,'Bastion':.95,'Lynx':.76,'Caracal':.84}[kind]
    excluded=mesh.vertex_groups['FelineCosmeticBounds'].index;groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
    physical=[v.index for v in mesh.data.vertices if not any(g.group==excluded for g in v.groups)];physical_set=set(physical)
    core={v.index for v in mesh.data.vertices if v.index in physical_set and any(g.group in groups for g in v.groups)};cache={}
    def sample(name,phase):
        key=(name,phase)
        if key not in cache:
            rig.animation_data.action=bpy.data.actions[name];start,end=rig.animation_data.action.frame_range;bpy.context.scene.frame_set(round(start+(end-start)*phase));bpy.context.view_layer.update()
            cache[key]={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
        return cache[key]
    reference=sample('FelineUprightCombatBase',0);cases=[]
    mixtures=[('Idle','WalkLong',.15),('Idle','WalkLong',.5),('WalkLong','Stride',.25),('WalkLong','Stride',.5),('WalkLong','Stride',1),('Stride','TurnLeft',.5),('WalkLong','TurnRight',.5),('TurnLeft','TurnRight',.5),('TurnLeft','TurnRight',0)]
    for phase in [0,.12,.25,.46,.48,.5,.72,.96]:
        for left,right,weight in mixtures:
            for reaction,rphase in [('CombatBase',0)]+[(n,p) for n in ['Pulse','Missile','Ability','Hit'] for p in [.2,.6]]:
                cases.append((phase,left,right,weight,reaction,rphase,sample('FelineUpright'+left,phase),sample('FelineUpright'+right,phase),sample('FelineUpright'+reaction,rphase)))
    rig.animation_data.action=None
    result={'name':kind,'scale':scale,'samples':len(cases),'coreRadius':0,'coreHeight':0,'coreFloor':100,'floor':100,'limbLengthError':0,'maxHindReach':0,'rootTranslation':0,'rootRotation':0,'method':'source-tagged physical core; idle-longwalk, longwalk-stride, gait-turn and mirrored turn mixtures, including Lynx double release phases; local TRS blend plus full-weight inverse(reference)*reaction additive; procedural aim/contact/carrier handled by independent production composition','radiusCase':None,'heightCase':None,'floorCase':None,'floorBone':None}
    for phase,left,right,weight,reaction,rphase,base,other,attack in cases:
        for bone in rig.pose.bones:
            bp,bq,bs=base[bone.name];op,oq,os=other[bone.name];ap,aq,ass=attack[bone.name];rp,rq,rs=reference[bone.name]
            bone.location=bp.lerp(op,weight)+ap-rp;bone.rotation_quaternion=bq.slerp(oq,weight)@(rq.inverted()@aq)
            bone.scale=Vector(tuple((bs[i]*(1-weight)+os[i]*weight)*ass[i]/rs[i] for i in range(3)))
        bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh();case=[phase,left,right,weight,reaction,rphase]
        for index in physical:
            p=deformed.vertices[index].co*scale
            if p.z<result['floor']:
                result['floor']=p.z;result['floorCase']=case;result['floorBone']=[mesh.vertex_groups[g.group].name for g in mesh.data.vertices[index].groups]
            if index in core:
                result['coreFloor']=min(result['coreFloor'],p.z)
                radius=math.hypot(p.x,p.y)
                if radius>result['coreRadius']:result['coreRadius']=radius;result['radiusCase']=case
                if p.z>result['coreHeight']:result['coreHeight']=p.z;result['heightCase']=case
        evaluated.to_mesh_clear()
        for label in ['FL','FR','HL','HR']:
            upper=rig.pose.bones[label+'_upper'];lower=rig.pose.bones[label+'_lower'];paw=rig.pose.bones[label+'_paw'];a=rig.data.bones[label+'_upper'].length;b=rig.data.bones[label+'_lower'].length
            result['limbLengthError']=max(result['limbLengthError'],abs((upper.head-lower.head).length-a)*scale,abs((lower.head-paw.head).length-b)*scale)
            if label[0]=='H':result['maxHindReach']=max(result['maxHindReach'],(upper.head-paw.head).length/(a+b))
        result['rootTranslation']=max(result['rootTranslation'],rig.pose.bones['root'].location.length);result['rootRotation']=max(result['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
    (SOURCE/('upright-locomotion-composition-'+kind.lower()+'.json')).write_text(json.dumps(result,indent=2));print('UPRIGHT COMPOSITION',json.dumps(result),flush=True)

def bake_turns(rig,kind,feet):
    """Original angular footfalls. Root stays fixed; stance sweep cancels yaw.
    Each mirrored clip uses the same distance phase as the runtime profile.
    """
    style=TURN_STYLE[{'Sentinel_Scout':'Lynx','Sentinel_Mortar':'Caracal','Sentinel_Anchor':'Bastion'}.get(kind,kind)]
    scene=bpy.context.scene
    for name,direction in [('FelineTurnLeft',1),('FelineTurnRight',-1)]:
        old=bpy.data.actions.get(name)
        if old:bpy.data.actions.remove(old)
        action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action
        end=round(style['duration']*60)
        for frame in range(end+1):
            scene.frame_set(frame);reset(rig);phase=frame/end;wave=math.sin(phase*math.tau)
            rig.pose.bones['pelvis'].rotation_quaternion=Matrix.Rotation(-direction*style['lead']*.35*wave,4,'Z').to_quaternion()
            rig.pose.bones['spine'].rotation_quaternion=Matrix.Rotation(direction*style['lead']*.45*wave,4,'Z').to_quaternion()
            rig.pose.bones['chest'].rotation_quaternion=Matrix.Rotation(direction*style['lead']*(.4+.35*wave),4,'Z').to_quaternion()
            rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(direction*style['lead']*(1+.2*math.sin(phase*math.tau+.5)),4,'Z').to_quaternion()
            bpy.context.view_layer.update()
            for label,foot in feet.items():
                mirrored=label if direction>0 else label[0]+('R' if label[1]=='L' else 'L')
                p=(phase-style['offsets'][mirrored])%1;duty=style['duty'];target=foot.copy();lift=0
                if p<duty:angle=direction*style['arc']*(.5-p/duty)
                else:
                    t=(p-duty)/(1-duty);ease=t*t*(3-2*t);angle=direction*style['arc']*(-.5+ease);lift=style['lift']*math.sin(t*math.pi)**2
                target=Matrix.Rotation(angle,4,'Z')@target
                target.z+=lift
                # A slight outward swing arc gives the returning paw clearance
                # without translating the body or changing a bone's length.
                if lift>0:target.x+=(-1 if label[1]=='L' else 1)*lift*.12
                ik(rig,label+'_upper',label+'_lower',label+'_paw',target,Vector((0,1 if label[0]=='F' else -1,0)))
                matrix=Matrix.Rotation(angle,4,'Z')@rig.data.bones[label+'_paw'].matrix_local;matrix.translation=rig.pose.bones[label+'_paw'].head.copy();rig.pose.bones[label+'_paw'].matrix=matrix
                bpy.context.view_layer.update()
            for i in range(5):
                rig.pose.bones['tail_'+str(i)].rotation_quaternion=(Matrix.Rotation(.02*math.sin(phase*math.tau-i*.4),4,'X')@Matrix.Rotation(-direction*style['lead']*(1.3-i*.12)+.03*math.sin(phase*math.tau-i*.5),4,'Z')).to_quaternion()
            for bone in rig.pose.bones:
                bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
        scene.frame_start=0;scene.frame_end=end

def turn_receipt(rig,mesh,kind):
    scale={'Pounce':.8,'Bastion':.95,'Lynx':.76,'Caracal':.84,'Sentinel_Scout':.65,'Sentinel_Mortar':.8,'Sentinel_Anchor':1.05}[kind]
    style=TURN_STYLE[{'Sentinel_Scout':'Lynx','Sentinel_Mortar':'Caracal','Sentinel_Anchor':'Bastion'}.get(kind,kind)]
    cosmetic=mesh.vertex_groups.get('FelineCosmeticBounds');cosmetic_index=cosmetic.index if cosmetic else -1
    physical=[v.index for v in mesh.data.vertices if not any(g.group==cosmetic_index for g in v.groups)]
    groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
    physical_set=set(physical);core={v.index for v in mesh.data.vertices if v.index in physical_set and any(g.group in groups for g in v.groups)}
    records=[]
    for name in ['FelineTurnLeft','FelineTurnRight']:
        rig.animation_data.action=bpy.data.actions[name];start,end=map(round,rig.animation_data.action.frame_range)
        record={'clip':name,'height':0,'coreRadius':0,'sideExtent':0,'floor':100,'rootTranslation':0,'rootRotation':0,'limbLengthError':0,'frames':end-start+1,'pawLift':{},'stanceCancellationError':0}
        limits={label:[100,-100] for label in ['FL','FR','HL','HR']}
        direction=1 if name.endswith('Left') else -1
        for frame in range(start,end+1):
            bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
            for index in physical:
                point=deformed.vertices[index].co*scale;record['height']=max(record['height'],point.z);record['floor']=min(record['floor'],point.z);record['sideExtent']=max(record['sideExtent'],abs(point.x))
                if index in core:record['coreRadius']=max(record['coreRadius'],math.hypot(point.x,point.y))
            evaluated.to_mesh_clear();record['rootTranslation']=max(record['rootTranslation'],rig.pose.bones['root'].location.length);record['rootRotation']=max(record['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
            for label in limits:
                paw=rig.pose.bones[label+'_paw'].head;limits[label][0]=min(limits[label][0],paw.z*scale);limits[label][1]=max(limits[label][1],paw.z*scale)
                for suffix,next_suffix in [('upper','lower'),('lower','paw')]:
                    bone=rig.pose.bones[label+'_'+suffix];distance=(bone.head-rig.pose.bones[label+'_'+next_suffix].head).length;record['limbLengthError']=max(record['limbLengthError'],abs(distance-rig.data.bones[label+'_'+suffix].length)*scale)
                mirrored=label if direction>0 else label[0]+('R' if label[1]=='L' else 'L');phase=(frame-start)/(end-start);p=(phase-style['offsets'][mirrored])%1
                if .05<p<style['duty']-.05:
                    # Undo the relative support sweep to recover the original
                    # foot anchor. This measures actual authored bone placement.
                    angle=direction*style['arc']*(.5-p/style['duty']);rest=rig.data.bones[label+'_paw'].head_local;restored=Matrix.Rotation(-angle,4,'Z')@paw
                    record['stanceCancellationError']=max(record['stanceCancellationError'],(restored-rest).length*scale)
        record['pawLift']={label:maximum-minimum for label,(minimum,maximum) in limits.items()};records.append(record)
    (SOURCE/('turn-bounds-'+kind.lower()+'.json')).write_text(json.dumps({'name':kind,'scale':scale,'turnStyle':style,'coreIncludes':'physical pelvis/spine/chest/head/weapon/launcher; source-tagged appendages excluded','clips':records},indent=2))
    return records

def append_existing_turns(kind):
    """Frozen geometry/gaits stay byte-identical in the editable scene. CPU only."""
    filename=kind if kind.startswith('Sentinel_') else kind+'_Quadruped'
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(filename+'.blend')))
    rig=next(obj for obj in bpy.data.objects if obj.type=='ARMATURE');mesh=next(obj for obj in bpy.data.objects if obj.type=='MESH' and any(mod.type=='ARMATURE' for mod in obj.modifiers))
    feet={label:rig.data.bones[label+'_paw'].head_local.copy() for label in ['FL','FR','HL','HR']}
    bake_turns(rig,kind,feet);records=turn_receipt(rig,mesh,kind)
    receipt_path=SOURCE/('rig-bounds-'+kind.lower()+'.json');receipt=json.loads(receipt_path.read_text());receipt['clips']=[record for record in receipt['clips'] if not record['clip'].startswith('FelineTurn')]+records;receipt['turnStyle']=TURN_STYLE[{'Sentinel_Scout':'Lynx','Sentinel_Mortar':'Caracal','Sentinel_Anchor':'Bastion'}.get(kind,kind)];receipt_path.write_text(json.dumps(receipt,indent=2))
    rig.animation_data.action=bpy.data.actions['FelineIdle'];bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(filename+'.blend')))
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/(filename+'.glb')),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True)
    print('APPENDED ZERO-ROOT TURNS',kind,flush=True)

def audit_turn_composition(kind):
    """Source-tagged armor audit, with the same local quaternion additive order
    as AnimationUtils.makeClipAdditive. Does not rewrite scenes or raw exports.
    """
    filename=kind if kind.startswith('Sentinel_') else kind+'_Quadruped'
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(filename+'.blend')))
    rig=next(obj for obj in bpy.data.objects if obj.type=='ARMATURE');mesh=next(obj for obj in bpy.data.objects if obj.type=='MESH' and any(mod.type=='ARMATURE' for mod in obj.modifiers))
    scale={'Pounce':.8,'Bastion':.95,'Lynx':.76,'Caracal':.84,'Sentinel_Scout':.65,'Sentinel_Mortar':.8,'Sentinel_Anchor':1.05}[kind]
    cosmetic=mesh.vertex_groups.get('FelineCosmeticBounds');excluded=cosmetic.index if cosmetic else -1;groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
    core=[vertex.index for vertex in mesh.data.vertices if not any(g.group==excluded for g in vertex.groups) and any(g.group in groups for g in vertex.groups)]
    cache={}
    def sample(name,phase):
        key=(name,phase)
        if key not in cache:
            action=bpy.data.actions[name];rig.animation_data.action=action;start,end=action.frame_range;bpy.context.scene.frame_set(round(start+(end-start)*phase));bpy.context.view_layer.update()
            cache[key]={bone.name:(bone.location.copy(),bone.rotation_quaternion.copy(),bone.scale.copy()) for bone in rig.pose.bones}
        return cache[key]
    cases=[]
    for phase in [0,.25,.5,.75]:
        for left in [0,.5,1]:
            for gait,weight,gait_phase in [('Idle',1,phase),('Idle',.5,phase),('Walk',.5,phase),('Trot',.35,(phase+.5)%1),('Gallop',.5,(phase+.5)%1)]:
                base=sample('Feline'+gait,gait_phase);l=sample('FelineTurnLeft',phase);r=sample('FelineTurnRight',phase)
                for reaction,reaction_phase in [('CombatBase',0)]+[(name,p) for name in ['Pulse','Missile','Ability','Hit'] for p in [.2,.6]]:
                    cases.append((phase,left,gait,weight,reaction,reaction_phase,base,l,r,sample('Feline'+reaction,reaction_phase)))
    reference=sample('FelineCombatBase',0);rig.animation_data.action=None
    result={'name':kind,'scale':scale,'samples':len(cases),'coreRadius':0,'coreHeight':0,'limbLengthError':0,'rootTranslation':0,'rootRotation':0,'method':'source-tagged physical core; turn/idle-walk-trot-gallop mixtures and mirrored reversal; local TRS blend, inverse(reference)*reaction quaternion at full additive weight; no post-animation aim, contact IK or carrier tilt','radiusCase':None,'heightCase':None}
    for phase,left,gait,weight,reaction,reaction_phase,base,l,r,attack in cases:
        for bone in rig.pose.bones:
            bp,bq,bs=base[bone.name];lp,lq,ls=l[bone.name];rp,rq,rs=r[bone.name];ap,aq,ass=attack[bone.name];refp,refq,refs=reference[bone.name]
            turnp=rp.lerp(lp,left);turnq=rq.slerp(lq,left);turns=rs.lerp(ls,left)
            bone.location=bp.lerp(turnp,weight)+ap-refp;bone.rotation_quaternion=bq.slerp(turnq,weight)@(refq.inverted()@aq)
            bone.scale=Vector(tuple(bs[i]*(1-weight)+turns[i]*weight for i in range(3)));bone.scale=Vector(tuple(bone.scale[i]*ass[i]/refs[i] for i in range(3)))
        bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh();case=[phase,left,gait,weight,reaction,reaction_phase]
        for index in core:
            point=deformed.vertices[index].co*scale;radius=math.hypot(point.x,point.y)
            if radius>result['coreRadius']:result['coreRadius']=radius;result['radiusCase']=case
            if point.z>result['coreHeight']:result['coreHeight']=point.z;result['heightCase']=case
        evaluated.to_mesh_clear();result['rootTranslation']=max(result['rootTranslation'],rig.pose.bones['root'].location.length);result['rootRotation']=max(result['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
        for label in ['FL','FR','HL','HR']:
            for suffix,next_suffix in [('upper','lower'),('lower','paw')]:
                bone=rig.pose.bones[label+'_'+suffix];error=abs((bone.head-rig.pose.bones[label+'_'+next_suffix].head).length-rig.data.bones[label+'_'+suffix].length)*scale;result['limbLengthError']=max(result['limbLengthError'],error)
    (SOURCE/('turn-composition-'+kind.lower()+'.json')).write_text(json.dumps(result,indent=2));print('TURN COMPOSITION',kind,result['coreRadius'],result['coreHeight'],result['limbLengthError'],flush=True)
def mat(name,color,metal=.7,rough=.35,emission=0):
    m=bpy.data.materials.new('Cat_'+name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission;materials[name]=m
def bind(o,bone,material):
    o.data.materials.append(materials[material]);group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
    if any(word in o.name.lower() for word in ['tail','antenna','mast','lidar','whisker','tuft']):
        cosmetic=o.vertex_groups.new(name='FelineCosmeticBounds');cosmetic.add(list(range(len(o.data.vertices))),1,'REPLACE')
    parts.append(o);return o
def box(name,position,size,bone,material,bevel=.06,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position);o=bpy.context.object;o.name=name;o.dimensions=size;o.rotation_euler=rotation
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined chamfer','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return bind(o,bone,material)
def rod(name,a,b,radius,bone,material,vertices=16):
    delta=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=delta.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.name=name;o.rotation_mode='QUATERNION';o.rotation_quaternion=delta.to_track_quat('Z','Y')
    for p in o.data.polygons:p.use_smooth=True
    return bind(o,bone,material)
def ellipsoid(name,p,size,bone,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=p);o=bpy.context.object;o.name=name;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for face in o.data.polygons:face.use_smooth=True
    return bind(o,bone,material)
def armor(name,p,size,bone,material):
    x,y,z=p;w,l,h=size
    vertices=[(x+sx*w*.5,y+sy*l*.5,z+sz*h*.5) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-.72,-.9,1),(.72,-.9,1),(.8,.78,.7),(-.8,.78,.7)]]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    mod=obj.modifiers.new('Armor edge','BEVEL');mod.width=.045;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return bind(obj,bone,material)

def ear(name,p,size,bone,material):
    x,y,z=p;w,d,h=size
    vertices=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x,y-d/2,z+h),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y+d/2,z+h)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return bind(obj,bone,material)
def reset(rig):
    for b in rig.pose.bones:b.rotation_mode='QUATERNION';b.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
def aim(rig,name,start,end):
    bone=rig.data.bones[name];matrix=(bone.tail_local-bone.head_local).rotation_difference(end-start).to_matrix().to_4x4()@bone.matrix_local;matrix.translation=start;rig.pose.bones[name].matrix=matrix;bpy.context.view_layer.update()
def ik(rig,upper,lower,paw,target,pole):
    start=rig.pose.bones[upper].head.copy();a=rig.data.bones[upper].length;b=rig.data.bones[lower].length;delta=target-start;distance=min(delta.length,a+b-.002);axis=delta.normalized();bend=pole-axis*pole.dot(axis);along=(a*a-b*b+distance*distance)/(2*distance)
    joint=start+axis*along+bend.normalized()*math.sqrt(max(0,a*a-along*along));end=start+axis*distance
    aim(rig,upper,start,joint);aim(rig,lower,joint,end);matrix=rig.data.bones[paw].matrix_local.copy();matrix.translation=end;rig.pose.bones[paw].matrix=matrix;bpy.context.view_layer.update()

def transform_bone(rig,name,amount,position,angle=0):
    bone=rig.data.bones[name]
    matrix=Matrix.Rotation(angle*amount,4,'X')@bone.matrix_local
    matrix.translation=bone.head_local.lerp(position,amount)
    rig.pose.bones[name].matrix=matrix;bpy.context.view_layer.update()

def upright_pose(rig,kind,proportions,feet,amount,phase=0,walking=False,airborne=False):
    """Rearing uses an articulated waist/chest; root never rotates or moves."""
    def point(x,y,z):return Vector((x*proportions[0],y*proportions[1],z*proportions[2]))
    sway=.022*math.sin(phase*math.tau)*(1 if walking else .4)*amount
    pounce_lift=.45 if kind=='Pounce' else 0
    spine_angle={'Pounce':-1.02,'Bastion':-1.12,'Lynx':-1.16,'Caracal':-1.07}[kind]
    transform_bone(rig,'pelvis',amount,point(sway,.83,1.55),.12)
    transform_bone(rig,'spine',amount,point(sway,.57,1.7+pounce_lift*.55),spine_angle)
    transform_bone(rig,'chest',amount,point(sway,.26,2.53+pounce_lift),-.045 if kind=='Bastion' else .025)
    transform_bone(rig,'head',amount,point(sway,-.26,2.74+pounce_lift),.02*math.sin(phase*math.tau))
    for label,foot in feet.items():
        front=label[0]=='F';side=-1 if label[1]=='L' else 1;target=foot.copy()
        if front:
            guard={'Pounce':(.9,-.55,2.58),'Bastion':(.68,-.67,2.58),'Lynx':(.55,-.64,2.48 if side<0 else 2.12),'Caracal':(.88,-.49,2.47)}[kind]
            # Forepaws clear the ground early, then fold into the chassis's combat guard.
            arm_phase=min(1,amount*1.32);arm_phase=arm_phase*arm_phase*(3-2*arm_phase)
            target=foot.lerp(point(side*guard[0],guard[1],guard[2]),arm_phase)
            target.z+=.14*math.sin(amount*math.pi)
            if walking:target.y+=.045*math.sin(phase*math.tau+(0 if side<0 else math.pi))*amount
        elif airborne:
            target.y-=.16*amount;target.z+=.48*amount
        elif walking:
            p=(phase-(0 if side<0 else .5))%1;duty=.64;stride=.64 if kind=='Bastion' else .86 if kind=='Lynx' else .76
            if p<duty:target.y+=(-stride/2+stride*p/duty)*amount
            else:
                t=(p-duty)/(1-duty);target.y+=(stride/2-stride*t*t*(3-2*t))*amount;target.z+=.18*math.sin(t*math.pi)*amount
        ik(rig,label+'_upper',label+'_lower',label+'_paw',target,Vector((0,1 if front else -1,.2 if front else 0)))
        if front:
            # Claw pads turn toward the target; they are attack limbs rather than planted feet.
            paw=rig.pose.bones[label+'_paw'];matrix=paw.matrix.copy();rotation=Matrix.Rotation(-.72*amount,4,'X');location=matrix.translation.copy();matrix=rotation@matrix;matrix.translation=location;paw.matrix=matrix
            bpy.context.view_layer.update()
    # Keep the articulated counterweight behind the pelvis rather than pitching it into the floor.
    for i in range(5):
        bone=rig.data.bones['tail_'+str(i)];a=bone.head_local.copy();b=bone.tail_local.copy()
        a.y+=.04*amount;a.z+=.04*amount;b.y+=.04*amount;b.z+=.04*amount
        a.x+=.045*amount*math.sin(phase*math.tau-i*.4);b.x+=.045*amount*math.sin(phase*math.tau-(i+1)*.4)
        aim(rig,'tail_'+str(i),a,b)

def wall_pose(rig,kind,proportions,feet,amount,phase=0,mode='cling'):
    """Compact feline adhesion pose. Root translation is supplied only by authority."""
    def point(x,y,z):return Vector((x*proportions[0],y*proportions[1],z*proportions[2]))
    original_kind=kind;kind={'Sentinel_Scout':'Lynx','Sentinel_Mortar':'Caracal','Sentinel_Anchor':'Bastion'}.get(kind,kind)
    actor_scale={'Pounce':.8,'Bastion':.95,'Lynx':.76,'Caracal':.84,'Sentinel_Scout':.65,'Sentinel_Mortar':.8,'Sentinel_Anchor':1.05}[original_kind]
    radius={'Pounce':1.75,'Bastion':2.05,'Lynx':1.65,'Caracal':1.85,'Sentinel_Scout':1.45,'Sentinel_Mortar':1.75,'Sentinel_Anchor':2.2}[original_kind]
    wall_y=-(radius+.08)/actor_scale+.165*proportions[2]
    mantle=mode=='mantle';lean=math.sin(phase*math.pi) if mantle else 0
    spring=(.032 if kind=='Pounce' else .012 if kind=='Bastion' else .024 if kind=='Lynx' else .016)*math.sin(phase*math.tau) if mode=='climb' else .005*math.sin(phase*math.tau)
    transform_bone(rig,'pelvis',amount,point(0,-.95,.9+spring if mantle else 1.02+spring),-.2)
    spine_y=-.59-lean*.08 if original_kind=='Sentinel_Anchor' else -.7-lean*.2
    transform_bone(rig,'spine',amount,point(0,spine_y,1-lean*.16+spring) if mantle else point(0,-.45,1.2+spring),-.65)
    chest_y=-.58-lean*.015 if original_kind=='Sentinel_Anchor' else -.98-lean*.1
    transform_bone(rig,'chest',amount,point(0,chest_y,1.15-lean*.25+spring) if mantle else point(0,-.68,1.45+spring),.04 if original_kind=='Sentinel_Anchor' else .08)
    transform_bone(rig,'head',amount,point(0,-.98,1.25-lean*.15+spring) if mantle else point(0,-.98,1.62+spring),-.06)
    offsets={'Pounce':{'FL':0,'FR':.45,'HL':.1,'HR':.6},'Bastion':{'FL':0,'FR':.5,'HL':.25,'HR':.75},'Lynx':{'FL':0,'FR':.5,'HL':.5,'HR':0},'Caracal':{'FL':0,'FR':.5,'HL':.3,'HR':.8}}[kind]
    duty={'Pounce':.72,'Bastion':.82,'Lynx':.64,'Caracal':.78}[kind]
    stride={'Pounce':.9,'Bastion':.84,'Lynx':1.08,'Caracal':.9}[kind]
    for label,foot in feet.items():
        front=label[0]=='F';side=-1 if label[1]=='L' else 1
        desired=point(side*(.7 if kind=='Bastion' else .66 if kind=='Lynx' else .73),0,1.7 if front else .68);desired.y=wall_y
        if mantle:desired.z=(.4 if front else .5)*proportions[2]
        if mode=='climb':
            p=(phase-offsets[label])%1
            if p<duty:desired.z+=(stride/2-stride*p/duty)*proportions[2]
            else:
                t=(p-duty)/(1-duty);desired.z+=(-stride/2+stride*t*t*(3-2*t))*proportions[2];desired.y+=.2*math.sin(t*math.pi)
        target=foot.lerp(desired,amount)
        if mantle:
            # Foreclaws clear the ledge while the rear paws tuck, then settle into four-foot support.
            target.z+=(.26 if not front else .2)*math.sin(phase*math.pi)
        ik(rig,label+'_upper',label+'_lower',label+'_paw',target,Vector((0,1 if front else .35,-.1 if front else .3)))
        paw=rig.pose.bones[label+'_paw'];matrix=paw.matrix.copy();location=matrix.translation.copy();matrix=Matrix.Rotation(-math.pi/2*amount,4,'X')@matrix;matrix.translation=location;paw.matrix=matrix;bpy.context.view_layer.update()
    for i in range(5):
        bone=rig.data.bones['tail_'+str(i)];a=bone.head_local.copy();b=bone.tail_local.copy()
        for position,offset in [(a,i),(b,i+1)]:
            position.y-=1.58*amount*proportions[1];position.z+=(-.4+offset*.07)*amount*proportions[2]
            position.x+=.055*amount*math.sin(phase*math.tau-offset*.4)*(1.3 if kind=='Pounce' else .6 if kind=='Bastion' else 1)
        aim(rig,'tail_'+str(i),a,b)

def combat_pose(rig,kind,proportions,feet,mode,phase,upright=False):
    """Rigid authored reactions, baked against a neutral stance for additive use."""
    style={'Sentinel_Scout':'Lynx','Sentinel_Mortar':'Caracal','Sentinel_Anchor':'Bastion'}.get(kind,kind)
    def point(x,y,z):return Vector((x*proportions[0],y*proportions[1],z*proportions[2]))
    if upright:upright_pose(rig,style,proportions,feet,1,0)
    guard={label:rig.pose.bones[label+'_paw'].head.copy() for label in feet} if upright else {}
    pulse=math.sin(math.pi*min(1,phase/.48)) if mode in ('pulse','missile','hit') else math.sin(math.pi*phase)**2
    strength={'Pounce':1,'Bastion':.65,'Lynx':1.2,'Caracal':.85}[style]
    if mode=='death':
        amount=phase*phase*(3-2*phase)
        for name,target in [('pelvis',point(0,.75,.66)),('spine',point(0,.1,.7)),('chest',point(0,-.6,.65)),('head',point(0,-1.02,.61))]:
            bone=rig.pose.bones[name];matrix=bone.matrix.copy();location=matrix.translation.copy();rotation=matrix.to_quaternion().slerp(rig.data.bones[name].matrix_local.to_quaternion(),amount);matrix=Matrix.Rotation(.06*amount if name=='head' else 0,4,'Y')@rotation.to_matrix().to_4x4();matrix.translation=location.lerp(target,amount);bone.matrix=matrix;bpy.context.view_layer.update()
    else:
        for name in ['pelvis','spine','chest','head']:
            bone=rig.pose.bones[name];matrix=bone.matrix.copy();location=matrix.translation.copy()
            if mode=='pulse':location.y+=.035*pulse*strength;location.z-=.018*pulse
            elif mode=='missile':location.y+=.09*pulse*strength;location.z-=.035*pulse
            elif mode=='hit':
                location.z-=.07*pulse;matrix=Matrix.Rotation(.08*pulse*strength,4,'Y')@matrix
            elif mode=='ability':
                crouch={'Pounce':.19,'Bastion':.1,'Lynx':.07,'Caracal':.045}[style]
                location.z-=crouch*pulse
                if name=='head':matrix=Matrix.Rotation((.08 if style=='Caracal' else -.035)*pulse,4,'X')@matrix
            matrix.translation=location;bone.matrix=matrix;bpy.context.view_layer.update()
        for side in ['L','R']:
            recoil=.19 if mode=='pulse' else .08 if mode=='missile' else 0
            rig.pose.bones['weapon_'+side].location.y=-recoil*pulse*strength
        rig.pose.bones['launcher'].rotation_quaternion=Matrix.Rotation(-.12*pulse if mode=='missile' else 0,4,'X').to_quaternion()
    for label,foot in feet.items():
        if upright and label[0]=='F' and mode!='death':
            target=rig.pose.bones[label+'_paw'].head.copy()
            if mode=='ability':
                side=-1 if label[1]=='L' else 1
                target.x+=side*(-.18 if style=='Bastion' else -.25 if style=='Caracal' else -.35 if style=='Pounce' else -.1)*pulse
                target.y-=.42*pulse if style=='Pounce' else .3*pulse if style=='Lynx' and side>0 else 0
                target.z+=(.12 if style=='Bastion' else -.2 if style=='Pounce' else -.12 if style=='Caracal' else .1 if side>0 else 0)*pulse
        else:target=guard[label].lerp(foot,amount) if upright and label[0]=='F' and mode=='death' else foot.copy()
        ik(rig,label+'_upper',label+'_lower',label+'_paw',target,Vector((0,1 if label[0]=='F' else -1,.6 if mode=='death' else .15)))
        if upright and label[0]=='F':
            paw=rig.pose.bones[label+'_paw'];matrix=paw.matrix.copy();location=matrix.translation.copy();matrix=Matrix.Rotation(-.72*(1-amount if mode=='death' else 1),4,'X')@matrix;matrix.translation=location;paw.matrix=matrix;bpy.context.view_layer.update()
    if mode=='death':
        for i in range(5):
            bone=rig.data.bones['tail_'+str(i)];a=bone.head_local.copy();b=bone.tail_local.copy();a.z-=.8*amount;b.z-=.8*amount;a.z=max(.14,a.z);b.z=max(.14,b.z);aim(rig,'tail_'+str(i),a,b)

def build(kind):
    global parts,materials
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);parts=[];materials={}
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    hostile=kind.startswith('Sentinel_');anchor='Anchor' in kind;mortar='Mortar' in kind;scout='Scout' in kind
    lynx=kind=='Lynx';medic=kind=='Caracal';heavy=kind=='Bastion'
    palette={'Pounce':((.5,.52,.43),(.84,.43,.09),(.14,.8,.72)), 'Bastion':((.26,.32,.37),(.82,.61,.18),(.36,.7,1)), 'Lynx':((.045,.2,.22),(.13,.53,.58),(.32,.92,.89)), 'Caracal':((.8,.78,.65),(.95,.28,.055),(.2,.9,.3))}
    paint,trim,glow=palette.get(kind,((.32,.115,.06),(.52,.3,.11),(.85,.085,.018)))
    mat('Armor',paint,.68,.36);mat('Metal',(.11,.145,.155),.9,.26);mat('Dark',(.018,.026,.031),.55,.52);mat('Trim',trim,.7,.34);mat('Glow',glow,.3,.2,1.8);mat('Glass',(.3,.045,.018) if hostile else (.24,.36,.32),.35,.12);mat('Pilot',(.62,.28,.075),.1,.65)
    if not hostile:materials['Glass'].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.38
    arm=bpy.data.armatures.new('FelineWeb_Rig');rig=bpy.data.objects.new('FelineWeb_Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    specs=[('root',None,(0,0,0),(0,0,.3))]
    specs.append(('pelvis','root',(0,.75,1.55),(0,.3,1.6)))
    specs.extend([('spine','pelvis',(0,.1,1.6),(0,-.6,1.7)),('chest','spine',(0,-.6,1.7),(0,-1.05,1.8)),('head','chest',(0,-1.1,1.8),(0,-1.6,1.85))])
    for side,s in [('L',-1),('R',1)]:specs.append(('weapon_'+side,'chest',(s*.56,-1.02,2.02),(s*.56,-1.32,2.02)))
    specs.append(('launcher','spine',(0,.13,2.15),(0,-.17,2.15)))
    hips={};feet={}
    for label,x,y in [('FL',-.73,-.88),('FR',.73,-.88),('HL',-.73,.9),('HR',.73,.9)]:
        front=label[0]=='F';hip=Vector((x,y,1.7 if front else 1.6));knee=Vector((x,y+(.35 if front else -.42),.91));foot=Vector((x,y-(.12 if front else -.08),.18))
        hips[label]=hip;feet[label]=foot
        specs.extend([(label+'_upper','chest' if front else 'pelvis',hip,knee),(label+'_lower',label+'_upper',knee,foot),(label+'_paw',label+'_lower',foot,foot+Vector((0,-.35,0)))])
    prev='spine'
    for i in range(5):
        a=(0,1.1+i*.47,1.7-i*.14);b=(0,1.57+i*.47,1.56-i*.14);specs.append(('tail_'+str(i),prev,a,b));prev='tail_'+str(i)
    for name,parent,head,tail in specs:
        b=arm.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    bulk=1.32 if anchor else 1.08 if mortar else .91 if scout else 1.18 if heavy else .82 if lynx else 1
    armor('Main dorsal shell',(0,.02 if hostile else -.25,1.72),(1.38*bulk,2.5 if hostile else 1.84,.64),'spine','Armor')
    if not hostile:
        armor('Articulated feline pelvis',(0,.87,1.65),(1.32*bulk,.83,.62),'pelvis','Armor')
        rod('Visible folding waist bearing',(-.6,.56,1.62),(.6,.56,1.62),.2,'pelvis','Metal')
    armor('Scapular chest',(0,-.87,1.66),(1.52*bulk,.78,.72),'chest','Metal')
    box('Ventral drive',(0,.12 if hostile else -.17,1.43),(.92,2.08 if hostile else 1.45,.48),'spine','Dark',.12)
    for s in [-1,1]:
        armor('Flank articulated shield',(s*.71,.18,1.65),(.18,1.53,.65),'spine','Armor')
        for i in range(5):box('Side thermal fin',(s*.8,.67-i*.16,1.54),(.11,.08,.38),'spine','Metal',.01,rotation=(0,0,s*.2))
        rod('Back weapon mounting',(s*.48,-.05,2.02),(s*.48,-1.02,2.02),.14,'spine','Metal')
        if not lynx and not medic:
            armor('Shoulder missile cassette',(s*.58,.13,2.15),(.4,.94,.35),'launcher','Dark')
            for k in range(3):rod('Missile exhaust',(s*.58,.56,2.06+k*.07),(s*.58,.62,2.06+k*.07),.025,'launcher','Glow',8)
        gun_end=-1.34 if lynx or medic else -1.7 if heavy else -1.58
        rod('Repeater barrel',(s*.56,-1.02,2.02),(s*.56,gun_end,2.02),.09 if heavy else .057 if lynx else .073,'weapon_L' if s<0 else 'weapon_R','Dark')
        rod('Muzzle sleeve',(s*.56,gun_end+.2,2.02),(s*.56,gun_end,2.02),.14 if heavy else .085 if lynx else .11,'weapon_L' if s<0 else 'weapon_R','Metal')
        box('Identification stripe',(s*.41,.03,2.04),(.055,1.14,.035),'spine','Trim',.01)
    armor('Feline cranial plate',(0,-1.43,1.88),(1.02,.78,.62),'head','Armor')
    armor('Cat muzzle',(0,-1.75 if lynx or anchor else -1.86,1.68),(.62,.4,.29),'head','Metal')
    box('Nose sensor',(0,-1.94 if lynx or anchor else -2.05,1.78),(.2,.1,.1),'head','Dark',.025)
    for s in [-1,1]:
        armor('Cat cheek',(s*.34,-1.71 if lynx or anchor else -1.85,1.76),(.31,.29 if lynx or anchor else .32,.28),'head','Armor')
        box('Feline luminous optic',(s*.32,-1.83,1.99),(.22,.06,.095),'head','Glow',.018,rotation=(0,s*.12,0))
        ear('Triangular feline ear',(s*.41,-1.14,2.11),(.32,.22,.67 if medic else .48),'head','Armor')
        box('Ear inner sensor',(s*.41,-1.28,2.33),(.07,.045,.21),'head','Glow',.01)
        if medic:
            rod('Caracal ear tuft',(s*.41,-1.14,2.74),(s*.45,-1.14,2.99),.026,'head','Dark',6)
        for j in range(3):rod('Whisker sensor',(s*.31,-2.03,1.77),(s*(.78+j*.07),-2.12+j*.08,1.77+j*.05),.014,'head','Metal',6)
    armor('Cockpit protective collar',(0,-.42,2.07),(.84,.86,.35),'chest','Metal')
    ellipsoid('Amber pilot canopy',(0,-.43,2.22),(.38,.49,.4),'chest','Glass')
    if not hostile:
        ellipsoid('Tiny cat pilot',(0,-.47,2.22),(.17,.18,.17),'chest','Pilot')
        for s in [-1,1]:armor('Tiny pilot ear',(s*.11,-.46,2.41),(.08,.1,.15),'chest','Pilot')
        for s in [-1,1]:ellipsoid('Tiny pilot eye',(s*.055,-.635,2.26),(.018,.018,.026),'chest','Dark')
    if not hostile:
        # Each chassis has a distinct loadout and silhouette as well as its paint.
        if heavy:
            for s in [-1,1]:
                armor('Bastion overlapping shoulder shield',(s*.99,-.71,1.71),(.52,1.2,1.04),'chest','Armor')
                box('Shield identification band',(s*1.265,-.71,1.77),(.045,.75,.11),'chest','Trim',.01)
                armor('Bastion rear stabilizer',(s*.91,.91,1.57),(.37,.62,.79),'pelvis','Armor')
            armor('Bastion armored reactor',(0,.65,2.17),(.98,.76,.51),'spine','Metal')
            for i in range(5):box('Reactor cooling slat',(0,.42+i*.12,2.44),(.7,.065,.05),'spine','Dark',.01)
        elif lynx:
            rod('Recon swept sensor mast',(0,.84,2.02),(0,1.12,2.9),.027,'pelvis','Metal',8)
            armor('Lynx lidar head',(0,1.1,2.89),(.32,.23,.16),'pelvis','Dark')
            box('Lidar viewing slit',(0,.985,2.89),(.22,.02,.06),'pelvis','Glow',.005)
            for s in [-1,1]:
                armor('Lynx swept dorsal fin',(s*.38,.73,2.09),(.1,.79,.43),'spine','Trim')
                rod('Recon telemetry antenna',(s*.41,-1.11,2.54),(s*.56,-.94,2.99),.016,'head','Metal',6)
        elif medic:
            for s in [-1,1]:
                armor('External repair cell cradle',(s*.72,.44,1.96),(.17,1.22,.65),'spine','Metal')
                for i in range(3):
                    rod('Green replaceable repair cell',(s*.91,.04+i*.36,1.7),(s*.91,.04+i*.36,2.25),.11,'spine','Glow',12)
                    rod('Repair cell cap',(s*.91,.04+i*.36,2.23),(s*.91,.04+i*.36,2.32),.125,'spine','Dark',12)
                box('Medic shoulder cross horizontal',(s*.81,-.84,1.82),(.04,.33,.09),'chest','Trim',.008)
                box('Medic shoulder cross vertical',(s*.815,-.84,1.82),(.04,.09,.33),'chest','Trim',.008)
            armor('Repair drone dock',(0,.64,2.2),(.6,.68,.22),'spine','Armor')
        else:
            for s in [-1,1]:
                armor('Pounce swept jump thruster',(s*.86,.72,1.66),(.35,.89,.49),'pelvis','Metal')
                rod('Jump turbine exhaust',(s*.88,1.1,1.65),(s*.88,1.3,1.65),.14,'pelvis','Dark',12)
                rod('Jump turbine glow',(s*.88,1.29,1.65),(s*.88,1.31,1.65),.1,'pelvis','Glow',12)
            for i in range(3):armor('Articulated dorsal spine plate',(0,.26+i*.38,2.02),(.74,.32,.16),'spine','Armor')
    else:
        box('Autonomous optical visor',(0,-.82,2.3),(.61,.09,.18),'chest','Glow',.04)
        for side in [-1,1]:
            armor('Sentinel forward armor',(side*.87,-.74,1.7),(.39,.95,.75),'chest','Armor')
        if scout:
            for side in [-1,1]:
                rod('Rangefinder mast',(side*.46,.73,2.06),(side*.46,.73,2.91),.025,'spine','Metal',8)
                ellipsoid('Scan emitter',(side*.46,.73,2.91),(.06,.06,.065),'spine','Glow')
            armor('Scout lidar cap',(0,.83,2.11),(.68,.44,.23),'spine','Metal')
        if mortar:
            for side in [-1,1]:
                for row in range(2):
                    for column in range(3):
                        x=side*(.45+column*.19);y=.25+row*.4
                        rod('Mortar launch tube',(x,y,2.08),(x,y-.25,2.85),.095,'launcher','Dark',12)
                        rod('Loaded warhead',(x,y-.225,2.79),(x,y-.25,2.87),.068,'launcher','Trim',12)
        if anchor:
            for side in [-1,1]:
                armor('Anchor shoulder bastion',(side*1.05,-.75,1.83),(.55,1.13,1.04),'chest','Armor')
                armor('Anchor siege flank',(side*.98,.6,1.7),(.46,1.45,.92),'spine','Armor')
                for row in range(4):box('Siege radiator',(side*1.23,.45-row*.16,1.68),(.08,.09,.47),'spine','Metal',.012)
                rod('Heavy cannon shroud',(side*.62,-1.11,2.18),(side*.62,-1.75,2.18),.14,'weapon_L' if side<0 else 'weapon_R','Metal')
    for label,hip in hips.items():
        front=label[0]=='F';x,y,z=hip;knee=rig.data.bones[label+'_upper'].tail_local;foot=feet[label]
        ellipsoid('Ball shoulder',hip,(.26,.27,.27),label+'_upper','Metal')
        rod('Upper limb titanium',hip,knee,.19 if front else .23,label+'_upper','Metal')
        center=(hip+knee)/2;armor('Upper cat limb armor',center,(.39*bulk,.43,.75),label+'_upper','Armor')
        ellipsoid('Knee bearing',knee,(.19,.21,.19),label+'_lower','Dark')
        rod('Lower actuator',knee,foot,.12,label+'_lower','Metal')
        midpoint=(knee+foot)/2;sleeve=armor('Lower paw sleeve',midpoint,(.29,.29,.48),label+'_lower','Armor')
        sleeve_axis=Vector((0,0,1)).rotation_difference((knee-foot).normalized())
        for vertex in sleeve.data.vertices:vertex.co=midpoint+sleeve_axis@(vertex.co-midpoint)
        ram_axis=(knee-foot).normalized();ram_start=knee-ram_axis*.08+Vector((.15,0,0));ram_end=foot+ram_axis*.17+Vector((.15,0,0))
        rod('Lower-leg hydraulic ram',ram_start,ram_end,.045,label+'_lower','Trim')
        armor('Feline planted paw',(foot.x,foot.y-.1,.13),(.5,.54,.23),label+'_paw','Dark')
        for toe in [-1,0,1]:
            box('Armored toe',(foot.x+toe*.155,foot.y-.3,.14),(.13,.28,.15),label+'_paw','Armor',.035)
            box('Metal claw',(foot.x+toe*.155,foot.y-.47,.1),(.05,.14,.08),label+'_paw','Metal',.01)
        rod('Paw energy strip',(foot.x-.17,foot.y-.22,.245),(foot.x+.17,foot.y-.22,.245),.018,label+'_paw','Glow',8)
    for i in range(5):
        bone=rig.data.bones['tail_'+str(i)];a=bone.head_local;b=bone.tail_local
        rod('Tail vertebral link',a,b,.14-i*.015,'tail_'+str(i),'Metal')
        ellipsoid('Tail joint',a,(.16-i*.012,.16-i*.012,.16-i*.012),'tail_'+str(i),'Dark')
    ellipsoid('Tail signal tip',rig.data.bones['tail_4'].tail_local,(.09,.13,.09),'tail_4','Glow')
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name=kind+'_Web_Quadruped'
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    # Proportions are authored in rig space so the animation has matching limb lengths.
    proportions=(.78,1.08,1.16) if lynx else (1.12,.93,.95) if heavy else (.98,.94,1.05) if medic else (1,1.04,1)
    for vertex in mesh.data.vertices:
        vertex.co.x*=proportions[0];vertex.co.y*=proportions[1];vertex.co.z*=proportions[2]
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for bone in arm.edit_bones:
        for point in [bone.head,bone.tail]:
            point.x*=proportions[0];point.y*=proportions[1];point.z*=proportions[2]
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False);bpy.context.view_layer.objects.active=mesh
    for foot in feet.values():
        foot.x*=proportions[0];foot.y*=proportions[1];foot.z*=proportions[2]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
    mod=mesh.modifiers.new('Feline armature','ARMATURE');mod.object=rig;mesh.parent=rig
    scene=bpy.context.scene;scene.render.fps=60
    motion_style={'Sentinel_Scout':'Lynx','Sentinel_Mortar':'Caracal','Sentinel_Anchor':'Bastion'}.get(kind,kind);gait_style=GAIT_STYLE[motion_style]
    for name,mode,duration in [('FelineIdle','idle',2),('FelineWalk','walk',1.15),('FelineTrot','trot',.68),('FelineGallop','run',.5),('FelineAir','air',1)]:
        action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action
        end=round(duration*60)+1
        for frame in range(1,end+1):
            scene.frame_set(frame);reset(rig);phase=(frame-1)/(end-1)
            rig.pose.bones['spine'].location.z=(gait_style['spring'] if mode=='run' else gait_style['spring']/3 if mode=='trot' else .014)*math.sin(phase*math.tau*(2 if mode=='trot' else 1))
            rig.pose.bones['spine'].rotation_quaternion=Matrix.Rotation((gait_style['spring']*.93 if mode=='run' else .018)*math.sin(phase*math.tau),4,'X').to_quaternion()
            rig.pose.bones['head'].rotation_quaternion=Matrix.Rotation(.04*math.sin(phase*math.tau),4,'X').to_quaternion()
            bpy.context.view_layer.update()
            for index,(label,foot) in enumerate(feet.items()):
                offsets={'walk':{'FL':0,'HR':.25,'FR':.5,'HL':.75},'trot':{'FL':0,'HR':0,'FR':.5,'HL':.5},'run':{'FL':0,'FR':.08,'HL':.46,'HR':.54}}
                p=(phase-offsets.get(mode,{}).get(label,0))%1
                gait_index=0 if mode=='walk' else 1 if mode=='trot' else 2;target=foot.copy();duty=gait_style['duties'][gait_index]
                if mode in ('walk','trot','run'):
                    stride=gait_style['strides'][gait_index];lift=gait_style['lifts'][gait_index]
                    if p<duty:target.y+=-stride/2+stride*p/duty
                    else:t=(p-duty)/(1-duty);target.y+=stride/2-stride*(t*t*(3-2*t));target.z+=lift*math.sin(t*math.pi)
                elif mode=='air':target.y+=-.4 if label[0]=='F' else .5;target.z+=.5
                ik(rig,label+'_upper',label+'_lower',label+'_paw',target,Vector((0,1 if label[0]=='F' else -1,0)))
            for i in range(5):rig.pose.bones['tail_'+str(i)].rotation_quaternion=(Matrix.Rotation(.045*math.sin(phase*math.tau-i*.45),4,'X')@Matrix.Rotation(.11*math.sin(phase*math.tau-i*.4),4,'Z')).to_quaternion()
            for bone in rig.pose.bones:bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
        scene.frame_start=1;scene.frame_end=end
    if not hostile:
        bounds=[];scale={'Pounce':.8,'Bastion':.95,'Lynx':.76,'Caracal':.84}[kind]
        cosmetic_group=mesh.vertex_groups.get('FelineCosmeticBounds');cosmetic_index=cosmetic_group.index if cosmetic_group else -1
        physical_vertices=[v.index for v in mesh.data.vertices if not any(g.group==cosmetic_index for g in v.groups)]
        core_groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
        physical_set=set(physical_vertices);core_vertices={v.index for v in mesh.data.vertices if v.index in physical_set and any(g.group in core_groups for g in v.groups)}
        for name,walking,duration,transition in [('FelineUprightIdle',False,2,None),('FelineUprightWalk',True,.95,None),('FelineUprightAir',False,1,None),('FelineTransformUp',False,.7,'up'),('FelineTransformDown',False,.7,'down')]:
            action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;end=round(duration*60)
            evidence={'clip':name,'duration':duration,'height':0,'radius':0,'floor':100,'hindPawMin':100,'hindPawMax':-100,'forePawMin':100,'forePawMax':-100}
            for frame in range(end+1):
                scene.frame_set(frame);reset(rig);phase=frame/end
                amount=phase*phase*(3-2*phase) if transition=='up' else 1-phase*phase*(3-2*phase) if transition=='down' else 1
                upright_pose(rig,kind,proportions,feet,amount,phase if transition is None else 0,walking,name=='FelineUprightAir')
                for bone in rig.pose.bones:
                    bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
                if frame%6==0 or frame==end:
                    bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
                    for index in physical_vertices:
                        p=deformed.vertices[index].co*scale;evidence['height']=max(evidence['height'],p.z);evidence['floor']=min(evidence['floor'],p.z);evidence['radius']=max(evidence['radius'],math.hypot(p.x,p.y))
                    evaluated.to_mesh_clear()
                    for label in feet:
                        height=rig.pose.bones[label+'_paw'].head.z*scale;prefix='fore' if label[0]=='F' else 'hind';evidence[prefix+'PawMin']=min(evidence[prefix+'PawMin'],height);evidence[prefix+'PawMax']=max(evidence[prefix+'PawMax'],height)
            bounds.append(evidence)
            scene.frame_start=0;scene.frame_end=end
        (SOURCE/('upright-bounds-'+kind.lower()+'.json')).write_text(json.dumps({'name':kind,'scale':scale,'cosmeticExcluded':'tail, whiskers, antennae, sensor mast/lidar, ear tufts','clips':bounds},indent=2))
        climb_bounds=[]
        for name,mode,duration in [('FelineGrab','grab',.3),('FelineCling','cling',1.5),('FelineClimb','climb',.9),('FelineMantle','mantle',.9)]:
            action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;end=round(duration*60)
            evidence={'clip':name,'duration':duration,'height':0,'radius':0,'floor':100,'coreRadius':0,'coreHeight':0,'sideExtent':0,'rootTranslation':0,'rootRotation':0,'pawPlaneMin':100,'pawPlaneMax':-100,'stanceContactError':0,'wallClearanceMin':100}
            for frame in range(end+1):
                scene.frame_set(frame);reset(rig);phase=frame/end;ease=phase*phase*(3-2*phase)
                amount=ease if mode=='grab' else 1-ease if mode=='mantle' else 1
                wall_pose(rig,kind,proportions,feet,amount,phase,mode)
                for bone in rig.pose.bones:
                    bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
                evidence['rootTranslation']=max(evidence['rootTranslation'],rig.pose.bones['root'].location.length);evidence['rootRotation']=max(evidence['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
                if frame%3==0 or frame==end:
                    bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
                    for index in physical_vertices:
                        p=deformed.vertices[index].co*scale;evidence['height']=max(evidence['height'],p.z);evidence['floor']=min(evidence['floor'],p.z);evidence['radius']=max(evidence['radius'],math.hypot(p.x,p.y));evidence['wallClearanceMin']=min(evidence['wallClearanceMin'],p.y+({'Pounce':1.75,'Bastion':2.05,'Lynx':1.65,'Caracal':1.85}[kind]+.08))
                        evidence['sideExtent']=max(evidence['sideExtent'],abs(p.x))
                        if index in core_vertices:evidence['coreRadius']=max(evidence['coreRadius'],math.hypot(p.x,p.y));evidence['coreHeight']=max(evidence['coreHeight'],p.z)
                    evaluated.to_mesh_clear()
                    for label in feet:
                        paw_y=rig.pose.bones[label+'_paw'].head.y*scale;evidence['pawPlaneMin']=min(evidence['pawPlaneMin'],paw_y);evidence['pawPlaneMax']=max(evidence['pawPlaneMax'],paw_y)
                        if mode=='cling':evidence['stanceContactError']=max(evidence['stanceContactError'],abs(paw_y-.165*scale*proportions[2]+({'Pounce':1.75,'Bastion':2.05,'Lynx':1.65,'Caracal':1.85}[kind]+.08)))
            scene.frame_start=0;scene.frame_end=end;climb_bounds.append(evidence)
        (SOURCE/('climb-bounds-'+kind.lower()+'.json')).write_text(json.dumps({'name':kind,'scale':scale,'cosmeticExcluded':'tail, whiskers, antennae, sensor mast/lidar, ear tufts','coreIncludes':'pelvis/spine/chest/head armor; contact limbs excluded only from coreRadius/coreHeight, included in all other measurements','clips':climb_bounds},indent=2))
    else:
        scale=1.05 if anchor else .8 if mortar else .65
        for name,mode,duration in [('FelineGrab','grab',.3),('FelineCling','cling',1.5),('FelineClimb','climb',.9),('FelineMantle','mantle',.9)]:
            action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;end=round(duration*60)
            for frame in range(end+1):
                scene.frame_set(frame);reset(rig);phase=frame/end;ease=phase*phase*(3-2*phase);wall_pose(rig,kind,proportions,feet,ease if mode=='grab' else 1-ease if mode=='mantle' else 1,phase,mode)
                for bone in rig.pose.bones:
                    bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
            scene.frame_start=0;scene.frame_end=end
    combat_bounds=[]
    cosmetic_group=mesh.vertex_groups.get('FelineCosmeticBounds');cosmetic_index=cosmetic_group.index if cosmetic_group else -1
    physical_vertices=[v.index for v in mesh.data.vertices if not any(g.group==cosmetic_index for g in v.groups)]
    for up in ([False] if hostile else [False,True]):
        for suffix,mode,duration in [('CombatBase','pulse',.1),('Pulse','pulse',.22),('Missile','missile',.44),('Ability','ability',.7),('Hit','hit',.34),('Death','death',1.05)]:
            name='Feline'+('Upright' if up else '')+suffix;action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;end=round(duration*60)
            record={'clip':name,'duration':end/60,'radius':0,'height':0,'floor':100,'rootTranslation':0,'rootRotation':0,'pawPlantError':0}
            for frame in range(end+1):
                scene.frame_set(frame);reset(rig);phase=0 if suffix=='CombatBase' else frame/end;combat_pose(rig,kind,proportions,feet,mode,phase,up)
                for bone in rig.pose.bones:
                    bone.keyframe_insert('location',frame=frame);bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('scale',frame=frame)
                if frame%3==0 or frame==end:
                    evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
                    for index in physical_vertices:
                        p=deformed.vertices[index].co*scale;record['radius']=max(record['radius'],math.hypot(p.x,p.y));record['height']=max(record['height'],p.z);record['floor']=min(record['floor'],p.z)
                    evaluated.to_mesh_clear()
                    for label,foot in feet.items():
                        if not up or label[0]=='H':record['pawPlantError']=max(record['pawPlantError'],(rig.pose.bones[label+'_paw'].head-foot).length*scale)
                    record['rootTranslation']=max(record['rootTranslation'],rig.pose.bones['root'].location.length);record['rootRotation']=max(record['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
            combat_bounds.append(record);scene.frame_start=0;scene.frame_end=end
    (SOURCE/('combat-bounds-'+kind.lower()+'.json')).write_text(json.dumps({'name':kind,'scale':scale,'clips':combat_bounds},indent=2))
    bake_turns(rig,kind,feet);turn_receipt(rig,mesh,kind)
    # Source-level admission uses tagged cosmetic vertices; glTF sampling also
    # runs independently after export, including attachment and additive layers.
    core_groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
    physical_set=set(physical_vertices);core_vertices={v.index for v in mesh.data.vertices if v.index in physical_set and any(g.group in core_groups for g in v.groups)}
    rig_bounds=[]
    for action in bpy.data.actions:
        rig.animation_data.action=action;start,end=map(round,action.frame_range)
        record={'clip':action.name,'height':0,'coreRadius':0,'sideExtent':0,'floor':100,'rootTranslation':0,'rootRotation':0,'limbLengthError':0}
        for frame in sorted(set(list(range(start,end+1,6))+[end])):
            scene.frame_set(frame);bpy.context.view_layer.update();evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());deformed=evaluated.to_mesh()
            for index in physical_vertices:
                p=deformed.vertices[index].co*scale;record['height']=max(record['height'],p.z);record['floor']=min(record['floor'],p.z);record['sideExtent']=max(record['sideExtent'],abs(p.x))
                if index in core_vertices:record['coreRadius']=max(record['coreRadius'],math.hypot(p.x,p.y))
            evaluated.to_mesh_clear();record['rootTranslation']=max(record['rootTranslation'],rig.pose.bones['root'].location.length);record['rootRotation']=max(record['rootRotation'],rig.pose.bones['root'].rotation_quaternion.angle)
            for label in feet:
                for suffix,next_suffix in [('upper','lower'),('lower','paw')]:
                    bone=rig.pose.bones[label+'_'+suffix];distance=(bone.head-rig.pose.bones[label+'_'+next_suffix].head).length
                    record['limbLengthError']=max(record['limbLengthError'],abs(distance-rig.data.bones[label+'_'+suffix].length)*scale)
        rig_bounds.append(record)
    (SOURCE/('rig-bounds-'+kind.lower()+'.json')).write_text(json.dumps({'name':kind,'scale':scale,'gaitStyle':gait_style,'coreIncludes':'physical pelvis/spine/chest/head/weapon/launcher armor; source-tagged tail/whisker/antenna/tuft cosmetics excluded','clips':rig_bounds},indent=2))
    rig.animation_data.action=bpy.data.actions['FelineIdle'];scene.frame_set(1)
    filename=kind if hostile else kind+'_Quadruped'
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(filename+'.blend')))
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/(filename+'.glb')),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True)
    print('NEW QUADRUPED',kind,len(mesh.data.polygons),'polygons',flush=True)
    if not hostile and '--portraits' in sys.argv:
        render_portrait(kind,rig)
    if not hostile and '--upright-previews' in sys.argv:
        rig.animation_data.action=bpy.data.actions['FelineUprightIdle'];scene.frame_set(0)
        render_portrait(kind,rig,True)
    if not hostile and '--climb-previews' in sys.argv:
        rig.animation_data.action=bpy.data.actions['FelineCling'];scene.frame_set(0)
        render_portrait(kind,rig,False,'climb-')
    if '--combat-previews' in sys.argv:
        for clip,frame,prefix in [('FelinePulse',4,'combat-pulse-'),('FelineAbility',21,'combat-ability-'),('FelineDeath',63,'combat-death-')]:
            rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);render_portrait(kind,rig,False,prefix)

def render_portrait(kind,rig,upright=False,prefix=None):
    art=SOURCE if upright or prefix else ROOT/'assets/runtime/art';art.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Studio softbox') or obj.name.startswith('Hangar portrait'):bpy.data.objects.remove(obj,do_unlink=True)
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True
    scene.world.color=(.16,.19,.22)
    for position,power,size,color in [((3,-4,7),1600,5,(.72,.86,1)),((-4,-1,4),1000,4,(.38,1,.83)),((1,5,5),2200,3,(1,.63,.32))]:
        light=bpy.data.lights.new('Studio softbox','AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=color
        obj=bpy.data.objects.new('Studio softbox',light);bpy.context.collection.objects.link(obj);obj.location=position;obj.rotation_euler=(Vector((0,0,1.3))-obj.location).to_track_quat('-Z','Y').to_euler()
    camera_data=bpy.data.cameras.new('Hangar portrait');camera=bpy.data.objects.new('Hangar portrait',camera_data);bpy.context.collection.objects.link(camera)
    camera.location=(5,-7,4.8 if upright else 4.1);camera.rotation_euler=(Vector((0,.12,1.9 if upright else 1.35))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=5.9;scene.camera=camera
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(art/((prefix or ('upright-' if upright else 'chassis-'))+kind.lower()+'.png'));bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    requested=next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--kind=')),None)
    for kind in ([] if '--enemies-only' in sys.argv else ['Pounce','Bastion','Lynx','Caracal'])+([] if '--players-only' in sys.argv else ['Sentinel_Scout','Sentinel_Mortar','Sentinel_Anchor']):
        if requested and kind!=requested:continue
        if '--upright-bounds-only' in sys.argv:
            bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(kind+'_Quadruped.blend')))
            upright_motion_receipt(next(o for o in bpy.data.objects if o.type=='ARMATURE'),next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)),kind)
        elif '--upright-composition-only' in sys.argv:audit_upright_composition(kind)
        elif '--upright-motion-only' in sys.argv:append_existing_upright(kind)
        elif '--turn-composition-only' in sys.argv:audit_turn_composition(kind)
        elif '--turns-only' in sys.argv:append_existing_turns(kind)
        else:build(kind)

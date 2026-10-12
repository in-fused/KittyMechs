"""Measured source-tagged physical armor; retains explicit aim/composition scope."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/source/pounce-art-v1'
baseline='--baseline' in sys.argv
bpy.ops.wm.open_mainfile(filepath=str(OUT/('approved-Pounce_Quadruped.blend' if baseline else 'Pounce_Quadruped.art-v1.blend')))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
cosmetic=mesh.vertex_groups['FelineCosmeticBounds'].index
groups={g.index for g in mesh.vertex_groups if g.name in ['pelvis','spine','chest','head','weapon_L','weapon_R','launcher']}
physical=[v.index for v in mesh.data.vertices if not any(g.group==cosmetic for g in v.groups)]
physical_set=set(physical);core=[v.index for v in mesh.data.vertices if v.index in physical_set and any(g.group in groups for g in v.groups)]
cache={}
def pose(name,p):
    key=(name,p)
    if key not in cache:
        a=bpy.data.actions[name];rig.animation_data.action=a;start,end=a.frame_range;bpy.context.scene.frame_set(round(start+(end-start)*p));bpy.context.view_layer.update()
        cache[key]={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
    return cache[key]
def measure(record,case=None):
    bpy.context.view_layer.update();o=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());data=o.to_mesh()
    for i in core:
        p=data.vertices[i].co*.8;assert all(math.isfinite(x) for x in p);radius=math.hypot(p.x,p.y)
        if radius>record['coreRadius']:
            record['coreRadius']=radius;record['radiusDetail']={'case':case,'vertex':i,'bones':[mesh.vertex_groups[g.group].name for g in mesh.data.vertices[i].groups],'sourcePosition':list(mesh.data.vertices[i].co),'posedPosition':list(p)}
        record['coreHeight']=max(record['coreHeight'],p.z);record['coreFloor']=min(record['coreFloor'],p.z)
    for i in physical:
        p=data.vertices[i].co*.8;record['physicalHeight']=max(record['physicalHeight'],p.z);record['physicalFloor']=min(record['physicalFloor'],p.z)
    o.to_mesh_clear();record['samples']+=1
def empty():return {'samples':0,'coreRadius':0,'coreHeight':0,'coreFloor':100,'physicalHeight':0,'physicalFloor':100}
rows=[]
for a in bpy.data.actions:
    row={'clip':a.name,**empty()}
    for phase in [0,.125,.25,.5,.75,.875,1]:
        p=pose(a.name,phase);rig.animation_data.action=None
        for b in rig.pose.bones:b.location,b.rotation_quaternion,b.scale=p[b.name]
        measure(row,[a.name,phase])
    rows.append(row)
composed={}
for upright in [False,True]:
    prefix='FelineUpright' if upright else 'Feline';reference=pose(prefix+'CombatBase',0);cases=[]
    mixes=[('Idle','WalkLong',.15),('WalkLong','Stride',.5),('Stride','TurnLeft',.5),('TurnLeft','TurnRight',.5)] if upright else [('Idle','Walk',.5),('Walk','Trot',.5),('Trot','Gallop',.5),('Walk','TurnLeft',.5),('TurnLeft','TurnRight',.5),('Air','Air',1)]
    for left,right,w in mixes:
        for phase in [0,.12,.25,.46,.5,.72,.96]:
            base=pose(prefix+left,phase);other=pose(prefix+right,(phase+.23)%1 if 'Turn' in right else phase)
            for reaction,rphase in [('CombatBase',0)]+[(n,p) for n in ['Pulse','Missile','Ability','Hit'] for p in [.2,.6]]:
                attack=pose(prefix+reaction,rphase);cases.append((w,base,other,attack,[left,right,w,phase,reaction,rphase]))
    row=empty();rig.animation_data.action=None
    for w,base,other,attack,case in cases:
        # Carrier's pi yaw maps world aim-pitch to opposite source X sign.
        for aim,pitch in [(-.65,-.24),(-.65,.22),(0,0),(.65,-.24),(.65,.22)]:
            for b in rig.pose.bones:
                p,q,s=base[b.name];op,oq,os=other[b.name];ap,aq,ass=attack[b.name];rp,rq,rs=reference[b.name]
                b.location=p.lerp(op,w)+ap-rp;b.rotation_quaternion=q.slerp(oq,w)@(rq.inverted()@aq);b.scale=Vector(tuple((s[k]*(1-w)+os[k]*w)*ass[k]/rs[k] for k in range(3)))
            bpy.context.view_layer.update();head=rig.pose.bones['head'];matrix=head.matrix.copy();position=matrix.translation.copy();matrix=Matrix.Rotation(pitch,4,'X')@Matrix.Rotation(aim,4,'Z')@matrix;matrix.translation=position;head.matrix=matrix
            measure(row,case+[aim,pitch])
    composed['upright' if upright else 'quadruped']=row
receipt={'scale':.8,'sourceTaggedPhysicalVertices':len(physical),'sourceTaggedCoreVertices':len(core),'standalone':rows,'composition':composed,'method':'Actual derivative evaluated source mesh;32clips x7 phases. Adjacent gait/turn/air bases plus inverse-reference full additive4 reactions at two phases, independent turn phase+.23, opposing exact head aim yaw/pitch limits. Excludes procedural carrier/IK and authority trajectory; these require actual production critic. Cosmetic group remains only inherited whiskers/tail; every new armor part physical except tail.'}
(OUT/('baseline-core-bounds.json' if baseline else 'source-core-bounds.json')).write_text(json.dumps(receipt,indent=2));print('POUNCE_ART_CORE',json.dumps(composed),flush=True)

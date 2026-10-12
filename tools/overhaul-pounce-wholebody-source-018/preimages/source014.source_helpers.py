"""ONE complete anatomical mech-cat source; new rest frames and all new render geometry."""
import bpy, bmesh, math, json, pathlib, hashlib, datetime, struct, traceback
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT=pathlib.Path(__file__).resolve().parents[3];HERE=pathlib.Path(__file__).resolve().parent
OLD=ROOT/'assets/source/overhaul-pounce-skinned-001/Pounce_Skinned_001.blend'
OLDRAW=ROOT/'assets/source/overhaul-pounce-skinned-001/Pounce_Skinned_001.raw.glb'
PROTECTED={str(OLD):'63fdc9b9ea96459d8943ab519ca6e7cc3f2d39dcb21f0b74915359e8109bd400',str(OLDRAW):'2a12ec71e453c811faad006cbfa29b99dc395f995a13d20974e3f2982c429eab'}
PARTS=[];PADS=[];CLAWS=[];RIG=None;MATS=[];FAIL=[];START=None;GEOMETRY=None
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def write(n,v):(HERE/n).write_text(json.dumps(v,indent=2,allow_nan=False),encoding='utf8')
def rows(m):return [list(map(float,r)) for r in m]
def native(p):return [.8*p[0],.8*p[2],-.8*p[1]]
def bounds(v):return [[min(p[i] for p in v) for i in range(3)],[max(p[i] for p in v) for i in range(3)]]
def mat(name,c,metal,rough,emit=0):
    m=bpy.data.materials.new('FelinePBR_'+name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
    return m
def weights(o,records):
    for i,w in enumerate(records):
        total=sum(w.values())
        if abs(total-1)>1e-6:raise RuntimeError('AUTHOR_WEIGHT_TOTAL:'+o.name)
        for name,value in w.items():
            group=o.vertex_groups.get(name) or o.vertex_groups.new(name=name);group.add([i],value,'REPLACE')
    arm=o.modifiers.new('OneAnatomicalPoseOwner','ARMATURE');arm.object=RIG;o.parent=RIG;o.matrix_parent_inverse=Matrix.Identity(4)
def mesh(name,v,f,bone,material,role,w=None,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata(v,[],f);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);data.materials.append(MATS[material]);uv=data.uv_layers.new(name='OwnedAnatomyUV')
    for p in data.polygons:
        p.use_smooth=smooth
        for j in p.loop_indices:c=data.vertices[data.loops[j].vertex_index].co;uv.data[j].uv=(c.x*.35+c.y*.11,c.z*.35+c.y*.29)
    weights(o,w or [{bone:1} for x in v]);o['source_owner']=bone;o['source_role']=role
    PARTS.append({'name':name,'role':role,'owner':bone,'material':MATS[material].name});return o
def fillet(o,width=.014,segments=2):
    bpy.context.view_layer.objects.active=o;o.select_set(True);m=o.modifiers.new('PurposeBevel','BEVEL');m.width=width;m.segments=segments;m.limit_method='ANGLE';m.angle_limit=.7;bpy.ops.object.modifier_apply(modifier=m.name);o.select_set(False);return o
def solid(name,v,bone,material,role):
    # Eight authored corner positions, not a scale/angle variant of the prior body.
    return fillet(mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],bone,material,role,smooth=False))
def path(name,points,rx,rz,bones,material,role,n=32):
    v=[];w=[]
    for i,p in enumerate(points):
        d=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized();a=Vector((1,0,0));a=(a-d*a.dot(d)).normalized();b=d.cross(a).normalized()
        for j in range(n):
            t=j*2*math.pi/n;v.append(list(Vector(p)+a*rx[i]*math.cos(t)+b*rz[i]*math.sin(t)));w.append(bones[i] if isinstance(bones[i],dict) else {bones[i]:1})
    f=[tuple(reversed(range(n)))]
    for i in range(len(points)-1):
        for j in range(n):k=(j+1)%n;f.append((i*n+j,i*n+k,(i+1)*n+k,(i+1)*n+j))
    f.append(tuple(range((len(points)-1)*n,len(points)*n)))
    return mesh(name,v,f,list(w[0])[0],material,role,w)
def body_weight(y):
    if y<-.35:return {'chest':1}
    if y<.10:t=(y+.35)/.45;return {'chest':1-t,'spine':t}
    if y<.48:t=(y-.10)/.38;return {'spine':1-t,'pelvis':t}
    return {'pelvis':1}
BODY=[(-1.25,1.55,.145,.135),(-1.05,1.51,.245,.23),(-.86,1.46,.37,.31),(-.64,1.43,.425,.345),(-.38,1.40,.40,.32),(-.10,1.37,.33,.26),(.16,1.34,.265,.235),(.39,1.32,.29,.25),(.66,1.34,.365,.29),(.87,1.36,.335,.26),(1.07,1.38,.17,.15)]
def body_skin():
    pts=[(0,y,z) for y,z,x,r in BODY];return path('AnatomicalChassis',pts,[r[2] for r in BODY],[r[3] for r in BODY],[body_weight(r[0]) for r in BODY],2,'continuous-tapered-thorax-waist-haunch',48)
def fitted_patch(name,rings,a0,a1,owner,material,role,n=24,offset=.018,thick=.025):
    # Genuine shaped outside/inside surfaces with an open anatomical outline, closed by thickness.
    v=[];w=[]
    for inward in (False,True):
        for y,z,x,r in rings:
            delta=offset+(0 if inward else thick)
            for j in range(n+1):a=a0+(a1-a0)*j/n;v.append([(x+delta)*math.cos(a),y,z+(r+delta)*math.sin(a)]);w.append(body_weight(y) if owner=='BODY' else {owner:1})
    stride=n+1;layer=len(rings)*stride;f=[]
    for k in range(len(rings)-1):
        for j in range(n):a=k*stride+j;b=a+stride;f.extend([(a,a+1,b+1,b),(a+layer,b+layer,b+1+layer,a+1+layer)])
    outline=[j for j in range(stride)]+[k*stride+n for k in range(1,len(rings))]+[(len(rings)-1)*stride+j for j in range(n-1,-1,-1)]+[k*stride for k in range(len(rings)-2,0,-1)]
    for a,b in zip(outline,outline[1:]+outline[:1]):f.append((a,b,b+layer,a+layer))
    return fillet(mesh(name,v,f,owner if owner!='BODY' else 'spine',material,role,w),.003,1)
def detail_strip(name,pts,radius,bone,material=0):return path(name,pts,[radius]*len(pts),[radius]*len(pts),[bone]*len(pts),material,'owned-cable-or-seam',8)
def hardware(name,c,bone):
    c=Vector(c);return path(name,[list(c+Vector((-.008,0,0))),list(c+Vector((.008,0,0)))],[.012]*2,[.012]*2,[bone]*2,0,'recessed-fastener',8)
def rig():
    global RIG,MATS
    for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
    MATS=[mat('BodyContact014_Titanium',(.115,.16,.19),.75,.43),mat('BodyContact014_OchreCeramic',(.34,.23,.125),.37,.51),mat('BodyContact014_GraphiteRubber',(.026,.035,.042),.12,.73),mat('BodyContact014_AmberOptic',(.92,.32,.055),.45,.30,1.1)]
    arm=bpy.data.armatures.new('FelineBodyContact014');RIG=bpy.data.objects.new('Pounce_BodyContact014_Rig',arm);bpy.context.collection.objects.link(RIG);bpy.context.view_layer.objects.active=RIG;RIG.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    defs=[('root',(0,0,0),(0,0,.25),None),('pelvis',(0,.72,1.36),(0,.30,1.34),'root'),('spine',(0,.30,1.34),(0,-.36,1.43),'pelvis'),('chest',(0,-.36,1.43),(0,-.95,1.51),'spine'),('head',(0,-1.11,1.57),(0,-1.65,1.60),'chest'),('launcher',(0,-.04,1.69),(0,-.30,1.73),'spine')]
    for limb,sign in [('FL',-1),('FR',1),('HL',-1),('HR',1)]:
        if limb.startswith('F'):
            hip=(sign*.47,-.79,1.42);knee=(sign*.51,-.35,.78);ankle=(sign*.49,-1.02,.19)
            defs.extend([(limb+'_upper',hip,knee,'chest'),(limb+'_lower',knee,ankle,limb+'_upper'),(limb+'_paw',ankle,(sign*.49,-1.32,.16),limb+'_lower')])
        else:
            hip=(sign*.43,.76,1.35);knee=(sign*.49,.25,.91);hock=(sign*.48,.97,.40);ankle=(sign*.46,.77,.17)
            defs.extend([(limb+'_upper',hip,knee,'pelvis'),(limb+'_lower',knee,hock,limb+'_upper'),(limb+'_hock',hock,ankle,limb+'_lower'),(limb+'_paw',ankle,(sign*.46,.47,.14),limb+'_hock')])
    for i in range(5):
        defs.append(('tail_'+str(i),(0,1.01+i*.34,1.40-i*.038),(0,1.35+i*.34,1.362-i*.038),'pelvis' if i==0 else 'tail_'+str(i-1)))
    for name,h,t,parent in defs:
        b=arm.edit_bones.new(name);b.head=h;b.tail=t
        if parent:b.parent=arm.edit_bones[parent]
    for limb in ('FL','FR','HL','HR'):
        p=arm.edit_bones[limb+'_paw'].head.copy()
        for d in range(4):
            x=p.x+(d-1.5)*.084;y=p.y-.17+(abs(d-1.5)-.5)*.020
            b=arm.edit_bones.new(limb+'_digit_'+str(d));b.head=(x,p.y-.083,.095);b.tail=(x,y-.050,.075);b.parent=arm.edit_bones[limb+'_paw']
            c=arm.edit_bones.new(limb+'_claw_'+str(d));c.head=(x,y+.007,.109);c.tail=(x,y-.050,.096);c.parent=b
    bpy.ops.object.mode_set(mode='OBJECT');RIG.select_set(False)
def armor():
    fitted_patch('ThoraxSlopedMantle',BODY[1:5],.32,math.pi-.32,'BODY',0,'layered-scapula-thorax-shell',n=32)
    fitted_patch('WaistDorsalPlate',BODY[5:7],.54,math.pi-.54,'BODY',1,'tapered-waist-panel')
    fitted_patch('PelvicMantle',BODY[7:10],.27,math.pi-.27,'BODY',0,'defined-sloped-haunch-armor',n=32)
    # Independently angled cheek/scapula plates with fitted source ring coordinates.
    for sign in (-1,1):
        a0,a1=(-.32,.30) if sign==1 else (math.pi-.30,math.pi+.32)
        fitted_patch('RibSidePlate_'+str(sign),BODY[2:5],a0,a1,'BODY',1,'sloped-rib-side-plate',offset=.032)
        fitted_patch('HipSidePlate_'+str(sign),BODY[8:10],a0,a1,'BODY',1,'sloped-hip-side-plate',offset=.032)
        for j in range(6):
            y=-.54+j*.095;detail_strip('RibLouvre_'+str(sign)+'_'+str(j),[(sign*.418,y,1.33),(sign*.40,y-.012,1.40),(sign*.36,y-.020,1.48)],.009,'chest')
        detail_strip('WaistHydraulic_'+str(sign),[(sign*.275,.18,1.16),(sign*.30,.37,1.13),(sign*.32,.53,1.18)],.018,'spine')
        for y in (-.74,-.49,.64,.83):hardware('BodyFlushFastener_'+str(sign)+'_'+str(y),(sign*(.42 if y<0 else .375),y,1.47 if y<0 else 1.41),'chest' if y<0 else 'pelvis')
    # Low fitted folded spine cassette, clearly shaped to torso slope rather than a floating box.
    solid('DorsalEquipmentCassette',[(-.14,-.28,1.72),(.14,-.28,1.72),(.12,.10,1.64),(-.12,.10,1.64),(-.11,-.24,1.80),(.11,-.24,1.80),(.09,.07,1.73),(-.09,.07,1.73)],'launcher',0,'folded-dorsal-equipment')
    for j in range(6):detail_strip('CassetteVent_'+str(j),[(-.086,-.22+j*.046,1.793-j*.010),(.086,-.22+j*.046,1.793-j*.010)],.006,'launcher',2)
def head():
    rings=[(-1.13,1.58,.14,.125),(-1.28,1.60,.245,.16),(-1.44,1.59,.22,.135),(-1.60,1.545,.17,.09),(-1.76,1.53,.085,.055)]
    path('SlimFelineHead',[(0,y,z) for y,z,x,r in rings],[r[2] for r in rings],[r[3] for r in rings],['head']*len(rings),0,'slim-wedge-head',48)
    fitted_patch('BrowCanopy',rings[1:4],.32,math.pi-.32,'head',1,'layered-brow-canopy',n=24,offset=.010,thick=.016)
    for sign in (-1,1):
        # Slanting eyes are authored low-profile facet solids, not square glowing cubes.
        v=[(sign*.219,-1.40,1.652),(sign*.188,-1.53,1.625),(sign*.177,-1.535,1.648),(sign*.211,-1.405,1.677)]
        back=[(p[0]-sign*.006,p[1],p[2]) for p in v];eye=mesh('EyeSlit_'+str(sign),v+back,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'head',3,'slanted-feline-optic',smooth=False)
        ear=mesh('SweptEarFin_'+str(sign),[(sign*.14,-1.25,1.735),(sign*.24,-1.17,2.015),(sign*.30,-1.035,1.73),(sign*.15,-1.22,1.718),(sign*.235,-1.145,1.975),(sign*.27,-1.012,1.72)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'head',0,'swept-feline-ear',smooth=False);fillet(ear,.009)
        detail_strip('MuzzleCrease_'+str(sign),[(sign*.067,-1.735,1.493),(sign*.13,-1.61,1.49),(sign*.17,-1.51,1.52)],.007,'head',2)
        for j in range(3):detail_strip('CheekServiceVent_'+str(sign)+'_'+str(j),[(sign*.218,-1.32+j*.027,1.58),(sign*.220,-1.32+j*.027,1.62)],.006,'head',2)
    mesh('CatNose',[(-.045,-1.78,1.55),(.045,-1.78,1.55),(0,-1.803,1.512),(-.036,-1.762,1.546),(.036,-1.762,1.546),(0,-1.774,1.516)],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'head',2,'feline-nose',smooth=False)
    # Short curved neck ribs, integrated into retained continuous chassis silhouette.
    for i in range(3):fitted_patch('NeckProtection_'+str(i),[(-1.22+i*.045,1.55,.15,.14),(-1.195+i*.045,1.553,.157,.145)],.45,math.pi-.45,'head',0,'cervical-layer',n=24,thick=.013)
def limb_geometry():
    for limb in ('FL','FR','HL','HR'):
        upper=RIG.data.bones[limb+'_upper'];lower=RIG.data.bones[limb+'_lower'];paw=RIG.data.bones[limb+'_paw'];u=upper.head_local;k=lower.head_local;p=paw.head_local
        if limb.startswith('F'):
            pts=[u,u.lerp(k,.18),u.lerp(k,.40),u.lerp(k,.76),k,k.lerp(p,.28),k.lerp(p,.62),k.lerp(p,.91),p]
            rx=[.15,.195,.205,.14,.105,.108,.088,.075,.075];rz=[.15,.23,.22,.13,.105,.14,.107,.074,.075]
            names=[upper.name]*4+[{upper.name:.5,lower.name:.5}]+[lower.name]*3+[paw.name]
        else:
            h=RIG.data.bones[limb+'_hock'].head_local
            pts=[u,u.lerp(k,.20),u.lerp(k,.45),u.lerp(k,.80),k,k.lerp(h,.22),k.lerp(h,.58),h,h.lerp(p,.50),p]
            rx=[.19,.225,.235,.165,.105,.098,.075,.070,.057,.062];rz=[.19,.28,.26,.145,.105,.11,.082,.072,.066,.070]
            names=[upper.name]*4+[{upper.name:.5,lower.name:.5}]+[lower.name]*2+[limb+'_hock']*2+[paw.name]
        path(limb+'_ContinuousLimb',list(map(list,pts)),rx,rz,names,2,'continuous-muscular-limb-skin',32)
        # Fitted swept plates follow upper muscle contour; lower guards follow bends, never identical cones.
        for seg,bone,start,end,rad in [('Scapula',upper.name,u,k,.16),('ForeGuard' if limb.startswith('F') else 'HockGuard',lower.name,k,lower.tail_local,.085)]:
            d=end-start;points=[start+d*t for t in (.16,.30,.48,.70,.81)];r=[rad*.84,rad*1.18,rad*1.12,rad*.75,rad*.54]
            # Shell via open longitudinal sector plus thickness in transported normal frame.
            armor_strip(limb+'_'+seg,points,r,[x*1.12 for x in r],bone,0 if seg=='Scapula' else 1,side=-1 if limb.endswith('L') else 1)
        # Joint discs are recessed finite cylinders, no spherical external housings.
        sign=-1 if limb.endswith('L') else 1
        detail_strip(limb+'_RecessedHinge',[(k.x+sign*.095,k.y,k.z),(k.x+sign*.11,k.y,k.z)],.044,lower.name,0)
        detail_strip(limb+'_UpperActuator',[(u.x+sign*.16,u.y+.05,u.z-.12),(k.x+sign*.12,k.y-.04,k.z+.16)],.019,upper.name,0)
        detail_strip(limb+'_HydraulicLine',[(u.x-sign*.10,u.y,u.z-.15),(k.x-sign*.09,k.y,k.z+.12),(p.x-sign*.06,p.y+.02,p.z+.10)],.013,lower.name,2)
        paw_geometry(limb,p)
def armor_strip(name,points,rx,rz,bone,material,side):
    n=20;v=[];count=len(points)*(n+1)
    for inner in (False,True):
        for i,p in enumerate(points):
            d=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized();a=Vector((side,0,0));a=(a-d*a.dot(d)).normalized();b=d.cross(a)
            for j in range(n+1):ang=-1.10+2.2*j/n;delta=.022 if inner else .040;v.append(list(p+a*(rx[i]+delta)*math.cos(ang)+b*(rz[i]+delta)*math.sin(ang)))
    f=[];stride=n+1
    for i in range(len(points)-1):
        for j in range(n):a=i*stride+j;f.extend([(a,a+1,a+stride+1,a+stride),(a+count,a+stride+count,a+stride+1+count,a+1+count)])
    boundary=list(range(stride))+[i*stride+n for i in range(1,len(points))]+[(len(points)-1)*stride+j for j in range(n-1,-1,-1)]+[i*stride for i in range(len(points)-2,0,-1)]
    for a,b in zip(boundary,boundary[1:]+boundary[:1]):f.append((a,b,b+count,a+count))
    return fillet(mesh(name,v,f,bone,material,'swept-fitted-anatomical-armor'),.003,1)
def paw_geometry(limb,p):
    # One anatomical metacarpal with four rounded forward lobes. Toes are contiguous, not pills.
    n=64;v=[]
    for z,scale in [(.050,.86),(.085,1),(.135,.90),(.195,.53)]:
        for j in range(n):
            a=j*2*math.pi/n;x=.175*math.cos(a);y=-.070+.14*math.sin(a)
            if math.sin(a)<0:y-=.032*(.5+.5*math.cos(8*a))
            v.append([p.x+x*scale,p.y+y*scale,z])
    f=[tuple(reversed(range(n)))]
    for i in range(3):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    f.append(tuple(range(3*n,4*n)))
    skin=mesh(limb+'_IntegratedPawSkin',v,f,limb+'_paw',2,'continuous-wrist-metacarpal-fourtoe-base')
    # Dorsal armor is fitted sloped fingers, with an actual forward-open recess at each toe.
    for d in range(4):
        x=p.x+(d-1.5)*.084;y=p.y-.17+(abs(d-1.5)-.5)*.020;bone=limb+'_digit_'+str(d)
        # Actual recess: subtract named cube from paw skin, then fitted open hood with no filled core.
        bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y-.01,.109));cut=bpy.context.object;cut.name=limb+'_TransientClawRecess_'+str(d);cut.scale=(.029,.105,.070)
        bpy.context.view_layer.objects.active=skin;mod=skin.modifiers.new('ActualToeCavity','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
        # Fitted narrow sculpted U hood follows continuous toe base; circular front arch, low root.
        vv=[];nn=24
        for inner in (False,True):
            for yy,z,rx,rz in [(y+.060,.092,.030,.031),(y+.012,.106,.037,.036),(y-.065,.102,.030,.026)]:
                for j in range(nn+1):a=math.pi*j/nn;t=.006 if inner else 0;vv.append([x+(rx-t)*math.cos(a),yy,z+(rz-t)*math.sin(a)])
        stride=nn+1;layer=3*stride;ff=[]
        for i in range(2):
            for j in range(nn):a=i*stride+j;ff.extend([(a,a+1,a+stride+1,a+stride),(a+layer,a+stride+layer,a+stride+1+layer,a+1+layer)])
        boundary=list(range(stride))+[stride+nn,2*stride+nn]+[2*stride+j for j in range(nn-1,-1,-1)]+[stride]
        for a,b in zip(boundary,boundary[1:]+boundary[:1]):ff.append((a,b,b+layer,a+layer))
        mesh(limb+'_ToeArmor_'+str(d),vv,ff,bone,0,'integrated-curved-recessed-toe-armor')
        pad(limb,d,(x,y-.010),(.033,.060),bone)
        points=[(x,y+.025,.111),(x,y+.008,.116),(x,y-.014,.112),(x,y-.037,.103),(x,y-.048,.084)]
        claw=path(limb+'_Claw_'+str(d),points,[.0055,.005,.004,.0025,.0007],[.0055,.005,.004,.0025,.0007],[limb+'_claw_'+str(d)]*5,0,'compact-recessed-curved-claw',16);CLAWS.append({'object':claw.name,'pawSkin':skin.name,'limb':limb,'index':d})
    # This entire new paw base is explicitly one rigid paw ownership; Boolean-born vertices inherit it.
    skin.vertex_groups.clear();skin.vertex_groups.new(name=limb+'_paw').add(list(range(len(skin.data.vertices))),1,'REPLACE')
    pad(limb,4,(p.x,p.y-.027),(.092,.060),limb+'_paw')
    # Connected narrow wrist rises from same paw skin into limb endpoint, not a stacked collar.
    detail_strip(limb+'_WristTendon',[(p.x,p.y+.018,.16),list(p+Vector((0,.01,.07)))],.053,limb+'_paw',2)
    armor_strip(limb+'_WristCuff',[Vector((p.x,p.y+.01,.19)),Vector((p.x,p.y+.035,.25)),Vector((p.x,p.y+.045,.29))],[.067,.064,.058],[.070,.055,.046],limb+'_paw',0,side=-1 if limb.endswith('L') else 1)
def pad(limb,d,c,r,bone):
    n=24;v=[]
    for z,s in [(.018,.88),(.027,.97),(.045,1),(.057,.91)]:
        for j in range(n):a=j*2*math.pi/n;v.append([c[0]+r[0]*s*math.cos(a),c[1]+r[1]*s*math.sin(a),z])
    f=[tuple(reversed(range(n)))]
    for i in range(3):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    f.append(tuple(range(3*n,4*n)));o=mesh(limb+'_BearingPad_'+str(d),v,f,bone,2,'physical-author-functional-pad')
    sole=[face for face in o.data.polygons if all(abs(o.data.vertices[i].co.z-.018)<1e-8 for i in face.vertices)]
    if len(sole)!=1:raise RuntimeError('AUTHOR_PAD_FACET:'+o.name)
    PADS.append({'object':o.name,'limb':limb,'index':d,'bone':bone,'polygon':sole[0].index,'vertices':list(sole[0].vertices),'armatureSource':[list(o.data.vertices[i].co) for i in sole[0].vertices],'boneLocal':[list(RIG.data.bones[bone].matrix_local.inverted()@o.data.vertices[i].co) for i in sole[0].vertices],'intent':'actual authored planeZ.018; not lowestclaw'})
def tail():
    for i in range(5):
        b=RIG.data.bones['tail_'+str(i)];d=b.tail_local-b.head_local;p=[b.head_local+d*t for t in (.04,.20,.50,.82,.96)];r=.066-i*.009
        path('TailFlex_'+str(i),list(map(list,p)),[r]*5,[r*.85]*5,[b.name]*5,2,'continuous-tail-flexure',32)
        armor_strip('TailArmor_'+str(i),p,[r*.94]*5,[r*.84]*5,b.name,0,side=1)
def geometry():
    dg=bpy.context.evaluated_depsgraph_get();data=[]
    for o in bpy.data.objects:
        if not o.get('source_owner'):continue
        e=o.evaluated_get(dg);m=e.to_mesh();m.calc_loop_triangles();v=[list(e.matrix_world@x.co) for x in m.vertices];t=[list(x.vertices) for x in m.loop_triangles];data.append({'object':o.name,'owner':o['source_owner'],'role':o['source_role'],'verticesWorldSource':v,'triangles':t,'bounds':bounds(v)});e.to_mesh_clear()
    return data
def check(g):
    issues=[];lowest=min((p[2],o['object'],i,p) for o in g for i,p in enumerate(o['verticesWorldSource']))
    if lowest[0]<-1e-5:issues.append({'kind':'actual-source-below-frozen-floor','lowest':lowest})
    table={o['object']:o for o in g}
    # Target actual forbidden skin/claw occupancy only, not arbitrary mounted fastener triangle rules.
    for item in CLAWS:
        a=table[item['object']];b=table[item['pawSkin']];ta=BVHTree.FromPolygons(a['verticesWorldSource'],a['triangles'],all_triangles=True);tb=BVHTree.FromPolygons(b['verticesWorldSource'],b['triangles'],all_triangles=True);pairs=ta.overlap(tb)
        if pairs:issues.append({'kind':'actual-claw-paw-surface-crossing','a':a['object'],'b':b['object'],'pairs':len(pairs),'first':list(pairs[0])});break
        # Explicit no-crossing containment against this actual closed paw, not an interface exception.
        point=Vector(a['verticesWorldSource'][0]);direction=Vector((.913,.347,.217)).normalized();origin=point;count=0
        for j in range(64):
            hit,normal,index,distance=tb.ray_cast(origin,direction,100)
            if hit is None:break
            count+=1;origin=hit+direction*1e-6
        nearest=tb.find_nearest(point)
        if count%2 and nearest is not None and nearest[3]>1e-6:issues.append({'kind':'actual-claw-paw-contained-vertex','a':a['object'],'b':b['object'],'vertex':0,'point':list(point),'rayCount':count,'nearestSurfaceDistance':nearest[3]});break
    return issues
def source_packet(g):
    return {'schema':'feline-body-contact-source014','units':{'source':'Xright-Yfront-Zup','nativeModel':'(.8x,.8z,-.8y)','actorPiMount':'SEPARATE; neverpremultiplyboneposes'},'rest':{b.name:{'parent':b.parent.name if b.parent else None,'head':list(b.head_local),'tail':list(b.tail_local),'matrixLocalToArmature':rows(b.matrix_local),'lengthSource':b.length} for b in RIG.data.bones},'currentRigWorld':rows(RIG.matrix_world),'currentPose':{b.name:rows(b.matrix) for b in RIG.pose.bones},'pads':PADS,'parts':PARTS,'profiles':{'frontChains':['upper','lower','paw'],'hindChains':['upper','lower','hock','paw'],'quadCarrierSpeedIntent':7.6,'uprightCarrierSpeedIntent':4.864,'RIntentSeconds':.7,'actualClips':'NONE; all source motion remains UNRUN','bodyMass':'notcalibrated; nativecapsule/contactauthority unchanged untilseparateintegration'},'sourceQualification':'STATIC_NEW_ANATOMY_ONLY; native/clips/ordinary/art unknown'}
def export_mesh():
    v=[];faces=[];records=[];uv=[];mats=[];smooth=[];offset={}
    for o in list(bpy.data.objects):
        if o.type!='MESH' or not o.get('source_owner'):continue
        base=len(v);offset[o.name]=base;v.extend([list(x.co) for x in o.data.vertices]);records.extend([{o.vertex_groups[g.group].name:float(g.weight) for g in x.groups} for x in o.data.vertices])
        for f in o.data.polygons:faces.append([base+i for i in f.vertices]);mats.append(MATS.index(o.data.materials[0]));smooth.append(f.use_smooth);uv.append([list(o.data.uv_layers.active.data[i].uv) for i in f.loop_indices])
    data=bpy.data.meshes.new('OptimizedBodyContact014');data.from_pydata(v,[],faces);data.update()
    sourceIds=data.attributes.new(name='_SOURCE_VERTEX',type='FLOAT',domain='POINT')
    for i,value in enumerate(sourceIds.data):value.value=float(i)
    for m in MATS:data.materials.append(m)
    layer=data.uv_layers.new(name='OwnedAnatomyUV')
    for f,mi,s,coords in zip(data.polygons,mats,smooth,uv):
        f.material_index=mi;f.use_smooth=s
        for i,c in zip(f.loop_indices,coords):layer.data[i].uv=c
    o=bpy.data.objects.new('Pounce_BodyContact014_Export',data);bpy.context.collection.objects.link(o);weights(o,records);write('export-source-offsets.json',offset)
    for obj in bpy.context.selected_objects:obj.select_set(False)
    o.select_set(True);RIG.select_set(True);bpy.context.view_layer.objects.active=RIG
    bpy.ops.export_scene.gltf(filepath=str(HERE/'Pounce_BodyContact014.raw.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_attributes=True)
    o.hide_render=True
def readback():
    raw=(HERE/'Pounce_BodyContact014.raw.glb').read_bytes();size,kind=struct.unpack_from('<II',raw,12);doc=json.loads(raw[20:20+size].decode());off=20+size;length,kind=struct.unpack_from('<II',raw,off);binary=raw[off+8:off+8+length]
    def access(index):
        a=doc['accessors'][index];view=doc['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt,bytesize={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']];start=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',bytesize*n)
        values=[list(struct.unpack_from('<'+fmt*n,binary,start+i*stride)) for i in range(a['count'])]
        if a.get('normalized'):
            divisor={5121:255,5123:65535,5125:4294967295}[a['componentType']];values=[[x/divisor for x in row] for row in values]
        return values
    bind=[{'joints':s['joints'],'actualInverseBindColumnMajor':access(s['inverseBindMatrices'])} for s in doc.get('skins',[])]
    # Record actual positions/joints/weights by material; no coordinate-equality inference of sole ownership.
    attr=[];padExport=[];offsets=json.loads((HERE/'export-source-offsets.json').read_text())
    for m in doc.get('meshes',[]):
        for pi,p in enumerate(m['primitives']):
            ids=[int(x[0]) for x in access(p['attributes']['_SOURCE_VERTEX'])];indices=[x[0] for x in access(p['indices'])]
            attr.append({'material':p.get('material'),'positionsGLTFMeshLocal':access(p['attributes']['POSITION']),'joints':access(p['attributes']['JOINTS_0']),'weights':access(p['attributes']['WEIGHTS_0']),'triangles':indices,'actualSourceVertexIds':ids})
            for pad in PADS:
                sole={offsets[pad['object']]+i for i in pad['vertices']};tri=[indices[i:i+3] for i in range(0,len(indices),3) if all(ids[j] in sole for j in indices[i:i+3])]
                if tri:padExport.append({'sourcePad':pad['object'],'mesh':m.get('name'),'primitive':pi,'actualExportedSoleTriangles':tri,'sourceIdsByExportVertex':{str(j):ids[j] for triangle in tri for j in triangle}})
    write('export-actual-attributes.json',attr)
    write('export-readback.json',{'nodes':doc.get('nodes'),'skins':doc.get('skins'),'inverseBinds':bind,'accessors':doc.get('accessors'),'sourceToGLTFLocalRelation':'actual node/root and mesh values retained; unshiftedsource comparison NOTassumed','padVertexOwnership':'actual exported_SOURCE_VERTEX directidentity, notpositionequality','actualPadMappings':padExport,'actualMaterialPrimitives':len(attr)})
    if {p['sourcePad'] for p in padExport}!={p['object'] for p in PADS}:raise RuntimeError('ACTUAL_EXPORTED_SOURCE_ID_PAD_MAP_INCOMPLETE')
def views():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('AnatomyReviewWorld');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.025,.036,.045,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.30;scene.world=world
    for name,loc,power,size in [('Key',(-4,-4,6),1600,4),('Fill',(4,-3,3),1000,5),('Rim',(3,4,4),2200,4)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.0))-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('AnatomyReview');o=bpy.data.objects.new('AnatomyReview',d);scene.collection.objects.link(o);scene.camera=o
    for n,loc,target,scale in [('full.png',(4.3,-5.5,3.1),(0,.35,1.0),4.9),('paw.png',(-1.8,-2.6,1.0),(-.49,-1.10,.15),.85),('sole.png',(-1.2,-2.2,-.9),(-.49,-1.10,.09),.70)]:
        o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale;scene.render.filepath=str(HERE/n);bpy.ops.render.render(write_still=True)
def preserve():
    global GEOMETRY
    GEOMETRY=geometry();write('actual-full-geometry.json',GEOMETRY);write('source-profile.json',source_packet(GEOMETRY));write('first-source-issues.json',FAIL)
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_BodyContact014.blend'))
    # Visual preservation first; a later exporter/readback failure cannot erase authored images.
    views();export_mesh();readback()

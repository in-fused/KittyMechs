"""One editable fixed57 body and actual two-body source-contact candidate014.
No native force, gameplay or render admission is inferred from this author.
"""
import pathlib
HERE=pathlib.Path(__file__).resolve().parent
exec(compile((HERE/'source_helpers.py').read_text(encoding='utf8'),'source_helpers.py','exec'))
from mathutils import Quaternion
SOURCE=ROOT/'assets/source/overhaul-pounce-identity57-animation-source-004'
MASTER=SOURCE/'Pounce_IdentityAnimation004.blend'
LEDGER=ROOT/'tools/overhaul-pounce-body-contact-source-014/protected-inputs.json'
FPS=60;HZ=30;REST={};ACTIONS=[];PAIR=[];CURRENT=None;VICTIM=None;VICTIM_MESHES=[];SOURCE_PROFILE=None;INITIAL_REST=None

def trans(v):return Matrix.Translation(Vector(v))
def rot(axis,angle):return Quaternion(Vector(axis),angle).to_matrix().to_4x4()
def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
def parent_base(name,poses):
    b=RIG.data.bones[name]
    return poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local.copy()
def chain(name,a,b):
    bone=RIG.data.bones[name];d=Vector(b)-Vector(a)
    if abs(d.length-bone.length)>2e-5:raise RuntimeError('FIXED_CHAIN_LENGTH:'+name)
    q=(bone.tail_local-bone.head_local).normalized().rotation_difference(d.normalized())
    return trans(a)@q.to_matrix().to_4x4()@bone.matrix_local.to_quaternion().to_matrix().to_4x4()
def two(hip,end,l1,l2,pole,label):
    d=Vector(end)-Vector(hip);r=d.length
    if r>=l1+l2-1e-6 or r<=abs(l1-l2)+1e-6:raise RuntimeError('REQUESTED_CHAIN_UNREACHABLE:'+label+':'+str(r))
    u=d/r;a=(l1*l1-l2*l2+r*r)/(2*r);height=math.sqrt(max(0,l1*l1-a*a));p=Vector(pole)-hip;p-=u*p.dot(u)
    if p.length<1e-8:raise RuntimeError('BEND_POLE_DEGENERATE:'+label)
    return hip+u*a+p.normalized()*height
def rest_packet():return {b.name:{'parent':b.parent.name if b.parent else None,'head':list(b.head_local),'tail':list(b.tail_local),'matrixLocalToArmature':rows(b.matrix_local),'lengthSource':b.length} for b in RIG.data.bones}
def clear_pose():
    RIG.animation_data.action=None
    for b in RIG.pose.bones:b.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
def meshes_for(rig):return [o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig and (o.get('source_owner') or o.get('assembly_owner'))]
def geometry_for(rig):
    dg=bpy.context.evaluated_depsgraph_get();out=[]
    for o in meshes_for(rig):
        evaluated=o.evaluated_get(dg);m=evaluated.to_mesh();m.calc_loop_triangles();vertices=[list(evaluated.matrix_world@v.co) for v in m.vertices]
        out.append({'object':o.name,'owner':o.get('source_owner') or o.get('assembly_owner'),'role':o.get('source_role'),'verticesWorldSource':vertices,'triangles':[list(t.vertices) for t in m.loop_triangles]});evaluated.to_mesh_clear()
    return out
def combined(parts):
    v=[];t=[];owners=[]
    for p in parts:
        offset=len(v);v.extend(p['verticesWorldSource']);t.extend([[offset+i for i in tri] for tri in p['triangles']]);owners.extend([p['object']]*len(p['triangles']))
    if not t:raise RuntimeError('EMPTY_GEOMETRY_QUERY')
    return BVHTree.FromPolygons(v,t,all_triangles=True),owners
def core_parts(g):return [p for p in g if p['owner'] in ('chest','spine','pelvis','launcher')]

def improve_body():
    # Purpose-authored measured-link shells replace the thin tubular limb skin.
    global PARTS
    remove=[]
    for o in meshes_for(RIG):
        if any(o.name.startswith(l+'_') for l in ('FL','FR','HL','HR')) and any(s in o.name for s in ('ContinuousLimb','Scapula','ForeGuard','HockGuard','UpperActuator','HydraulicLine')):remove.append(o)
        if o.name.startswith('HipSidePlate_'):remove.append(o)
    names={o.name for o in remove}
    for o in remove:bpy.data.objects.remove(o,do_unlink=True)
    PARTS=[p for p in PARTS if p['name'] not in names]
    for limb in ('FL','FR','HL','HR'):
        sign=-1 if limb.endswith('L') else 1;fore=limb.startswith('F');chain_names=[limb+'_upper',limb+'_lower']+([] if fore else [limb+'_hock'])
        for index,name in enumerate(chain_names):
            b=RIG.data.bones[name];a=b.head_local;end=b.tail_local;d=end-a
            radius=(.17 if fore else .20) if index==0 else .095 if index==1 else .068
            points=[a+d*t for t in (.04,.19,.39,.66,.87,.96)]
            rx=[radius*.65,radius,radius*1.06,radius*.89,radius*.68,radius*.53]
            rz=[x*(1.19 if index==0 else 1.07) for x in rx]
            path(limb+'_MechanicalLink_'+str(index),[list(p) for p in points],rx,rz,[name]*len(points),2,'continuous-fitted-articulated-link',24)
            armor_strip(limb+'_SculptedLinkShell_'+str(index),points,[x*.98 for x in rx],[x*.96 for x in rz],name,0 if index==0 else 1,sign)
            detail_strip(limb+'_ProtectedRam_'+str(index),[list(a+d*.17+Vector((sign*radius*.76,0,.02))),list(a+d*.83+Vector((sign*radius*.55,0,.02)))],.023 if index==0 else .015,name,0)
            for j,t in enumerate((.25,.48,.71)):
                c=a+d*t;detail_strip(limb+'_LinkServiceSeam_'+str(index)+'_'+str(j),[list(c+Vector((sign*radius*.96,-.018,.012))),list(c+Vector((sign*radius*.96,.018,.012)))],.006,name,2)
    for sign in (-1,1):
        fitted_patch('014InterlockingHaunch_'+str(sign),BODY[7:10],-.35 if sign==1 else math.pi-.32,.32 if sign==1 else math.pi+.35,'BODY',0,'continuous-angular-haunch-armor',offset=.025,thick=.025)
        detail_strip('014PelvicPanelBreak_'+str(sign),[(sign*.27,.47,1.57),(sign*.35,.72,1.58),(sign*.29,.95,1.54)],.009,'pelvis',2)
    for m in MATS:
        p=m.node_tree.nodes.get('Principled BSDF')
        if p:p.inputs['Roughness'].default_value=max(.46,float(p.inputs['Roughness'].default_value))

def duplicate_victim():
    global VICTIM,VICTIM_MESHES
    VICTIM=RIG.copy();VICTIM.data=RIG.data.copy();VICTIM.name='014VictimRig';VICTIM.animation_data_clear();bpy.context.collection.objects.link(VICTIM)
    for original in meshes_for(RIG):
        o=original.copy();o.data=original.data.copy();o.name='014Victim__'+original.name;o.parent=VICTIM;o['assembly_owner']=o['source_owner'];del o['source_owner'];bpy.context.collection.objects.link(o)
        for mod in o.modifiers:
            if mod.type=='ARMATURE':mod.object=VICTIM
        VICTIM_MESHES.append(o)
def copy_victim(root):
    VICTIM.matrix_world=root.copy()
    for b in RIG.pose.bones:VICTIM.pose.bones[b.name].matrix_basis=b.matrix_basis.copy()
    bpy.context.view_layer.update()

def commit_pose(bob=0,u=0,fore_targets=None,floor_targets=None,claw_extension=0,tail_side=0,fold_poles=False):
    global CURRENT
    fore_targets=fore_targets or {};floor_targets=floor_targets or {};poses={};requests={}
    CURRENT={'status':'REQUESTS_UNCOMMITTED','rootWorldSource':rows(RIG.matrix_world),'bob':bob,'upright':u,'requests':requests}
    for name in ('root','pelvis','spine','chest','head','launcher'):
        base=parent_base(name,poses)
        if name=='root':base=trans((0,0,bob))@base
        if name in ('pelvis','spine','chest'):
            angle={'pelvis':-.27,'spine':-.43,'chest':-.40}[name]*u;base=trans(base.translation)@rot((1,0,0),angle)@trans(-base.translation)@base
        if name=='head':base=trans(base.translation)@REST[name].to_quaternion().to_matrix().to_4x4()
        poses[name]=base
    for limb in ('FL','FR','HL','HR'):
        fore=limb.startswith('F');sign=-1 if limb.endswith('L') else 1;upper=limb+'_upper';lower=limb+'_lower';paw=limb+'_paw';hip=parent_base(upper,poses).translation;target=Vector(floor_targets.get(limb,REST[paw].translation));intent='SOURCE_FLOOR_PLANT'
        if fore and limb in fore_targets:target=Vector(fore_targets[limb]);intent='ACTUAL_VICTIM_SURFACE_REACH'
        elif fore and u>0:
            # Upright collapse releases first; reacquire the actual floor only
            # once its fixed target is reachable. Target is never clamped.
            guard=hip+Vector((sign*.07,-.29,-.38));floor=Vector(floor_targets.get(limb,REST[paw].translation));blend=ease((.40-u)/.40);target=guard.lerp(floor,blend);intent='UNLOAD_REPLANT' if blend<1 else 'SOURCE_FLOOR_PLANT'
        pole=RIG.data.bones[lower].head_local+(hip-REST[upper].translation)
        if fold_poles:pole=hip+Vector((sign*.72,.12,.25))
        requests[limb]={'hipSource':list(hip),'requestedAnkleSource':list(target),'intent':intent,'committed':False}
        if fore:
            knee=two(hip,target,RIG.data.bones[upper].length,RIG.data.bones[lower].length,pole,limb);poses[upper]=chain(upper,hip,knee);poses[lower]=chain(lower,knee,target);joints=[hip,knee,target]
        else:
            hock=limb+'_hock';d=RIG.data.bones[paw].head_local-RIG.data.bones[hock].head_local;h=target-d;knee=two(hip,h,RIG.data.bones[upper].length,RIG.data.bones[lower].length,pole,limb);poses[upper]=chain(upper,hip,knee);poses[lower]=chain(lower,knee,h);poses[hock]=chain(hock,h,target);joints=[hip,knee,h,target]
        poses[paw]=trans(target)@REST[paw].to_quaternion().to_matrix().to_4x4();requests[limb].update({'jointsSource':[list(j) for j in joints],'committed':True})
    for b in RIG.data.bones:
        if b.name in poses:continue
        poses[b.name]=parent_base(b.name,poses)
        if b.name.startswith('tail_'):
            # Tuck above the victim's spine/forward, away from the two incoming
            # fore paws. Actual own-tail/body clearance remains a measured limit.
            angle=tail_side*(2.0 if b.name=='tail_0' else .08);poses[b.name]=trans(poses[b.name].translation)@rot((1,0,0),angle)@trans(-poses[b.name].translation)@poses[b.name]
        if '_claw_' in b.name and b.name.startswith(('FL_','FR_')):poses[b.name]=trans((0,-claw_extension,0))@poses[b.name]
    for b in RIG.data.bones:
        base=poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local;RIG.pose.bones[b.name].matrix_basis=base.inverted()@poses[b.name]
    bpy.context.view_layer.update();CURRENT={'status':'FIXED_CHAINS_COMMITTED','rootWorldSource':rows(RIG.matrix_world),'bob':bob,'upright':u,'requests':requests,'poseArmatureSource':{b.name:rows(b.matrix) for b in RIG.pose.bones}}
    return CURRENT
def key(frame):
    for b in RIG.pose.bones:b.rotation_mode='QUATERNION';b.keyframe_insert('location',frame=frame,group=b.name);b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name);b.keyframe_insert('scale',frame=frame,group=b.name)
def pose_claws(limb):
    return [o for o in meshes_for(RIG) if o.get('source_owner','').startswith(limb+'_claw_')]
def claw_offsets(limb,extension):
    # Actual source mesh vertices relative to the measured paw origin, not a
    # nominal hand marker; fixed paw rest orientation is preserved in pair.
    origin=REST[limb+'_paw'].translation;points=[]
    for o in pose_claws(limb):
        for v in o.data.vertices:points.append({'object':o.name,'vertex':v.index,'offset':v.co-origin+Vector((0,-extension,0))})
    if not points:raise RuntimeError('ACTUAL_CLAW_GEOMETRY_MISSING:'+limb)
    return points
def contact_target(tree,owners,limb,root,extension):
    sign=-1 if limb.endswith('L') else 1;ankle=Vector((sign*.30,0,1.30));options=[]
    for p in claw_offsets(limb,extension):
        point=ankle+p['offset'];origin=Vector((point.x,root.translation.y+1,point.z));hit,normal,index,distance=tree.ray_cast(origin,Vector((0,-1,0)),20)
        if hit is not None:options.append((hit.y-p['offset'].y,p,hit,normal,index,distance,origin))
    if not options:raise RuntimeError('NO_ACTUAL_VICTIM_SURFACE_FOR_CLAWS:'+limb)
    y,p,hit,normal,index,distance,origin=max(options,key=lambda x:x[0]);ankle.y=y
    if not all(math.isfinite(x) for x in list(hit)+list(normal)+[distance]) or abs(normal.length-1)>1e-5 or distance<0 or distance>20:raise RuntimeError('INVALID_ACTUAL_SOURCE_SURFACE_RECEIPT')
    local=root.inverted()@ankle
    return local,{'limb':limb,'clawObject':p['object'],'clawVertex':p['vertex'],'actualVictimObject':owners[index],'victimCombinedBVHTriangle':index,'queryGeometry':'actual current union of victim core mesh triangles; combined triangle index','surfaceWorldSource':list(hit),'normalWorldSource':list(normal),'rayOriginWorldSource':list(origin),'rayDirectionWorldSource':[0,-1,0],'rayDistanceSource':distance,'requestedAnkleWorldSource':list(ankle),'clawOffsetSource':list(p['offset'])}
def source_floor(g,label):
    minimum=min((v[2],p['object'],i,list(v)) for p in g for i,v in enumerate(p['verticesWorldSource']))
    if minimum[0]<-1e-5:raise RuntimeError('ACTUAL_SOURCE_BELOW_FLOOR:'+label+':'+str(minimum))
    return {'lowest':minimum,'plane':'actual common author SceneWorld Z=0; not native support/force'}
def pad_support(rig,limbs):
    dg=bpy.context.evaluated_depsgraph_get();out=[]
    for pad in PADS:
        if pad['limb'] not in limbs:continue
        name=pad['object'] if rig==RIG else '014Victim__'+pad['object'];o=bpy.data.objects[name];e=o.evaluated_get(dg);m=e.to_mesh();vertices=[list(e.matrix_world@m.vertices[i].co) for i in pad['vertices']];e.to_mesh_clear()
        if any(v[0]<-6 or v[0]>6 or v[1]<-3 or v[1]>6 for v in vertices):raise RuntimeError('SOURCE_PAD_OUTSIDE_FINITE_AUTHOR_GROUND:'+name)
        out.append({'object':name,'owner':pad['bone'],'facet':pad['polygon'],'actualWorldSourceVertices':vertices,'actualSupport':'014AuthorGround finite rectangle [-6,6]x[-3,6], SceneWorld Z0','maxAbsoluteFloorResidual':max(abs(v[2]) for v in vertices)})
    if any(p['maxAbsoluteFloorResidual']>1e-5 for p in out):raise RuntimeError('SOURCE_PAD_NOT_PLANTED:'+str(out))
    return out
def author_ground():
    data=bpy.data.meshes.new('014AuthorGroundGeometry');data.from_pydata([(-6,-3,0),(6,-3,0),(6,6,0),(-6,6,0)],[],[(0,1,2,3)]);data.update();o=bpy.data.objects.new('014AuthorGround',data);bpy.context.collection.objects.link(o)
    material=mat('014DiagnosticGround',(.055,.067,.071),.05,.82);data.materials.append(material);o['diagnostic_only_not_exported']=True
    write('actual-author-ground.json',{'object':o.name,'verticesSceneWorldSource':[list(v.co) for v in data.vertices],'facet':[0,1,2,3],'clock':'static author scene current to every source sample','nativeSupport':'UNKNOWN; geometric authored support plane only'})

def paired_actions():
    global CURRENT
    clear_pose();RIG.matrix_world=Matrix.Translation((0,0,-.018));commit_pose(bob=-.18,tail_side=1);copy_victim(RIG.matrix_world);victim_g=geometry_for(VICTIM);clear_pose();RIG.matrix_world=Matrix.Translation((0,0,-.018));commit_pose();rest_g=geometry_for(RIG)
    core_max=max(v[1] for p in core_parts(victim_g) for v in p['verticesWorldSource']);head_min=min(v[1] for p in rest_g if p['owner']=='head' for v in p['verticesWorldSource']);separation=core_max-head_min
    write('pair-root-design.json',{'method':'victim actual core rear Y minus actual attacker head front Y; NOT native legacy hull spacing','victimCoreRearSourceY':core_max,'attackerHeadFrontSourceY':head_min,'sourceSeparation':separation,'nativeCanonicalSeparation':.8*separation,'sourceRootFloorZ':-.018,'mount':'export_yup; runtime .8 and Ry(pi) separate once','choreography':'grounded hind-thrust tackle with fore release/reach; no ballistic/native-force claim'})
    planted_hind_world={l:REST[l+'_paw'].translation+Vector((0,separation+.45,-.018)) for l in ('HL','HR')}
    for beat,duration in [('Impact',.6),('Pin',.8),('Claw',.24),('Release',.4),('Escape',.4)]:
        count=round(duration*HZ);duration=count/HZ;actions={}
        for role in ('Attacker','Victim'):
            name='FelinePair'+beat+role;action=bpy.data.actions.new(name);actions[role]=action;ACTIONS.append({'name':name,'duration':duration,'complete':False,'sourceHz':HZ,'assembly':'both actual bodies same source clock','nativeAdmission':'UNKNOWN'})
        for i in range(count+1):
            f=i/count;clock=i/HZ;frame=1+i*(FPS//HZ);impact=ease(f/.60) if beat=='Impact' else 1-ease(f) if beat in ('Release','Escape') else 1;root_y=separation+.45*(1-impact);extension=.08*impact
            bpy.context.scene.frame_set(frame)
            RIG.matrix_world=Matrix.Translation((0,0,-.018));RIG.animation_data.action=actions['Victim'];victim_state=commit_pose(bob=-.18*impact,tail_side=impact);key(frame);copy_victim(RIG.matrix_world);victim_g=geometry_for(VICTIM);tree,owners=combined(core_parts(victim_g))
            attacker_root=Matrix.Translation((0,root_y,-.018));targets={};contacts=[]
            if impact>0:
                for limb in ('FL','FR'):
                    target,witness=contact_target(tree,owners,limb,attacker_root,extension);start=REST[limb+'_paw'].translation;blend=ease(impact);target=start.lerp(target,blend);target.z+=.22*math.sin(math.pi*blend)**2;targets[limb]=target;contacts.append(witness)
            fixed_hind={limb:attacker_root.inverted()@point for limb,point in planted_hind_world.items()}
            RIG.matrix_world=attacker_root;RIG.animation_data.action=actions['Attacker'];attacker_state=commit_pose(bob=-.04*impact,fore_targets=targets,floor_targets=fixed_hind,claw_extension=extension);key(frame)
            attacker_g=geometry_for(RIG);raw={'beat':beat,'clockSeconds':clock,'frame':frame,'impact':impact,'attackerRootWorldSource':rows(RIG.matrix_world),'victimRootWorldSource':rows(VICTIM.matrix_world),'attacker':attacker_state,'victim':victim_state,'requestedActualVictimContacts':contacts,'qualification':'SOURCE_ASSEMBLY_ONLY_UNCOMMITTED_CHECKS'};CURRENT=raw
            # Raw current request/current body pose survives any following gate.
            write('current-pair-request.json',raw)
            raw['actualFloorAttacker']=source_floor(attacker_g,beat+'/attacker');raw['actualFloorVictim']=source_floor(victim_g,beat+'/victim');raw['actualSupportingPadsAttacker']=pad_support(RIG,('HL','HR'));raw['actualSupportingPadsVictim']=pad_support(VICTIM,('FL','FR','HL','HR'))
            if impact==1:
                actual=[]
                for contact in contacts:
                    mesh=next(p for p in attacker_g if p['object']==contact['clawObject']);point=Vector(mesh['verticesWorldSource'][contact['clawVertex']]);nearest=tree.find_nearest(point);residual=(point-Vector(contact['surfaceWorldSource'])).length
                    actual.append({'clawObject':mesh['object'],'clawVertex':contact['clawVertex'],'actualClawWorldSource':list(point),'actualVictimSurfaceWorldSource':contact['surfaceWorldSource'],'pointResidualSource':residual,'nearestActualVictimSurface':None if nearest is None else {'point':list(nearest[0]),'normal':list(nearest[1]),'triangle':nearest[2],'distance':nearest[3]}})
                raw['actualClawSurfaceCorrespondence']=actual
                if any(c['pointResidualSource']>2e-5 for c in actual):raise RuntimeError('ACTUAL_CLAW_SURFACE_MISMATCH:'+str(actual))
            # Conservative whole cross-body surface candidate check at assembly
            # endpoints/contact midpoint. Intended fore claws are separately
            # measured; this is not a universal triangle containment certificate.
            if i in (0,count//2,count):
                body=[p for p in attacker_g if not p['owner'].startswith(('FL_claw_','FR_claw_'))];a,aowners=combined(body);v,vowners=combined(victim_g);overlaps=a.overlap(v);raw['nonClawCrossBodyBVHCandidates']=[{'attacker':aowners[x],'victim':vowners[y],'attackerTriangle':x,'victimTriangle':y} for x,y in overlaps[:32]];raw['nonClawCrossBodyCandidateCount']=len(overlaps)
                if overlaps:raise RuntimeError('CROSS_BODY_NONCLAW_SURFACE_CANDIDATES:'+str(raw['nonClawCrossBodyBVHCandidates']))
            raw['qualification']='MEASURED_SOURCE_ASSEMBLY_ONLY_NOT_NATIVE_OR_PIN_LOAD';PAIR.append(raw)
        for role in ('Attacker','Victim'):
            record=next(a for a in ACTIONS if a['name']==actions[role].name);record['complete']=True
    return separation

def missing_floor_actions():
    # New floor-reacquisition choreography instead of the failed fixed-world
    # fore target at upright hip height. Body contact is actual geometry-derived.
    global CURRENT
    clear_pose();RIG.matrix_world=Matrix.Translation((0,0,-.018));commit_pose();g=geometry_for(RIG);core_low=min(v[2] for p in core_parts(g) for v in p['verticesWorldSource']);depth=core_low
    write('down-floor-design.json',{'actualRestCoreLowestWorldSource':core_low,'bodyLoweringSource':depth,'intent':'fold fixed chains outward while body reacquires common source floor; no stretched links or force claim'})
    for upright in (False,True):
        for suffix,duration in [('Death',.9),('Down',.9)]:
            name=('FelineUpright' if upright else 'Feline')+suffix;action=bpy.data.actions.new(name);RIG.animation_data.action=action;record={'name':name,'duration':duration,'complete':False,'sourceHz':HZ,'nativeAdmission':'UNKNOWN'};ACTIONS.append(record);count=round(duration*HZ)
            for i in range(count+1):
                f=i/count;u=(1-ease(f/.55)) if upright else 0;lower=ease((f-.55)/.45) if upright else ease(f);state=commit_pose(bob=-depth*lower,u=u,fold_poles=lower>0);CURRENT={'action':name,'time':i/HZ,'frame':1+i*2,**state};write('current-missing-action-request.json',CURRENT);key(1+i*2);source_floor(geometry_for(RIG),name+':'+str(i))
            record['complete']=True

def pair_views():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1100;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
    world=bpy.data.worlds.new('014PairWorld');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35;scene.world=world
    for name,loc,power in [('Key',(-4,-5,6),1500),('Rim',(4,5,5),1800)]:
        d=bpy.data.lights.new('014'+name,'AREA');d.energy=power;d.size=5;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,1,1))-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('014Evidence');camera=bpy.data.objects.new(d.name,d);scene.collection.objects.link(camera);scene.camera=camera;d.type='ORTHO';d.ortho_scale=6.2;camera.location=(4,-4,3.6);camera.rotation_euler=(Vector((0,1.2,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    if PAIR:
        chosen=next((p for p in PAIR if p['beat']=='Pin' and p['impact']==1),PAIR[-1]);RIG.animation_data.action=None;VICTIM.animation_data_clear();RIG.matrix_world=Matrix(chosen['attackerRootWorldSource']);VICTIM.matrix_world=Matrix(chosen['victimRootWorldSource'])
        for rig,role in [(RIG,'attacker'),(VICTIM,'victim')]:
            poses={n:Matrix(m) for n,m in chosen[role]['poseArmatureSource'].items()}
            for b in rig.data.bones:base=poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local;rig.pose.bones[b.name].matrix_basis=base.inverted()@poses[b.name]
        bpy.context.view_layer.update();write('pair-selected-actual-geometry.json',{'clock':chosen['clockSeconds'],'beat':chosen['beat'],'attacker':geometry_for(RIG),'victim':geometry_for(VICTIM),'scope':'two actual evaluated bodies, not isolated roles'})
        for label,location,target,scale in [('pair-side',(5,1.5,2.7),(0,1.3,1),6.0),('pair-front',(3,-4,3.1),(0,1,1.1),6.0),('claw-contact',(1.9,2.3,1.8),(.30,1.1,1.2),1.4)]:camera.location=location;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();d.ortho_scale=scale;scene.render.filepath=str(HERE/(label+'.png'));bpy.ops.render.render(write_still=True)

START=utc();error=None;status='FIRST_SOURCE_FAILURE_STOP';entered=False
try:
    protected=json.loads(LEDGER.read_text(encoding='utf-8-sig'))['files']
    for row in protected:
        p=ROOT/row['path']
        if p.stat().st_size!=row['bytes'] or sha(p)!=row['sha256']:raise RuntimeError('PROTECTED_INPUT_CHANGED:'+row['path'])
    bpy.ops.wm.open_mainfile(filepath=str(MASTER));RIG=next(o for o in bpy.data.objects if o.type=='ARMATURE');RIG.name='Pounce_BodyContact014_Rig';SOURCE_PROFILE=json.loads((SOURCE/'source-profile.json').read_text())['preservedSource'];PADS=SOURCE_PROFILE['pads'];PARTS=SOURCE_PROFILE['parts'];MATS=[bpy.data.materials[n] for n in ('FelinePBR_Identity003_Gunmetal','FelinePBR_Identity003_DeepTealCeramic','FelinePBR_Identity003_Graphite','FelinePBR_Identity003_AmberOptic')];REST={b.name:b.matrix_local.copy() for b in RIG.data.bones};INITIAL_REST=rest_packet()
    if len(REST)!=57:raise RuntimeError('EXACT57_BONES_REQUIRED')
    complete={r['name'] for r in json.loads((SOURCE/'actual-action-records.json').read_text()) if r['complete'] and 'Pair' not in r['name'] and not r['name'].endswith(('Death','Down'))}
    RIG.animation_data_clear();RIG.animation_data_create()
    for a in list(bpy.data.actions):
        if a.name not in complete:bpy.data.actions.remove(a)
        else:ACTIONS.append({'name':a.name,'complete':True,'origin':'exact retained004 action; source-only qualification unchanged'})
    entered=True;clear_pose();improve_body();duplicate_victim();author_ground();bpy.context.scene.render.fps=FPS
    paired_actions();missing_floor_actions();status='AUTHORED_SOURCE_ASSEMBLY_AND_ACTIONS_ONLY'
except Exception as exc:error={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc(),'current':CURRENT}
finally:
    try:
        write('first-source-failure.json',{'error':error,'lastCurrent':CURRENT});write('actual-action-records.json',ACTIONS);write('matching-clock-two-body-assembly.json',PAIR)
        if RIG and entered:
            for action in bpy.data.actions:action.use_fake_user=True
            actual_rest=rest_packet();write('fixed-rest-verification.json',{'before':INITIAL_REST,'after':actual_rest,'matches':INITIAL_REST==actual_rest})
            if INITIAL_REST!=actual_rest:raise RuntimeError('FIXED_REST_CHANGED')
            source={'schema':'body-contact014-source','units':{'source':'Xright-Yfront-Zup','canonicalNative':'.8*(x,z,-y)','actorPi':'separate once','floorWorldSourceZ':0,'rigWorldFloorZ':-.018,'noNativeHullSizing':True},'rest':actual_rest,'pads':PADS,'parts':PARTS};write('source-profile.json',{'preservedSource':source,'actions':ACTIONS,'scope':'editable source; actual assembly metadata; native/gameplay/art UNQUALIFIED','remaining':['upright pairs not authored','wall/grip/mantle surface alignment native unqualified','arbitrary moving/canceled R replanning unqualified','full skin/self-contact/force/load admission unqualified']});write('actual-full-geometry.json',geometry_for(RIG));bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_BodyContact014.blend'))
            # Preserve current failure/master first. Only export already created
            # tracks and inspect/render existing committed source evidence.
            pair_views()
            for o in VICTIM_MESHES:o.hide_render=True;o.hide_set(True)
            if VICTIM:VICTIM.hide_render=True;VICTIM.hide_set(True)
            RIG.matrix_world=Matrix.Translation((0,0,-.018));clear_pose()
            for record in ACTIONS:
                action=bpy.data.actions.get(record['name'])
                if action:
                    track=RIG.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,1,action);track.mute=True
            export_mesh();readback()
            raw=(HERE/'Pounce_BodyContact014.raw.glb').read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);write('actual-animation-inventory.json',[{'name':a.get('name'),'channels':a['channels'],'samplers':a['samplers'],'inputAccessorRanges':[{'min':doc['accessors'][s['input']].get('min'),'max':doc['accessors'][s['input']].get('max')} for s in a['samplers']]} for a in doc.get('animations',[])])
            missing={r['name'] for r in ACTIONS if r['complete']}-{a.get('name') for a in doc.get('animations',[])}
            if missing:raise RuntimeError('COMPLETE_ACTIONS_NOT_ACTUALLY_EXPORTED:'+str(sorted(missing)))
    except Exception as exc:
        write('preservation-error.json',{'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc()})
        if error is None:error={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc()};status='PRESERVATION_FAILURE_STOP'
    after=[]
    for row in json.loads(LEDGER.read_text(encoding='utf-8-sig'))['files']:
        p=ROOT/row['path'];after.append({'path':row['path'],'sha256':sha(p),'match':sha(p)==row['sha256']})
    write('receipt.json',{'startedUTC':START,'closedUTC':utc(),'status':status,'error':error,'oneAttempt':True,'sourceFrames':len(PAIR),'completeActions':sum(a['complete'] for a in ACTIONS),'protectedAfter':after,'nativeArtRuntimeAdmission':'UNQUALIFIED'})
if error:raise RuntimeError(error['message'])

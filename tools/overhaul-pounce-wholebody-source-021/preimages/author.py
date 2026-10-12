"""Fixed57 whole-body preparation/support-exchange source candidate018.
No native force, gameplay or render admission is inferred from this author.
"""
import pathlib
HERE=pathlib.Path(__file__).resolve().parent
exec(compile((HERE/'source_helpers.py').read_text(encoding='utf8'),'source_helpers.py','exec'))
from mathutils import Quaternion
SOURCE=ROOT/'assets/source/overhaul-pounce-body-contact-source-014'
ORIGINAL004=ROOT/'assets/source/overhaul-pounce-identity57-animation-source-004'
MASTER=SOURCE/'Pounce_BodyContact014.blend'
LEDGER=ROOT/'tools/overhaul-pounce-wholebody-source-018/protected-inputs.json'
FPS=60;HZ=30;REST={};ACTIONS=[];PAIR=[];CURRENT=None;VICTIM=None;VICTIM_MESHES=[];SOURCE_PROFILE=None;INITIAL_REST=None
GROUND_BOUNDS=(-6,6,-3,6)
PHASE_CONTEXT=None

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

def duplicate_victim():
    global VICTIM,VICTIM_MESHES
    VICTIM=RIG.copy();VICTIM.data=RIG.data.copy();VICTIM.name='018VictimRig';VICTIM.animation_data_clear();bpy.context.collection.objects.link(VICTIM)
    for original in meshes_for(RIG):
        o=original.copy();o.data=original.data.copy();o.name='018Victim__'+original.name;o.parent=VICTIM;o['assembly_owner']=o['source_owner'];del o['source_owner'];bpy.context.collection.objects.link(o)
        for mod in o.modifiers:
            if mod.type=='ARMATURE':mod.object=VICTIM
        VICTIM_MESHES.append(o)
def copy_victim(root):
    VICTIM.matrix_world=root.copy()
    for b in RIG.pose.bones:VICTIM.pose.bones[b.name].matrix_basis=b.matrix_basis.copy()
    bpy.context.view_layer.update()

def commit_pose(bob=0,u=0,fore_targets=None,floor_targets=None,claw_extension=0,tail_side=0,fold_poles=False,tail_yaw=0):
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
            yaw=tail_yaw*(1.57 if b.name=='tail_0' else .025);poses[b.name]=trans(poses[b.name].translation)@rot((0,0,1),yaw)@trans(-poses[b.name].translation)@poses[b.name]
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
        name=pad['object'] if rig==RIG else '018Victim__'+pad['object'];o=bpy.data.objects[name];e=o.evaluated_get(dg);m=e.to_mesh();vertices=[list(e.matrix_world@m.vertices[i].co) for i in pad['vertices']];e.to_mesh_clear()
        xmin,xmax,ymin,ymax=GROUND_BOUNDS
        if any(v[0]<xmin or v[0]>xmax or v[1]<ymin or v[1]>ymax for v in vertices):raise RuntimeError('SOURCE_PAD_OUTSIDE_FINITE_AUTHOR_GROUND:'+name)
        out.append({'object':name,'owner':pad['bone'],'facet':pad['polygon'],'actualWorldSourceVertices':vertices,'actualSupport':'018AuthorGround actual finite SceneWorld Z0 rectangle','actualGroundBoundsSource':list(GROUND_BOUNDS),'maxAbsoluteFloorResidual':max(abs(v[2]) for v in vertices)})
    if any(p['maxAbsoluteFloorResidual']>1e-5 for p in out):raise RuntimeError('SOURCE_PAD_NOT_PLANTED:'+str(out))
    return out
def author_ground():
    data=bpy.data.meshes.new('018AuthorGroundGeometry');data.from_pydata([(-6,-3,0),(6,-3,0),(6,6,0),(-6,6,0)],[],[(0,1,2,3)]);data.update();o=bpy.data.objects.new('018AuthorGround',data);bpy.context.collection.objects.link(o)
    material=mat('018DiagnosticGround',(.055,.067,.071),.05,.82);data.materials.append(material);o['diagnostic_only_not_exported']=True
    write('actual-author-ground.json',{'object':o.name,'verticesSceneWorldSource':[list(v.co) for v in data.vertices],'facet':[0,1,2,3],'clock':'static author scene current to every source sample','nativeSupport':'UNKNOWN; geometric authored support plane only'})

def pair_views():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1100;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
    world=bpy.data.worlds.new('018PairWorld');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35;scene.world=world
    for name,loc,power in [('Key',(-4,-5,6),1500),('Rim',(4,5,5),1800)]:
        d=bpy.data.lights.new('018'+name,'AREA');d.energy=power;d.size=5;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,1,1))-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('018Evidence');camera=bpy.data.objects.new(d.name,d);scene.collection.objects.link(camera);scene.camera=camera;d.type='ORTHO';d.ortho_scale=6.2;camera.location=(4,-4,3.6);camera.rotation_euler=(Vector((0,1.2,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    if PAIR:
        chosen=next((p for p in PAIR if p['beat']=='Pin' and p['impact']==1),PAIR[-1]);RIG.animation_data.action=None;VICTIM.animation_data_clear();RIG.matrix_world=Matrix(chosen['attackerRootWorldSource']);VICTIM.matrix_world=Matrix(chosen['victimRootWorldSource'])
        for rig,role in [(RIG,'attacker'),(VICTIM,'victim')]:
            poses={n:Matrix(m) for n,m in chosen[role]['poseArmatureSource'].items()}
            for b in rig.data.bones:base=poses[b.parent.name]@b.parent.matrix_local.inverted()@b.matrix_local if b.parent else b.matrix_local;rig.pose.bones[b.name].matrix_basis=base.inverted()@poses[b.name]
        bpy.context.view_layer.update();ag=geometry_for(RIG);vg=geometry_for(VICTIM);actual_bounds=bounds(ag+vg);center=Vector([(a+b)/2 for a,b in zip(actual_bounds['min'],actual_bounds['max'])]);span=max(b-a for a,b in zip(actual_bounds['min'],actual_bounds['max']));detail=Vector(chosen['actualClawSurfaceCorrespondence'][0]['actualVictimSurfaceWorldSource']) if chosen.get('actualClawSurfaceCorrespondence') else center
        write('pair-selected-actual-geometry.json',{'clock':chosen['clockSeconds'],'beat':chosen['beat'],'attacker':ag,'victim':vg,'actualBothBodyBounds':actual_bounds,'detailIsActualContact':bool(chosen.get('actualClawSurfaceCorrespondence')),'scope':'two actual evaluated bodies, not isolated roles'})
        for label,location,target,scale in [('pair-side',center+Vector((8,1,4)),center,span*1.6),('pair-front',center+Vector((4,-8,4)),center,span*1.6),('selected-source-detail',detail+Vector((2,1,1)),detail,1.4)]:camera.location=location;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();d.ortho_scale=scale;scene.render.filepath=str(HERE/(label+'.png'));bpy.ops.render.render(write_still=True)

exec(compile((HERE/'wholebody_choreography.py').read_text(encoding='utf8'),'wholebody_choreography.py','exec'))
START=utc();error=None;status='FIRST_SOURCE_FAILURE_STOP';entered=False
try:
    protected=json.loads(LEDGER.read_text(encoding='utf-8-sig'))['files']
    for row in protected:
        p=ROOT/row['path']
        if p.stat().st_size!=row['bytes'] or sha(p)!=row['sha256']:raise RuntimeError('PROTECTED_INPUT_CHANGED:'+row['path'])
    bpy.ops.wm.open_mainfile(filepath=str(MASTER));RIG=bpy.data.objects['Pounce_BodyContact014_Rig'];RIG.name='Pounce_Wholebody018_Rig';SOURCE_PROFILE=json.loads((SOURCE/'source-profile.json').read_text())['preservedSource'];PADS=SOURCE_PROFILE['pads'];PARTS=SOURCE_PROFILE['parts'];MATS=[bpy.data.materials[n] for n in ('FelinePBR_Identity003_Gunmetal','FelinePBR_Identity003_DeepTealCeramic','FelinePBR_Identity003_Graphite','FelinePBR_Identity003_AmberOptic')];REST={b.name:b.matrix_local.copy() for b in RIG.data.bones};INITIAL_REST=rest_packet()
    if len(REST)!=57:raise RuntimeError('EXACT57_BONES_REQUIRED')
    restore_actual004_actions()
    for o in list(bpy.data.objects):
        if o!=RIG and (o.type=='ARMATURE' or (o.type=='MESH' and not o.get('source_owner'))):bpy.data.objects.remove(o,do_unlink=True)
    entered=True;clear_pose();duplicate_victim();author_ground();bpy.context.scene.render.fps=FPS
    paired_actions();status='AUTHORED_SOURCE_ASSEMBLY_AND_ACTIONS_ONLY'
except Exception as exc:error={'type':type(exc).__name__,'message':str(exc),'traceback':traceback.format_exc(),'current':CURRENT,'phaseContext':PHASE_CONTEXT}
finally:
    try:
        write('first-source-failure.json',{'error':error,'lastCurrent':CURRENT,'phaseContext':PHASE_CONTEXT});write('actual-action-records.json',ACTIONS);write('matching-clock-two-body-assembly.json',PAIR)
        if RIG and entered:
            for action in bpy.data.actions:action.use_fake_user=True
            actual_rest=rest_packet();write('fixed-rest-verification.json',{'before':INITIAL_REST,'after':actual_rest,'matches':INITIAL_REST==actual_rest})
            if INITIAL_REST!=actual_rest:raise RuntimeError('FIXED_REST_CHANGED')
            source={'schema':'wholebody018-source','units':{'source':'Xright-Yfront-Zup','canonicalNative':'.8*(x,z,-y)','actorPi':'separate once','floorWorldSourceZ':0,'rigWorldFloorZ':-.018,'noNativeHullSizing':True},'rest':actual_rest,'pads':PADS,'parts':PARTS};write('source-profile.json',{'preservedSource':source,'actions':ACTIONS,'scope':'editable source; actual assembly metadata; native/gameplay/art UNQUALIFIED','remaining':['upright pairs not authored','new upright death/down not authored; retained004 quad actions are not new geometry qualification','wall/grip/mantle surface alignment native unqualified','arbitrary moving/canceled R replanning unqualified','full skin/self-contact/force/load admission unqualified']});write('actual-full-geometry.json',geometry_for(RIG));write('actual-current-two-body-geometry.json',{'attacker':geometry_for(RIG),'victim':geometry_for(VICTIM) if VICTIM else [],'current':CURRENT});bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_Wholebody018.blend'))
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
            raw=(HERE/'Pounce_Wholebody018.raw.glb').read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);write('actual-animation-inventory.json',[{'name':a.get('name'),'channels':a['channels'],'samplers':a['samplers'],'inputAccessorRanges':[{'min':doc['accessors'][s['input']].get('min'),'max':doc['accessors'][s['input']].get('max')} for s in a['samplers']]} for a in doc.get('animations',[])])
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



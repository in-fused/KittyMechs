"""Root-only ONE bounded Blender job. Original034 geometry/materials; five corrected004 gaits.
No renderer/native work, geometry edits, paid service, old saves or retry.
"""
import ast, bpy, datetime, hashlib, json, math, pathlib, struct, traceback
from mathutils import Vector, Matrix, Quaternion

HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[2]
TOOLS=ROOT/'tools/overhaul-gait-058'
MASTER=ROOT/'assets/source/overhaul-pounce-art-detail-034/Pounce_ArtDetail034.blend'
SOLVER=ROOT/'assets/source/overhaul-pounce-identity57-animation-source-004/author.py'
FPS=60
SPECS=[('FelineWalk','walk',1.0),('FelineTrot','trot',.42),('FelineGallop','gallop',.16),('FelineUprightWalkLong','uprightWalk',.6),('FelineUprightStride','uprightWalk',.28)]
CURRENT=None
RIG=None
REST={}
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def utc():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def rows(m):return [list(map(float,r)) for r in m]
def save(name,value):(HERE/name).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n',encoding='utf8')
def protect():
    return [{'path':r['path'],'sha256':sha(ROOT/r['path']),'match':sha(ROOT/r['path'])==r['sha256']} for r in json.loads((TOOLS/'protected-inputs.json').read_text())['files']]
def extract(path,names):
    text=path.read_text(encoding='utf8');tree=ast.parse(text);found={n.name:ast.get_source_segment(text,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names}
    if set(found)!=set(names):raise RuntimeError('EXTRACTED_FUNCTION_SET_MISMATCH')
    return '\n\n'.join(found[n] for n in names)
def scalar(v):
    if isinstance(v,(float,int,str,bool)) or v is None:return v
    try:return [scalar(x) for x in v]
    except TypeError:return str(v)
def materials():
    out=[]
    for m in sorted(bpy.data.materials,key=lambda x:x.name):
        nodes=[]
        for n in sorted(m.node_tree.nodes,key=lambda x:x.name) if m.use_nodes else []:
            nodes.append({'name':n.name,'type':n.bl_idname,'inputs':[(x.name,scalar(x.default_value)) for x in n.inputs if hasattr(x,'default_value')], 'image':({'name':n.image.name,'packedSHA256':hashlib.sha256(bytes(n.image.packed_file.data)).hexdigest() if n.image.packed_file else None} if getattr(n,'image',None) else None)})
        out.append({'name':m.name,'nodes':nodes,'links':sorted((x.from_node.name,x.from_socket.name,x.to_node.name,x.to_socket.name) for x in m.node_tree.links) if m.use_nodes else []})
    return out
def clear_pose():
    RIG.animation_data.action=None
    for b in RIG.pose.bones:b.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()

started=utc();error=None;before=None;material_before=None;records=[]
try:
    if any(not r['match'] for r in protect()):raise RuntimeError('PROTECTED_INPUT_CHANGED')
    bpy.ops.wm.open_mainfile(filepath=str(MASTER))
    rigs=[o for o in bpy.data.objects if o.type=='ARMATURE']
    if len(rigs)!=1:raise RuntimeError('EXACT_ONE_RIG_REQUIRED')
    RIG=rigs[0];REST={b.name:b.matrix_local.copy() for b in RIG.data.bones}
    if len(REST)!=57:raise RuntimeError('EXACT57_REST_REQUIRED')
    # Frozen034 author fingerprint excludes pose/action, includes all geometry/rest/UV/weights.
    fingerprint_text=extract(ROOT/'assets/source/overhaul-pounce-art-detail-034/author.py',['fingerprint'])
    exec(compile(fingerprint_text,'retained034-fingerprint','exec'))
    before=fingerprint();material_before=materials()
    raw=(ROOT/'public/assets/models/Pounce_ArtDetail034.glb').read_bytes();size=struct.unpack_from('<I',raw,12)[0];original=json.loads(raw[20:20+size]);allowed={a['name'] for a in original['animations']}
    if len(allowed)!=43 or not allowed.issubset({a.name for a in bpy.data.actions}):raise RuntimeError('EXACT43_EDITABLE_ACTIONS_REQUIRED')
    selected={x[0] for x in SPECS}
    RIG.animation_data_clear();RIG.animation_data_create()
    # Only selected curves are replaced in this new in-memory master.38 others remain.
    for a in list(bpy.data.actions):
        if a.name in selected:bpy.data.actions.remove(a,do_unlink=True)
        elif a.name in allowed:a.use_fake_user=True
    function_names=['trans','rotation','ease','chain_bone','solve_two','parent_base','parameters','pose','key_pose']
    solver_text=extract(SOLVER,function_names)
    save('solver-provenance.json',{'source':str(SOLVER.relative_to(ROOT)),'sourceSHA256':sha(SOLVER),'functions':function_names,'extractedUTF8SHA256':hashlib.sha256(solver_text.encode()).hexdigest(),'originalGaitCorrection':'source front -Y; stance begins negative/front and retracts toward positive/back; swing returns toward negative/front','restAnatomyChanges':False})
    exec(compile(solver_text,'retained004-five-gait-solver','exec'))
    def gait(phase,duty,stride,lift):
        p=phase%1
        if p<duty:return stride*(-.5+p/duty),0,'stance'
        s=(p-duty)/(1-duty)
        return stride*(.5-ease(s)),lift*math.sin(math.pi*s)**2,'swing'
    scene=bpy.context.scene;scene.render.fps=FPS;scene.render.fps_base=1
    for name,kind,intent in SPECS:
        count=max(3,round(intent*FPS));duration=count/FPS
        action=bpy.data.actions.new(name);RIG.animation_data.action=action;action.use_fake_user=True
        clock=[]
        for i in range(count+1):
            t=i/FPS;state=pose(kind,t,duration);key_pose(action,i+1)
            clock.append({'frame':i+1,'sourceTime':t,'requests':state['requests']})
        p=parameters(kind,0,duration)
        records.append({'name':name,'kind':kind,'frames':count+1,'sourceDuration':duration,'exportCycleStart':1/FPS,'exportCycleEnd':(count+1)/FPS,'strideSource':p['stride'],'duty':p['duty'],'nativeDistancePerCycleIntent':.8*p['stride']/p['duty'],'lowSourcePawZY':{'sourceZ':'unchanged floor targets','sourceY':'retracted rearward while stance'},'nativeSupport':'UNQUALIFIED','clock':clock})
    for name in sorted(allowed):
        action=bpy.data.actions[name];track=RIG.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
    clear_pose()
    if fingerprint()!=before or materials()!=material_before:raise RuntimeError('GEOMETRY_REST_UV_WEIGHTS_OR_MATERIAL_CHANGED')
    save('geometry-material-preservation.json',{'before':before,'after':fingerprint(),'materialBefore':material_before,'materialAfter':materials(),'identical':True})
    save('authored-gait-records.json',records)
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_Gait058.blend'))
    merged=bpy.data.objects.get('Pounce_ArtBridge019_Export')
    if merged is None or merged.type!='MESH' or merged.parent!=RIG:raise RuntimeError('RETAINED019_EXPORT_MESH_REQUIRED')
    for o in bpy.context.selected_objects:o.select_set(False)
    merged.hide_set(False);merged.select_set(True);RIG.select_set(True);bpy.context.view_layer.objects.active=RIG
    # Temporary export may include034 materials. Final graft copies only selected curves.
    bpy.ops.export_scene.gltf(filepath=str(HERE/'Pounce_Gait058.temporary.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_attributes=True)
    if fingerprint()!=before or materials()!=material_before:raise RuntimeError('PRESERVATION_CHANGED_AFTER_EXPORT')
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc(),'current':CURRENT}
finally:
    after=protect()
    if any(not r['match'] for r in after) and error is None:error={'message':'PROTECTED_INPUT_CHANGED_AFTER_JOB'}
    save('author-receipt.json',{'startedUTC':started,'closedUTC':utc(),'status':'FIRST_AUTHOR_FAILURE_STOP' if error else 'FIVE_GAIT_CURVES_AUTHORED_EXPORT_ONLY','error':error,'completedGaits':[r['name'] for r in records],'protectedAfter':after,'nativeContactAdmission':False,'publicMount':False})
if error:raise RuntimeError(error['message'])

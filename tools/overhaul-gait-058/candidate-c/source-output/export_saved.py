"""Root-only FIRST export of saved058B curves; no author/solver/geometry mutation.
Select exact retained authored parts, never an unsaved019 transient merged mesh.
"""
import ast, bpy, datetime, hashlib, json, math, pathlib, traceback
from mathutils import Matrix
HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[2]
TOOLS=ROOT/'tools/overhaul-gait-058c'
B=ROOT/'assets/source/overhaul-pounce-gait-058'
MASTER=B/'Pounce_Gait058.blend'
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def save(name,v):(HERE/name).write_text(json.dumps(v,indent=2,allow_nan=False)+'\n',encoding='utf8')
def extract(path,names):
    text=path.read_text();tree=ast.parse(text);found={n.name:ast.get_source_segment(text,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names}
    if set(found)!=set(names):raise RuntimeError('EXTRACTED_FUNCTION_SET_MISMATCH')
    return '\n\n'.join(found[n] for n in names)
def protected():return [{'path':r['path'],'sha256':sha(ROOT/r['path']),'match':sha(ROOT/r['path'])==r['sha256']} for r in json.loads((TOOLS/'protected-inputs.json').read_text())['files']]
started=datetime.datetime.now(datetime.timezone.utc).isoformat();error=None;witness={}
try:
    if any(not r['match'] for r in protected()):raise RuntimeError('PROTECTED_INPUT_CHANGED')
    author=json.loads((B/'author-receipt.json').read_text())
    if author['status']!='FIRST_AUTHOR_FAILURE_STOP' or author['error']['message']!='RETAINED019_EXPORT_MESH_REQUIRED':raise RuntimeError('EXACT_SAVED_B_EXPORT_BOUNDARY_REQUIRED')
    trace=[json.loads(x) for x in (B/'pose-owner-readback.jsonl').read_text().splitlines()]
    records=json.loads((B/'authored-gait-records.json').read_text());expected={(r['name'],i) for r in records for i in range(1,r['frames']+1)}
    stages=['detached-solver-evaluation','owned-key-current-evaluation','owned-key-same-clock-replay']
    if len(expected)!=153 or len(trace)!=459:raise RuntimeError('EXACT153_CLOCKS459_OWNER_ROWS_REQUIRED')
    for stage in stages:
        rows=[r for r in trace if r['stage']==stage]
        if len(rows)!=153 or {(r['clock']['clip'],r['clock']['frame']) for r in rows}!=expected:raise RuntimeError('B_READBACK_CLOCK_STAGE_INCOMPLETE')
    if any(len(r['requestedArmatureMatrices'])!=57 or len(r['actualEvaluatedArmatureMatrices'])!=57 or not math.isfinite(r['maxMatrixComponentResidual']) or r['maxMatrixComponentResidual']>2e-5 for r in trace):raise RuntimeError('B_READBACK_NOT_PASSING')
    seal=json.loads((B/'geometry-material-preservation.json').read_text())
    if seal['before']!=seal['after'] or seal['materialBefore']!=seal['materialAfter'] or not seal['identical']:raise RuntimeError('B_GEOMETRY_MATERIAL_SEAL_NOT_PASSING')
    bpy.ops.wm.open_mainfile(filepath=str(MASTER));rigs=[o for o in bpy.data.objects if o.type=='ARMATURE']
    if len(rigs)!=1:raise RuntimeError('EXACT_ONE_RETAINED_RIG_REQUIRED')
    RIG=rigs[0]
    exec(compile(extract(ROOT/'assets/source/overhaul-pounce-art-detail-034/author.py',['fingerprint']),'retained034-fingerprint','exec'))
    exec(compile(extract(B/'author.py',['scalar','materials']),'retained058B-material-fingerprint','exec'))
    if fingerprint()!=seal['before'] or materials()!=seal['materialBefore']:raise RuntimeError('SAVED_B_GEOMETRY_REST_UV_WEIGHTS_MATERIAL_MISMATCH')
    source=json.loads((ROOT/'assets/source/overhaul-pounce-art-bridge-019/source-profile.json').read_text())['preservedSource']
    parts={p['name']:p for p in source['parts']}
    actual={o.name:o for o in bpy.data.objects if o.type=='MESH' and o.get('source_owner')}
    if len(parts)!=255 or set(parts)!=set(actual):raise RuntimeError('EXACT_RETAINED019_255_AUTHORED_PARTS_REQUIRED')
    for name,o in actual.items():
        if o.parent!=RIG or o.get('source_owner')!=parts[name]['owner'] or not any(m.type=='ARMATURE' and m.object==RIG for m in o.modifiers):raise RuntimeError('RETAINED_AUTHORED_PART_RIG_CONTRACT:'+name)
    # Verify saved keys, not requests or a new solver run. No key insertion occurs.
    basis={b.name:b.matrix_basis.copy() for b in RIG.pose.bones};frame=bpy.context.scene.frame_current;replay=[]
    if len(basis)!=57 or RIG.animation_data.action is not None or any(not t.mute for t in RIG.animation_data.nla_tracks):raise RuntimeError('EXPECTED_SAVED_B_SINGLE_OWNER_STATE_REQUIRED')
    for r in [r for r in trace if r['stage']=='owned-key-same-clock-replay']:
        c=r['clock'];action=bpy.data.actions.get(c['clip'])
        if action is None:raise RuntimeError('SAVED_KEYED_GAIT_ACTION_MISSING')
        RIG.animation_data.action=action;bpy.context.scene.frame_set(c['frame']+1);bpy.context.scene.frame_set(c['frame']);bpy.context.view_layer.update()
        e=RIG.evaluated_get(bpy.context.evaluated_depsgraph_get());raw={n:[list(map(float,row)) for row in e.pose.bones[n].matrix] for n in basis}
        delta=max(abs(raw[n][i][j]-r['requestedArmatureMatrices'][n][i][j]) for n in basis for i in range(4) for j in range(4))
        replay.append({'clock':c,'actualEvaluatedArmatureMatrices':raw,'maxMatrixComponentResidual':delta})
        if not math.isfinite(delta) or delta>2e-5:
            save('saved-key-readback.json',replay);raise RuntimeError('SAVED_B_KEY_REPLAY_MISMATCH:'+str(delta))
    save('saved-key-readback.json',replay)
    RIG.animation_data.action=None;bpy.context.scene.frame_set(frame)
    for b in RIG.pose.bones:b.matrix_basis=basis[b.name]
    bpy.context.view_layer.update()
    if fingerprint()!=seal['before'] or materials()!=seal['materialBefore']:raise RuntimeError('PRESERVATION_CHANGED_DURING_SAVED_KEY_READBACK')
    for o in bpy.context.selected_objects:o.select_set(False)
    for o in actual.values():o.hide_set(False);o.select_set(True)
    RIG.select_set(True);bpy.context.view_layer.objects.active=RIG
    bpy.ops.export_scene.gltf(filepath=str(HERE/'Pounce_Gait058C.temporary.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_attributes=True)
    if fingerprint()!=seal['before'] or materials()!=seal['materialBefore']:raise RuntimeError('PRESERVATION_CHANGED_AFTER_EXPORT')
    witness={'savedBMasterSHA256':sha(MASTER),'savedGeometryFingerprint':seal['before'],'materialsMatch':True,'retainedAuthoredParts':sorted(actual),'partCount':255,'savedKeyReplayClocks':len(replay),'maxSavedKeyReplayResidual':max(r['maxMatrixComponentResidual'] for r in replay),'temporaryExportSHA256':sha(HERE/'Pounce_Gait058C.temporary.glb'),'reauthor':False,'newGeometry':False,'solverRun':False,'nativeContactAdmission':False,'publicMount':False}
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
finally:
    after=protected()
    if any(not r['match'] for r in after) and error is None:error={'message':'PROTECTED_INPUT_CHANGED_AFTER_EXPORT'}
    save('export-receipt.json',{'candidate':'058C','startedUTC':started,'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FIRST_EXPORT_FAILURE_STOP' if error else 'SAVED058B_EXPORT_ONLY','error':error,'protectedAfter':after,'witness':witness})
if error:raise RuntimeError(error['message'])

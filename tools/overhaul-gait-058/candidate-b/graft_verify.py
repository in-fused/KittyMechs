"""Root-only postauthor append/gait verification. Never edits034/public/runtime.
Selected five curves appended to immutable034 GLB; existing binary/resources unchanged.
Actual ankle kinematics are checked; native/pad support is explicitly unqualified.
"""
from pathlib import Path
import copy, datetime, hashlib, json, math, struct, traceback
ROOT=Path(__file__).resolve().parents[2]
HERE=ROOT/'assets/source/overhaul-pounce-gait-058'
TOOLS=Path(__file__).resolve().parent
SELECTED={'FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(name,value):(HERE/name).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n',encoding='utf8')
def parse(p):
    raw=p.read_bytes();magic,version,length=struct.unpack_from('<III',raw)
    assert magic==0x46546c67 and version==2 and length==len(raw),'INVALID_GLB'
    size,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
    doc=json.loads(raw[20:20+size]);o=20+size;size,kind=struct.unpack_from('<II',raw,o);assert kind==0x004e4942
    return doc,raw[o+8:o+8+size]
def values(doc,blob,i):
    a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];assert v['buffer']==0 and 'sparse' not in a
    width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt,size={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']]
    start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*size)
    return [struct.unpack_from('<'+fmt*width,blob,start+k*stride) for k in range(a['count'])]
def decoded_tracks(doc,blob,a):
    return {doc['nodes'][c['target']['node']]['name']+'.'+c['target']['path']:(a['samplers'][c['sampler']].get('interpolation','LINEAR'),values(doc,blob,a['samplers'][c['sampler']]['input']),values(doc,blob,a['samplers'][c['sampler']]['output'])) for c in a['channels']}
started=datetime.datetime.now(datetime.timezone.utc).isoformat();error=None;witness={}
try:
    protected=json.loads((TOOLS/'protected-inputs.json').read_text())['files']
    if any(sha(ROOT/r['path'])!=r['sha256'] for r in protected):raise RuntimeError('PROTECTED_INPUT_CHANGED')
    author=json.loads((HERE/'author-receipt.json').read_text())
    if author['status']!='FIVE_GAIT_CURVES_AUTHORED_EXPORT_ONLY':raise RuntimeError('AUTHOR_NOT_SUCCESSFUL')
    old,oldbin=parse(ROOT/'public/assets/models/Pounce_ArtDetail034.glb')
    new,newbin=parse(HERE/'Pounce_Gait058.temporary.glb')
    manifest=json.loads((ROOT/'src/game/entities/identity57Runtime034Manifest.json').read_text())
    oldnames={n['name']:i for i,n in enumerate(old['nodes']) if 'name' in n};newnames={n['name']:i for i,n in enumerate(new['nodes']) if 'name' in n}
    joints=set(manifest['jointNames'])
    if len(joints)!=57 or len(old['animations'])!=43:raise RuntimeError('EXACT57_43_REQUIRED')
    def binds(doc,blob):
        result={}
        for s in doc['skins']:
            for node,v in zip(s['joints'],values(doc,blob,s['inverseBindMatrices'])):
                name=doc['nodes'][node]['name']
                if name in result and result[name]!=v:raise RuntimeError('AMBIGUOUS_BIND')
                result[name]=v
        return result
    ob,nb=binds(old,oldbin),binds(new,newbin)
    maxbind=max(abs(a-b) for name in joints for a,b in zip(ob[name],nb[name]))
    if maxbind>2e-6:raise RuntimeError('INVERSE_BIND_FRAME_MISMATCH')
    def parents(doc):return {doc['nodes'][c]['name']:n.get('name') for n in doc['nodes'] for c in n.get('children',[]) if 'name' in doc['nodes'][c]}
    op,np=parents(old),parents(new)
    if any(op.get(n)!=np.get(n) for n in joints):raise RuntimeError('JOINT_PARENT_FRAME_MISMATCH')
    newanims={a['name']:a for a in new.get('animations',[])}
    if not SELECTED.issubset(newanims):raise RuntimeError('SELECTED_EXPORT_CLIPS_MISSING')
    result=copy.deepcopy(old);chunks=[oldbin];length=len(oldbin);amap={};vmap={}
    def append_accessor(i):
        global length
        if i in amap:return amap[i]
        a=new['accessors'][i];assert 'sparse' not in a
        vi=a['bufferView']
        if vi not in vmap:
            v=new['bufferViews'][vi];assert v['buffer']==0
            pad=(-length)%4
            if pad:chunks.append(bytes(pad));length+=pad
            data=newbin[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
            if len(data)!=v['byteLength']:raise RuntimeError('TRUNCATED_VIEW')
            vmap[vi]=len(result['bufferViews']);result['bufferViews'].append({**copy.deepcopy(v),'buffer':0,'byteOffset':length});chunks.append(data);length+=len(data)
        amap[i]=len(result['accessors']);result['accessors'].append({**copy.deepcopy(a),'bufferView':vmap[vi]})
        return amap[i]
    core_errors=[]
    for idx,a in enumerate(old['animations']):
        if a['name'] not in SELECTED:continue
        b=newanims[a['name']];at=decoded_tracks(old,oldbin,a);bt=decoded_tracks(new,newbin,b)
        if set(at)!=set(bt) or len(bt)!=57*3:raise RuntimeError('LOCAL_TRACK_CONTRACT_CHANGED')
        for target,(interpolation,times,data) in bt.items():
            oi,ot,ov=at[target]
            # Raw quaternion/TRS evaluator below implements LINEAR/slerp only.
            if interpolation!='LINEAR':raise RuntimeError('ANALYTICAL_SAMPLER_INTERPOLATION_UNSUPPORTED:'+a['name']+':'+target)
            if interpolation!=oi or len(times)!=len(ot) or max(abs(x[0]-y[0]) for x,y in zip(times,ot))>2e-6:raise RuntimeError('SOURCE_CLIP_CLOCK_CHANGED:'+a['name'])
            # Core/tail choreography remains in its original chronology/pose clocks.
            if target.split('.')[0] in {'root','pelvis','spine','chest','head','launcher','tail_0','tail_1','tail_2','tail_3','tail_4'}:
                if len(data)!=len(ov):raise RuntimeError('CORE_TRACK_LENGTH_CHANGED')
                delta=max(abs(x-y) for xrow,yrow in zip(data,ov) for x,y in zip(xrow,yrow));core_errors.append(delta)
                if delta>2e-5:raise RuntimeError('CORE_OR_TAIL_CURVE_CHANGED:'+a['name']+':'+target)
        c=copy.deepcopy(b)
        for s in c['samplers']:s['input']=append_accessor(s['input']);s['output']=append_accessor(s['output'])
        for channel in c['channels']:
            name=new['nodes'][channel['target']['node']]['name']
            if name not in joints:raise RuntimeError('NONJOINT_ANIMATION_TARGET')
            channel['target']['node']=oldnames[name]
        result['animations'][idx]=c
    blob=b''.join(chunks);result['buffers'][0]['byteLength']=len(blob)
    for field in ['nodes','skins','meshes','materials','images','textures','samplers','scene','scenes']:
        if result.get(field)!=old.get(field):raise RuntimeError('IMMUTABLE_FIELD_CHANGED:'+field)
    if result['accessors'][:len(old['accessors'])]!=old['accessors'] or result['bufferViews'][:len(old['bufferViews'])]!=old['bufferViews'] or blob[:len(oldbin)]!=oldbin:raise RuntimeError('ORIGINAL_BUFFER_OR_METADATA_CHANGED')
    if any(a!=b for a,b in zip(old['animations'],result['animations']) if a['name'] not in SELECTED):raise RuntimeError('NONSELECTED38_ACTION_CHANGED')
    jd=json.dumps(result,separators=(',',':')).encode();jd+=b' '*((-len(jd))%4);blob+=bytes((-len(blob))%4)
    raw=struct.pack('<III',0x46546c67,2,28+len(jd)+len(blob))+struct.pack('<II',len(jd),0x4e4f534a)+jd+struct.pack('<II',len(blob),0x004e4942)+blob
    path=HERE/'Pounce_Gait058.glb';path.write_bytes(raw)
    # Reuse immutable005 quaternion/TRS evaluator functions ONLY, before its mutation loop.
    code=(ROOT/'tools/overhaul-identity57-runtime-005/inventory.py').read_text().split('rest=posed_world')[0]
    code=code.replace('root=Path(__file__).resolve().parents[2]','root=Path.cwd()').replace("source=root/'assets/source/overhaul-pounce-identity57-animation-source-004/Pounce_IdentityAnimation004.raw.glb'",'source=Path('+repr(str(path))+')')
    evaluator={};exec(compile(code,'raw058-TRS-evaluator','exec'),evaluator)
    posed_world=evaluator['posed_world'];sample=evaluator['sample'];access=evaluator['accessor'];nodes=evaluator['nodes'];byname={n.get('name'):i for i,n in enumerate(nodes)}
    records={r['name']:r for r in json.loads((HERE/'authored-gait-records.json').read_text())};metrics=[]
    for a in result['animations']:
        if a['name'] not in SELECTED:continue
        rec=records[a['name']];cs=[]
        for c in a['channels']:
            s=a['samplers'][c['sampler']];cs.append((c['target']['node'],c['target']['path'],[v[0] for v in access(s['input'])],access(s['output'])))
        def pose_at(f):return posed_world({(i,p):sample(p,rec['exportCycleStart']+(f%1)*rec['sourceDuration'],ts,vs) for i,p,ts,vs in cs})
        limbs=['HL','HR'] if 'Upright' in a['name'] else ['FL','FR','HL','HR']
        offsets={'HL':0,'HR':.5} if 'Upright' in a['name'] else {'FL':0,'FR':.5,'HL':.75,'HR':.25} if a['name']=='FelineWalk' else {'FL':0,'FR':.5,'HL':.5,'HR':0}
        for limb in limbs:
            start=.15;end=.45;pa=pose_at(start-offsets[limb])[byname[limb+'_paw']][0];pb=pose_at(end-offsets[limb])[byname[limb+'_paw']][0]
            relative=.8*(pb[2]-pa[2]);travel=rec['nativeDistancePerCycleIntent']*(end-start);residual=relative+travel
            if not relative<0:raise RuntimeError('STANCE_SWEEP_WRONG_FORWARD_SIGN:'+a['name']+':'+limb)
            if abs(residual)>.04:raise RuntimeError('DECLARED_STANCE_ANKLE_RESIDUAL_OVER4CM:'+a['name']+':'+limb)
            metrics.append({'clip':a['name'],'limb':limb,'declaredContactPhase':[start,end],'mountedRelativeForwardDelta':relative,'bodyForwardDeltaIntent':travel,'worldAnkleForwardResidual':residual,'ankleVerticalDeltaNative':.8*(pb[1]-pa[1]),'qualification':'DECLARED_SOURCE_STANCE_ANKLE_KINEMATICS_ONLY; NO_NATIVE_OR_PAD_SUPPORT'})
        entry=manifest['clips'][a['name']]
        entry['measuredGait']={'nativeDistancePerCycle':rec['nativeDistancePerCycleIntent'],'cycleStart':rec['exportCycleStart'],'cycleEnd':rec['exportCycleEnd'],'sourceDuty':rec['duty'],'stanceRelativeForwardSign':-1,'interpretation':'Signed declared source stance, scale.8 Ry(pi), exact source interval; actual ankle analytical residual in gait-verification.json; native/pad support UNQUALIFIED'}
    manifest.update(schema='identity57-runtime058-five-signed-gaits-source-candidate',source=str(path.relative_to(ROOT)).replace('\\','/'),publicURL='/assets/models/Pounce_Gait058.glb',sha256=sha(path),bytes=len(raw),scope='SOURCE_CANDIDATE_ONLY; original034 geometry/material/binary prefix and38 nonselected actions retained; five corrected source gait curves; runtime MUST consume declared cycleStart/end; native/planted-pad/contact/turn/R/complete quality UNQUALIFIED')
    save('identity57Runtime058Manifest.json',manifest)
    witness={'assetSHA256':sha(path),'bytes':len(raw),'maxInverseBindError':maxbind,'maxRetainedCoreTailTrackError':max(core_errors),'originalBinaryPrefixRetained':True,'originalGeometryMaterialNodeSkinFieldsRetained':True,'retainedNonselectedActions':38,'correctedActions':sorted(SELECTED),'analyticAnkleMetrics':metrics,'nativeContactAdmission':False,'publicMount':False}
    save('gait-verification.json',witness)
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
finally:
    after=[{'path':r['path'],'sha256':sha(ROOT/r['path']),'match':sha(ROOT/r['path'])==r['sha256']} for r in json.loads((TOOLS/'protected-inputs.json').read_text())['files']]
    if any(not r['match'] for r in after) and error is None:error={'message':'PROTECTED_INPUT_CHANGED_AFTER_GRAFT'}
    save('graft-receipt.json',{'startedUTC':started,'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FIRST_GRAFT_FAILURE_STOP' if error else 'APPENDED_SIGNED_SOURCE_GAITS_ONLY','error':error,'protectedAfter':after,'witness':witness})
if error:raise RuntimeError(error['message'])

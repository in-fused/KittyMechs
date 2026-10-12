"""ONE bounded data-only 106 animation graft. Failure stops before runtime/public admission."""
from pathlib import Path
import copy, hashlib, json, math, struct, traceback, datetime
ROOT=Path(__file__).resolve().parents[2]
HERE=ROOT/'assets/source/overhaul-pounce-motion-106'
SELECTED={'FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride','FelineTransitionBase106','FelineTransitionArc106'}
ADDED={'FelineTransitionBase106','FelineTransitionArc106'}
LIMIT=2e-5 # unchanged authored-source representation guard
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,x):(HERE/n).write_text(json.dumps(x,indent=2,allow_nan=False)+'\n',encoding='utf8')
def parse(p):
 raw=p.read_bytes();assert struct.unpack_from('<III',raw)==(0x46546c67,2,len(raw))
 n,k=struct.unpack_from('<II',raw,12);assert k==0x4e4f534a
 d=json.loads(raw[20:20+n]);m,k=struct.unpack_from('<II',raw,20+n);assert k==0x004e4942 and 28+n+m==len(raw)
 return d,raw[28+n:]
def vals(d,b,i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];assert v['buffer']==0 and 'sparse' not in a
 w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];f,z={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']]
 start=v.get('byteOffset',0)+a.get('byteOffset',0);step=v.get('byteStride',w*z)
 return [struct.unpack_from('<'+f*w,b,start+j*step) for j in range(a['count'])]
I=[[int(i==j) for j in range(4)] for i in range(4)]
B=[[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]]
BT=[[B[j][i] for j in range(4)] for i in range(4)]
def mul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
def inverse(a):
 x=[list(a[i])+list(I[i]) for i in range(4)]
 for j in range(4):
  pivot=max(range(j,4),key=lambda i:abs(x[i][j]));assert abs(x[pivot][j])>1e-12
  x[j],x[pivot]=x[pivot],x[j];v=x[j][j];x[j]=[t/v for t in x[j]]
  for i in range(4):
   if i!=j:
    v=x[i][j];x[i]=[p-v*q for p,q in zip(x[i],x[j])]
 return [r[4:] for r in x]
def trs(n,local=None):
 if 'matrix' in n:
  assert not local;return [[n['matrix'][j*4+i] for j in range(4)] for i in range(4)]
 local=local or {};p=local.get('translation',n.get('translation',[0,0,0]));x,y,z,w=local.get('rotation',n.get('rotation',[0,0,0,1]));s=local.get('scale',n.get('scale',[1,1,1]))
 a=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),p[0]],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),p[1]],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),p[2]],[0,0,0,1]]
 for i in range(3):
  for j in range(3):a[i][j]*=s[j]
 return a
def parentmap(d):return {c:i for i,n in enumerate(d['nodes']) for c in n.get('children',[])}
def world(d,local):
 parents=parentmap(d);cache={}
 def visit(i):
  if i not in cache:
   m=trs(d['nodes'][i],local.get(i));cache[i]=mul(visit(parents[i]),m) if i in parents else m
  return cache[i]
 for i in range(len(d['nodes'])):visit(i)
 return cache
def tracks(d,b,a):
 out={}
 for c in a['channels']:
  n=d['nodes'][c['target']['node']]['name'];p=c['target']['path'];s=a['samplers'][c['sampler']]
  ts=[v[0] for v in vals(d,b,s['input'])];vs=vals(d,b,s['output']);mode=s.get('interpolation','LINEAR')
  assert mode in ('LINEAR','STEP') and len(ts)==len(vs) and all(math.isfinite(t) for t in ts) and all(t2>t1 for t1,t2 in zip(ts,ts[1:]))
  assert all(math.isfinite(v) for row in vs for v in row)
  if mode=='STEP':assert all(row==vs[0] for row in vs),('NONCONSTANT_STEP',a['name'],n,p)
  if p=='rotation':assert max(abs(sum(v*v for v in row)-1) for row in vs)<=LIMIT,('NONUNIT_QUATERNION',a['name'],n)
  assert (n,p) not in out;out[n,p]=(ts,vs,mode)
 return out
error=None;witness={};started=datetime.datetime.now(datetime.timezone.utc).isoformat()
try:
 inv=json.loads((HERE/'export-inventory.json').read_text());author=json.loads((HERE/'author-receipt.json').read_text())
 assert author['error'] is None and all(r['match'] for r in author['protectedAfter'])
 for r in json.loads((ROOT/'tools/overhaul-motion-106/protected-inputs.json').read_text())['files']:assert sha(ROOT/r['path'])==r['sha256'],('PROTECTED_CHANGED',r['path'])
 basepath=ROOT/'public/assets/models/Pounce_Gait058E.glb';temppath=HERE/'Pounce_Motion106.temporary.glb'
 assert sha(basepath)==inv['baseGLBSHA256'] and sha(temppath)==inv['temporaryGLBSHA256'] and sha(HERE/'Pounce_Motion106.blend')==inv['savedMasterSHA256']
 base,bb=parse(basepath);temp,tb=parse(temppath);manifest=json.loads((ROOT/'src/game/entities/identity57Runtime058EManifest.json').read_text())
 bm={n['name']:i for i,n in enumerate(base['nodes'])};tm={n['name']:i for i,n in enumerate(temp['nodes'])};assert len(bm)==len(base['nodes']) and len(tm)==len(temp['nodes'])
 joints=set(manifest['jointNames']);assert len(joints)==57
 bp,tp=parentmap(base),parentmap(temp)
 for name in joints:
  bi,ti=bm[name],tm[name]
  while True:
   bn,tn=base['nodes'][bi],temp['nodes'][ti];assert bn['name']==tn['name']
   for key,default in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]:assert bn.get(key,default)==tn.get(key,default),('REST_OR_ANCESTRY_CHANGED',name,key)
   assert bn.get('matrix')==tn.get('matrix')
   assert (bi in bp)==(ti in tp)
   if bi not in bp:break
   bi,ti=bp[bi],tp[ti]
 def binds(d,b):
  out={}
  for s in d['skins']:
   for node,m in zip(s['joints'],vals(d,b,s['inverseBindMatrices'])):
    name=d['nodes'][node]['name'];assert name not in out or out[name]==m;out[name]=m
  return out
 assert binds(base,bb)==binds(temp,tb),'ALL_INVERSE_BINDS_CHANGED'
 ba={a['name']:a for a in base['animations']};ta={a['name']:a for a in temp['animations']}
 assert len(ba)==43 and len(ta)==45 and set(ta)==set(ba)|ADDED
 decoded={n:tracks(temp,tb,ta[n]) for n in SELECTED}
 expected={(n,p) for n in joints for p in ('translation','rotation','scale')}
 assert all(set(t)==expected for t in decoded.values())
 # Saved readback evaluates owned action at exact exported keys. Compare source
 # world heads and rest-relative world matrices, avoiding Blender bone-axis basis.
 rows=[json.loads(line) for line in (HERE/'pose-readback.jsonl').open(encoding='utf8')]
 owned=[r for r in rows if r['stage']=='owned-key-current-evaluation']
 reference=next(r for r in owned if r['clock']['clip']=='FelineTransitionBase106')
 src_rest={n:mul(reference['rootWorldSource'],m) for n,m in reference['actualEvaluatedArmatureMatrices'].items()}
 rest=world(temp,{ });max_pose=0;max_head=0;metrics={};pose_count=0
 for row in owned:
  name=row['clock']['clip'];frame=row['clock']['frame'];local={}
  for (bone,p),(ts,vs,mode) in decoded[name].items():
   k=frame-1;assert len(ts)==next(r['frames'] for r in author['records'] if r['name']==name)
   assert abs(ts[k]-frame/60)<=2e-6;local.setdefault(tm[bone],{})[p]=vs[k]
  worlds=world(temp,local)
  for bone,m in row['actualEvaluatedArmatureMatrices'].items():
   source=mul(row['rootWorldSource'],m);ex=worlds[tm[bone]]
   expected_head=mul(B,source);head=max(abs(ex[i][3]-expected_head[i][3]) for i in range(3));max_head=max(max_head,head)
   want=mul(mul(mul(B,source),inverse(src_rest[bone])),BT);actual=mul(ex,inverse(rest[tm[bone]]))
   delta=max(abs(want[i][j]-actual[i][j]) for i in range(4) for j in range(4));max_pose=max(max_pose,delta)
   assert head<=LIMIT and delta<=LIMIT,('SOURCE_EXPORT_POSE_MISMATCH',name,frame,bone,head,delta)
  pose_count+=1
  choreo=row['clock']['choreography']
  if 'duty' in choreo:
   m=metrics.setdefault(name,{'sourceDuty':choreo['duty'],'points':[],'intentNativeDistancePerCycle':choreo['nativeDistancePerCycle']})
   paw='HL' if 'Upright' in name else 'FL'
   if choreo['requests'][paw]['intent']=='stance':m['points'].append((row['clock']['phase'],worlds[tm[paw+'_paw']][2][3]))
 for name,m in metrics.items():
  pts=m.pop('points');assert len(pts)>2
  a,c=pts[0],pts[-1];stride=-.8*(c[1]-a[1])/(c[0]-a[0]);assert stride>0 and abs(stride-m['intentNativeDistancePerCycle'])<=LIMIT
  m['nativeDistancePerCycle']=stride;m['exportStanceSamplePhase']=[a[0],c[0]];m['measurement']='Actual exported ankle Z slope per unit cycle, scale .8, mounted Ry(pi); native/pad contact unqualified'
 # Exact reference local TRS and neutral arc endpoints permit additive conversion.
 for target,(ts,vs,mode) in decoded['FelineTransitionBase106'].items():
  n,p=target;expected_value=temp['nodes'][tm[n]].get(p,{'translation':[0,0,0],'rotation':[0,0,0,1],'scale':[1,1,1]}[p]);assert all(max(abs(v-w) for v,w in zip(row,expected_value))<=LIMIT for row in vs)
  av=decoded['FelineTransitionArc106'][target][1]
  assert max(abs(v-w) for endpoint in [av[0],av[-1]] for v,w in zip(endpoint,vs[0]))<=LIMIT
 result=copy.deepcopy(base);chunks=[bb];length=len(bb);amap={};vmap={}
 def append(i):
  global length
  if i in amap:return amap[i]
  a=temp['accessors'][i];vi=a['bufferView'];v=temp['bufferViews'][vi]
  if vi not in vmap:
   pad=(-length)%4;chunks.append(bytes(pad));length+=pad;data=tb[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];assert len(data)==v['byteLength']
   vmap[vi]=len(result['bufferViews']);result['bufferViews'].append({**copy.deepcopy(v),'byteOffset':length});chunks.append(data);length+=len(data)
  amap[i]=len(result['accessors']);result['accessors'].append({**copy.deepcopy(a),'bufferView':vmap[vi]});return amap[i]
 for name in sorted(SELECTED):
  a=copy.deepcopy(ta[name])
  for s in a['samplers']:s['input']=append(s['input']);s['output']=append(s['output'])
  for c in a['channels']:c['target']['node']=bm[temp['nodes'][c['target']['node']]['name']]
  if name in ba:result['animations'][next(i for i,a in enumerate(base['animations']) if a['name']==name)]=a
  else:result['animations'].append(a)
 blob=b''.join(chunks);result['buffers'][0]['byteLength']=len(blob)
 for key in base:
  if key not in ('animations','accessors','bufferViews','buffers'):assert result[key]==base[key],('ORIGINAL_RESOURCE_CHANGED',key)
 assert result['accessors'][:len(base['accessors'])]==base['accessors'] and result['bufferViews'][:len(base['bufferViews'])]==base['bufferViews'] and blob[:len(bb)]==bb
 assert all(a==result['animations'][i] for i,a in enumerate(base['animations']) if a['name'] not in SELECTED)
 for name in SELECTED:assert tracks(result,blob,next(a for a in result['animations'] if a['name']==name))==decoded[name]
 actual_catalog={}
 for a in result['animations']:
  t=tracks(result,blob,a);starts=[v[0][0] for v in t.values()];ends=[v[0][-1] for v in t.values()]
  entry={'duration':max(ends),'channels':len(t),'targets':sorted(n+'.'+p for n,p in t)}
  if a['name'] in metrics:entry['measuredGait']={**metrics[a['name']],'cycleStart':min(starts),'cycleEnd':max(ends)}
  elif a['name'] in ADDED:entry['sampleInterval']={'start':min(starts),'end':max(ends)}
  elif 'measuredGait' in manifest['clips'][a['name']]:entry['measuredGait']=manifest['clips'][a['name']]['measuredGait']
  actual_catalog[a['name']]=entry
 j=json.dumps(result,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=bytes((-len(blob))%4)
 raw=struct.pack('<III',0x46546c67,2,28+len(j)+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob
 output=HERE/'Pounce_Motion106.glb';assert not output.exists();output.write_bytes(raw)
 manifest.update(schema='identity57-motion106-actual-animation-graft-candidate',source=str(output.relative_to(ROOT)).replace('\\','/'),publicURL='/assets/models/Pounce_Motion106.glb',sha256=sha(output),bytes=len(raw),clips=actual_catalog,scope='Playable motion candidate; 058E resources/BIN prefix and38 nonselected actions preserved; five whole-body gaits plus additive R reference/arc. Visual quality, native contact and full goal unqualified.')
 save('identity57Runtime106Manifest.json',manifest)
 witness={'sha256':sha(output),'bytes':len(raw),'sourcePosesCompared':pose_count,'sourceExportWorldMatrixMaxError':max_pose,'sourceExportHeadMaxError':max_head,'allSkinBindsExact':True,'all57RestAndNonboneAncestryExact':True,'originalResourcesAndBINPrefixExact':True,'nonselectedActionsRetained':38,'selectedTracksCopiedExactly':7,'actualClipCount':45,'actualGaitMetrics':metrics,'additiveReferenceRestAndArcEndpointsVerified':True,'visualQualityApproved':False,'nativeContactApproved':False}
 save('graft-verification.json',witness)
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
finally:save('graft106-receipt.json',{'writer':'CLOSED','startedUTC':started,'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FIRST_ACTUAL_GRAFT_FAILURE_STOP' if error else 'ACTUAL_GRAFT_VERIFIED_CANDIDATE','error':error,'witness':witness})
if error:raise RuntimeError(error['message'])
print(json.dumps(witness))

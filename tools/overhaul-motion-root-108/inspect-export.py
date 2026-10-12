from pathlib import Path
import json,struct,hashlib,math
r=Path(__file__).resolve().parents[2];a=r/'assets/source/overhaul-pounce-motion-106'
def parse(p):
 b=p.read_bytes();assert struct.unpack_from('<III',b)==(0x46546c67,2,len(b));n,k=struct.unpack_from('<II',b,12);assert k==0x4e4f534a
 d=json.loads(b[20:20+n]);m,k=struct.unpack_from('<II',b,20+n);assert k==0x004e4942
 return d,b[28+n:28+n+m]
def values(d,b,i):
 x=d['accessors'][i];v=d['bufferViews'][x['bufferView']];assert v['buffer']==0 and 'sparse' not in x
 width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[x['type']];fmt,size={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[x['componentType']]
 start=v.get('byteOffset',0)+x.get('byteOffset',0);stride=v.get('byteStride',width*size)
 return [struct.unpack_from('<'+fmt*width,b,start+j*stride) for j in range(x['count'])]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
receipt=json.loads((a/'author-receipt.json').read_text());assert receipt['error'] is None and receipt['status']=='AUTHORED_SOURCE_AND_TEMPORARY_EXPORT_UNADMITTED'
assert len(receipt['records'])==7 and all(x['match'] for x in receipt['protectedAfter'])
process=json.loads((r/'.sites-runtime/overhaul-20261010/motion108-author/process-receipt.json').read_text());assert process['exitCode']==0 and process['failure'] is None and all(x['match'] for x in process['inputsAfter'])
base,bb=parse(r/'public/assets/models/Pounce_Gait058E.glb');temp,tb=parse(a/'Pounce_Motion106.temporary.glb')
names=lambda d:{n['name']:i for i,n in enumerate(d['nodes']) if 'name' in n}
bm,tm=names(base),names(temp);assert len(tm)==len(temp['nodes']) and len(bm)==len(base['nodes'])
bs,ts=base['skins'][0],temp['skins'][0]
bn=[base['nodes'][i]['name'] for i in bs['joints']];tn=[temp['nodes'][i]['name'] for i in ts['joints']];assert set(bn)==set(tn) and len(bn)==57
ib=values(base,bb,bs['inverseBindMatrices']);it=values(temp,tb,ts['inverseBindMatrices']);bindings=dict(zip(tn,it));max_bind=max(abs(v-w) for name,m in zip(bn,ib) for v,w in zip(m,bindings[name]));assert max_bind<=1e-6,('bind mismatch',max_bind)
max_rest=0
for name in bn:
 x,y=base['nodes'][bm[name]],temp['nodes'][tm[name]]
 for key,default in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]:
  gap=max(abs(v-w) for v,w in zip(x.get(key,default),y.get(key,default)));max_rest=max(max_rest,gap)
assert max_rest<=1e-6,('joint rest mismatch',max_rest)
selected={'FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride','FelineTransitionArc106','FelineTransitionBase106'};catalog={}
for animation in temp['animations']:
 if animation['name'] not in selected:continue
 targets=[];starts=[];ends=[]
 for channel in animation['channels']:
  target=channel['target'];name=temp['nodes'][target['node']]['name'];assert name in bn and target['path'] in ('translation','rotation','scale')
  sampler=animation['samplers'][channel['sampler']];assert sampler.get('interpolation','LINEAR')=='LINEAR'
  times=[v[0] for v in values(temp,tb,sampler['input'])];out=values(temp,tb,sampler['output']);assert len(times)==len(out)
  assert all(math.isfinite(v) for row in out for v in row) and all(t2>t1 for t1,t2 in zip(times,times[1:]))
  targets.append(name+'.'+target['path']);starts.append(times[0]);ends.append(times[-1])
 catalog[animation['name']]={'duration':max(ends),'channels':len(targets),'targets':sorted(targets),'cycleStart':min(starts),'cycleEnd':max(ends)}
assert set(catalog)==selected
out={'status':'EXPORTED_CURVES_INSPECTED_UNADMITTED','savedMasterSHA256':sha(a/'Pounce_Motion106.blend'),'temporaryGLBSHA256':sha(a/'Pounce_Motion106.temporary.glb'),'baseGLBSHA256':sha(r/'public/assets/models/Pounce_Gait058E.glb'),'jointCount':57,'inverseBindMaxDifference':max_bind,'jointRestMaxDifference':max_rest,'animationCatalog':catalog,'visualQualityApproved':False}
p=a/'export-inventory.json';assert not p.exists();p.write_text(json.dumps(out,indent=2))
print(json.dumps({k:v for k,v in out.items() if k!='animationCatalog'}));print(json.dumps({n:{k:v for k,v in c.items() if k!='targets'} for n,c in catalog.items()}))

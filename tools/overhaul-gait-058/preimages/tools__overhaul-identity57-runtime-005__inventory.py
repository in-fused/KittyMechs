"""Light raw GLB inventory: no renderer, native world or source mutation."""
import json, struct, hashlib, math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
source=root/'assets/source/overhaul-pounce-identity57-animation-source-004/Pounce_IdentityAnimation004.raw.glb'
raw=source.read_bytes(); length=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+length]); off=20+length
blob=raw[off+8:off+8+struct.unpack_from('<I',raw,off)[0]]
nodes=g['nodes']; parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
types={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 assert a['componentType']==5126 and 'sparse' not in a
 count=types[a['type']];stride=v.get('byteStride',count*4);start=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+'f'*count,blob,start+k*stride) for k in range(a['count'])]
def mul(a,b):
 ax,ay,az,aw=a;bx,by,bz,bw=b
 return (aw*bx+ax*bw+ay*bz-az*by,aw*by+ay*bw+az*bx-ax*bz,aw*bz+az*bw+ax*by-ay*bx,aw*bw-ax*bx-ay*by-az*bz)
def sample(path,t,ts,vs):
 if t<=ts[0]:return vs[0]
 if t>=ts[-1]:return vs[-1]
 k=next(k for k in range(len(ts)-1) if ts[k]<=t<=ts[k+1]);u=(t-ts[k])/(ts[k+1]-ts[k]);a=vs[k];b=vs[k+1]
 if path=='rotation':
  dot=sum(x*y for x,y in zip(a,b))
  if dot<0:b=tuple(-x for x in b);dot=-dot
  if dot<.9995:
   theta=math.acos(min(1,dot));s=math.sin(theta);v=tuple((math.sin((1-u)*theta)*x+math.sin(u*theta)*y)/s for x,y in zip(a,b))
  else:v=tuple((1-u)*x+u*y for x,y in zip(a,b))
  norm=math.sqrt(sum(x*x for x in v));return tuple(x/norm for x in v)
 return tuple((1-u)*x+u*y for x,y in zip(a,b))
def rotate(v,q):
 x,y,z,w=q;vx,vy,vz=v;tx=2*(y*vz-z*vy);ty=2*(z*vx-x*vz);tz=2*(x*vy-y*vx)
 return (vx+w*tx+y*tz-z*ty,vy+w*ty+z*tx-x*tz,vz+w*tz+x*ty-y*tx)
def posed_world(local):
 cache={}
 def visit(i):
  if i in cache:return cache[i]
  n=nodes[i];p=local.get((i,'translation'),n.get('translation',[0,0,0]));q=local.get((i,'rotation'),n.get('rotation',[0,0,0,1]));s=local.get((i,'scale'),n.get('scale',[1,1,1]))
  assert 'matrix' not in n, 'matrix node needs explicit decomposition'
  if i in parents:
   pp,pq,ps=visit(parents[i]);r=rotate(tuple(p[k]*ps[k] for k in range(3)),pq);p=tuple(pp[k]+r[k] for k in range(3));q=mul(pq,q);s=tuple(ps[k]*s[k] for k in range(3))
  cache[i]=(p,q,s);return cache[i]
 for i in range(len(nodes)):visit(i)
 return cache
rest=posed_world({});joint_ids=g['skins'][0]['joints'];byname={n.get('name'):i for i,n in enumerate(nodes)}
clips={}
gait_names={'FelineWalk','FelineTrot','FelineGallop','FelineUprightWalk','FelineUprightWalkLong','FelineUprightStride'}
for anim in g['animations']:
 channels=[];end=0
 for c in anim['channels']:
  samp=anim['samplers'][c['sampler']];times=[v[0] for v in accessor(samp['input'])];values=accessor(samp['output']);end=max(end,max(times));channels.append((c['target']['node'],c['target']['path'],times,values))
 record={'duration':end,'channels':len(channels),'targets':sorted(nodes[i]['name']+'.'+path for i,path,_,_ in channels)}
 if anim['name'] in gait_names:
  paw='HL_paw' if 'Upright' in anim['name'] else 'FL_paw';clock=max((c[2] for c in channels),key=len);pts=[]
  for k,t in enumerate(clock):
   local={(i,p):sample(p,t,ts,vs) for i,p,ts,vs in channels};pts.append(posed_world(local)[byname[paw]][0])
  low=min(p[1] for p in pts);stance=[(k,p) for k,p in enumerate(pts[:-1]) if p[1]<=low+.0001]
  duty=len(stance)/max(1,len(pts)-1);sweep=max(p[2] for _,p in stance)-min(p[2] for _,p in stance)
  assert duty>0 and sweep>0
  record['measuredGait']={'paw':paw,'pawHeadMinY':low,'nearLowHeadThreshold':.0001,'stanceFraction':duty,'stanceSweepExportZ':sweep,'nativeDistancePerCycle':.8*sweep/duty,'interpretation':'Measured ankle-head low-height sweep, not native support or pad proof'}
 clips[anim['name']]=record
manifest={'schema':'identity57-runtime005-partial-source','source':str(source.relative_to(root)).replace('\\','/'),'publicURL':'/assets/models/Pounce_Identity57_Runtime005.glb','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'scale':.8,'basis':'GLTF export_yup already (sourceX,sourceZ,-sourceY); source -Yfront exports +Z; actual authority direction(yaw=0) is -Z; measured separate Ry(pi) mount','sourceFloorWorldZ':-.018,'floorBakedInExport':True,'jointNames':[nodes[i]['name'] for i in joint_ids],'jointParents':{nodes[i]['name']:nodes[parents[i]].get('name') if i in parents else None for i in joint_ids},'restJointWorldHeads':{nodes[i]['name']:rest[i][0] for i in joint_ids},'clips':clips,'missingSourceActions':['FelineUprightDeath','FelineUprightDown','FelineUprightPair*'],'scope':'PRIVATE_SUPPORTED_ACTION_OBSERVATION_ONLY; source004 original failure preserved'}
assert len(joint_ids)==57 and len(clips)==43
(root/'src/game/entities/identity57Runtime005Manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'sha256':manifest['sha256'],'joints':len(joint_ids),'clips':len(clips),'gaits':{k:v['measuredGait']['nativeDistancePerCycle'] for k,v in clips.items() if 'measuredGait' in v},'head':rest[byname['head']][0],'tail0':rest[byname['tail_0']][0]}))



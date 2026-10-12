"""Read saved operands and GLB sampler bytes only; no pose evaluator or jobs."""
import json,struct,hashlib,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).parent
def glb(path):
 b=path.read_bytes(); n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);p=20+n;size=struct.unpack_from('<I',b,p)[0];return j,b[p+8:p+8+size]
def values(doc,bin,index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];assert a['componentType']==5126 and not v.get('byteStride');start=v.get('byteOffset',0)+a.get('byteOffset',0);return [list(struct.unpack_from('<'+'f'*w,bin,start+i*4*w)) for i in range(a['count'])]
site=ROOT/'.sites-runtime/overhaul-20261010/delivery206-primary';m=json.loads((site/'evidence.json').read_text())['measurement'];phi=m['lastCase']['phi'];g=m['actualCatalog']['FelineGallop']['measuredGait'];raw=(phi-g['sourceOffsets']['HL'])%1;t=g['cycleStart']+raw*(g['cycleEnd']-g['cycleStart'])
paths=[ROOT/'tools/overhaul-anatomy-motion-202/output/Pounce_Anatomy202.glb',HERE/'output/Pounce_Anatomy206.glb'];sources=[]
for path in paths:
 d,b=glb(path);a=next(a for a in d['animations'] if a['name']=='FelineGallop');channels=[]
 for c in a['channels']:
  s=a['samplers'][c['sampler']];bone=d['nodes'][c['target']['node']]['name'];prop=c['target']['path'];times=[v[0] for v in values(d,b,s['input'])];v=values(d,b,s['output']);stride=3 if s.get('interpolation')=='CUBICSPLINE' else 1
  near=[]
  for i in range(len(times)-1):
   if times[i]<=t<=times[i+1] and prop=='rotation':
    q0=v[i*stride+(1 if stride==3 else 0)];q1=v[(i+1)*stride+(1 if stride==3 else 0)];dot=sum(x*y for x,y in zip(q0,q1));near.append({'indices':[i,i+1],'times':[times[i],times[i+1]],'frames':[60*times[i],60*times[i+1]],'fraction':(t-times[i])/(times[i+1]-times[i]),'quaternions':[q0,q1],'dot':dot,'norms':[math.sqrt(sum(x*x for x in q)) for q in [q0,q1]],'rawCubicRows':v[i*stride:(i+2)*stride]})
  if near:channels.append({'bone':bone,'property':prop,'interpolation':s.get('interpolation','LINEAR'),'near':near,'samplerValuesSHA':hashlib.sha256(json.dumps([times,v],separators=(',',':')).encode()).hexdigest()})
 sources.append({'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'nearbyQuaternionChannels':channels})
rows=json.loads((ROOT/'assets/source/overhaul-anatomy-motion-202/source-operands202.json').read_text());neighbors=[x for x in rows if (x.get('clock') or {}).get('name')=='FelineGallop' and 18<=(x.get('clock') or {}).get('frame',0)<=21 and x.get('operands',{}).get('stage')=='limb-before-fixed-reach' and x['operands'].get('limb')=='FR']
out={'scope':'READ_ONLY_SAVED_OPERANDS_AND_SAMPLER_BYTES_NOT_NEW_POSE_EVALUATION','status':'FIRST_REMAINING_SOURCE_FAILURE','completeActions':{'names':len(set(x['name'] for x in m['completeActions'])),'cases':len(m['completeActions']),'maximumWorldMatrixComponentResidual':max(b['maxWorldMatrixResidual'] for x in m['completeActions'] for b in x['bones']),'limit':2e-5,'unit':'mixed translation/rotation matrix components'},'ordinaryPassedFrames':len(m['frames']),'failure':m['failures'][0],'clock':{'canonical':phi,'raw':raw,'seconds':t,'frame':t*60,'authorCanonical':(raw+g['sourceOffsets']['HL'])%1,'record':g},'sources':sources,'neighborAuthorOperands':neighbors,'unreached':['remaining gallop phases','walk/trot/upright','mixedR/bands/stop/idle','parent covariance','temporal preview','native/gameplay contact']}
(HERE/'failure-forensics207.json').write_text(json.dumps(out,indent=2,allow_nan=False))
for src in sources:
 bad=[(x['bone'],x['near'][0]['dot']) for x in src['nearbyQuaternionChannels'] if x['near'][0]['dot']<0];print(src['path'],'negative adjacent dots',bad)
print('clocks',out['clock']['raw'],out['clock']['seconds'],'complete',out['completeActions'],'ordinary',len(m['frames']))

"""ONE bounded postprocess of the immutable failed048 raw; never author/repair poses."""
from pathlib import Path
import json,struct,hashlib,math,datetime,traceback,copy
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/source/overhaul-moving-recoil-049'
RAW=ROOT/'assets/source/overhaul-moving-recoil-048/Pounce_MovingRecoil048.raw.glb'
BLEND=ROOT/'assets/source/overhaul-moving-recoil-048/Pounce_MovingRecoil048.blend'
MODEL=ROOT/'public/assets/models/Pounce_ArtDetail034.glb'
RAW_SHA='349ff039be0952b04c90f915010945e8520a05e7ae1d91126ba9a71fd725b010'
BLEND_SHA='316e063e47156cf04be38cd48f0e7fc1525a52a454a5a8fda94d0cbe17fdb751'
MODEL_SHA='5295d87f683bcbbc5df6647cca92f12725050cfd8174403787f0e5d760b0b595'
NAMES=['FelinePulseMoving048','FelineMissileMoving048','FelineUprightPulseMoving048','FelineUprightMissileMoving048']
start=datetime.datetime.now(datetime.timezone.utc).isoformat();failure=None;rows={};binary_sha=None
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def save(name,value):(OUT/name).write_text(json.dumps(value,indent=2),encoding='utf8')
def read(path):
 data=path.read_bytes()
 if len(data)<28 or struct.unpack_from('<III',data,0)!=(0x46546c67,2,len(data)):raise RuntimeError('INVALID_COMPLETE_GLB')
 size,kind=struct.unpack_from('<II',data,12)
 if kind!=0x4e4f534a:raise RuntimeError('EXPECTED_JSON')
 length,kind=struct.unpack_from('<II',data,20+size)
 if kind!=0x004e4942 or 28+size+length!=len(data):raise RuntimeError('EXPECTED_EXACT_BIN_TAIL')
 return json.loads(data[20:20+size]),data[28+size:]
def values(doc,binary,index):
 a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC4':4}.get(a['type'])
 if not size or a['componentType']!=5126 or a.get('sparse') or a.get('normalized') or v.get('extensions') or v.get('byteStride') or v.get('buffer',0)!=0:raise RuntimeError('UNSUPPORTED_ACTUAL_CHANNEL_ACCESSOR')
 offset=v.get('byteOffset',0)+a.get('byteOffset',0);length=a['count']*size*4
 if offset<0 or offset+length>len(binary) or length>v['byteLength']:raise RuntimeError('INVALID_CHANNEL_SPAN')
 return [list(struct.unpack_from('<'+'f'*size,binary,offset+i*size*4)) for i in range(a['count'])]
def head(doc,animation):
 found=[c for c in animation['channels'] if doc['nodes'][c['target']['node']].get('name')=='head' and c['target']['path']=='rotation']
 if len(found)!=1:raise RuntimeError('EXACTLY_ONE_HEAD_ROTATION_REQUIRED:'+animation['name'])
 return found[0]
def qdistance(a,b):return min(max(abs(x-y) for x,y in zip(a,b)),max(abs(x+y) for x,y in zip(a,b)))
try:
 OUT.mkdir(parents=True,exist_ok=True)
 for name in ['Pounce_MovingRecoil049.glb','manifest.json','provenance.json','process-receipt.json']:
  if (OUT/name).exists():raise RuntimeError('REFUSE_OUTPUT_OVERWRITE:'+name)
 for path,expected in [(RAW,RAW_SHA),(BLEND,BLEND_SHA),(MODEL,MODEL_SHA)]:
  if sha(path)!=expected:raise RuntimeError('IMMUTABLE_SOURCE_SHA_CHANGED:'+str(path))
 failed=json.loads((RAW.parent/'author-receipt.json').read_text())
 if failed['status']!='FAILED_STOP' or failed['error']['message']!='ANIMATION_ONLY_EXPORT_HAS_RENDER_ASSET':raise RuntimeError('EXPECTED_ORIGINAL048_FAILURE')
 doc,binary=read(RAW);frozen,frozen_binary=read(MODEL);original=copy.deepcopy(doc);binary_sha=hashlib.sha256(binary).hexdigest()
 if any(doc.get(key) for key in ['meshes','materials','images','textures']):raise RuntimeError('RAW_HAS_ACTUAL_RENDER_ASSET')
 if any('mesh' in node or 'skin' in node for node in doc['nodes']):raise RuntimeError('SKIN_METADATA_IS_REFERENCED')
 if len(doc.get('skins',[]))!=1 or len(doc['skins'][0]['joints'])!=57:raise RuntimeError('EXPECTED_ONE_ORPHAN57_SKIN')
 if sorted(a['name'] for a in doc['animations'])!=sorted(NAMES):raise RuntimeError('EXACT_FOUR_AUTHORED_NAMES_REQUIRED')
 del doc['skins']
 for animation in doc['animations']:
  channel=head(doc,animation);sampler=animation['samplers'][channel['sampler']]
  if sampler.get('interpolation','LINEAR')!='LINEAR':raise RuntimeError('EXPECTED_ACTUAL_LINEAR_SAMPLING')
  quaternions=values(doc,binary,sampler['output']);times=[v[0] for v in values(doc,binary,sampler['input'])]
  frames=28 if 'Missile' in animation['name'] else 20;duration=frames/60
  if len(times)!=frames+1 or len(quaternions)!=len(times) or any(not math.isfinite(v) for v in times):raise RuntimeError('ACTUAL_FRAME_COUNT_OR_FINITE_TIMING')
  if abs(times[0])>1e-6 or abs(times[-1]-duration)>1e-6 or any(abs(b-a-1/60)>1e-5 for a,b in zip(times,times[1:])):raise RuntimeError('ACTUAL60HZ_MONOTONIC_TIMING')
  if any(any(not math.isfinite(v) for v in q) or abs(sum(v*v for v in q)-1)>2e-5 for q in quaternions):raise RuntimeError('NONFINITE_OR_NONUNIT_ACTUAL_QUATERNION')
  prefix='FelineUpright' if animation['name'].startswith('FelineUpright') else 'Feline';idle=next(a for a in frozen['animations'] if a['name']==prefix+'Idle');idle_channel=head(frozen,idle);idle_sampler=idle['samplers'][idle_channel['sampler']];reference=values(frozen,frozen_binary,idle_sampler['output'])[0]
  if max(qdistance(quaternions[0],reference),qdistance(quaternions[-1],reference))>1e-5:raise RuntimeError('ACTUAL034_IDLE_ENDPOINT_BASIS_MISMATCH:'+animation['name'])
  motion=max(qdistance(q,reference) for q in quaternions)
  if motion<=.035:raise RuntimeError('NONIDENTITY_READABLE_MOTION_REQUIRED:'+animation['name'])
  # Preserve exact authored sampler references and every byte of its accessor/BIN.
  animation['channels']=[dict(channel,sampler=0)];animation['samplers']=[sampler]
  rows[animation['name']]={'duration':times[-1],'channels':1,'targets':['head.quaternion'],'idleReference':prefix+'Idle','referenceQuaternionXYZW':reference,'maxReferenceComponentMotion':motion,'samples':len(times),'inputAccessor':sampler['input'],'outputAccessor':sampler['output']}
 if any(doc.get(key) for key in ['meshes','materials','skins','images','textures']):raise RuntimeError('FINAL_ZERO_RENDER_ASSETS_REQUIRED')
 for key in ['nodes','accessors','bufferViews','buffers','scenes','scene']:
  if doc.get(key)!=original.get(key):raise RuntimeError('IMMUTABLE_METADATA_CHANGED:'+key)
 encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 output=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
 candidate=OUT/'Pounce_MovingRecoil049.glb';candidate.write_bytes(output);check,check_binary=read(candidate)
 if check_binary!=binary:raise RuntimeError('AUTHORED_BIN_PAYLOAD_CHANGED')
 for a in check['animations']:
  c=head(check,a);s=a['samplers'][c['sampler']]
  if len(a['channels'])!=1 or values(check,check_binary,s['output'])!=values(original,binary,rows[a['name']]['outputAccessor']):raise RuntimeError('AUTHORED_HEAD_VALUES_CHANGED')
 save('manifest.json',{'schema':'original-moving-head-recoil049-048authored-samples','publicURL':'/assets/models/Pounce_MovingRecoil049.glb','sha256':sha(candidate),'bytes':len(output),'sourceMasterSHA256':failed['sourceMasterSHA256'],'sourceModelSHA256':MODEL_SHA,'sourceRawSHA256':RAW_SHA,'sourceBlendSHA256':BLEND_SHA,'clips':rows,'scope':'Head-only authored motion, no geometry/material/skin/native/contact certificate'})
 save('provenance.json',{'license':'Original project-authored048 animation; no external asset/provider','sourceRaw':str(RAW.relative_to(ROOT)),'sourceRawSHA256':RAW_SHA,'sourceBlend':str(BLEND.relative_to(ROOT)),'sourceBlendSHA256':BLEND_SHA,'original034SHA256':MODEL_SHA,'original048FailurePreserved':True,'sourceBIN_SHA256':binary_sha,'finalBIN_SHA256':hashlib.sha256(check_binary).hexdigest(),'operation':'Verified orphan skin metadata removed; exactly four authored head rotation channels retained; all head times/values/accessors and BIN bytes unchanged','newAuthoring':False})
 for path,expected in [(RAW,RAW_SHA),(BLEND,BLEND_SHA),(MODEL,MODEL_SHA)]:
  if sha(path)!=expected:raise RuntimeError('SOURCE_CHANGED_DURING_POSTPROCESS')
except Exception as exc:failure={'message':str(exc),'traceback':traceback.format_exc()}
finally:
 if not (OUT/'process-receipt.json').exists():save('process-receipt.json',{'startUTC':start,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FAILED_STOP' if failure else 'VALIDATED_ANIMATION_ONLY_UNQUALIFIED','error':failure,'sourceRawSHA256':RAW_SHA,'original034SHA256':MODEL_SHA,'sourceBIN_SHA256':binary_sha,'clips':rows,'oneAttempt':True})
if failure:raise RuntimeError(failure['message'])

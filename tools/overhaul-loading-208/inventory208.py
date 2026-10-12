from pathlib import Path
import json,struct,hashlib,io
from PIL import Image
r=Path('.');out=r/'tools/overhaul-loading-208';base=r/'.sites-runtime/overhaul-20261009/build-062/playable-root/dist'
names=['assets/models/Sentinel_Anchor.glb','assets/models/Sentinel_Mortar.glb','assets/models/Sentinel_Scout.glb','assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb','assets/models/Pounce_Anatomy121Batched.glb'];rows=[]
for name in names:
 p=base/name;b=p.read_bytes();length,kind=struct.unpack_from('<II',b,12);assert kind==0x4e4f534a;j=json.loads(b[20:20+length]);binstart=20+length+8
 active=set();stack=list(j['scenes'][j.get('scene',0)]['nodes'])
 while stack:
  n=stack.pop()
  if n in active:continue
  active.add(n);stack+=j['nodes'][n].get('children',[])
 meshIDs={j['nodes'][n]['mesh'] for n in active if 'mesh' in j['nodes'][n]};primitives=[q for n in meshIDs for q in j['meshes'][n]['primitives']]
 images=[]
 for im in j.get('images',[]):
  if 'bufferView' not in im:images.append({'externalURI':im.get('uri')});continue
  bv=j['bufferViews'][im['bufferView']];start=binstart+bv.get('byteOffset',0);data=b[start:start+bv['byteLength']]
  with Image.open(io.BytesIO(data)) as image:width,height=image.size
  images.append({'mimeType':im.get('mimeType'),'encodedBytes':len(data),'width':width,'height':height,'RGBA8WithMipBytesEstimate':width*height*4*4/3})
 compressed=[v['extensions']['EXT_meshopt_compression'] for v in j.get('bufferViews',[]) if 'EXT_meshopt_compression' in v.get('extensions',{})]
 rows.append({'path':p.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'allJSONMeshes':len(j.get('meshes',[])),'activeMeshes':len(meshIDs),'activePrimitives':len(primitives),'activeTriangles':sum(j['accessors'][q['indices']]['count']//3 for q in primitives if q.get('mode',4)==4),'materials':len(j.get('materials',[])),'textures':len(j.get('textures',[])),'images':images,'skinJoints':[len(s['joints']) for s in j.get('skins',[])],'animations':len(j.get('animations',[])),'channels':sum(len(a['channels']) for a in j.get('animations',[])),'meshoptViews':len(compressed),'meshoptDecodedBytes':sum(v['count']*v['byteStride'] for v in compressed),'extensions':j.get('extensionsUsed',[])})
e=json.loads((r/'.sites-runtime/overhaul-20261010/coop204-public/evidence.json').read_text(encoding='utf8'));saved=[]
for q in e['partialFailureObservations']:
 if 'receipt' not in q:continue
 d=q['receipt'];saved.append({'page':q['page'],'snapshotTick':d['snapshot']['tick'],'cameraFrameClock':d['camera']['frameClock'],'visualFrameClock':d['camera']['visualFrameClock'],'preferredDistance':d['camera']['preferredDistance'],'visualOwner':d['camera']['bodySight']['owner'],'performance':d['performance'],'inputAt':d['input']['at'],'transport':d['transport']})
(out/'asset-inventory.json').write_text(json.dumps({'writer':'CLOSED','scope':'FROZEN062 raw GLB JSON/image-header metadata only; no geometry decode/render/FPS test','assets':rows,'saved204':saved,'missing':['Manager active/loaded/total/errors and per-item start/end','Local SceneReady latch/current generation registry state','Network ResourceTiming/HTTP failures/transfer times','Meshopt per-view actual CPU/queue duration','Main-thread long tasks and animation/roster construction durations','GPU shader compile/texture upload and frame times']},indent=2)+'\n',encoding='utf8')
print(json.dumps({'assets':[{'name':Path(x['path']).name,'bytes':x['bytes'],'activePrimitives':x['activePrimitives'],'activeTriangles':x['activeTriangles'],'meshoptDecodedBytes':x['meshoptDecodedBytes'],'images':len(x['images'])} for x in rows]}))

"""Read-only GLB/source-byte qualification, writes only new lane audit receipt."""
import json,struct,os,hashlib,math
from PIL import Image
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/source/overhaul-rainline-street-population-001')
RECEIPT=os.path.join(ROOT,'.sites-runtime/overhaul-20261010/rainline-street-population-001')
path=os.path.join(OUT,'Rainline_StreetPopulation_001.glb');data=open(path,'rb').read()
magic,version,size=struct.unpack_from('<III',data)
assert magic==0x46546c67 and version==2 and size==len(data)
length,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
g=json.loads(data[20:20+length]);manifest=json.load(open(os.path.join(OUT,'manifest.json')))
tris=0;missing=[]
for mesh in g['meshes']:
 for p in mesh['primitives']:
  assert p.get('mode',4)==4
  count=g['accessors'][p['indices']]['count'] if 'indices' in p else g['accessors'][p['attributes']['POSITION']]['count']
  assert count%3==0;tris+=count//3
  for attr in ['COLOR_0','TEXCOORD_0']:
   if attr not in p['attributes']:missing.append([mesh.get('name'),attr])
assert tris==manifest['totalUniqueTriangles'] and tris<=80000
assert len(g['materials'])<=4 and len(g.get('images',[]))==4 and not missing
assert len(data)<=12582912
for r in manifest['modules']:
 b=r['bounds_gltf_xyz'];assert all(math.isfinite(v) for v in b['min']+b['max']);assert all(mx>mn for mn,mx in zip(b['min'],b['max']));assert r['collisionProposal']
files=[]
for n in sorted(os.listdir(OUT)):
 p=os.path.join(OUT,n)
 if os.path.isfile(p):
  row={'name':n,'bytes':os.path.getsize(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()}
  if n.endswith('.png'):row['imageSize']=list(Image.open(p).size)
  files.append(row)
assert Image.open(os.path.join(OUT,'review-module-silhouettes.png')).size==(2400,1900)
assert Image.open(os.path.join(OUT,'review-west-loading-sample.png')).size==(2200,1500)
report={'status':'STATIC_SOURCE_BYTES_PASS_RUNTIME_AND_CRITIC_PENDING','glbBytes':len(data),'glbSHA256':hashlib.sha256(data).hexdigest(),'uniqueTriangles':tris,'meshes':len(g['meshes']),'materials':len(g['materials']),'textures':len(g.get('textures',[])),'embeddedImages':len(g['images']),'nodes':len(g['nodes']),'sourceModuleCount':len(manifest['modules']),'colorAndUVAttributes':'all primitives present','boundsEvidence':'source world-coordinate bounds in manifest, finite nonzero extents; no collision/contact/runtime claim','files':files}
json.dump(report,open(os.path.join(RECEIPT,'static-audit.json'),'w'),indent=2)
print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))

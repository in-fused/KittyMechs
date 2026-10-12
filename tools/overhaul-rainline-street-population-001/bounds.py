"""Lightweight exact exported vertex bounds; no Blender, no geometry mutation."""
import os,json,struct,math
import numpy as np
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/source/overhaul-rainline-street-population-001')
data=open(os.path.join(OUT,'Rainline_StreetPopulation_001.glb'),'rb').read();length=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+length]);binary=memoryview(data)[28+length:]
modules={r['id']:r for r in json.load(open(os.path.join(OUT,'manifest.json')))['modules']};acc={}
def read(i):
 a=g['accessors'][i];assert a['componentType']==5126 and a['type']=='VEC3' and not a.get('sparse')
 view=g['bufferViews'][a['bufferView']];off=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',12)
 return np.ndarray((a['count'],3),dtype='<f4',buffer=binary,offset=off,strides=(stride,4)).astype(np.float64)
def matrix(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
 m=np.eye(4);m[:3,:3]=r@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
def walk(i,parent,owner=None):
 n=g['nodes'][i];world=parent@matrix(n);name=n.get('name','');owner=name if name in modules else owner
 if 'mesh' in n:
  assert owner is not None,('unowned',name)
  for p in g['meshes'][n['mesh']]['primitives']:
   v=read(p['attributes']['POSITION']);v=np.column_stack([v,np.ones(len(v))])@world.T;v=v[:,:3]
   if owner not in acc:acc[owner]={'min':v.min(0),'max':v.max(0),'vertices':0}
   else:acc[owner]['min']=np.minimum(acc[owner]['min'],v.min(0));acc[owner]['max']=np.maximum(acc[owner]['max'],v.max(0))
   acc[owner]['vertices']+=len(v)
 for child in n.get('children',[]):walk(child,world,owner)
for root in g['scenes'][g.get('scene',0)]['nodes']:walk(root,np.eye(4))
records=[]
for name,b in acc.items():
 mn=b['min'];mx=b['max'];assert np.isfinite(mn).all() and np.isfinite(mx).all()
 records.append({'id':name,'min_gltf_xyz':mn.tolist(),'max_gltf_xyz':mx.tolist(),'sizeXYZMeters':(mx-mn).tolist(),'positionCount':b['vertices'],'sourceManifestBounds':'conservative transformed object boxes; this receipt is exact exported vertex extrema','physicalContactAdmission':'PENDING'})
report={'status':'EXACT_EXPORTED_VERTEX_EXTREMA_SOURCE_ONLY','coordinateSystem':'meters, glTF Y up','moduleCount':len(records),'positionCount':sum(r['positionCount'] for r in records),'modules':records}
json.dump(report,open(os.path.join(ROOT,'.sites-runtime/overhaul-20261010/rainline-street-population-001/exact-exported-bounds.json'),'w'),indent=2)
for r in records:print(r['id'],[round(v,4) for v in r['sizeXYZMeters']])

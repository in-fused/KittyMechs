"""Small static recipe check; no Blender, mesh creation, pose, or native run."""
import ast,json,hashlib,pathlib,datetime
from panel_topology import grow_disk
ROOT=pathlib.Path(__file__).resolve().parents[2]
HERE=pathlib.Path(__file__).resolve().parent
paths=[ROOT/'assets/source/overhaul-feline-source-manifold-and-finish-004/author.py',HERE/'source_owner.py',HERE/'panel_topology.py']
for path in paths:ast.parse(path.read_text(encoding='utf-8-sig'),filename=str(path))
joined=grow_disk([(0,1,2),(0,2,3),(0,4,5)],[0,1,2],0)
assert joined['triangles']==[0,1] and joined['excludedSelectedTriangles']==[2]
closed_fan=grow_disk([(0,1,2),(0,2,3),(0,3,4),(0,4,1)],[0,1,2,3],0)
assert closed_fan['triangles']==[0,1,2,3] and set(closed_fan['boundary'])=={1,2,3,4}
receipt={'closedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'STATIC_SYNTAX_AND_DISK_CONSTRUCTION_ONLY','astFiles':[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],'vertexOnlyFan':joined,'edgeFanClosedToSingleBoundary':closed_fan,'sourceGeometryMotionNative':'NOT_RUN'}
(HERE/'preparation-check.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps({'status':receipt['status'],'sourceGeometryMotionNative':'NOT_RUN'}))

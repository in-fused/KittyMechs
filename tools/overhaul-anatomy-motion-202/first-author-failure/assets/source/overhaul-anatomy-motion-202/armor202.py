"""202 bounded armor ledger. Only explicit NEW master's axial/scapular objects.
No execute-on-import, image generation, installs, material replacement or scale.
"""
import hashlib,json
from mathutils import Vector,Matrix
from anatomy202 import AXIAL202
AXIAL_PREFIX202=('AnatomicalChassis','ArticulatedWaistRib_','WaistFlexCable_','WaistCopperLine_','OverlappingMantle_','PelvicDorsalScale_')
def mesh_fingerprint202(o):
 return hashlib.sha256(repr({'vertices':[list(v.co) for v in o.data.vertices],'faces':[list(f.vertices) for f in o.data.polygons],'uv':[[list(x.uv) for x in u.data] for u in o.data.uv_layers],'weights':[[(o.vertex_groups[g.group].name,g.weight) for g in v.groups] for v in o.data.vertices],'materials':[m.name for m in o.data.materials],'basis':[list(r) for r in o.matrix_basis]}).encode()).hexdigest()
def mutable202(o):return o.name.startswith(AXIAL_PREFIX202) or o.name.startswith(('FL_ShoulderInsetVent_','FR_ShoulderInsetVent_'))
def body_objects202(rig):return [o for o in rig.children if o.type=='MESH' and o.get('source_owner')]
def armor202(rig,emit):
 import bpy
 before=body_objects202(rig);untouched={o.name:mesh_fingerprint202(o) for o in before if not mutable202(o)};ledger=[];heads=[rig.data.bones[n].head_local.copy() for n in AXIAL202];forward=(heads[-1]-heads[0]).normalized();coordinates=[p.dot(forward) for p in heads]
 for o in before:
  if not mutable202(o):continue
  row={'object':o.name,'before':mesh_fingerprint202(o),'changedVertices':[]};ledger.append(row);localToRig=rig.matrix_world.inverted()@o.matrix_world
  if o.name.startswith(('FL_ShoulderInsetVent_','FR_ShoulderInsetVent_')):
   owner=o.name[:2]+'_scapula202'
   for group in list(o.vertex_groups):o.vertex_groups.remove(group)
   o.vertex_groups.new(name=owner).add(list(range(len(o.data.vertices))),1,'REPLACE');row['ownership']=owner
  else:
   for v in o.data.vertices:
    old=[(o.vertex_groups[g.group].name,float(g.weight)) for g in v.groups];body=sum(w for n,w in old if n in ('pelvis','spine','chest'))
    if not body:continue
    c=(localToRig@v.co).dot(forward)
    if c<coordinates[0] or c>coordinates[-1]:continue
    for i in range(4):
     if coordinates[i]<=c<=coordinates[i+1]:break
    t=(c-coordinates[i])/(coordinates[i+1]-coordinates[i]);new=[(n,w) for n,w in old if n not in ('pelvis','spine','chest')]+[(AXIAL202[i],body*(1-t)),(AXIAL202[i+1],body*t)];new=[(n,w) for n,w in new if w>0]
    row['changedVertices'].append({'vertex':v.index,'old':old,'new':new,'sourceRigPoint':list(localToRig@v.co)})
    if len(new)>4 or abs(sum(w for n,w in new)-sum(w for n,w in old))>2e-5:raise RuntimeError('202_WEIGHT_LAYOUT_OR_SUM')
    for g in list(v.groups):o.vertex_groups[g.group].remove([v.index])
    for n,w in new:(o.vertex_groups.get(n) or o.vertex_groups.new(name=n)).add([v.index],w,'REPLACE')
  row['after']=mesh_fingerprint202(o);emit(row)
 # The old anterior DorsalKeel does not span the waist. Add four physically
 # separate rigid overlapping plates centered on the ACTUAL new axial spans.
 chassis=next(o for o in before if o.name=='AnatomicalChassis');chassisRig=rig.matrix_world.inverted()@chassis.matrix_world;points=[chassisRig@v.co for v in chassis.data.vertices];material=bpy.data.materials['FelinePBR_Identity003_DeepTealCeramic']
 for i,name in enumerate(AXIAL202[:-1]):
  a,b=heads[i],heads[i+1];axis=(b-a).normalized();right=Vector((1,0,0));normal=right.cross(axis).normalized()
  if normal.z<0:normal=-normal
  centre=a.lerp(b,.5);near=[p for p in points if abs((p-centre).dot(forward))<(b-a).length*.65]
  if not near:raise RuntimeError('202_AXIAL_PLATE_NO_ACTUAL_ENVELOPE')
  width=max(abs(p.x) for p in near)*1.4;surface=max((p-centre).dot(normal) for p in near);centre+=normal*(surface+.006);length=(b-a).length*1.06;thickness=.024
  verts=[centre+right*(x*width*.5)+axis*(y*length*.5)+normal*(z*thickness*.5) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]];faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
  mesh=bpy.data.meshes.new('202_AxialPlate_'+name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(o);o.parent=rig;o.matrix_parent_inverse=Matrix.Identity(4);o['source_owner']=name;o.data.materials.append(material);uv=mesh.uv_layers.new(name='UVMap')
  for face in mesh.polygons:
   for j,loop in enumerate(face.loop_indices):uv.data[loop].uv=((0,0),(1,0),(1,1),(0,1))[j]
  o.vertex_groups.new(name=name).add(list(range(8)),1,'REPLACE');mod=o.modifiers.new('202_actual_skin','ARMATURE');mod.object=rig
  row={'newObject':o.name,'owner':name,'sourceCentre':list(centre),'sourceSpanStart':list(a),'sourceSpanEnd':list(b),'width':width,'length':length,'thickness':thickness,'material':material.name,'geometry':mesh_fingerprint202(o),'intent':'visible mechanically articulated central plate, separate ownership not smooth rubber armor'};ledger.append(row);emit(row)
 for name,h in untouched.items():
  if mesh_fingerprint202(bpy.data.objects[name])!=h:raise RuntimeError('202_UNTOUCHED_GEOMETRY_MATERIAL_UV_WEIGHTS:'+name)
 current=body_objects202(rig);triangles=sum(len(f.vertices)-2 for o in current for f in o.data.polygons);count=sum(len(o.data.vertices) for o in current);emit({'stage':'budget-before-guard','objects':len(current),'vertices':count,'indices':triangles*3})
 if len(current)>275 or count>33027 or triangles*3>160023:raise RuntimeError('202_AUTHORED10PCT_GEOMETRY_BUDGET')
 return {'ledger':ledger,'untouched':untouched,'objects':len(current),'vertices':count,'indices':triangles*3}

"""Read-only connected-component inventory of the approved editable Bastion."""
import bpy, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/source/feline-web/Bastion_Quadruped.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
adj=[[] for _ in mesh.data.vertices]
for e in mesh.data.edges:
    a,b=e.vertices;adj[a].append(b);adj[b].append(a)
visited=set();components=[]
polys={}
for p in mesh.data.polygons:
    for v in p.vertices:polys.setdefault(v,[]).append(p)
for v in mesh.data.vertices:
    if v.index in visited:continue
    ids=[];stack=[v.index];visited.add(v.index)
    while stack:
        i=stack.pop();ids.append(i)
        for n in adj[i]:
            if n not in visited:visited.add(n);stack.append(n)
    ps={p.index:p for i in ids for p in polys.get(i,[])}
    lo=[min(mesh.data.vertices[i].co[a] for i in ids) for a in range(3)]
    hi=[max(mesh.data.vertices[i].co[a] for i in ids) for a in range(3)]
    groups=sorted({mesh.vertex_groups[g.group].name for i in ids for g in mesh.data.vertices[i].groups if g.weight>.5})
    mats=sorted({mesh.data.materials[p.material_index].name for p in ps.values()})
    components.append({'index':len(components),'vertices':len(ids),'triangles':sum(len(p.vertices)-2 for p in ps.values()),'bones':groups,'materials':mats,'min':lo,'max':hi,'center':[(lo[a]+hi[a])/2 for a in range(3)]})
out=ROOT/'assets/source/bastion-art-v1';out.mkdir(parents=True,exist_ok=True)
data={'source':str(source),'mesh':mesh.name,'meshLocal':[list(r) for r in mesh.matrix_local],'vertices':len(mesh.data.vertices),'bones':[b.name for b in rig.data.bones],'actions':[a.name for a in bpy.data.actions],'components':components}
(out/'baseline-components.json').write_text(json.dumps(data,indent=2))
print('BASTION_PROBE',json.dumps({'components':len(components),'vertices':len(mesh.data.vertices),'actions':len(bpy.data.actions),'bones':len(rig.data.bones)}),flush=True)

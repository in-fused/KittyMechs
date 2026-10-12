"""Versioned shoulder-only derivative of the current v1 editable Bastion.

No atlas remapping of retained loops; original source hulls and immutable
before/after triangle streams are part of the receipt. Run in Blender 4.5.
"""
import bpy, bmesh, json, hashlib, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
attempt = sys.argv[sys.argv.index('--attempt')+1] if '--attempt' in sys.argv else 'attempt-001'
assert attempt.startswith('attempt-') and attempt[8:].isdigit()
OUT = ROOT / 'assets/source/bastion-art-v2' / attempt
SOURCE = ROOT / 'assets/source/bastion-art-v1/Bastion_Quadruped.art-v1.blend'
ORIGINAL = ROOT / 'assets/source/feline-web/Bastion_Quadruped.blend'
assert not OUT.exists(), 'Fresh immutable version directory required'
OUT.mkdir(parents=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def components(mesh):
    adjacent = [[] for _ in mesh.data.vertices]
    for edge in mesh.data.edges:
        a, b = edge.vertices; adjacent[a].append(b); adjacent[b].append(a)
    seen = set(); result = []
    for vertex in mesh.data.vertices:
        if vertex.index in seen: continue
        stack = [vertex.index]; seen.add(vertex.index); ids = []
        while stack:
            index = stack.pop(); ids.append(index)
            for neighbor in adjacent[index]:
                if neighbor not in seen: seen.add(neighbor); stack.append(neighbor)
        result.append(ids)
    return result

bpy.ops.wm.open_mainfile(filepath=str(ORIGINAL))
original_mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers))
original_components = components(original_mesh)
assert len(original_components) == 140
hulls = {}
for index in (57, 58, 60, 61):
    points = [original_mesh.data.vertices[i].co.copy() for i in original_components[index]]
    hull = bmesh.new(); vertices = [hull.verts.new(p) for p in points]
    bmesh.ops.convex_hull(hull, input=vertices, use_existing_faces=False); hull.normal_update()
    center = sum(points, Vector()) / len(points); planes = []
    for face in hull.faces:
        normal = face.normal.copy(); point = face.verts[0].co
        if normal.dot(center - point) > 0: normal = -normal
        planes.append([*normal, normal.dot(point)])
    hull.free()
    hulls[index] = {'index': index, 'bone': 'chest', 'planes': planes,
        'min': [min(p[k] for p in points) for k in range(3)],
        'max': [max(p[k] for p in points) for k in range(3)], 'center': list(center)}

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers))
assert len(rig.data.bones) == 25 and len(bpy.data.actions) == 32
def signatures():
    actions = {}
    for action in bpy.data.actions:
        actions[action.name] = [[curve.data_path, curve.array_index,
            [[*key.co, key.interpolation] for key in curve.keyframe_points]]
            for layer in action.layers for strip in layer.strips
            for bag in strip.channelbags for curve in bag.fcurves]
    return {'bones': {b.name: {'parent': b.parent.name if b.parent else None,
        'matrix': [list(r) for r in b.matrix_local], 'head': list(b.head_local),
        'tail': list(b.tail_local)} for b in rig.data.bones}, 'actions': actions,
        'meshLocal': [list(r) for r in mesh.matrix_local], 'rigLocal': [list(r) for r in rig.matrix_local]}
signature = signatures()
chest_group = mesh.vertex_groups['chest'].index
def inside(point, hull, margin=2e-6):
    return all(Vector(plane[:3]).dot(point) - plane[3] <= margin for plane in hull['planes'])
selected = {}; delete = set()
for index, hull in hulls.items():
    matching = []
    for component_index, ids in enumerate(components(mesh)):
        if not all(any(g.group == chest_group and g.weight == 1 for g in mesh.data.vertices[i].groups) for i in ids): continue
        if all(inside(mesh.data.vertices[i].co, hull) for i in ids):
            matching.append({'component': component_index, 'vertices': sorted(ids)}); delete.update(ids)
    expected_components = 10 if index in (57,60) else 1
    expected_vertices = 600 if index in (57,60) else 24
    assert len(matching) == expected_components, (index, 'Ambiguous current shoulder component selection', matching)
    assert sum(len(c['vertices']) for c in matching) == expected_vertices, (index, 'Unexpected selected source count')
    selected[index] = matching

def triangle_rows(exclude):
    mesh.data.calc_loop_triangles(); uv = mesh.data.uv_layers.active
    rows = []
    for triangle in mesh.data.loop_triangles:
        if any(i in exclude for i in triangle.vertices): continue
        vertices = []
        for index, loop in zip(triangle.vertices, triangle.loops):
            vertex = mesh.data.vertices[index]
            groups = sorted((mesh.vertex_groups[g.group].name, g.weight) for g in vertex.groups)
            vertices.append([list(vertex.co), list(mesh.data.corner_normals[loop].vector), list(uv.data[loop].uv), groups])
        rotated = [vertices[i:] + vertices[:i] for i in range(3)]
        rows.append(json.dumps([mesh.data.materials[triangle.material_index].name, min(rotated, key=lambda v: json.dumps(v))], separators=(',', ':')))
    return sorted(rows)
retained_before = triangle_rows(delete)
selected_triangles = [list(t.vertices) for t in mesh.data.loop_triangles if all(i in delete for i in t.vertices)]
assert all(all(i in delete for i in t.vertices) or all(i not in delete for i in t.vertices) for t in mesh.data.loop_triangles)
materials = {m.name: m for m in mesh.data.materials}
parts = []; records = []
tiles = {'FelinePBR_Paint': 0, 'FelinePBR_Trim': 1, 'FelinePBR_Metal': 2, 'FelinePBR_Dark': 3}

def part(name, index, material, coords, faces):
    hull = hulls[index]; center = Vector(hull['center']); clipped = 0
    points = []
    # A measured inset leaves headroom for the installed export quantization.
    for coord in coords:
        point = Vector(coord); delta = point - center; fraction = 1
        for plane in hull['planes']:
            normal = Vector(plane[:3]); denominator = normal.dot(delta)
            if denominator > 1e-10:
                fraction = min(fraction, max(0, (plane[3] - normal.dot(center) - .0015) / denominator))
        if fraction < 1: clipped += 1
        points.append(center + delta * fraction)
    data = bpy.data.meshes.new(name); data.from_pydata(points, [], faces); data.materials.append(materials[material]); data.update()
    # Consistent outward faces after mirrored construction.
    bm = bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    # The closed annular flange can remain consistently inward after recalc.
    # Qualify each new solid independently before joining it to the saved rig.
    assert all(edge.is_manifold for edge in bm.edges), (name, 'New part is not a closed two-manifold')
    volume_before = bm.calc_volume(signed=True)
    assert math.isfinite(volume_before) and abs(volume_before) > 1e-12, (name, 'Zero/nonfinite new solid volume')
    reversed_winding = volume_before < 0
    if reversed_winding: bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.normal_update(); volume_after = bm.calc_volume(signed=True)
    assert volume_after > 0, (name, 'New part must face outward')
    bm.to_mesh(data); bm.free()
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj.vertex_groups.new(name='chest').add(list(range(len(points))), 1, 'REPLACE')
    uv = data.uv_layers.new(name='UVMap'); tile = tiles[material]
    low = Vector(hull['min']); span = Vector(hull['max']) - low
    # Stable explicit tile assignment for NEW loops only, not component ordinals.
    for polygon in data.polygons:
        axis = max(range(3), key=lambda k: abs(polygon.normal[k])); axes = [k for k in range(3) if k != axis]
        for loop in polygon.loop_indices:
            point = data.vertices[data.loops[loop].vertex_index].co
            a, b = [(point[k] - low[k]) / span[k] for k in axes]
            uv.data[loop].uv = ((tile % 4 + .035 + .93*a) / 4, 1 - (tile // 4 + .035 + .93*b) / 4)
    maximum = max(Vector(p[:3]).dot(v.co) - p[3] for v in data.vertices for p in hull['planes'])
    assert maximum < -0.001, (name, maximum)
    # The deep housing crossed the pelvis in actual Climb poses. This source
    # relief is checked AFTER envelope clipping, which can shift points inward.
    # It is an art design constraint, not a runtime penetration tolerance.
    lateral_relief = None
    if name.endswith('recessed shoulder load bearing'):
        lateral_relief = min(abs(v.co.x) for v in data.vertices)
        assert lateral_relief >= 1.235, (name, 'Housing relief collapsed during hull clipping', lateral_relief)
    records.append({'name': name, 'component': index, 'bone': 'chest', 'vertices': len(points),
        'maximumPlaneExcess': maximum, 'clippedVertices': clipped, 'cosmetic': False,
        'signedVolumeBefore': volume_before, 'reversedWinding': reversed_winding, 'signedVolumeAfter': volume_after,
        'closedTwoManifold': True, 'minimumAbsoluteSourceXRelief': lateral_relief})
    parts.append(obj)
    return obj

def point(index, x, y, z):
    hull = hulls[index]; low = hull['min']; high = hull['max']
    if index >= 60: x = 1-x
    return tuple(low[k] + (high[k]-low[k])*v for k,v in enumerate((x,y,z)))

def collar(index, name, material, angle0, angle1, inner, outer, depth, steps=7):
    # Four profile loops form a thick annular panel with a sloped outer edge.
    # Fixed shell bevels folded the thin bearing's cross-section over itself.
    # Scale each bevel to its wall thickness; thick shell coordinates stay exact.
    thickness = outer - inner
    assert thickness > 0, (name, 'Positive annular wall thickness required')
    outer_bevel = min(.035, thickness*.25)
    inner_bevel = min(.012, thickness*.25)
    profiles = [(depth+.015, inner), (depth+.065, outer-outer_bevel), (depth+.23, outer), (depth+.27, inner+inner_bevel)]
    def turn(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])
    for a, b, c, d in ((profiles[0], profiles[1], profiles[2], profiles[3]),
                       (profiles[1], profiles[2], profiles[3], profiles[0])):
        assert not (turn(a,b,c)*turn(a,b,d) < 0 and turn(c,d,a)*turn(c,d,b) < 0), (name, 'Folded annular profile')
    coords = []; closed = abs(angle1-angle0-math.tau)<1e-10
    count = steps if closed else steps+1
    for x, radius in profiles:
        for step in range(count):
            angle = angle0 + (angle1-angle0)*step/steps
            coords.append(point(index, x, .49+radius*math.cos(angle), .52+radius*math.sin(angle)))
    faces=[]
    for row in range(4):
        for step in range(steps):
            next_step=(step+1)%count
            faces.append((row*count+step, row*count+next_step, ((row+1)%4)*count+next_step, ((row+1)%4)*count+step))
    if not closed: faces.extend([(0, count, 2*count, 3*count), (count-1, 4*count-1, 3*count-1, 2*count-1)])
    part(name, index, material, coords, faces)

def cylinder(index, name, material, center, radius, depth, segments=20):
    x, y, z = center; coords=[]
    for xx in (x, x+depth):
        for step in range(segments):
            angle = math.tau*step/segments
            coords.append(point(index, xx, y+radius*math.cos(angle), z+radius*math.sin(angle)))
    faces=[tuple(range(segments-1,-1,-1)),tuple(range(segments,2*segments))]
    faces.extend((i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments))
    part(name,index,material,coords,faces)

def box(index,name,material,low,high):
    coords=[point(index,x,y,z) for z in (low[2],high[2]) for y in (low[1],high[1]) for x in (low[0],high[0])]
    part(name,index,material,coords,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)])

for index in (57,60):
    side = 'L' if index == 57 else 'R'
    # Shallow, smaller-radius load-bearing cup keeps the original broad shell
    # while leaving room for the pelvis to tuck forward during ascent.
    cylinder(index,side+' recessed shoulder load bearing','FelinePBR_Dark',(.18,.49,.52),.355,.055,24)
    for sector in range(3):
        a0 = math.tau*sector/3+.035; a1=math.tau*(sector+1)/3-.035
        collar(index,side+' curved segmented shoulder shell '+str(sector+1),'FelinePBR_Paint',a0,a1,.24,.455,.03)
    collar(index,side+' machined nested bearing flange','FelinePBR_Metal',0,math.tau,.195,.232,.085,24)
    cylinder(index,side+' recessed bearing center','FelinePBR_Dark',(.12,.49,.52),.184,.15)
    cylinder(index,side+' protected machined hub face','FelinePBR_Metal',(.105,.49,.52),.144,.018)
    for toe in range(3): box(index,side+' ochre feline hub toe '+str(toe),'FelinePBR_Trim',(.084,.413+toe*.057,.535),(.099,.451+toe*.057,.59))
    box(index,side+' ochre feline hub palm','FelinePBR_Trim',(.084,.438,.454),(.099,.542,.524))
    for step in range(3):
        angle=math.tau*(step+.5)/3
        cylinder(index,side+' recessed collar fastener '+str(step),'FelinePBR_Dark',(.078,.49+.345*math.cos(angle),.52+.345*math.sin(angle)),.018,.038,8)
for index in (58,61):
    box(index,'Short ochre serial witness tab','FelinePBR_Trim',(.10,.79,.15),(.90,.94,.85))

bm = bmesh.new(); bm.from_mesh(mesh.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in sorted(delete)], context='VERTS'); bm.to_mesh(mesh.data); bm.free(); mesh.data.update()
assert triangle_rows(set()) == retained_before, 'Retained source triangle attributes changed during removal'
retained_vertex_count = len(mesh.data.vertices)
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True)
for obj in parts: obj.select_set(True)
bpy.context.view_layer.objects.active=mesh; bpy.ops.object.join(); mesh.data.update()
assert triangle_rows(set(range(retained_vertex_count,len(mesh.data.vertices)))) == retained_before, 'Retained source loops/normals/UVs changed during join'
assert signatures() == signature, 'Rig/action/local transform changed'
mesh.data.calc_loop_triangles(); assert len(mesh.data.loop_triangles) <= 22000
for vertex in mesh.data.vertices:
    influences=[g for g in vertex.groups if mesh.vertex_groups[g.group].name in signature['bones']]
    assert len(influences)==1 and influences[0].weight==1
for image in bpy.data.images:
    if image.source == 'FILE': assert image.packed_file, 'Current packed atlas must be retained'
rig.animation_data.action=bpy.data.actions['FelineIdle']; bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Bastion_Quadruped.art-v2.blend'))
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Bastion_Quadruped.candidate.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True,export_image_format='NONE')
receipt={'version':2,'source':str(SOURCE.relative_to(ROOT)),'sourceSha256':sha(SOURCE),'originalEnvelopeSourceSha256':sha(ORIGINAL),
    'baselineShippingSha256':sha(ROOT/'public/assets/models/Bastion_Quadruped.glb'),
    'reference':{'path':'assets/source/city-materials-v1/expanded/raw/Bastion_Lion_Profile.png','sha256':sha(ROOT/'assets/source/city-materials-v1/expanded/raw/Bastion_Lion_Profile.png')},
    'hulls':list(hulls.values()),'selectedSourceComponents':selected,'deletedSourceTriangles':selected_triangles,
    'deletedSourceVertices':len(delete),'newParts':records,'newVerticesStart':retained_vertex_count,
    'sourceVertices':len(mesh.data.vertices),'sourceTriangles':len(mesh.data.loop_triangles),
    'exactRetainedSourceTriangleAttributes':True,'retainedSourceTriangles':len(retained_before),
    'retainedSourceStreamSha256':hashlib.sha256(json.dumps(retained_before,separators=(',',':')).encode()).hexdigest(),
    'exactSourceChannelsBindsAndLocalTransforms':True,'retainedBones':25,'retainedActions':32,
    'sourceBlendSha256':sha(OUT/'Bastion_Quadruped.art-v2.blend'),'candidateGlbSha256':sha(OUT/'Bastion_Quadruped.candidate.glb'),
    'scope':'Shoulder-only source derivative; fixed shared atlas and current material nodes. Source containment and retained source streams verified; decoded shipping, contact, clearance and visual approval pending.'}
(OUT/'source-shoulder-receipt.json').write_text(json.dumps(receipt,indent=2))
print('BASTION_SHOULDER_SOURCE',json.dumps({'sourceTriangles':receipt['sourceTriangles'],'sourceVertices':receipt['sourceVertices'],'retainedTriangles':len(retained_before),'newParts':len(records)}),flush=True)

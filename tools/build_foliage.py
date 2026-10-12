"""Build meter-scale LODs from retained CC0 fir/fern source geometry.

Run after fetch-polyhaven-model.py and prepare-foliage-source.py. Final Meshopt,
MASK policy, shipping-byte validation and visual approval are separate steps.
"""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/source/environment-foliage'
OUT=ROOT/'assets/runtime/models'
EDIT=BASE/'editable'
OUT.mkdir(parents=True,exist_ok=True);EDIT.mkdir(parents=True,exist_ok=True)
records=[]

def thin_branches(mesh,lod):
    if lod==0:return
    bm=bmesh.new();bm.from_mesh(mesh);seen=set();remove=[];index=0
    for vertex in bm.verts:
        if vertex in seen:continue
        stack=[vertex];seen.add(vertex);component=[]
        while stack:
            current=stack.pop();component.append(current)
            for edge in current.link_edges:
                other=edge.other_vert(current)
                if other not in seen:seen.add(other);stack.append(other)
        center=sum((v.co for v in component),Vector())/len(component)
        span=max(v.co.z for v in component)-min(v.co.z for v in component)
        principal=center.xy.length<.6 and span>1.5
        if not principal and (lod==2 or index%4):remove.extend(component)
        index+=1
    bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(mesh);bm.free()

def thin_needles(mesh,lod):
    # Keep whole authored twig patches and their UVs. Collapsing triangles across
    # a cutout atlas damages coverage; distant levels sample complete patches.
    if lod==0:return
    bm=bmesh.new();bm.from_mesh(mesh);seen=set();remove=[];index=0
    for vertex in bm.verts:
        if vertex in seen:continue
        stack=[vertex];seen.add(vertex);component=[]
        while stack:
            current=stack.pop();component.append(current)
            for edge in current.link_edges:
                other=edge.other_vert(current)
                if other not in seen:seen.add(other);stack.append(other)
        crown=max(v.co.z for v in component)>12.95
        if not crown and index%(2 if lod==1 else 4):remove.extend(component)
        index+=1
    bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(mesh);bm.free()

def clear_selection():
    bpy.context.view_layer.update()
    for obj in bpy.context.view_layer.objects:
        if obj:obj.select_set(False)

def material(name,stem,alpha=False,arm=False):
    result=bpy.data.materials.new(name);result.use_nodes=True
    tree=result.node_tree;bs=tree.nodes.get('Principled BSDF')
    bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.85
    result.use_backface_culling=not alpha
    def image(suffix,noncolor=False):
        node=tree.nodes.new('ShaderNodeTexImage')
        path=BASE/'prepared'/suffix
        node.image=bpy.data.images.load(str(path),check_existing=True)
        if noncolor:node.image.colorspace_settings.name='Non-Color'
        return node
    diff=image(stem+'-diff.'+('png' if alpha else 'jpg'))
    tree.links.new(diff.outputs['Color'],bs.inputs['Base Color'])
    if alpha:
        tree.links.new(diff.outputs['Alpha'],bs.inputs['Alpha'])
        result.surface_render_method='DITHERED';result.use_backface_culling=False
    normal=image(stem+'-normal.jpg',True);normalmap=tree.nodes.new('ShaderNodeNormalMap')
    tree.links.new(normal.outputs['Color'],normalmap.inputs['Color']);tree.links.new(normalmap.outputs['Normal'],bs.inputs['Normal'])
    rough=image(stem+('-arm.jpg' if arm else '-rough.jpg'),True)
    channels=tree.nodes.new('ShaderNodeSeparateColor');tree.links.new(rough.outputs['Color'],channels.inputs['Color'])
    tree.links.new(channels.outputs['Green'],bs.inputs['Roughness'])
    if arm:tree.links.new(channels.outputs['Blue'],bs.inputs['Metallic'])
    return result

def export(name,objects):
    clear_selection()
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
    for o in objects:
        bounds=[o.matrix_world@Vector(v) for v in o.bound_box]
        records.append({'asset':name,'node':o.name,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),
                        'boundsBlender':[[min(v[i] for v in bounds) for i in range(3)],[max(v[i] for v in bounds) for i in range(3)]],
                        'materials':[m.name for m in o.data.materials]})

# The provider blend includes its actual lower-detail trees, unlike the glTF
# download. Retain LOD2's branch/twig layout, reducing wood detail separately so
# simplification does not spend the entire budget on the scanned trunk.
bpy.ops.wm.open_mainfile(filepath=str(BASE/'fir_tree_01-blend-1k/fir_tree_01_1k.blend'))
source=bpy.data.objects['fir_tree_01_b_LOD2']
source.hide_viewport=False;source.hide_set(False)
bounds=[source.matrix_world@Vector(v) for v in source.bound_box]
base=min(v.z for v in bounds);height=max(v.z for v in bounds)-base;factor=13/height
matrix=source.matrix_world.copy();root=Vector((source.location.x,source.location.y,base))
source.data=source.data.copy()
# The provider stores UVMap as a three-component corner attribute for its
# Geometry-Nodes materials, not a Blender UV layer. Promote actual authored UVs
# (including each source material's mapping) before separation/decimation/export.
attribute=source.data.attributes.get('UVMap')
if not attribute or attribute.domain!='CORNER':raise RuntimeError('Missing provider corner UVMap')
uvs=[value.vector.copy() for value in attribute.data]
attribute.name='Provider_UV_Vector'
uv=source.data.uv_layers.new(name='UVMap');uv.active_render=True
for polygon in source.data.polygons:
    original=source.data.materials[polygon.material_index]
    mapping=original.node_tree.nodes.get('Mapping')
    scale=mapping.inputs['Scale'].default_value if mapping else Vector((1,1,1))
    for loop in polygon.loop_indices:uv.data[loop].uv=(uvs[loop].x*scale[0],uvs[loop].y*scale[1])
for v in source.data.vertices:v.co=(matrix@v.co-root)*factor
source.matrix_world=Matrix.Identity(4)
for obj in list(bpy.data.objects):
    if obj!=source:bpy.data.objects.remove(obj,do_unlink=True)
clear_selection();source.select_set(True);bpy.context.view_layer.objects.active=source
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
materials={'fir_tree_01_bark':material('PH_Fir_Bark','bark'),
           'fir_tree_01_trunk_b':material('PH_Fir_Trunk','trunk_b'),
           'fir_tree_01_twig':material('PH_Fir_Needles','twig',True),
           'fir_tree_01_dead_branches':material('PH_Fir_Deadwood','bark')}
materials['fir_tree_01_dead_branches']=materials['fir_tree_01_bark']
budgets=[{'fir_tree_01_bark':1100,'fir_tree_01_trunk_b':450,'fir_tree_01_twig':20000,'fir_tree_01_dead_branches':450},
         {'fir_tree_01_bark':500,'fir_tree_01_trunk_b':240,'fir_tree_01_twig':20000,'fir_tree_01_dead_branches':220},
         {'fir_tree_01_bark':170,'fir_tree_01_trunk_b':140,'fir_tree_01_twig':20000,'fir_tree_01_dead_branches':110}]
objects=[]
for part in parts:
    # Separate-by-material keeps slots in some Blender versions. Determine the
    # actually used slot rather than relying on slot zero.
    key=part.data.materials[part.data.polygons[0].material_index].name
    if key=='fir_tree_01_trunk_b':
        # Normalize the scanned root flare to the established .34m half-width
        # trunk proxy. The source package remains unchanged; .33m leaves room
        # for quantization. Branch canopy geometry is deliberately unaffected.
        for vertex in part.data.vertices:
            radial=vertex.co.xy.length
            if vertex.co.z<6.5 and radial>.33:
                vertex.co.x*=.33/radial;vertex.co.y*=.33/radial
        part.data.update()
    bm=bmesh.new();bm.from_mesh(part.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(part.data);bm.free()
    for lod,budget in enumerate(budgets):
        obj=part.copy();obj.data=part.data.copy();bpy.context.collection.objects.link(obj)
        obj.name=f'Fir_LOD{lod}_'+key.removeprefix('fir_tree_01_')
        if key=='fir_tree_01_bark':thin_branches(obj.data,lod)
        if key=='fir_tree_01_twig':thin_needles(obj.data,lod)
        clear_selection();obj.select_set(True);bpy.context.view_layer.objects.active=obj
        triangles=sum(len(p.vertices)-2 for p in obj.data.polygons)
        if triangles>budget[key]:
            decimate=obj.modifiers.new('Bounded wood and frond LOD','DECIMATE');decimate.ratio=budget[key]/triangles
            bpy.ops.object.modifier_apply(modifier=decimate.name)
        obj.data.materials.clear();obj.data.materials.append(materials[key])
        for p in obj.data.polygons:p.material_index=0
        objects.append(obj)
for part in parts:bpy.data.objects.remove(part,do_unlink=True)
joined=[]
selections=[[obj for obj in objects if obj.name.startswith(f'Fir_LOD{lod}_')] for lod in range(3)]
for lod,selected in enumerate(selections):
    clear_selection()
    for obj in selected:obj.select_set(True)
    bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name=f'Fir_LOD{lod}';joined.append(obj)
objects=joined
export('Forest_Fir',objects)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(BASE/'fern_02-gltf-1k/fern_02_1k.gltf'))
plants=[bpy.data.objects['fern_02_b'],bpy.data.objects['fern_02_d']]
fern_material=material('PH_Fern_Leaves','fern',True,True);objects=[]
for variant,plant in enumerate(plants):
    # Original clump geometry is local around its own ground origin. Preserve
    # meter scale, shift the actual minimum sole to ground, and remove grid layout.
    minimum=min(v.co.z for v in plant.data.vertices)
    for lod,budget in enumerate([2100,480]):
        obj=plant.copy();obj.data=plant.data.copy();bpy.context.collection.objects.link(obj)
        obj.matrix_world=Matrix.Identity(4);obj.name=f'Fern_V{variant}_LOD{lod}'
        for v in obj.data.vertices:v.co.z-=minimum
        clear_selection();obj.select_set(True);bpy.context.view_layer.objects.active=obj
        triangles=sum(len(p.vertices)-2 for p in obj.data.polygons)
        if triangles>budget:
            decimate=obj.modifiers.new('Distant frond detail','DECIMATE');decimate.ratio=budget/triangles;bpy.ops.object.modifier_apply(modifier=decimate.name)
        obj.data.materials.clear();obj.data.materials.append(fern_material)
        for p in obj.data.polygons:p.material_index=0
        objects.append(obj)
for obj in list(bpy.data.objects):
    if obj not in objects:bpy.data.objects.remove(obj,do_unlink=True)
export('Forest_Fern',objects)
(BASE/'derivative-bounds.json').write_text(json.dumps({'sourceTree':'fir_tree_01_b_LOD2','treeHeight':13,'treeScale':factor,
   'sourceFernClumps':['fern_02_b','fern_02_d'],'textureSize':512,'nodes':records},indent=2)+'\n',encoding='utf8')
print('FOLIAGE_EXPORTED '+json.dumps({'nodes':len(records),'treeScale':factor}),flush=True)

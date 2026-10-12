import bpy, math, random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'assets/source/nature';OUT=ROOT/'assets/runtime/models'
# Pillow is available in the system Python; preprocessed textures are prepared by a separate tool.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,diffuse,normal=None,alpha=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;tree=m.node_tree;bs=tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.88
    img=tree.nodes.new('ShaderNodeTexImage');img.image=bpy.data.images.load(str(SOURCE/diffuse));tree.links.new(img.outputs['Color'],bs.inputs['Base Color'])
    if alpha:tree.links.new(img.outputs['Alpha'],bs.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_backface_culling=False
    if normal:
        n=tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(SOURCE/normal));n.image.colorspace_settings.name='Non-Color';normalNode=tree.nodes.new('ShaderNodeNormalMap');tree.links.new(n.outputs['Color'],normalNode.inputs['Color']);tree.links.new(normalNode.outputs['Normal'],bs.inputs['Normal'])
    return m
bark=material('Pine_Bark','bark.jpg','bark-normal.jpg');leaf=material('Pine_Fronds','fronds.png','fronds-normal.jpg',True)
parts=[]
def rod(a,b,radius):
    from mathutils import Vector
    delta=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=9 if radius>.2 else 6,radius1=radius,radius2=radius*.45,depth=delta.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.data.materials.append(bark)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project();bpy.ops.object.mode_set(mode='OBJECT')
    for face in o.data.polygons:face.use_smooth=True
    parts.append(o)
rod((0,0,0),(0,0,13),.36)
vertices=[];faces=[];uvs=[];rng=random.Random(331)
for tier in range(14):
    z=1.65+tier*.76;length=4.2*(1-tier/15)
    for branch in range(9):
        angle=branch*math.tau/9+tier*.73+rng.uniform(-.12,.12);dx=math.cos(angle);dy=math.sin(angle);end=(dx*length,dy*length,z-.55)
        rod((0,0,z),end,.08*(1-tier/15))
        for segment in range(4):
            radius=length*(.13+segment*.24);center=(dx*radius,dy*radius,z-.4*radius/length);width=(3.5-tier*.14)*(1-segment*.1);height=2.35-tier*.09
            for cross in range(2):
                theta=angle+cross*math.pi/2;tx=math.cos(theta);ty=math.sin(theta);start=len(vertices)
                # A tilted bough fan fills the canopy rather than flat upright spokes.
                tilt=.55 if cross else .82;vx=-ty*math.sqrt(1-tilt*tilt);vy=tx*math.sqrt(1-tilt*tilt)
                for u,v in [(0,0),(1,0),(1,1),(0,1)]:vertices.append((center[0]+tx*(u-.5)*width+vx*(v-.5)*height,center[1]+ty*(u-.5)*width+vy*(v-.5)*height,center[2]+tilt*(v-.5)*height));uvs.append((u,v))
                faces.append((start,start+1,start+2,start+3))
mesh=bpy.data.meshes.new('Real pine photographed boughs');mesh.from_pydata(vertices,[],faces);mesh.update();uv=mesh.uv_layers.new(name='UVMap')
for face in mesh.polygons:
    for loop in face.loop_indices:uv.data[loop].uv=uvs[mesh.loops[loop].vertex_index]
o=bpy.data.objects.new('Pine evergreen canopy',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(leaf);parts.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name='Pine_Evergreen'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'Pine_Evergreen.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'Pine_Evergreen.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
# Import and reduce one actual scanned rock to a reusable browser-safe mesh.
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE/'coast_rocks_02.gltf'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Normalize the entire scan to a centered six-meter cluster with its base on the ground.
from mathutils import Vector
bounds=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
minimum=Vector(tuple(min(v[i] for v in bounds) for i in range(3)));maximum=Vector(tuple(max(v[i] for v in bounds) for i in range(3)))
center=(minimum+maximum)/2;factor=6/max(maximum.x-minimum.x,maximum.y-minimum.y)
for o in objects:
    matrix=o.matrix_world.copy()
    for vertex in o.data.vertices:
        p=matrix@vertex.co;vertex.co=((p.x-center.x)*factor,(p.y-center.y)*factor,(p.z-minimum.z)*factor*3)
    o.matrix_world=__import__('mathutils').Matrix.Identity(4)
for o in objects:
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    triangles=sum(len(p.vertices)-2 for p in o.data.polygons)
    mod=o.modifiers.new('Browser triangle budget','DECIMATE');mod.ratio=min(1,2200/max(1,triangles));bpy.ops.object.modifier_apply(modifier=mod.name)
    # Bring source material images down to 512px without changing the retained originals.
for img in bpy.data.images:
    if img.type=='IMAGE' and max(img.size)>512:img.scale(512,512)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'Coastal_Basalt.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'Coastal_Basalt.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
print('EXPORTED REALISTIC NATURE',flush=True)

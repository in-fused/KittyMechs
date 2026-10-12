"""Non-destructive original Pounce armor derivative of the approved 32-action scene.

All newly authored vertices are confined to a same-bone baseline component's
convex envelope. This is a pose-independent affine envelope argument, not a
replacement for production contact/core/appearance checks.
"""
import bpy, bmesh, json, hashlib, shutil, math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/source/pounce-art-v1';OUT.mkdir(parents=True,exist_ok=True)
if '--pack-source-only' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'Pounce_Quadruped.art-v1.blend'))
    for image in bpy.data.images:
        if image.source=='FILE' and not image.packed_file:image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Pounce_Quadruped.art-v1.blend'))
    print('POUNCE_ART_EDITABLE_MAPS_PACKED',flush=True);sys.exit(0)
ORIGINAL=ROOT/'assets/source/feline-web/Pounce_Quadruped.blend'
BASE=OUT/'approved-Pounce_Quadruped.blend'
if not BASE.exists():shutil.copy2(ORIGINAL,BASE)
assert hashlib.sha256(BASE.read_bytes()).digest()==hashlib.sha256(ORIGINAL.read_bytes()).digest(),'Approved editable source changed; explicitly version the derivative instead of silently rebasing.'
models=ROOT/'public/assets/models'
manifest=OUT/'baseline-models.json'
if not manifest.exists():
    manifest.write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(models.glob('*.glb'))},indent=2))
    shutil.copy2(models/'Pounce_Quadruped.glb',OUT/'approved-Pounce_Quadruped.glb')
bpy.ops.wm.open_mainfile(filepath=str(BASE))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
mesh=next(o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))

def signatures():
    bones={b.name:{'parent':b.parent.name if b.parent else None,'matrix':[list(r) for r in b.matrix_local],'head':list(b.head_local),'tail':list(b.tail_local)} for b in rig.data.bones}
    actions={}
    for a in bpy.data.actions:
        curves=[]
        for layer in a.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for c in bag.fcurves:
                        curves.append([c.data_path,c.array_index,[[*p.co,p.interpolation] for p in c.keyframe_points]])
        actions[a.name]=curves
    return {'bones':bones,'actions':actions,'rigLocal':[list(r) for r in rig.matrix_local],'meshLocal':[list(r) for r in mesh.matrix_local]}
before=signatures()
assert len(before['bones'])==25 and len(before['actions'])==32

def components():
    adj=[[] for _ in mesh.data.vertices]
    for e in mesh.data.edges:
        a,b=e.vertices;adj[a].append(b);adj[b].append(a)
    seen=set();result=[]
    for v in mesh.data.vertices:
        if v.index in seen:continue
        stack=[v.index];seen.add(v.index);ids=[]
        while stack:
            i=stack.pop();ids.append(i)
            for n in adj[i]:
                if n not in seen:seen.add(n);stack.append(n)
        pts=[mesh.data.vertices[i].co.copy() for i in ids];lo=Vector(tuple(min(p[k] for p in pts) for k in range(3)));hi=Vector(tuple(max(p[k] for p in pts) for k in range(3)))
        groups=[mesh.vertex_groups[g.group].name for g in mesh.data.vertices[ids[0]].groups if g.weight>.5]
        hull=bmesh.new();verts=[hull.verts.new(p) for p in pts];bmesh.ops.convex_hull(hull,input=verts,use_existing_faces=False);hull.normal_update()
        center=sum(pts,Vector())/len(pts);planes=[]
        for f in hull.faces:
            n=f.normal.copy();point=f.verts[0].co.copy()
            if n.dot(center-point)>0:n=-n
            planes.append((n,n.dot(point)))
        hull.free();result.append({'ids':ids,'lo':lo,'hi':hi,'center':center,'planes':planes,'groups':groups,'points':pts})
    return result
comps=components();assert len(comps)==137
def paw_bounds():
    result={}
    for label in ['FL','FR','HL','HR']:
        name=label+'_paw';group=mesh.vertex_groups[name].index;matrix=rig.data.bones[name].matrix_local.inverted()
        ps=[matrix@v.co for v in mesh.data.vertices if any(g.group==group and g.weight>.99999 for g in v.groups)]
        result[name]={'min':[min(p[k] for p in ps) for k in range(3)],'max':[max(p[k] for p in ps) for k in range(3)]}
    return result
old_paws=paw_bounds();parts=[];new_records=[]
material_map={m.name:m for m in mesh.data.materials}
role={'Cat_Armor':0,'Cat_Trim':1,'Cat_Metal':2,'Cat_Dark':3,'Cat_Glow':4,'Cat_Glass':5,'Cat_Pilot':6}
for name,m in material_map.items():
    m.name='FelinePBR_'+name.removeprefix('Cat_');m['originalAtlasProfile']='feline-pbr-v1'
    m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
    if not bs:bs=nodes.new('ShaderNodeBsdfPrincipled')
    if name=='Cat_Glow':bs.inputs['Base Color'].default_value=(.08,.62,.52,1);bs.inputs['Emission Color'].default_value=(.12,.8,.7,1);bs.inputs['Emission Strength'].default_value=2
    else:bs.inputs['Base Color'].default_value=(1,1,1,.38 if name=='Cat_Glass' else 1)
    bs.inputs['Metallic'].default_value=1;bs.inputs['Roughness'].default_value=1
    for kind in ['albedo','normal','orm']:
        tex=nodes.new('ShaderNodeTexImage');tex.name='Original '+kind;tex.image=bpy.data.images.load(str(OUT/'textures'/f'feline-{kind}-v1.png'),check_existing=True)
        tex.image.colorspace_settings.name='sRGB' if kind=='albedo' else 'Non-Color'
        if kind=='albedo':links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        elif kind=='normal' and name not in ['Cat_Glass','Cat_Glow']:
            n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=1;links.new(tex.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bs.inputs['Normal'])
        elif kind=='orm':
            split=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],split.inputs['Color']);links.new(split.outputs['Green'],bs.inputs['Roughness']);links.new(split.outputs['Blue'],bs.inputs['Metallic'])

def confine(obj,index):
    c=comps[index];center=c['center'];error=0;shrunk=0
    for v in obj.data.vertices:
        p=obj.matrix_world@v.co;d=p-center;t=1.
        for n,b in c['planes']:
            den=n.dot(d)
            if den>1e-10:t=min(t,max(0,(b-n.dot(center)-1e-6)/den))
        if t<1:shrunk+=1;p=center+d*t
        for n,b in c['planes']:error=max(error,n.dot(p)-b)
        v.co=obj.matrix_world.inverted()@p
    new_records.append({'name':obj.name,'envelopeComponent':index,'bone':next(g for g in c['groups'] if g!='FelineCosmeticBounds'),'cosmetic':'FelineCosmeticBounds' in c['groups'],'vertices':len(obj.data.vertices),'maximumPlaneExcess':error,'clippedVertices':shrunk})
    assert error<2e-6
    bone=next(g for g in c['groups'] if g!='FelineCosmeticBounds');obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    if 'FelineCosmeticBounds' in c['groups']:obj.vertex_groups.new(name='FelineCosmeticBounds').add(list(range(len(obj.data.vertices))),1,'REPLACE')
    parts.append(obj)

def plate(name,index,material,lo=(0,0,0),hi=(1,1,1),taper=.0,bevel=.018):
    c=comps[index];a=c['lo'];span=c['hi']-a;low=a+Vector(tuple(span[k]*lo[k] for k in range(3)));high=a+Vector(tuple(span[k]*hi[k] for k in range(3)))
    coords=[]
    for z in [low.z,high.z]:
        for y in [low.y,high.y]:
            narrow=taper if y==low.y else taper*.3
            coords.extend([(low.x+narrow*(high.x-low.x),y,z),(high.x-narrow*(high.x-low.x),y,z)])
    faces=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    data=bpy.data.meshes.new(name);data.from_pydata(coords,[],faces);data.materials.append(material_map[material]);obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    if bevel:
        mod=obj.modifiers.new('Manufactured chamfer edges','BEVEL');mod.width=bevel
        mod.segments=3 if any(tag in name.lower() for tag in ['nested shell','crown armor','main shin armor','cheek blade','machined muzzle']) else 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in data.polygons:p.use_smooth=False
    confine(obj,index);obj.select_set(False);return obj

def disk(name,index,material,side,center_fraction=(.5,.5,.5),radius=.32,depth=.04):
    c=comps[index];a=c['lo'];span=c['hi']-a;center=a+Vector(tuple(span[k]*center_fraction[k] for k in range(3)))
    radius*=min(span.y,span.z)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=depth,location=center,rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=name;o.data.materials.append(material_map[material]);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);confine(o,index);o.select_set(False)

def joint_core(index):
    c=comps[index];center=(c['lo']+c['hi'])/2;size=(c['hi']-c['lo'])*.40
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=center);o=bpy.context.object;o.name='Faceted recessed joint machinery';o.scale=size;o.data.materials.append(material_map['Cat_Dark']);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);confine(o,index);o.select_set(False)

def tail_section(index,start,end,radius,material,name):
    c=comps[index];bone=rig.data.bones[next(g for g in c['groups'] if g!='FelineCosmeticBounds')];a=bone.head_local;b=bone.tail_local;length=(b-a).length
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=length*(end-start),location=a.lerp(b,(start+end)/2));o=bpy.context.object;o.name=name;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');o.data.materials.append(material_map[material]);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);confine(o,index);o.select_set(False)

remove=set()
# Sculpt the large blocks into backed, overlapping manufactured plates.
for idx,name in [(0,'Dorsal'),(1,'Pelvis'),(3,'Scapular')]:
    remove.add(idx);plate(name+' dark recessed chassis',idx,'Cat_Dark',(.045,.03,.03),(.955,.97,.88),.10)
    for j in range(3):
        front=j/3+.016;back=(j+1)/3-.016
        plate(name+f' nested shell {j+1}',idx,'Cat_Armor',(.045,front,.43),(.955,back,.98),.13 if j==0 else .045,.025)
        plate(name+f' ridge accent {j+1}',idx,'Cat_Trim',(.43,front+.025,.967),(.57,back-.025,.993),.1,.006)
for idx in [5,19]:
    remove.add(idx);plate('Inset flank mechanical backing',idx,'Cat_Dark',(.05,.015,.015),(.95,.985,.93),0)
    for j in range(3):plate('Separated swept flank louver',idx,'Cat_Armor',(.1,j/3+.025,.1),(.9,(j+1)/3-.025,.97),.18)
# The head remains recognizably feline: tapered muzzle, cut-in cheek and brow.
remove.update([33,34,35,36,43,37,44])
plate('Recessed feline skull core',33,'Cat_Dark',(.025,.015,.015),(.975,.985,.93),.13,.03)
plate('Swept crown armor',33,'Cat_Armor',(.045,.02,.50),(.955,.96,.985),.15,.032)
for side in [-1,1]:
    lo=(.06,.055,.13) if side<0 else (.55,.055,.13);hi=(.45,.97,.71) if side<0 else (.94,.97,.71)
    plate('Layered temporal cheek shell',33,'Cat_Armor',lo,hi,.17,.025)
plate('Tapered machined muzzle',34,'Cat_Metal',(.015,.01,.01),(.985,.985,.975),.21,.022)
plate('Muzzle dark nasal seam',34,'Cat_Dark',(.45,.025,.44),(.55,.80,.93),.06,.008)
plate('Recessed compact nose sensor',35,'Cat_Dark',(.015,.24,.02),(.985,.98,.97),.15,.01)
for idx in [36,43]:
    plate('Recessed cheek mechanism',idx,'Cat_Dark',(.02,.14,.02),(.98,.97,.85),.12,.018)
    plate('Faceted feline cheek blade',idx,'Cat_Armor',(.045,.14,.33),(.955,.96,.97),.2,.026)
for idx in [37,44]:
    plate('Deep optic lid socket',idx,'Cat_Dark',(.015,.015,.02),(.985,.985,.98),.04,.012)
    plate('Narrow original feline optic',idx,'Cat_Glow',(.08,.008,.33),(.92,.26,.68),.11,.005)
    plate('Armored upper brow ridge',idx,'Cat_Armor',(.02,.08,.74),(.98,.97,.99),.1,.008)
    plate('Optic vertical dark pupil',idx,'Cat_Dark',(.46,.005,.29),(.54,.20,.71),0,.002)
# Contoured limb armor and rigid hub faces replace smooth toy-like joints.
for idx in [68,83,98,113,71,86,101,116]:
    remove.add(idx)
    plate('Inset shin actuator backing',idx,'Cat_Dark',(.04,.03,.035),(.96,.97,.92),.13)
    plate('Tapered main shin armor',idx,'Cat_Armor',(.045,.05,.035),(.955,.92,.97),.22,.023)
    plate('Shin raised service panel',idx,'Cat_Metal',(.24,.15,.64),(.76,.76,.985),.12,.012)
for idx in [66,81,96,111,69,84,99,114]:
    remove.add(idx);joint_core(idx)
    side=-1 if idx in [66,96,69,99] else 1
    disk('Flush polygonal joint bearing',idx,'Cat_Dark',side,(.12 if side<0 else .88,.5,.5),.38,.045)
    disk('Recessed joint center face',idx,'Cat_Metal',side,(.09 if side<0 else .91,.5,.5),.23,.035)
# Keep the pad, metallic claw tips and LEDs, which own existing sole bounds.
for idx in [73,88,103,118]:
    c=comps[idx];cut=c['lo'].z+(c['hi'].z-c['lo'].z)*.63
    for i in c['ids']:
        v=mesh.data.vertices[i]
        if v.co.z>cut:v.co.z=cut+(v.co.z-cut)*.06
        assert max(n.dot(v.co)-b for n,b in c['planes'])<2e-6
    new_records.append({'name':'Lowered existing paw pad roof; sole/XY bounds retained','envelopeComponent':idx,'bone':next(g for g in c['groups'] if g!='FelineCosmeticBounds'),'cosmetic':False,'vertices':len(c['ids']),'maximumPlaneExcess':0,'clippedVertices':0})
    for j in range(3):plate('Exposed dorsal paw knuckle',idx,'Cat_Armor',(.08+j*.29,.10,.68),(.28+j*.29,.78,.98),.12,.012)
for idx in [74,76,78,89,91,93,104,106,108,119,121,123]:
    remove.add(idx);plate('Tapered compact rigid digit knuckle',idx,'Cat_Armor',(.01,.015,.005),(.99,.99,.995),.18,.016)
    plate('Knuckle dark segmentation',idx,'Cat_Dark',(.35,.28,.88),(.65,.68,.99),.0,.006)
# Segmented tapered tail armor stays within the original rod envelopes.
for idx in [126,128,130,132,134]:
    remove.add(idx);radius=(comps[idx]['hi'].x-comps[idx]['lo'].x)/2
    tail_section(idx,0,1,radius*.52,'Cat_Dark','Recessed flexible tail core')
    for j in range(3):tail_section(idx,j/3+.025,(j+1)/3-.025,radius*.94,'Cat_Armor','Separated tapered rigid tail collar')

bm=bmesh.new();bm.from_mesh(mesh.data);bm.verts.ensure_lookup_table()
delete={i for index in remove for i in comps[index]['ids']};bmesh.ops.delete(bm,geom=[bm.verts[i] for i in delete],context='VERTS');bm.to_mesh(mesh.data);bm.free()
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=mesh;bpy.ops.object.join()
# Flat per-face projection chooses a tile by surface and produces continuous
# panel inset/rivet detail with margins; all material primitives share UV0.
uv=mesh.data.uv_layers.active or mesh.data.uv_layers.new(name='UVMap')
uv_components=components();vertex_component={v:index for index,c in enumerate(uv_components) for v in c['ids']}
for p in mesh.data.polygons:
    m=mesh.data.materials[p.material_index];r=role['Cat_'+m.name.removeprefix('FelinePBR_')]
    component_index=vertex_component[p.vertices[0]];c=uv_components[component_index]
    tile=r+(8 if r in [0,2] and component_index%11==0 else 0)
    axis=max(range(3),key=lambda k:abs(p.normal[k]));axes=[k for k in range(3) if k!=axis]
    mins=[c['lo'][k] for k in axes];spans=[c['hi'][k]-c['lo'][k] for k in axes]
    for loop in p.loop_indices:
        v=mesh.data.vertices[mesh.data.loops[loop].vertex_index].co
        a=(v[axes[0]]-mins[0])/max(spans[0],1e-8);b=(v[axes[1]]-mins[1])/max(spans[1],1e-8)
        # Image authoring uses top-left origin; Blender UV uses lower-left.
        uv.data[loop].uv=((tile%4+.035+.93*a)/4,1-(tile//4+.035+.93*b)/4)
mesh.data.update()
new_paws=paw_bounds()
for name in old_paws:
    for axis in ['min','max']:
        assert max(abs(x-y) for x,y in zip(old_paws[name][axis],new_paws[name][axis]))<1e-6,(name,axis,old_paws[name],new_paws[name])
assert signatures()==before,'Art authoring changed a retained bind/hierarchy/animation channel'
mesh.data.calc_loop_triangles();triangles=len(mesh.data.loop_triangles);assert triangles<=22000,triangles
for v in mesh.data.vertices:
    bindings=[g for g in v.groups if mesh.vertex_groups[g.group].name in before['bones']]
    assert len(bindings)==1 and abs(bindings[0].weight-1)<1e-7
rig.animation_data.action=bpy.data.actions['FelineIdle'];bpy.context.scene.frame_set(1)
for image in bpy.data.images:
    if image.source=='FILE' and not image.packed_file:image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Pounce_Quadruped.art-v1.blend'))
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Pounce_Quadruped.candidate.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True,export_image_format='NONE')
receipt={'sourceSha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'baselineShippingSha256':json.loads(manifest.read_text())['Pounce_Quadruped.glb'],'sourceVertices':len(mesh.data.vertices),'sourceTriangles':triangles,'materialSlots':len(mesh.data.materials),'retainedBones':25,'retainedActions':32,'exactSourceChannelsAndBinds':True,'pawBoundsBefore':old_paws,'pawBoundsAfter':new_paws,'removedBaselineComponents':sorted(remove),'newParts':new_records,'envelopeMethod':'Every new vertex lies inside same-bone original component convex hull; no physical geometry reclassified cosmetic. Affine bone transforms preserve containment in every pose; explicit render contact/core audit still required.'}
(OUT/'source-art-receipt.json').write_text(json.dumps(receipt,indent=2))
print('POUNCE_ART_SOURCE',json.dumps({'triangles':triangles,'vertices':len(mesh.data.vertices),'parts':len(new_records),'bones':25,'clips':32}),flush=True)

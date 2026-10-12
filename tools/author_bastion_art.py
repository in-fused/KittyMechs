"""Non-destructive original Bastion armor derivative of the approved 32-action scene.

All newly authored vertices are confined to a same-bone baseline component's
convex envelope. This is a pose-independent affine envelope argument, not a
replacement for production contact/core/appearance checks.
"""
import bpy, bmesh, json, hashlib, shutil, math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/source/bastion-art-v1';OUT.mkdir(parents=True,exist_ok=True)
if '--pack-source-only' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'Bastion_Quadruped.art-v1.blend'))
    for image in bpy.data.images:
        if image.source=='FILE' and not image.packed_file:image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Bastion_Quadruped.art-v1.blend'))
    print('BASTION_ART_EDITABLE_MAPS_PACKED',flush=True);sys.exit(0)
ORIGINAL=ROOT/'assets/source/feline-web/Bastion_Quadruped.blend'
BASE=OUT/'approved-Bastion_Quadruped.blend'
if not BASE.exists():shutil.copy2(ORIGINAL,BASE)
assert hashlib.sha256(BASE.read_bytes()).digest()==hashlib.sha256(ORIGINAL.read_bytes()).digest(),'Approved editable source changed; explicitly version the derivative instead of silently rebasing.'
models=ROOT/'public/assets/models'
manifest=OUT/'baseline-models.json'
if not manifest.exists():
    manifest.write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(models.glob('*.glb'))},indent=2))
    shutil.copy2(models/'Bastion_Quadruped.glb',OUT/'approved-Bastion_Quadruped.glb')
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
comps=components();assert len(comps)==140
def paw_bounds():
    result={}
    for label in ['FL','FR','HL','HR']:
        name=label+'_paw';group=mesh.vertex_groups[name].index;matrix=rig.data.bones[name].matrix_local.inverted()
        ps=[matrix@v.co for v in mesh.data.vertices if any(g.group==group and g.weight>.99999 for g in v.groups)]
        result[name]={'min':[min(p[k] for p in ps) for k in range(3)],'max':[max(p[k] for p in ps) for k in range(3)]}
    return result
old_paws=paw_bounds();parts=[];new_records=[]
material_map={m.name.split('.')[0]:m for m in mesh.data.materials}
role={'Cat_Armor':0,'Cat_Trim':1,'Cat_Metal':2,'Cat_Dark':3,'Cat_Glow':4,'Cat_Glass':5,'Cat_Pilot':6}
for name,m in material_map.items():
    m.name='FelinePBR_'+('Paint' if name=='Cat_Armor' else name.removeprefix('Cat_'));m['originalAtlasProfile']='feline-pbr-v1'
    m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
    if not bs:bs=nodes.new('ShaderNodeBsdfPrincipled')
    if name=='Cat_Glow':bs.inputs['Base Color'].default_value=(.08,.62,.52,1);bs.inputs['Emission Color'].default_value=(.12,.8,.7,1);bs.inputs['Emission Strength'].default_value=2
    elif name=='Cat_Armor':bs.inputs['Base Color'].default_value=(.29,.38,.42,1)
    else:bs.inputs['Base Color'].default_value=(1,1,1,.38 if name=='Cat_Glass' else 1)
    bs.inputs['Metallic'].default_value=1;bs.inputs['Roughness'].default_value=1
    for kind in ['albedo','normal','orm']:
        tex=nodes.new('ShaderNodeTexImage');tex.name='Original '+kind;tex.image=bpy.data.images.load(str(OUT/'textures'/f'feline-{kind}-v1.png'),check_existing=True)
        tex.image.colorspace_settings.name='sRGB' if kind=='albedo' else 'Non-Color'
        if kind=='albedo':
            if name=='Cat_Armor':
                tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.29,.38,.42,1);links.new(tex.outputs['Color'],tint.inputs[1]);links.new(tint.outputs[0],bs.inputs['Base Color'])
            else:links.new(tex.outputs['Color'],bs.inputs['Base Color'])
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
        mod.segments=3 if any(tag in name.lower() for tag in ['shield rim','shield face','crown armor','main shin armor','dorsal shell']) else 1
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
# Heavy chassis plates expose continuous waist/chest bearings rather than toy blocks.
for idx,name in [(0,'Dorsal'),(1,'Pelvis')]:
    remove.add(idx);plate(name+' recessed load chassis',idx,'Cat_Dark',(.035,.02,.035),(.965,.98,.88),.055,.014)
    for j in range(3):
        front=j/3+.02;back=(j+1)/3-.02
        plate(name+f' heavy dorsal shell {j+1}',idx,'Cat_Armor',(.035,front,.50),(.965,back,.975),.075,.025)
        plate(name+f' bare edge inset {j+1}',idx,'Cat_Metal',(.045,front+.025,.94),(.13,back-.025,.986),.05,.008)
        plate(name+f' bare edge inset opposite {j+1}',idx,'Cat_Metal',(.87,front+.025,.94),(.955,back-.025,.986),.05,.008)
remove.add(3)
plate('Protected broad scapular load frame',3,'Cat_Dark',(.03,.02,.025),(.97,.98,.94),.08,.016)
for side in [-1,1]:
    lo=(.03,.03,.52) if side<0 else (.53,.03,.52);hi=(.47,.96,.975) if side<0 else (.97,.96,.975)
    plate('Paired scapular shoulder armor',3,'Cat_Armor',lo,hi,.1,.025)
remove.add(2)
plate('Waist bearing mechanical housing',2,'Cat_Dark',(.02,.015,.03),(.98,.985,.97),.08,.016)
for lo,hi in [((.03,.03,.08),(.17,.97,.92)),((.83,.03,.08),(.97,.97,.92))]:plate('Waist exposed protected bearing flange',2,'Cat_Metal',lo,hi,.03,.012)
for idx in [5,19]:
    remove.add(idx);plate('Recessed protected flank',idx,'Cat_Dark',(.025,.015,.025),(.975,.985,.93),.02,.012)
    for j in range(3):plate('Heavy flank panel with exposed gap',idx,'Cat_Armor',(.08,j/3+.018,.06),(.92,(j+1)/3-.018,.98),.06,.018)
# Paired chest-bone shields: dark backing, thick perimeter rails and recessed pad motif.
for idx in [57,60]:
    remove.add(idx);negative=idx==57
    plate('Shield recessed structural backing',idx,'Cat_Dark',(.06,.035,.035),(.94,.965,.96),.045,.015)
    face=(.025,.16) if negative else (.84,.975)
    x0,x1=face
    plate('Shield face inset field',idx,'Cat_Armor',(x0,.14,.16),(x1,.86,.84),.045,.022)
    for lo,hi in [((x0,.035,.035),(x1,.965,.15)),((x0,.035,.85),(x1,.965,.965)),((x0,.035,.15),(x1,.14,.85)),((x0,.86,.15),(x1,.965,.85))]:
        plate('Paired shield rim protected rail',idx,'Cat_Metal',lo,hi,.015,.013)
    # Three separated armored toe-shaped fingers plus central pad, all chest rigid.
    for j in range(3):plate('Shield paw emblem raised toe',idx,'Cat_Trim',(x0-.002 if negative else x0,.23+j*.18,.63),(x1 if negative else x1+.002,.35+j*.18,.77),.06,.005)
    plate('Shield paw emblem armored palm',idx,'Cat_Trim',(x0,.32,.33),(x1,.68,.57),.07,.008)
for idx in [58,61]:
    remove.add(idx);plate('Shield independent ochre serial rib',idx,'Cat_Trim',(.10,.045,.08),(.9,.955,.92),.0,.008)
for idx in [59,62]:
    remove.add(idx);plate('Rear stabilizer recessed hinge',idx,'Cat_Dark',(.03,.03,.03),(.97,.97,.9),.04,.013)
    plate('Heavy pelvis rear stabilizer',idx,'Cat_Armor',(.04,.06,.12),(.96,.94,.975),.08,.025)
# Reactor fin pack is readable from ordinary rear camera; no concealed collar stacking.
remove.add(63)
plate('Reactor protected recessed core',63,'Cat_Dark',(.03,.03,.025),(.97,.97,.92),.055,.018)
for j in range(4):plate('Reactor raised machined cooling spine',63,'Cat_Metal',(.08+j*.22,.06,.4),(.20+j*.22,.94,.98),.03,.014)
for idx in [64,65,66,67,68]:
    remove.add(idx);plate('Reactor crown ochre service fin',idx,'Cat_Trim',(.035,.02,.08),(.965,.98,.94),.01,.006)
# Broad protected feline head: paired brows and cheeks, recessed optics, compact muzzle.
remove.update([33,34,35,36,43,37,44])
plate('Bastion recessed feline skull',33,'Cat_Dark',(.025,.03,.025),(.975,.97,.92),.08,.018)
plate('Protected heavy crown armor',33,'Cat_Armor',(.045,.06,.52),(.955,.97,.98),.07,.030)
plate('Heavy crown central ochre identifier',33,'Cat_Trim',(.43,.22,.956),(.57,.90,.985),.04,.006)
plate('Compact armored muzzle housing',34,'Cat_Metal',(.025,.025,.025),(.975,.97,.97),.14,.018)
plate('Recessed broad nasal sensor',35,'Cat_Dark',(.035,.25,.03),(.965,.97,.965),.07,.008)
for idx in [36,43]:
    plate('Recessed heavy cheek actuator',idx,'Cat_Dark',(.025,.16,.03),(.975,.97,.86),.08,.014)
    plate('Bastion angled cheek guard',idx,'Cat_Armor',(.055,.17,.35),(.945,.95,.965),.12,.021)
for idx in [37,44]:
    plate('Protected recessed optic socket',idx,'Cat_Dark',(.02,.02,.02),(.98,.98,.98),.035,.009)
    plate('Bastion narrow watchful optic',idx,'Cat_Glow',(.1,.008,.35),(.9,.24,.62),.1,.004)
    plate('Bastion thick upper armored brow',idx,'Cat_Armor',(.035,.08,.73),(.965,.97,.99),.055,.008)
    plate('Optic focused pupil',idx,'Cat_Dark',(.47,.005,.3),(.53,.18,.67),0,.002)
# Armored hubs and shin rails stay bound to their original individual segments.
for idx in [71,86,101,116,74,89,104,119]:
    remove.add(idx);plate('Protected shin dark actuator backing',idx,'Cat_Dark',(.03,.025,.03),(.97,.975,.93),.055,.012)
    plate('Heavy tapered main shin armor',idx,'Cat_Armor',(.06,.055,.04),(.94,.945,.975),.12,.024)
    plate('Shin exposed hard service panel',idx,'Cat_Metal',(.28,.18,.75),(.72,.82,.988),.04,.010)
for idx in [69,84,99,114,72,87,102,117]:
    remove.add(idx);joint_core(idx);side=-1 if idx in [69,99,72,102] else 1
    disk('Protected faceted hub outer rim',idx,'Cat_Armor',side,(.13 if side<0 else .87,.5,.5),.40,.055)
    disk('Machined recessed bearing cap',idx,'Cat_Metal',side,(.09 if side<0 else .91,.5,.5),.26,.045)
# Keep exact pad/claw/LED extremes. Lower only pad roof to reveal broad armor guard rails.
for idx in [76,91,106,121]:
    c=comps[idx];cut=c['lo'].z+(c['hi'].z-c['lo'].z)*.70
    for i in c['ids']:
        v=mesh.data.vertices[i]
        if v.co.z>cut:v.co.z=cut+(v.co.z-cut)*.08
    new_records.append({'name':'Paw pad roof recessed; sole and XY bounds retained','envelopeComponent':idx,'bone':next(g for g in c['groups'] if g!='FelineCosmeticBounds'),'cosmetic':False,'vertices':len(c['ids']),'maximumPlaneExcess':0,'clippedVertices':0})
    for j in range(3):plate('Heavy exposed paw guard rail',idx,'Cat_Armor',(.06+j*.30,.14,.73),(.29+j*.30,.83,.98),.06,.009)
for idx in [77,79,81,92,94,96,107,109,111,122,124,126]:
    remove.add(idx);plate('Rigid protected feline toe guard',idx,'Cat_Armor',(.02,.02,.01),(.98,.98,.99),.10,.012)
    plate('Toe guard exposed metal cap',idx,'Cat_Metal',(.13,.025,.75),(.87,.18,.97),.06,.004)
for idx in [129,131,133,135,137]:
    remove.add(idx);radius=(comps[idx]['hi'].x-comps[idx]['lo'].x)/2
    tail_section(idx,0,1,radius*.50,'Cat_Dark','Heavy tail recessed flexible core')
    for j in range(2):tail_section(idx,j/2+.025,(j+1)/2-.025,radius*.95,'Cat_Armor','Bastion separated tail protective sleeve')

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
    m=mesh.data.materials[p.material_index];r=0 if m.name=='FelinePBR_Paint' else role['Cat_'+m.name.removeprefix('FelinePBR_')]
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
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Bastion_Quadruped.art-v1.blend'))
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'Bastion_Quadruped.candidate.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_animations=True,export_force_sampling=True,export_skins=True,export_yup=True,export_image_format='NONE')
receipt={'sourceSha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'baselineShippingSha256':json.loads(manifest.read_text())['Bastion_Quadruped.glb'],'chassis':'Bastion','paintTintLinear':[.29,.38,.42,1],'sourceVertices':len(mesh.data.vertices),'sourceTriangles':triangles,'materialSlots':len(mesh.data.materials),'retainedBones':25,'retainedActions':32,'exactSourceChannelsAndBinds':True,'pawBoundsBefore':old_paws,'pawBoundsAfter':new_paws,'removedBaselineComponents':sorted(remove),'newParts':new_records,'envelopeMethod':'Every new vertex lies inside same-bone original component convex hull; no physical geometry reclassified cosmetic. Affine bone transforms preserve containment in every pose; explicit render contact/core audit still required.'}
(OUT/'source-art-receipt.json').write_text(json.dumps(receipt,indent=2))
print('BASTION_ART_SOURCE',json.dumps({'triangles':triangles,'vertices':len(mesh.data.vertices),'parts':len(new_records),'bones':25,'clips':32}),flush=True)

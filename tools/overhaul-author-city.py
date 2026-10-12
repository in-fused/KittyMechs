import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets/source/overhaul-city-v2')
TEXTURES=os.path.join(ROOT,'assets/source/environment-factory/shipping-textures')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
materials={}
# CC0 retained factory materials; original custom palette signs/glazing.
for name,color,rough,metal,source in [('brick',(.52,.40,.29),.85,0,'brick'),('plaster',(.58,.62,.56),.84,0,'trim_01'),('steel',(.18,.29,.28),.63,.45,'garage'),('trim',(.33,.39,.37),.62,.4,'trim_01'),('cream',(.7,.65,.47),.8,0,'trim_01'),('glass',(.025,.10,.13),.3,.3,None),('warmglass',(.20,.17,.085),.5,.1,None),('dark',(.038,.053,.052),.9,0,None),('paint',(.76,.58,.25),.7,.1,None),('blue',(.10,.21,.30),.65,.3,'garage'),('red',(.39,.13,.08),.65,.1,'garage')]:
 m=bpy.data.materials.new('Rainline_'+name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if source:
  for suffix,input_name in [('diff','Base Color'),('nor_gl','Normal')]:
   path=os.path.join(TEXTURES,'modular_factory_facade_'+source+'_'+suffix+'_1k.jpg');img=bpy.data.images.load(path,check_existing=True)
   # Deliberately small matched source maps for street-distance masonry/steel.
   if img.size[0]>512:
    img.scale(512,512)
    os.makedirs(os.path.join(OUT,'textures'),exist_ok=True)
    img.filepath_raw=os.path.join(OUT,'textures',os.path.basename(path).replace('1k','512'));img.file_format='JPEG';img.save()
   node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
   if suffix=='nor_gl':
    img.colorspace_settings.name='Non-Color';normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.6;m.node_tree.links.new(node.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
   else:
    mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*color,1);m.node_tree.links.new(node.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
 materials[name]=m
# glTF exporter supports direct base-color map + factor; multiply setup is replaced with direct map and factor.
for m in materials.values():
 p=m.node_tree.nodes.get('Principled BSDF')
 for n in list(m.node_tree.nodes):
  if n.type=='TEX_IMAGE' and n.image.colorspace_settings.name!='Non-Color':m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
kit=bpy.data.collections.new('EXPORT_Modular_Components');bpy.context.scene.collection.children.link(kit)
current=[]
def box(name,loc,scale,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[mat])
 # Meter-like triplanar UVs in normalized module space; architectural scale is ~4x5m.
 if o.data.uv_layers:
  uv=o.data.uv_layers.active.data
  for face in o.data.polygons:
   normal=face.normal
   for li in face.loop_indices:
    v=o.data.vertices[o.data.loops[li].vertex_index].co+o.location
    uv[li].uv=(v.x*2+1,v.z*2+1) if abs(normal.y)>.5 else (v.y*2+1,v.z*2+1) if abs(normal.x)>.5 else (v.x*2+1,v.y*2+1)
 current.append(o);return o
def cylinder(name,loc,r,depth,mat,axis='Z',vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 if axis=='X':o.rotation_euler[1]=math.pi/2
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.data.materials.append(materials[mat]);current.append(o);return o
def lettering(label,loc,width,height):
 bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='Sign_'+label;o.data.body=label;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=.12;o.data.resolution_u=1;o.data.extrude=0;o.data.materials.append(materials['paint']);bpy.context.view_layer.update();o.scale=(width/max(o.dimensions.x,.01),height/max(o.dimensions.z,.01),1);bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 # Normalize evaluated font mesh bounds, robust against font dimension cache.
 xs=[v.co.x for v in o.data.vertices];zs=[v.co.z for v in o.data.vertices];cx=(min(xs)+max(xs))/2;cz=(min(zs)+max(zs))/2;dx=max(xs)-min(xs);dz=max(zs)-min(zs)
 for v in o.data.vertices:v.co.x=(v.co.x-cx)*width/max(dx,.001);v.co.z=(v.co.z-cz)*height/max(dz,.001)
 current.append(o)
modules={}
def finish(name):
 global current
 root=bpy.data.objects.new(name,None);kit.objects.link(root);root['normalized_component']='Centered unit cube; exterior frontage -BlenderY = runtime+Z'
 groups={mat:[o for o in current if o.data.materials[0]==materials[mat]] for mat in materials}
 for mat,objects in groups.items():
  if not objects:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0]
  if len(objects)>1:bpy.ops.object.join()
  o=objects[0];o.name=name+'__'+mat;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.parent=root
  for c in list(o.users_collection):c.objects.unlink(o)
  kit.objects.link(o)
 root.name=name;modules[name]=root;current=[]
def wall(mat):
 box('backing',(0,0,0),(1,.54,1),mat)
 box('foot_course',(0,-.38,-.44),(1,.24,.12),'dark')
 box('cornice',(0,-.40,.445),(1,.18,.11),'trim')
 # Narrow piers break the panel grid with deeply recessed frontage.
 for x in [-.465,.465]:box('pier',(x,-.385,0),(.07,.23,.79),mat)
def window(x,z,w,h,warm=False):
 box('recess',(x,-.34,z),(w+.055,.04,h+.065),'dark')
 box('glazing',(x,-.366,z),(w,.018,h),'warmglass' if warm else 'glass')
 for xx in [x-w/2-.012,x+w/2+.012]:box('jamb',(xx,-.405,z),(.024,.13,h+.065),'trim')
 for zz in [z-h/2-.02,z+h/2+.02]:box('sill',(x,-.407,zz),(w+.072,.14,.04),'trim')
 box('mullion',(x,-.392,z),(.018,.075,h),'trim')
def sign(label,color='steel'):
 box('sign_board',(0,-.43,.31),(.79,.08,.16),color);lettering(label,(0,-.478,.31),.66,.086)
# Collars and worn reinforcement.
box('column',(0,0,0),(.74,.74,1),'steel')
for x in [-.45,.45]:
 for y in [-.45,.45]:box('reinforcement',(x,y,0),(.1,.1,1),'trim')
for z in [-.46,0,.46]:box('collar',(0,0,z),(1,1,.08),'steel')
finish('frame')
box('plinth',(0,0,0),(1,1,1),'plaster');box('foot_joint',(0,-.49,.15),(1,.018,.06),'dark');finish('foundation')
# 1: Works ground floor has a garage door, pedestrian entry and bold sign.
wall('brick');box('roller_door',(-.12,-.385,-.065),(.56,.07,.64),'steel')
for z in [-.32,-.2,-.08,.04,.16]:box('roller_seam',(-.12,-.425,z),(.55,.016,.019),'trim')
window(.31,-.06,.18,.62)
box('hazard_sill',(-.12,-.45,-.40),(.6,.08,.065),'paint');sign('WORKS 07');finish('facade_workshop')
# 2: Factory upper floor: masonry, smaller horizontal clerestory windows, ducts.
wall('brick')
for x in [-.23,.23]:window(x,.14,.32,.27)
box('duct',(0,-.365,-.20),(.69,.13,.16),'steel')
for x in [-.28,-.14,0,.14,.28]:box('duct_louvre',(x,-.445,-.20),(.05,.04,.13),'dark')
box('drainpipe',(.42,-.435,-.035),(.045,.06,.72),'trim');finish('facade_factory')
# 3: Apartment upper floor: two short floors in each owned cell, warm panes and shutters.
wall('plaster')
for z in [-.20,.19]:
 for x in [-.235,.235]:
  window(x,z,.23,.25,warm=(x>0 and z<0))
  box('shutter',(x-.15,-.43,z),(.052,.07,.27),'steel')
box('belt_course',(0,-.42,0),(.91,.15,.035),'cream');finish('facade_apartment')
# 4: Shop ground floor: deep display/entry, maroon canopy, clear authored label.
wall('brick');window(-.19,-.09,.43,.53);window(.30,-.12,.17,.60)
box('canopy',(0,-.40,.18),(.84,.19,.075),'red');sign('DOCK MARKET','red')
box('display_shelf',(-.19,-.403,-.24),(.40,.10,.045),'paint');finish('facade_shop')
# 5: Utility frontage: weathered pale service panels and intake fans, no giant glass wall.
wall('cream');box('service_panel',(-.14,-.37,-.09),(.52,.11,.58),'steel')
for x in [-.30,-.16,-.02]:
 cylinder('fan_housing',(x,-.444,.03),.07,.07,'dark','Y')
 cylinder('fan_hub',(x,-.488,.03),.018,.015,'trim','Y',8)
for z in [-.26,-.21,-.16]:box('intake',(-.14,-.436,z),(.45,.035,.023),'dark')
window(.32,.03,.17,.43);sign('PUMP 04');finish('facade_utility')
# 6: Transit halls: cool metal stripes, ticket glazing and station signage.
wall('blue')
window(-.2,-.04,.38,.51);window(.28,-.04,.23,.51)
box('transit_stripe',(0,-.438,-.37),(.89,.05,.045),'paint');sign('RAINLINE');finish('facade_transit')
# 7: Civic upper facade has heavy warm piers, narrow glazing and cast stone rhythm.
wall('plaster')
for x in [-.27,0,.27]:window(x,.015,.115,.52)
for x in [-.415,.415]:box('stone_fin',(x,-.40,-.04),(.08,.20,.70),'cream')
finish('facade_civic')
# Roof vents and low-profile circular housings remain entirely within the .4m roof slab.
for name,mat in [('roof','steel'),('roof_utility','cream'),('roof_residential','plaster')]:
 box('roof_base',(0,0,-.12),(1,1,.76),mat)
 for x in [-.46,.46]:box('parapet',(x,0,.26),(.08,1,.48),'trim')
 for y in [-.46,.46]:box('parapet',(0,y,.26),(1,.08,.48),'trim')
 if name=='roof_utility':
  for x in [-.23,.23]:cylinder('low_tank',(x,0,.28),.17,.36,'steel',vertices=16)
 elif name=='roof_residential':
  box('rooflight',(0,0,.30),(.44,.40,.32),'dark');box('rooflight_glass',(0,0,.47),(.40,.36,.035),'glass')
 else:
  box('vent_plinth',(0,0,.24),(.43,.43,.35),'dark')
  for x in [-.16,-.08,0,.08,.16]:box('vent_strip',(x,0,.45),(.045,.40,.05),'trim')
 finish(name)
box('slab',(0,0,0),(1,1,1),'plaster');finish('slab')
box('web',(0,0,0),(1,.64,.64),'steel')
for z in [-.43,.43]:box('flange',(0,0,z),(1,1,.14),'trim')
finish('gantry')
box('deck',(0,0,0),(1,1,.9),'steel')
for x in [-.42,-.21,0,.21,.42]:box('tread',(x,0,.475),(.025,1,.05),'trim')
finish('bridge')
box('rail',(0,0,0),(1,1,1),'steel');finish('rail')
box('cabinet',(0,0,-.04),(.84,.80,.92),'steel');box('cap',(0,0,.45),(1,1,.1),'trim')
for z in [-.27,-.18,-.09,0,.09,.18,.27]:box('louvre',(0,-.45,z),(.63,.08,.045),'dark')
box('service_label',(0,-.48,.33),(.42,.035,.06),'paint');finish('props')
# Pack retained source textures into the editable master.
for img in bpy.data.images:
 if img.source=='FILE':img.pack()
bpy.ops.object.select_all(action='DESELECT')
for o in kit.objects:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Rainline_Modular_City_v2.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'Rainline_Modular_City_v2.raw.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
# A single source review, close to the real camera's street-height frontage view.
kit.hide_render=True
preview=bpy.data.collections.new('REVIEW_Ordinary_Street');bpy.context.scene.collection.children.link(preview)
def place(name,loc,scale,rotation=0):
 for child in modules[name].children:
  o=child.copy();o.data=child.data;o.parent=None;o.location=loc;o.scale=scale;o.rotation_euler[2]=rotation;preview.objects.link(o)
for building,(x,usage,height) in enumerate([(-11,'works',9),(11,'utility',8),(-30,'residential',12),(30,'transit',10)]):
 z=0 if building<2 else 22
 for row in range(2):
  for bay in range(4):
   module='facade_workshop' if usage=='works' and row==0 else 'facade_factory' if usage=='works' else 'facade_utility' if usage=='utility' else 'facade_shop' if usage=='residential' and row==0 else 'facade_apartment' if usage=='residential' else 'facade_transit'
   place(module,(x+(bay-1.5)*4,z,height*(row+.5)/2),(4,.4,height/2-.2))
 place('roof_utility' if usage=='utility' else 'roof_residential' if usage=='residential' else 'roof',(x,z+6,height),(16,12,.4))
 place('foundation',(x,z+6,-.2),(16,12,.4))
 for xx in [-7.5,7.5]:place('frame',(x+xx,z,height/2),(.6,.6,height-.4))
for x in [-5,5]:place('props',(x,-7,1.1),(1.8,.8,2.2))
box('review_ground',(0,12,-.50),(100,90,.2),'dark')
for o in current:
 for c in list(o.users_collection):c.objects.unlink(o)
 preview.objects.link(o)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.world.color=(.32,.36,.4)
bpy.ops.object.light_add(type='AREA',location=(0,-12,18));bpy.context.object.data.energy=3000;bpy.context.object.data.size=22
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=(.4,-.35,-.2);bpy.context.object.data.energy=2.0
bpy.ops.object.camera_add(location=(0,-35,4.8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,8,4.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=28;scene.camera=cam
scene.render.filepath=os.path.join(OUT,'review-ordinary-street.png')
if os.environ.get('RAINLINE_SKIP_REVIEW')!='1':bpy.ops.render.render(write_still=True)
preview.hide_render=True;kit.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Rainline_Modular_City_v2.blend'))
print('CITY_ART_V2_COMPLETE')

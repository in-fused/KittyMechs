"""Frozen one-job Rainline street kit. All outputs in new source/receipt lanes."""
import bpy, math, json, os, hashlib, random
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.join(ROOT,'assets/source/overhaul-rainline-street-population-001')
RECEIPT=os.path.join(ROOT,'.sites-runtime/overhaul-20261010/rainline-street-population-001')
os.makedirs(OUT,exist_ok=True);os.makedirs(RECEIPT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
FONT_PATH=os.path.join(ROOT,'public/assets/fonts/barlowcondensed/BarlowCondensed-SemiBold.ttf')
font=bpy.data.fonts.load(FONT_PATH)
kit=bpy.data.collections.new('STREET_KIT_export');scene.collection.children.link(kit)
proxycol=bpy.data.collections.new('COLLISION_PROPOSAL_PENDING');scene.collection.children.link(proxycol)
review=bpy.data.collections.new('SOURCE_REVIEW_ONLY');scene.collection.children.link(review)
COL={'iron':(.115,.145,.16),'bare':(.38,.42,.43),'rust':(.34,.105,.035),'ochre':(.63,.32,.055),'blue':(.035,.12,.23),'red':(.40,.045,.026),'chalk':(.72,.69,.57),'rubber':(.019,.024,.027),'stone':(.31,.34,.32),'green':(.09,.19,.105),'soil':(.11,.074,.036),'cyan':(.11,.65,.58)}
materials={}
for key,rough,metal in [('painted',.65,.55),('rubber',.88,0),('mineral',.93,0),('instrument',.29,.18)]:
 m=bpy.data.materials.new('RainlineStreet_'+key);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Color'
 rng=random.Random('RainlineStreetWeather'+key);size=256;px=[]
 for y in range(size):
  for x in range(size):
   v=.95+rng.uniform(-.055,.025)
   if (x*13+y*3)%113<2:v-=.12
   if rng.random()<.018:v-=.19
   px.extend([v,v,v,1])
 im=bpy.data.images.new('Original_'+key+'_weather_master',width=size,height=size);im.pixels=px;im.filepath_raw=os.path.join(OUT,'weather-'+key+'.png');im.file_format='PNG';im.save();im.pack()
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
 mix=m.node_tree.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
 m.node_tree.links.new(attr.outputs['Color'],mix.inputs[6]);m.node_tree.links.new(tex.outputs['Color'],mix.inputs[7]);m.node_tree.links.new(mix.outputs[2],p.inputs['Base Color'])
 materials[key]=m
current=[];module='';modules={};proxies={}
def own(o,mat='painted',col='iron'):
 for c in list(o.users_collection):c.objects.unlink(o)
 kit.objects.link(o);o.name=module+'__'+o.name
 if o.type=='MESH':
  o.data.materials.clear();o.data.materials.append(materials[mat]);a=o.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER');rng=random.Random(o.name)
  for f in o.data.polygons:
   fac=rng.uniform(.86,1.0)
   for i in f.loop_indices:a.data[i].color=tuple(v*fac for v in COL[col])+(1,)
  if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap')
  uv=o.data.uv_layers.active.data
  for f in o.data.polygons:
   normal=f.normal;axes=(0,1) if abs(normal.z)>.5 else (0,2) if abs(normal.y)>.5 else (1,2)
   for i in f.loop_indices:
    v=o.data.vertices[o.data.loops[i].vertex_index].co;uv[i].uv=(v[axes[0]]*.7,v[axes[1]]*.7)
 current.append(o);return o
def box(n,loc,size,col='iron',bevel=.018,mat='painted'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Manufactured_edge_radius','BEVEL');mod.width=min(bevel,min(size)*.18);mod.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return own(o,mat,col)
def cyl(n,loc,r,depth,col='bare',axis='Z',verts=12,mat='painted'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=n
 if axis=='X':o.rotation_euler[1]=math.pi/2
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return own(o,mat,col)
def rod(n,a,b,r=.035,col='bare',mat='painted'):
 a,b=Vector(a),Vector(b);o=cyl(n,(a+b)/2,r,(b-a).length,col,verts=10,mat=mat);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def ring(n,loc,major,minor,col='iron',axis='Z',mat='painted'):
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=loc,major_radius=major,minor_radius=minor);o=bpy.context.object;o.name=n
 if axis=='X':o.rotation_euler[1]=math.pi/2
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 return own(o,mat,col)
def text(n,s,loc,w,h,col='chalk'):
 bpy.ops.object.text_add(location=loc);o=bpy.context.object;o.name=n;o.data.body=s;o.data.font=font;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=1;o.data.extrude=0
 bpy.context.view_layer.update();o.scale=(w/max(o.dimensions.x,.001),h/max(o.dimensions.y,.001),1);bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=(math.pi/2,0,0);return own(o,'painted',col)
def bolts(xwidth,zheight,y,zbase=0):
 for x in [-xwidth/2,xwidth/2]:
  for z in [zbase,zbase+zheight]:cyl('hex_fastener',(x,y,z),.025,.025,'bare','Y',6)
def panel(w,h,y,z,col='iron',label='SERVICE'):
 box('panel_gasket',(0,y+.009,z),(w+.055,.035,h+.055),'rubber',.007,'rubber');box('access_panel',(0,y-.012,z),(w,.035,h),col,.012);bolts(w-.09,h-.09,y-.035,z-h/2+.045)
 box('recess_handle',(w*.30,y-.049,z),(w*.12,.035,.055),'bare',.008)
 if label:text('service_label',label,(0,y-.041,z+h*.27),w*.68,.10)
def feet(w,d,z=.08):
 for x in [-w/2,w/2]:
  for y in [-d/2,d/2]:box('anchor_foot',(x,y,z),( .22,.22,.16),'bare');cyl('anchor_bolt',(x,y,z+.09),.03,.035,'iron',verts=6)
def hazard(w,y,z):
 box('hazard_back',(0,y,z),(w,.02,.10),'ochre',.002)
 for i in range(max(1,int(w/.22))):
  o=box('hazard_slash',(-w/2+.10+i*.22,y-.012,z),(.075,.014,.10),'iron',0);o.rotation_euler[1]=-.35
def louvres(w,y,z,count=6):
 box('louvre_shadow',(0,y+.01,z),(w,.025,count*.075+.035),'rubber',.008,'rubber')
 for i in range(count):box('folded_louvre',(0,y-.016,z+(i-(count-1)/2)*.075),(w-.04,.065,.028),'bare',.006)
def begin(n):
 global module,current
 module=n;current=[];proxies[n]=[]
def solid(n,loc,size):proxies[module].append({'part':n,'shape':'box','center_blender_xyz':list(loc),'size_blender_xyz':list(size),'solid':True,'loadBearing':False,'climbAdmission':'PENDING','supportOwner':module})
def end():
 root=bpy.data.objects.new(module,None);kit.objects.link(root);root['units']='meters';root['admission']='PENDING';root['loadBearing']=False
 for o in current:o.parent=root
 modules[module]=root
def wheel(x,y,z,r=.28):
 cyl('tire',(x,y,z),r,.16,'rubber','X',16,'rubber');cyl('wheel_hub',(x+(.085 if x>0 else -.085),y,z),r*.50,.025,'bare','X');cyl('hub_axle',(x+(.105 if x>0 else -.105),y,z),.055,.03,'iron','X',6)
 for j in range(6):
  a=j*math.tau/6;cyl('wheel_lug',(x+(.103 if x>0 else -.103),y+math.cos(a)*r*.30,z+math.sin(a)*r*.30),.019,.035,'iron','X',6)

begin('freight_service_cart')
box('ladder_chassis',(0,0,.42),(1.45,2.55,.18),'iron');box('ribbed_deck',(0,-.20,.60),(1.40,1.85,.18),'ochre')
for x in [-.56,.56]:
 for y in [-.85,.85]:wheel(x*1.33,y,.30,.30)
for y in [-.9,-.55,-.2,.15,.5]:box('bed_seam',(0,y,.701),(1.36,.024,.025),'bare',.003)
for x in [-.69,.69]:
 for y in [-1.05,.60]:rod('bed_post',(x,y,.70),(x,y,1.05),.04)
 rod('bed_side_rail',(x,-1.05,1.05),(x,.60,1.05),.045,'ochre')
box('power_pack',(0,.88,.91),(1.2,.56,.46),'blue');panel(.90,.33,.58,.93,'blue','RL / 07');louvres(.55,1.18,.92,3)
for x in [-.5,.5]:rod('tiller_support',(x,1.17,.80),(x,1.48,1.55),.04,'ochre')
rod('tiller_handle',(-.5,1.48,1.55),(.5,1.48,1.55),.045,'rubber','rubber');hazard(1.30,-1.28,.47)
box('cargo_toolcase',(0,-.30,.94),(.86,.75,.49),'red');panel(.65,.27,-.69,.95,'red','TOOLS');solid('chassis',(0,0,.40),(1.60,2.70,.80));solid('toolcase',(0,-.3,.95),(.9,.8,.6));solid('battery',(0,.88,.95),(1.25,.6,.6));end()

begin('repair_trolley')
box('base_tray',(0,0,.27),(.85,.80,.13),'red')
for x in [-.37,.37]:
 for y in [-.30,.30]:wheel(x,y,.16,.16);rod('corner_angle',(x,y,.30),(x,y,1.20),.025)
for z in [.66,1.03]:box('open_tray',(0,0,z),(.84,.77,.065),'red');box('tray_back',(0,.365,z+.09),(.84,.035,.20),'red')
box('drawer',(0,0,.46),(.72,.69,.25),'iron');panel(.62,.18,-.36,.46,'iron','REPAIR')
for x in [-.32,.32]:rod('handle_post',(x,.37,1.03),(x,.47,1.40),.025)
rod('push_handle',(-.32,.47,1.4),(.32,.47,1.4),.03,'rubber','rubber')
cyl('gas_bottle',(.20,.15,1.32),.11,.48,'blue');cyl('bottle_cap',(.20,.15,1.59),.035,.07,'bare');rod('spanner',(-.28,-.10,1.09),(.06,-.10,1.09),.028)
solid('cart_body',(0,0,.72),(.85,.8,1.2));end()

begin('generator_skid')
box('skid',(0,0,.13),(1.65,1.1,.26),'iron');feet(1.40,.85)
box('generator_housing',(0,0,.72),(1.45,.92,1.0),'ochre',.045);panel(1.22,.63,-.49,.73,'ochre','POWER / 19');louvres(.72,.48,.74,8)
for x in [-.73,.73]:box('corner_guard',(x,-.47,.71),(.06,.08,1.02),'bare')
box('lifting_crown',(0,0,1.27),(.65,.15,.08),'bare');ring('lift_eye',(0,0,1.40),.105,.028,'bare','Y')
cyl('exhaust',(.51,.22,1.34),.085,.28,'iron');cyl('exhaust_cap',(.51,.22,1.49),.11,.045,'bare');hazard(1.30,-.575,.27)
for x in [-.42,-.12,.18]:cyl('socket',(x,-.535,.59),.045,.045,'rubber','Y',12,'rubber')
solid('generator',(0,0,.75),(1.65,1.15,1.50));end()

begin('charging_pedestal')
box('anchored_plinth',(0,0,.10),(.92,.82,.20),'stone',.03,'mineral');box('cabinet',(0,0,1.05),(.72,.60,1.8),'blue');panel(.56,1.10,-.325,.94,'blue','CHARGE / B')
box('screen_bezel',(0,-.33,1.56),(.47,.06,.32),'rubber',.01,'rubber');box('status_screen',(0,-.365,1.56),(.39,.018,.23),'cyan',.004,'instrument');text('screen_text','READY',(0,-.379,1.56),.31,.07)
for x in [-.25,.25]:rod('safety_arm',(x,-.37,.5),(x,-.37,1.3),.024)
ring('cable_loop',(.47,0,1.03),.28,.022,'rubber','X','rubber');box('connector',(.43,-.23,1.33),(.10,.16,.19),'red');feet(.72,.63)
solid('cabinet',(0,0,1.05),(.78,.70,1.9));solid('plinth',(0,0,.1),(.92,.82,.2));end()

begin('hydraulic_manifold')
box('base',(0,0,.10),(1.8,.75,.20),'iron');feet(1.5,.55)
for x in [-.72,.72]:box('upright',(x,.20,.76),(.12,.13,1.4),'bare');box('bearing_plate',(x,0,.64),(.24,.48,.10),'iron')
rod('header',(-.78,0,.8),(.78,0,.8),.095,'blue')
for x in [-.56,0,.56]:
 rod('drop_pipe',(x,0,.23),(x,0,1.2),.065,'blue');cyl('flange',(x,0,.64),.135,.065,'bare');cyl('flange',(x,0,.94),.135,.065,'bare')
 cyl('valve_stem',(x,-.11,1.07),.038,.20,'bare','Y');ring('valve_wheel',(x,-.23,1.07),.135,.019,'red','Y')
 for a in range(4):
  ang=a*math.pi/2;rod('wheel_spoke',(x,-.23,1.07),(x+math.cos(ang)*.125,-.23,1.07+math.sin(ang)*.125),.011,'red')
box('gauge_bracket',(0,.15,1.27),(.50,.12,.10),'iron');cyl('pressure_gauge',(0,-.025,1.40),.12,.10,'bare','Y');cyl('gauge_face',(0,-.083,1.40),.099,.012,'chalk','Y',16,'instrument');rod('gauge_needle',(0,-.093,1.40),(.055,-.093,1.455),.006,'red')
solid('base',(0,0,.12),(1.8,.75,.24));solid('pipe_rack',(0,0,.85),(1.75,.55,1.35));end()

begin('cable_reel')
for x in [-.49,.49]:
 cyl('reel_flange',(x,0,.66),.64,.09,'ochre','X',20);cyl('reel_rim',(x,0,.66),.58,.105,'bare','X',20)
 for i in range(6):
  a=i*math.tau/6;cyl('flange_bolt',(x+(.059 if x>0 else -.059),math.cos(a)*.45,.66+math.sin(a)*.45),.026,.026,'iron','X',6)
cyl('wound_core',(0,0,.66),.47,.89,'rubber','X',20,'rubber')
for x in [-.40,-.30,-.20,-.10,0,.10,.20,.30,.40]:ring('cable_wind',(x,0,.66),.467,.027,'rubber','X','rubber')
cyl('axle',(0,0,.66),.10,1.20,'bare','X');box('chock',(0,-.51,.09),(.82,.23,.18),'iron');solid('reel',(0,0,.66),(1.20,1.28,1.32));end()

begin('winch_anchor')
box('plate',(0,0,.085),(1.15,.95,.17),'bare');feet(.95,.75)
for x in [-.42,.42]:box('bearing',(x,0,.38),(.15,.50,.48),'blue');cyl('bearing_cap',(x,0,.46),.17,.20,'bare','X')
cyl('drum',(0,0,.46),.23,.72,'rubber','X',16,'rubber')
for x in [-.33,.33]:cyl('drum_flange',(x,0,.46),.31,.075,'ochre','X',16)
for x in [-.27,-.18,-.09,0,.09,.18,.27]:ring('rope_wind',(x,0,.46),.24,.015,'bare','X')
box('motor',(.57,0,.45),(.24,.38,.35),'blue');rod('feed_roller',(-.40,-.35,.39),(.40,-.35,.39),.035,'bare');box('control',(0,.32,.42),(.44,.16,.25),'red');solid('winch',(0,0,.43),(1.5,.95,.86));end()

begin('cast_barrier')
# Sloped closed manufactured concrete profile, not a paper plane.
verts=[]
for x in [-1.4,1.4]:
 for y,z in [(-.38,0),(.38,0),(.38,.24),(.16,.68),(.16,.94),(-.16,.94),(-.16,.68),(-.38,.24)]:verts.append((x,y,z))
faces=[tuple(reversed(range(8))),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
mesh=bpy.data.meshes.new('cast_section');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('cast_barrier',mesh);kit.objects.link(o);own(o,'mineral','stone')
for x in [-1,1]:box('cast_seam',(x,0,.946),(.018,.32,.008),'iron',0);ring('lift_socket',(x,0,.95),.065,.016,'bare','Y')
hazard(2.35,-.171,.80);text('barrier_id','RAINLINE / 03',(0,-.388,.18),1.45,.12)
solid('cast_barrier',(0,0,.47),(2.8,.76,.94));end()

begin('security_fence')
for x in [-1.25,1.25]:box('post',(x,0,.86),(.10,.11,1.72),'bare');box('foot',(x,0,.055),(.34,.48,.11),'iron');box('post_cap',(x,0,1.74),(.14,.15,.045),'ochre')
for z in [.20,1.62]:box('rail',(0,0,z),(2.5,.08,.075),'bare')
for x in [-1.1,-.88,-.66,-.44,-.22,0,.22,.44,.66,.88,1.1]:rod('welded_vertical',(x,0,.25),(x,0,1.59),.011,'iron')
for z in [.38,.60,.82,1.04,1.26,1.48]:rod('welded_horizontal',(-1.18,0,z),(1.18,0,z),.011,'iron')
box('warning_plate',(.66,-.052,1.19),(.52,.025,.36),'ochre');text('fence_warning','KEEP CLEAR',(.66,-.069,1.19),.43,.10,'iron')
# Separate proxies preserve the open visual mesh as a physically closed barrier.
solid('barrier_mesh',(0,0,.94),(2.5,.08,1.5));solid('left_foot',(-1.25,0,.08),(.34,.48,.16));solid('right_foot',(1.25,0,.08),(.34,.48,.16));end()

begin('rain_planter')
box('drained_base',(0,0,.08),(1.35,.73,.16),'iron');box('planter_body',(0,0,.40),(1.3,.68,.61),'red',.035);box('upper_rim',(0,0,.72),(1.38,.76,.10),'bare');box('soil',(0,0,.777),(1.23,.62,.035),'soil',0,'mineral')
for x in [-.40,0,.40]:
 rod('plant_stem',(x,0,.79),(x+.035,.01,1.20),.015,'green','mineral')
 for z,dx,dy in [(1.0,.15,.02),(1.1,-.12,.05),(1.19,.10,-.06)]:
  o=box('leaf',(x+dx/2,dy,z),(.22,.08,.028),'green',.01,'mineral');o.rotation_euler[1]=.6 if dx<0 else -.6
for x in [-.50,.50]:cyl('drain_hole',(x,-.35,.20),.035,.025,'rubber','Y',10,'rubber')
text('planter_mark','RAIN GARDEN',(0,-.359,.51),.92,.12);solid('planter',(0,0,.42),(1.38,.76,.84));end()

begin('public_bench')
for x in [-.75,.75]:
 box('cast_leg',(x,0,.30),(.16,.61,.6),'stone',.018,'mineral');box('foot',(x,0,.04),(.31,.75,.08),'bare');rod('back_support',(x,.24,.45),(x,.30,1.01),.025)
for y in [-.25,-.083,.083,.25]:box('seat_slat',(0,y,.60),(1.90,.13,.085),'ochre',.012)
for z in [.77,.94]:box('back_slat',(0,.30,z),(1.90,.07,.13),'ochre',.009)
for x in [-.92,.92]:rod('armrest',(x,-.22,.77),(x,.27,.77),.035,'iron');rod('armrest_leg',(x,-.22,.64),(x,-.22,.77),.028,'iron')
solid('seat',(0,0,.58),(1.90,.65,.14));solid('left_leg',(-.75,0,.30),(.20,.61,.60));solid('right_leg',(.75,0,.30),(.20,.61,.60));solid('back',(0,.30,.85),(1.90,.11,.42));end()

begin('bundled_pressure_tanks')
box('pallet',(0,0,.10),(1.3,1.05,.20),'bare')
for x in [-.32,.32]:
 for y in [-.25,.25]:
  cyl('tank',(x,y,.81),.235,1.35,'blue',verts=16);cyl('tank_shoulder',(x,y,1.50),.17,.08,'blue');cyl('valve',(x,y,1.59),.04,.11,'bare');ring('foot_ring',(x,y,.18),.228,.025,'bare')
for x in [-.63,.63]:box('cage_post',(x,0,.9),(.06,.95,1.62),'iron')
for z in [.55,1.20]:box('retaining_band',(0,-.50,z),(1.28,.035,.055),'ochre');box('retaining_band',(0,.50,z),(1.28,.035,.055),'ochre')
box('warning_plate',(0,-.523,.85),(.45,.025,.24),'chalk');text('pressure_warning','PRESSURE',(0,-.54,.85),.38,.08,'red');solid('tank_bundle',(0,0,.88),(1.35,1.10,1.76));end()

begin('stacked_industrial_cases')
box('fork_pallet',(0,0,.1),(1.6,1.15,.20),'bare')
for j,(x,y,z,w,d,h,col) in enumerate([(-.40,0,.52,.75,1.0,.72,'red'),(.4,0,.52,.75,1.0,.72,'blue'),(0,0,1.23,1.18,.84,.70,'ochre')]):
 box('cargo_case',(x,y,z),(w,d,h),col,.025)
 for dx in [-w/2+.04,w/2-.04]:
  for dy in [-d/2+.025,d/2-.025]:box('corner_protector',(x+dx,y+dy,z),(.055,.07,h+.018),'bare',.008)
 for dx in [-w*.30,w*.30]:box('cargo_latch',(x+dx,y-d/2-.018,z+.12),(.07,.04,.17),'bare',.006)
 text('shipping_label','RL '+str(81+j),(x,y-d/2-.023,z-.07),w*.54,.10)
solid('case_stack',(0,0,.81),(1.65,1.2,1.62));end()

begin('covered_machine_pallet')
for x in [-.57,0,.57]:box('pallet_runner',(x,0,.065),(.18,1.45,.13),'bare')
box('deck',(0,0,.17),(1.60,1.45,.12),'ochre')
# Thick folded machine cover with purposeful ridges, tie-down straps and seals.
box('covered_machine',(0,0,.67),(1.45,1.31,.90),'blue',.07)
for x in [-.47,.47]:box('tension_strap',(x,0,1.125),(.075,1.40,.035),'ochre',.005);box('front_strap',(x,-.665,.68),(.075,.025,.88),'ochre',.003);box('buckle',(x,-.69,.68),(.12,.04,.15),'bare',.006)
for y in [-.42,0,.42]:box('cover_fold',(0,y,1.135),(1.35,.024,.02),'iron',.003)
box('shipping_pocket',(0,-.69,.82),(.38,.025,.24),'chalk');text('freight_tag','FRAGILE',(0,-.708,.82),.31,.08,'red');solid('pallet_load',(0,0,.63),(1.6,1.45,1.26));end()

begin('service_bollard')
box('base',(0,0,.07),(.42,.42,.14),'bare');cyl('post',(0,0,.57),.13,.94,'ochre',verts=12);cyl('collar',(0,0,.72),.143,.19,'iron',verts=12);cyl('cap',(0,0,1.07),.15,.065,'bare',verts=12)
for x in [-.14,.14]:
 for y in [-.14,.14]:cyl('base_anchor',(x,y,.15),.025,.025,'iron',verts=6)
box('reflector',(0,-.133,.87),(.13,.017,.14),'chalk',.002,'instrument');solid('bollard',(0,0,.57),(.30,.30,1.14));solid('foot',(0,0,.07),(.42,.42,.14));end()

begin('inspection_hatch')
box('hatch_frame',(0,0,.04),(1.10,.90,.08),'bare');box('recessed_cover',(0,0,.086),(.98,.78,.04),'iron',.01)
for x in [-.44,.44]:
 for y in [-.33,.33]:cyl('cover_bolt',(x,y,.113),.026,.014,'bare',verts=6)
for y in [-.27,-.18,-.09,0,.09,.18,.27]:box('traction_ridge',(0,y,.115),(.84,.016,.016),'bare',.002)
box('pull_recess',(0,-.23,.121),(.24,.07,.008),'rubber',.004,'rubber');solid('hatch',(0,0,.05),(1.10,.90,.10));end()

# Join each module by material; retain named component/proxy recipes in manifest.
records=[]
for name,root in modules.items():
 children=list(root.children);parts=[o.name for o in children]
 for mat in materials.values():
  group=[o for o in list(root.children) if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'__'+mat.name;o.parent=root
 bpy.context.view_layer.update();points=[o.matrix_world@Vector(v) for o in root.children for v in o.bound_box]
 mn=[min(p[i] for p in points) for i in range(3)];mx=[max(p[i] for p in points) for i in range(3)];tri=0
 for o in root.children:o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
 records.append({'id':name,'pivot':'ground-center; Blender Z up; GLB Y up','bounds_blender_xyz':{'min':mn,'max':mx},'bounds_gltf_xyz':{'min':[mn[0],mn[2],-mx[1]],'max':[mx[0],mx[2],-mn[1]]},'triangles':tri,'materials':[o.data.materials[0].name for o in root.children],'authored_parts':parts,'collisionProposal':proxies[name],'physicsAdmission':'PENDING','navAdmission':'PENDING','destructionAdmission':'PENDING','decorations':'fasteners, markings, plant leaves and cable winds are non-load-bearing children of the solid module'})
 for k,p in enumerate(proxies[name]):
  bpy.ops.mesh.primitive_cube_add(size=1,location=p['center_blender_xyz']);o=bpy.context.object;o.name='PENDING_'+name+'_'+p['part'];o.scale=p['size_blender_xyz']
  for c in list(o.users_collection):c.objects.unlink(o)
  proxycol.objects.link(o);o.hide_render=True;o.hide_set(True);o.display_type='WIRE'
total=sum(r['triangles'] for r in records)
if len(records)!=16 or total>80000:raise RuntimeError('Frozen module/triangle budget failed')
if len(materials)>4:raise RuntimeError('Frozen material budget failed')
manifest={'name':'Rainline street population 001','status':'SOURCE_CANDIDATE_PENDING_CRITIC_AND_RUNTIME','modules':records,'totalUniqueTriangles':total,'sharedMaterials':4,'weatherTextures':{'count':4,'size':256,'decodedRGBA8WithMipmapsBytes':4*256*256*4*4/3},'unit':'meter','sourceOwnership':'Original project geometry and deterministic weather maps. Existing unchanged BarlowCondensed SemiBold font, OFL1.1. No external generation/download.','fontSource':{'path':os.path.relpath(FONT_PATH,ROOT).replace('\\','/'),'sha256':hashlib.sha256(open(FONT_PATH,'rb').read()).hexdigest(),'licensePath':'public/assets/fonts/barlowcondensed/OFL.txt','licenseSHA256':hashlib.sha256(open(os.path.join(ROOT,'public/assets/fonts/barlowcondensed/OFL.txt'),'rb').read()).hexdigest()},'runtimeIntegration':False}
json.dump(manifest,open(os.path.join(OUT,'manifest.json'),'w'),indent=2)
bpy.ops.object.select_all(action='DESELECT')
for root in modules.values():
 root.select_set(True)
 for o in root.children:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'Rainline_StreetPopulation_001.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_extras=True)
if os.path.getsize(os.path.join(OUT,'Rainline_StreetPopulation_001.glb'))>12582912:raise RuntimeError('Frozen GLB byte budget failed')

# Source-only presentation, finite deck and explicit board label.
def review_box(n,loc,size,col):
 global module,current
 before=current;current=[];o=box(n,loc,size,col,0,'mineral');kit.objects.unlink(o);review.objects.link(o);current=before;return o
def review_text(s,loc,w,h):
 global current
 before=current;current=[];o=text('SOURCE_BOARD_LABEL',s,loc,w,h);kit.objects.unlink(o);review.objects.link(o);current=before;return o
def duplicate(root,loc,rz=0):
 r=root.copy();r.name='REVIEW_ONLY_'+root.name;review.objects.link(r);r.location=loc;r.rotation_euler[2]=rz
 for orig in root.children:
  o=orig.copy();o.data=orig.data;review.objects.link(o);o.parent=r
 return r
def camera(loc,target,scale):
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=scale;scene.camera=c;return c
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.device='CPU';scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
scene.world.color=(.18,.18,.18);scene.view_settings.view_transform='AgX'
for loc,power,size in [((3,-10,18),3200,12),((-12,-2,10),2200,10),((5,8,12),3500,8)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
roots=list(modules.values())
for i,r in enumerate(roots):
 x=(i%4-1.5)*4.5;y=(i//4-1.5)*4.5;r.location=(x,y,0)
 review_box('DISPLAY_TILE_'+r.name,(x,y,-.05),(4.05,3.90,.10),'stone')
 review_text(str(i+1).zfill(2)+' / '+r.name.replace('_',' ').upper(),(x,y-1.90,.055),3.40,.20)
 # Flat labels: text helper faces -Y; rotate into deck plane.
 o=list(review.objects)[-1];o.rotation_euler=(0,0,0)
review_text('RAINLINE / WORKING STREET KIT / SOURCE REVIEW ONLY',(0,-10.1,.07),17,.40);list(review.objects)[-1].rotation_euler=(0,0,0)
cam=camera((17,-24,26),(0,0,.35),26);scene.render.resolution_x=2400;scene.render.resolution_y=1900;scene.render.filepath=os.path.join(OUT,'review-module-silhouettes.png');bpy.ops.render.render(write_still=True)
for r in roots:r.location=(0,0,0);r.hide_render=True
kit.hide_render=True
for o in list(review.objects):o.hide_render=True
# Honest local loading-pocket sample: finite 15x10m floor, exact warehouse edge
# context only, no actual city art/backing exported and no infinite floor.
review_box('FINITE_SAMPLE_DECK',(0,0,-.12),(15,10,.24),'stone')
review_box('CANONICAL_WAREHOUSE_CONTEXT',(0,5.5,2.4),(14,1,4.8),'iron')
for x in [-6,-3,0,3,6]:review_box('CONTEXT_FACADE_SEAM',(x,4.99,2.4),(.04,.025,4.6),'bare')
sample=[('freight_service_cart',(3.8,.4,0),0),('repair_trolley',(2.0,1.0,0),0),('generator_skid',(-4.8,2.7,0),0),('hydraulic_manifold',(-5.5,.8,0),0),('cable_reel',(-3.8,1.1,0),0),('stacked_industrial_cases',(-1.6,3.5,0),0),('covered_machine_pallet',(.3,3.5,0),0),('security_fence',(-5.8,3.8,0),0),('service_bollard',(6,2.0,0),0),('inspection_hatch',(0,-1.7,0),0)]
for n,loc,rz in sample:duplicate(modules[n],loc,rz).hide_render=False
# Clear 3m local handcart strip is diagram context, not mech route proof.
for y in [-3,-2,-1,0,1,2,3]:review_box('CLEAR_SERVICE_STRIP_MARK',(6,y,.01),(.06,.45,.02),'ochre')
review_text('WEST LOADING POCKET / PLACEMENT STUDY / COLLISION PENDING',(0,-4.75,.02),13,.30);list(review.objects)[-1].rotation_euler=(0,0,0)
cam.location=(14,-19,17);cam.rotation_euler=(Vector((0,.6,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=21
scene.render.resolution_x=2200;scene.render.resolution_y=1500;scene.render.filepath=os.path.join(OUT,'review-west-loading-sample.png');bpy.ops.render.render(write_still=True)
# Save source master with kit roots at exact origin, hidden from source sample;
# reviewers can toggle source-only review collection and unhide kit.
for root in modules.values():root['reviewVisibility']='hidden only to show source sample; unhide for module editing'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Rainline_StreetPopulation_001.blend'))
files=[]
for name in os.listdir(OUT):
 path=os.path.join(OUT,name)
 if os.path.isfile(path):files.append({'path':os.path.relpath(path,ROOT).replace('\\','/'),'bytes':os.path.getsize(path),'sha256':hashlib.sha256(open(path,'rb').read()).hexdigest()})
json.dump({'job':'one Blender author/export/two source preview job','status':'COMPLETED_SOURCE_ONLY','uniqueTriangles':total,'files':files},open(os.path.join(RECEIPT,'job-receipt.json'),'w'),indent=2)
print('RAINLINE_STREET_COMPLETED',total,len(records))

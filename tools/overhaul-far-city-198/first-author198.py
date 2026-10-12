"""Own-kit front PBR projection on exact backing/profile source polygons.
One bounded Blender execution. No source/public/runtime asset is replaced.
"""
import bpy,os,sys,json,math,ast,hashlib,time
import numpy as np
from mathutils import Vector,Matrix
OUT=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(os.path.join(OUT,'../../..'))
started=time.monotonic();module_names=[];records=[]
SOURCE=os.path.join(ROOT,'assets/source/overhaul-city-v4/Rainline_Identity_v4.blend')
source_hash=hashlib.sha256(open(SOURCE,'rb').read()).hexdigest()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
source_collection=bpy.data.collections.new('SOURCE_198_readonly_kit');bpy.context.scene.collection.children.link(source_collection)
far_collection=bpy.data.collections.new('FAR_198_authored');bpy.context.scene.collection.children.link(far_collection)
with bpy.data.libraries.load(SOURCE,link=False) as (src,dst):dst.objects=[n for n in src.objects if any(n.startswith(f+'_') for f in ['loading','transit','control','residential'])]
for o in dst.objects:
 if o:source_collection.objects.link(o)
bpy.context.view_layer.update()
roots=[o for o in source_collection.objects if o.type=='EMPTY'];modules={o.name:o for o in roots}
module_names=sorted(n for n in modules if not n.endswith(('_wall','_deck')))
if len(module_names)!=24:raise RuntimeError('198_EXPECT24_FACADES:'+str(module_names))
for name,root in modules.items():root.name='SOURCE__'+name
materials={m.name.rsplit('_',1)[-1]:m for m in bpy.data.materials if m.name.startswith('RainlineIdentity_')}
if len(materials)!=4:raise RuntimeError('198_EXPECT4_RETAINED_MATERIALS')
for m in materials.values():
 principled=m.node_tree.nodes.get('Principled BSDF')
 if principled.inputs['Emission Strength'].default_value!=0 and any(principled.inputs['Emission Color'].default_value[:3]):raise RuntimeError('198_UNDECLARED_SOURCE_EMISSION')
FONT=bpy.data.fonts.load(os.path.join(ROOT,'public/assets/fonts/barlowcondensed/BarlowCondensed-SemiBold.ttf'))
COLORS={'concrete':(.40,.43,.41),'chalk':(.66,.64,.54),'brick':(.36,.13,.065),'mortar':(.20,.21,.19),'blue':(.035,.16,.21),'steel':(.21,.27,.26),'dark':(.018,.035,.04),'glass':(.075,.17,.21),'warm':(.34,.23,.095),'rust':(.39,.12,.055),'ochre':(.62,.39,.08),'light':(.70,.69,.55)}
import random
current=[]
# Read only named own-source construction functions; never execute its exports,
# file writes, library loads, image generation or old production author script.
tree=ast.parse(open(os.path.join(ROOT,'assets/source/overhaul-city-v4/author.py'),encoding='utf8').read())
allowed={'paint','box','text','backing','window','vent','bolts','weather','frontage'}
for node in tree.body:
 if isinstance(node,ast.FunctionDef) and node.name in allowed:exec(compile(ast.Module(body=[node],type_ignores=[]),'<own-source-recipe198>','exec'),globals())
KEEP={'opaque_backing','cell_boundary_pier','roof_edge_coping','owned_base_course','inset_glass','opaque_reveal','deep_window_jamb','deep_sill_lintel','window_mullion','industrial_bearing','closed_shutter','loading_dock_jamb','shutter_lintel','stepped_station_pier','station_transom','cast_control_pier','cast_panel_course','domestic_sill','residential_spandrel','brick_pilaster'}
labels={'loading':{'machine':'WEST MACHINE','entry':'RELAY WORKS','warehouse':'WEST STORAGE','eastworks':'EAST MACHINE','freight':'EAST FREIGHT','corewest':'CORE FOUNDRY','coreeast':'CORE FREIGHT'},'transit':{'west':'WEST RELAY','east':'EAST SERVICE','rear':'REAR STATION'},'control':{'pump':'PUMP CONTROL','grid':'CIVIC GRID','power':'POWER CORE','city':'CITY GRID'},'residential':{'quay':'QUAY ROOMS','east':'EAST TENEMENT'}}
def key(points):return tuple(sorted(tuple(round(float(v),6) for v in p) for p in points))
def facekey(o,p):return key([o.matrix_world@o.data.vertices[v].co for v in p.vertices])
def signature(o):
 o.data.calc_loop_triangles();return {'polygons':len(o.data.polygons),'triangles':len(o.data.loop_triangles),'positions':hashlib.sha256(np.asarray([list(o.matrix_world@v.co) for v in o.data.vertices],dtype='<f8').tobytes()).hexdigest()}
# 24x128px tiles,8px replicated gutters,6 columns; atlas remains1024 square.
atlas=[np.zeros((1024,1024,4),dtype=np.float32) for _ in range(3)]
for image in atlas:image[:,:,3]=1
weather_pixels={}
for name,m in materials.items():
 image=next(n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
 pixels=np.empty(len(image.pixels),dtype=np.float32);image.pixels.foreach_get(pixels);weather_pixels[name]=(pixels.reshape(image.size[1],image.size[0],4),image.size[:])
def project(source):
 zbuffer=np.full((128,128),-np.inf);albedo=np.zeros((128,128,4),dtype=np.float32);normal=np.zeros_like(albedo);orm=np.zeros_like(albedo)
 for o in source.children:
  if o.type!='MESH':continue
  material=o.data.materials[0];surface=material.name.rsplit('_',1)[-1]
  if surface=='glazing':continue
  principled=material.node_tree.nodes.get('Principled BSDF');metal=float(principled.inputs['Metallic'].default_value);rough=float(principled.inputs['Roughness'].default_value)
  image,(w,h)=weather_pixels[surface];color=o.data.color_attributes.active_color;uv=o.data.uv_layers.active
  o.data.calc_loop_triangles()
  for tri in o.data.loop_triangles:
   loops=list(tri.loops);xyz=np.asarray([list(o.matrix_world@o.data.vertices[o.data.loops[l].vertex_index].co) for l in loops]);xy=(xyz[:,[0,2]]+.5)*128-.5
   lo=np.maximum(np.floor(xy.min(0)).astype(int),0);hi=np.minimum(np.ceil(xy.max(0)).astype(int),127)
   if np.any(hi<lo):continue
   denom=(xy[1,1]-xy[2,1])*(xy[0,0]-xy[2,0])+(xy[2,0]-xy[1,0])*(xy[0,1]-xy[2,1])
   if abs(denom)<1e-15:continue
   xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));a=((xy[1,1]-xy[2,1])*(xx-xy[2,0])+(xy[2,0]-xy[1,0])*(yy-xy[2,1]))/denom;b=((xy[2,1]-xy[0,1])*(xx-xy[2,0])+(xy[0,0]-xy[2,0])*(yy-xy[2,1]))/denom;c=1-a-b
   weights=np.stack((a,b,c),-1);depth=-(weights@xyz[:,1]);view=zbuffer[lo[1]:hi[1]+1,lo[0]:hi[0]+1];mask=(a>=0)&(b>=0)&(c>=0)&(depth>view)
   if not np.any(mask):continue
   coords=weights@np.asarray([tuple(uv.data[l].uv) for l in loops]);tx=np.floor((coords[:,:,0]%1)*w).astype(int)%w;ty=np.floor((coords[:,:,1]%1)*h).astype(int)%h
   colors=weights@np.asarray([tuple(color.data[l].color) for l in loops]);rgb=colors[:,:,:3]*image[ty,tx,:3]
   n=o.matrix_world.to_3x3().inverted().transposed()@tri.normal;n.normalize();tangent=np.asarray([n.x,n.z,-n.y])*.5+.5
   y=slice(lo[1],hi[1]+1);x=slice(lo[0],hi[0]+1);albedo[y,x,:3][mask]=rgb[mask];albedo[y,x,3][mask]=1;normal[y,x,:3][mask]=tangent;normal[y,x,3][mask]=1;orm[y,x,:3][mask]=[1,rough,metal];orm[y,x,3][mask]=1;view[mask]=depth[mask]
 if not np.all(np.isfinite(zbuffer)):raise RuntimeError('198_PROJECTED_BACKING_GAPS')
 return albedo,normal,orm
far_material=bpy.data.materials.new('FarFacade_198_projected_own_PBR');far_material.use_nodes=True;far_shader=far_material.node_tree.nodes.get('Principled BSDF');far_shader.inputs['Emission Strength'].default_value=0
for slot,name in enumerate(module_names):
 if time.monotonic()-started>130:raise RuntimeError('198_AUTHOR_WORK_BOUND')
 source=modules[name];family=name.split('_')[0];label=labels[family].get(name.split('_label_')[-1]) if '_label_' in name else None;frontage(family,'ground' if '_label_' in name or name.endswith('_ground') else 'upper',label);bpy.context.view_layer.update()
 retained=set();backing_front=set()
 for o in current:
  stem=o.name.split('.')[0]
  if stem in KEEP:
   for p in o.data.polygons:
    k=facekey(o,p);retained.add(k)
    if stem=='opaque_backing' and p.normal.y<-.9:backing_front.add(k)
 for o in current:bpy.data.objects.remove(o,do_unlink=True)
 current=[]
 maps=project(source);col=slot%6;row=slot//6
 for target,values in zip(atlas,maps):target[row*144:row*144+144,col*144:col*144+144]=np.pad(values,((8,8),(8,8),(0,0)),mode='edge')
 root=bpy.data.objects.new(name,None);far_collection.objects.link(root);root['source_module']=name;root['ownership']='only intact far;near/damaged/ruin/clipped excluded';root['geometry']='exact retained original profile polygons +own projected front PBR'
 before=after=0;matching=0;matched_keys=set()
 for original in source.children:
  if original.type!='MESH':continue
  original.data.calc_loop_triangles();before+=len(original.data.loop_triangles);polys=[p for p in original.data.polygons if facekey(original,p) in retained]
  if not polys:continue
  indices=sorted({v for p in polys for v in p.vertices});remap={v:i for i,v in enumerate(indices)};mesh=bpy.data.meshes.new(name+'__retainedProfile');mesh.from_pydata([original.data.vertices[v].co for v in indices],[],[[remap[v] for v in p.vertices] for p in polys]);mesh.materials.append(original.data.materials[0]);mesh.materials.append(far_material);uv=mesh.uv_layers.new(name='UVMap');colors=mesh.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER');old_uv=original.data.uv_layers.active;old_color=original.data.color_attributes.active_color
  obj=bpy.data.objects.new(original.name.replace(name,name+'_far'),mesh);far_collection.objects.link(obj);obj.parent=root;obj.matrix_local=original.matrix_local.copy()
  for new,old in zip(mesh.polygons,polys):
   matched_keys.add(facekey(original,old))
   front=facekey(original,old) in backing_front;new.material_index=1 if front else 0
   for nl,ol in zip(new.loop_indices,old.loop_indices):
    colors.data[nl].color=(1,1,1,1) if front else old_color.data[ol].color
    if front:
     p=original.matrix_world@original.data.vertices[original.data.loops[ol].vertex_index].co;uv.data[nl].uv=((col*144+8+(p.x+.5)*127+.5)/1024,(row*144+8+(p.z+.5)*127+.5)/1024)
    else:uv.data[nl].uv=old_uv.data[ol].uv
   matching+=1
  mesh.calc_loop_triangles();after+=len(mesh.loop_triangles)
 if not backing_front or after==0 or after>=before or retained-matched_keys:raise RuntimeError('198_NO_REAL_COARSE_REPRESENTATION_OR_PROFILE_MISSING:'+name)
 records.append({'module':name,'sourceTriangles':before,'farTriangles':after,'retainedOriginalPolygons':matching,'sourceBackingFrontPolygons':len(backing_front),'tile':slot,'openingPolicy':'original opaque backing and actual glazing/reveal/profile polygons retained;no synthetic entrance','emission':0})
# Retained roof/deck/wall modules are copied exactly, never atlas-authored.
architecture=[]
for name,source in modules.items():
 if name in module_names:continue
 root=source.copy();root.name=name;far_collection.objects.link(root)
 for original in source.children:
  obj=original.copy();obj.data=original.data.copy();far_collection.objects.link(obj);obj.parent=root;obj.matrix_local=original.matrix_local.copy();architecture.append({'module':name,'before':signature(original),'after':signature(obj)})
for kind,pixels in zip(['albedo','normal','orm'],atlas):
 image=bpy.data.images.new('Far198_'+kind,width=1024,height=1024,alpha=True);image.colorspace_settings.name='sRGB' if kind=='albedo' else 'Non-Color';image.pixels.foreach_set(pixels.ravel());image.filepath_raw=os.path.join(OUT,kind+'198.png');image.file_format='PNG';image.save();image.pack();node=far_material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
 if kind=='albedo':far_material.node_tree.links.new(node.outputs['Color'],far_shader.inputs['Base Color'])
 elif kind=='normal':normal_node=far_material.node_tree.nodes.new('ShaderNodeNormalMap');far_material.node_tree.links.new(node.outputs['Color'],normal_node.inputs['Color']);far_material.node_tree.links.new(normal_node.outputs['Normal'],far_shader.inputs['Normal'])
 else:separate=far_material.node_tree.nodes.new('ShaderNodeSeparateColor');separate.mode='RGB';far_material.node_tree.links.new(node.outputs['Color'],separate.inputs['Color']);far_material.node_tree.links.new(separate.outputs['Green'],far_shader.inputs['Roughness']);far_material.node_tree.links.new(separate.outputs['Blue'],far_shader.inputs['Metallic'])
source_collection.hide_render=True;bpy.context.view_layer.update()
# Export only the new authored far collection; original editable source retained.
bpy.ops.object.select_all(action='DESELECT')
for o in far_collection.objects:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Rainline_Far198.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'Rainline_Far198.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
# Sparse ordinary far/oblique source-only pixel witnesses. This repeated kit
# assembly is explicitly hypothetical, not an actual saved game camera scene.
far_collection.hide_render=True;source_collection.hide_render=True
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.2,.24,.28,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.7
bpy.ops.object.light_add(type='SUN',location=(0,-40,50));bpy.context.object.rotation_euler=(.6,-.4,-.25);bpy.context.object.data.energy=2
bpy.ops.object.camera_add(location=(0,-90,14));camera=bpy.context.object;camera.data.angle=math.radians(62);scene.camera=camera
preview_collection=bpy.data.collections.new('PREVIEW_198_hypothetical_15m_facade');scene.collection.children.link(preview_collection)
far_roots={o.name:o for o in far_collection.objects if o.type=='EMPTY'};previews=[]
for owner,kit_roots in [('source',modules),('far',far_roots)]:
 for col,family in enumerate(['loading','transit','control','residential']):
  for row in range(4):
   module=kit_roots[family+('_ground' if row==0 else '_upper')];placement=Matrix.Translation(Vector(((col-1.5)*3.8,0,(row+.5)*3.2)))@Matrix.Diagonal(Vector((3.8,.4,3.2,1)))
   for original in module.children:
    o=original.copy();o.data=original.data;preview_collection.objects.link(o);o.parent=None;o.matrix_world=placement@original.matrix_world
  roof=kit_roots[family+'_deck'] if family+'_deck' in kit_roots else kit_roots[family+'_wall']
  for original in roof.children:
   o=original.copy();o.data=original.data;preview_collection.objects.link(o);o.parent=None;o.matrix_world=Matrix.Translation(Vector(((col-1.5)*3.8,1.8,13.1)))@Matrix.Diagonal(Vector((3.8,4,.6,1)))@original.matrix_world
 for label,position in [('front',(0,-90,14)),('oblique-roof',(35,-90,30))]:
  camera.location=position;camera.rotation_euler=(Vector((0,0,7))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,'preview-'+owner+'-'+label+'.png');bpy.ops.render.render(write_still=True);previews.append({'owner':owner,'view':label,'file':os.path.basename(scene.render.filepath),'camera':position,'fov':62,'resolution':[1280,800],'scope':'Hypothetical repeated actual-source facade/roof geometry at ordinary far distance;not saved game scene'})
 for o in list(preview_collection.objects):bpy.data.objects.remove(o,do_unlink=True)
report={'writer':'CLOSED','scope':'Locally authored own source PBR projection/coarse facade;unadmitted','sourceMasterSHA256':source_hash,'modules':records,'architecture':architecture,'textures':{'newCount':3,'resolution':[1024,1024],'format':'PNG_RGBA8;normal/ORM NonColor;albedo sRGB','estimatedRGBA8MipBytes':3*1024*1024*4*4/3,'retainedWeatherMaps':4,'retainedWeatherMipBytes':4*256*256*4*4/3,'emission':'Actual retained source factor/texture absent;zero retained'},'elapsed':time.monotonic()-started,'externalAssets':False,'nativeChanges':False}
report['previews']=previews
with open(os.path.join(OUT,'author-receipt198.json'),'w') as f:json.dump(report,f,indent=2)
print(json.dumps({'status':'AUTHOR_EXPORTED_UNADMITTED','modules':len(records),'triangles':sum(r['farTriangles'] for r in records),'elapsed':report['elapsed']}))

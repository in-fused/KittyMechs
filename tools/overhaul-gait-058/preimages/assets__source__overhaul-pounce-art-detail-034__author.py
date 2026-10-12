"""Original local PBR authoring; immutable019 geometry/animation binary retained."""
from pathlib import Path
import bpy, numpy as np, json, struct, hashlib, datetime, traceback, copy
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
OLD=ROOT/'public/assets/models/Pounce_ArtBridge019.glb'
MASTER=ROOT/'assets/source/overhaul-pounce-art-bridge-019/Pounce_ArtBridge019.blend'
START=datetime.datetime.now(datetime.timezone.utc).isoformat();error=None;ledger=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value):(HERE/name).write_text(json.dumps(value,indent=2),encoding='utf8')
def fingerprint():
 h=hashlib.sha256()
 for o in sorted(bpy.data.objects,key=lambda o:o.name):
  if o.type=='ARMATURE':
   for b in o.data.bones:h.update(repr((b.name,b.parent.name if b.parent else None,[list(x) for x in b.matrix_local],b.length)).encode())
  if o.type=='MESH':
   h.update(o.name.encode());h.update(repr([list(x) for x in o.matrix_basis]).encode())
   for v in o.data.vertices:h.update(repr((list(v.co),[(g.group,g.weight) for g in v.groups])).encode())
   for p in o.data.polygons:h.update(repr(list(p.vertices)).encode())
   for uv in o.data.uv_layers:
    for x in uv.data:h.update(repr(list(x.uv)).encode())
 return h.hexdigest()
def write_image(name,rgb):
 rgba=np.ones((512,512,4),dtype=np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
 im=bpy.data.images.new(name,width=512,height=512,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(HERE/(name+'.png'));im.file_format='PNG';im.save();return im
def linear_srgb(x):return np.where(x<=.0031308,x*12.92,1.055*np.maximum(x,0)**(1/2.4)-.055)
try:
 ledger=json.loads((ROOT/'tools/overhaul-pounce-art-detail-034/author-seal.json').read_text())['protected']
 for row in ledger:
  if sha(ROOT/row['path'])!=row['sha256']:raise RuntimeError('PROTECTED_CHANGED:'+row['path'])
 bpy.ops.wm.open_mainfile(filepath=str(MASTER));before=fingerprint()
 n=512;y,x=np.mgrid[0:n,0:n]/n;u=(x*8)%1;v=(y*8)%1
 # Recessed service-panel edges, recessed screws, louver slots and fine grain.
 edge=np.minimum.reduce([u,1-u,v,1-v]);seam=np.clip((.018-edge)/.012,0,1)
 radius=np.sqrt(((u-.12)/.047)**2+((v-.12)/.047)**2);bolt=np.clip(1-np.abs(radius-1)*4,0,1)
 slot=(np.abs(u-.12)<.032)&(np.abs(v-.12)<.007)
 louver=((u>.36)&(u<.84)&(v>.2)&(v<.48)&(((v*45)%1)<.22)).astype(float)
 rng=np.random.default_rng(34019);grain=rng.uniform(-.035,.035,(n,n))
 scratches=((rng.random((n,n))>.998)&(u>.07)&(u<.93)).astype(float)
 abrasion=np.clip((.055-edge)/.05,0,1)*(.55+.45*np.sin(x*951+y*733)**2)
 height=-seam*.032+bolt*.012-louver*.018-slot*.015+grain*.005
 dy,dx=np.gradient(height);normal=np.stack([-dx*95,-dy*95,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
 maps={'Pounce034_Normal':write_image('Pounce034_Normal',normal*.5+.5)}
 rough=np.clip(.87+grain*.9+seam*.1+abrasion*.08,.65,1)
 maps['Pounce034_MetalRough']=write_image('Pounce034_MetalRough',np.stack([np.ones_like(x),rough,np.ones_like(x)],axis=2))
 palettes=[('Gunmetal',[.055,.078,.092]),('DeepTealCeramic',[.085,.24,.225]),('Graphite',[.02,.025,.029])]
 for key,color in palettes:
  base=linear_srgb(np.array(color))[None,None,:]*np.ones((n,n,3))
  light=(1-seam*.65-louver*.75-slot*.8+grain+bolt*.2)[:,:,None]
  rgb=base*light;bare=linear_srgb(np.array([.18,.23,.25]))
  rgb=rgb*(1-abrasion[:,:,None]*.35)+bare*abrasion[:,:,None]*.35
  rgb+=scratches[:,:,None]*.10
  if key=='DeepTealCeramic':
   caution=((v>.69)&(v<.76)&(u>.18)&(u<.83));stripe=((u+v)*22%1)>.5
   rgb[caution&stripe]=[.73,.49,.12];rgb[caution&~stripe]=[.055,.07,.075]
   # A small pale identification stripe, distinct from the warning band.
   rgb[(u>.78)&(u<.82)&(v>.53)&(v<.63)]=[.64,.74,.73]
  if key=='Graphite':rgb*=1-(((u*45)%1)<.22)[:,:,None]*.3
  maps['Pounce034_'+key]=write_image('Pounce034_'+key,rgb)
 for key,color in palettes:
  material=bpy.data.materials['FelinePBR_Identity003_'+key];nodes=material.node_tree.nodes;links=material.node_tree.links;p=nodes.get('Principled BSDF')
  image=maps['Pounce034_'+key];image.colorspace_settings.name='sRGB';t=nodes.new('ShaderNodeTexImage');t.image=image;links.new(t.outputs['Color'],p.inputs['Base Color'])
  mr=nodes.new('ShaderNodeTexImage');mr.image=maps['Pounce034_MetalRough'];separate=nodes.new('ShaderNodeSeparateColor');links.new(mr.outputs['Color'],separate.inputs['Color'])
  multiply=nodes.new('ShaderNodeMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=p.inputs['Roughness'].default_value;links.new(separate.outputs['Green'],multiply.inputs[0]);links.new(multiply.outputs[0],p.inputs['Roughness'])
  nt=nodes.new('ShaderNodeTexImage');nt.image=maps['Pounce034_Normal'];nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.32;links.new(nt.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
 for image in maps.values():image.pack()
 after=fingerprint()
 if before!=after:raise RuntimeError('GEOMETRY_REST_UV_WEIGHTS_CHANGED')
 bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'Pounce_ArtDetail034.blend'))
 # Patch only PBR resources. Retain original binary prefix, accessors, mesh,
 # skin, nodes, rest and animation channels without re-export or conversion.
 old=OLD.read_bytes();jlen=struct.unpack_from('<I',old,12)[0];doc=json.loads(old[20:20+jlen]);offset=20+jlen;blen=struct.unpack_from('<I',old,offset)[0];binary=old[offset+8:offset+8+blen];source=copy.deepcopy(doc)
 chunks=[binary];doc['images']=[];doc['textures']=[];doc['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
 for name in maps:
  data=(HERE/(name+'.png')).read_bytes();pad=(-sum(map(len,chunks)))%4;chunks.append(b'\0'*pad);view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':sum(map(len,chunks)),'byteLength':len(data)});chunks.append(data)
  image=len(doc['images']);doc['images'].append({'name':name,'bufferView':view,'mimeType':'image/png'});doc['textures'].append({'source':image,'sampler':0})
 indices={name:i for i,name in enumerate(maps)}
 for m in doc['materials']:
  key=m['name'].replace('FelinePBR_Identity003_','')
  if key not in [k for k,_ in palettes]:continue
  p=m['pbrMetallicRoughness'];p['baseColorFactor']=[1,1,1,1];p['baseColorTexture']={'index':indices['Pounce034_'+key]};p['metallicRoughnessTexture']={'index':indices['Pounce034_MetalRough']};m['normalTexture']={'index':indices['Pounce034_Normal'],'scale':.32}
 finalbin=b''.join(chunks);doc['buffers'][0]['byteLength']=len(finalbin)
 jd=json.dumps(doc,separators=(',',':')).encode();jd+=b' '*((-len(jd))%4);finalbin+=b'\0'*((-len(finalbin))%4)
 out=struct.pack('<III',0x46546c67,2,28+len(jd)+len(finalbin))+struct.pack('<II',len(jd),0x4e4f534a)+jd+struct.pack('<II',len(finalbin),0x004e4942)+finalbin
 if finalbin[:len(binary)]!=binary:raise RuntimeError('ORIGINAL_BINARY_CHANGED')
 for field in ('meshes','accessors','nodes','skins','animations','scenes','scene'):
  if doc.get(field)!=source.get(field):raise RuntimeError('ORIGINAL_CHANNEL_OR_GEOMETRY_CHANGED:'+field)
 (HERE/'Pounce_ArtDetail034.glb').write_bytes(out)
 manifest=json.loads((ROOT/'src/game/entities/identity57Runtime019Manifest.json').read_text());manifest.update(schema='identity57-runtime034-original019-geometry-material-detail',source=str((HERE/'Pounce_ArtDetail034.glb').relative_to(ROOT)).replace('\\','/'),publicURL='/assets/models/Pounce_ArtDetail034.glb',sha256=sha(HERE/'Pounce_ArtDetail034.glb'),bytes=len(out))
 save('identity57Runtime034Manifest.json',manifest)
 save('material-provenance.json',{'license':'Original project-authored procedural textures; no external source or paid generation','seed':34019,'textureSize':[512,512],'textures':[{'name':name,'sha256':sha(HERE/(name+'.png'))} for name in maps],'geometryRestUVWeightsFingerprint':before,'originalBinarySHA256':hashlib.sha256(binary).hexdigest(),'preservedFields':['meshes','accessors','nodes','skins','animations','scenes','scene'],'actualClips':len(doc.get('animations',[])),'scope':'PBR appearance only; no motion/contact/native/art approval'})
except Exception as exc:error={'message':str(exc),'traceback':traceback.format_exc()}
finally:
 save('author-receipt.json',{'startUTC':START,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FAILED_STOP' if error else 'MATERIAL_ONLY_GEOMETRY_CHANNELS_RETAINED','error':error,'protectedAfter':[{'path':x['path'],'match':sha(ROOT/x['path'])==x['sha256']} for x in ledger]})
if error:raise RuntimeError(error['message'])

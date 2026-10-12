"""Attach three shared external maps without rewriting a GLB's geometry/rig bytes.

Use on texture-free Blender output, or optimized GLB with embedded images.
Embedded image ranges are removed, then ordinary graphics byte offsets and
EXT_meshopt_compression byte offsets are explicitly rebased without changing
their payload bytes. External-only inputs only change the JSON texture contract.
"""
from pathlib import Path
import json, struct, shutil, sys
ROOT=Path(__file__).resolve().parents[1]
path=Path(sys.argv[1]);uri_prefix=sys.argv[2] if len(sys.argv)>2 else 'textures/'
data=path.read_bytes();magic,version,total=struct.unpack_from('<III',data);assert magic==0x46546c67 and version==2 and total==len(data)
json_size,json_type=struct.unpack_from('<II',data,12);assert json_type==0x4e4f534a
document=json.loads(data[20:20+json_size]);tail=data[20+json_size:]
image_views={image['bufferView'] for image in document.get('images',[]) if 'bufferView' in image}
if image_views:
    # Retain actual graphics/compressed spans; virtual Meshopt decode buffers
    # remain unchanged. Rebase both ordinary and EXT_meshopt offsets exactly.
    bin_size,bin_type=struct.unpack_from('<II',tail);assert bin_type==0x004e4942
    payload=tail[8:8+bin_size];kept=[v for i,v in enumerate(document['bufferViews']) if i not in image_views]
    spans=[]
    for v in kept:
        if v.get('buffer',0)==0:spans.append((v.get('byteOffset',0),v.get('byteOffset',0)+v['byteLength']))
        e=v.get('extensions',{}).get('EXT_meshopt_compression')
        if e and e['buffer']==0:spans.append((e.get('byteOffset',0),e.get('byteOffset',0)+e['byteLength']))
    merged=[]
    for start,end in sorted(spans):
        if merged and start<=merged[-1][1]:merged[-1][1]=max(merged[-1][1],end)
        else:merged.append([start,end])
    rebased=[];new_payload=bytearray()
    for start,end in merged:
        new_payload+=b'\0'*((-len(new_payload))%4);rebased.append((start,end,len(new_payload)));new_payload+=payload[start:end]
    def offset(old):
        return next(new+old-start for start,end,new in rebased if start<=old<end)
    for v in kept:
        if v.get('buffer',0)==0:v['byteOffset']=offset(v.get('byteOffset',0))
        e=v.get('extensions',{}).get('EXT_meshopt_compression')
        if e and e['buffer']==0:e['byteOffset']=offset(e.get('byteOffset',0))
    mapping={old:new for new,old in enumerate(i for i in range(len(document['bufferViews'])) if i not in image_views)}
    def remap(value):
        if isinstance(value,dict):
            for key,item in value.items():
                if key=='bufferView':value[key]=mapping[item]
                elif key!='images':remap(item)
        elif isinstance(value,list):
            for item in value:remap(item)
    document['bufferViews']=kept;remap(document);document['buffers'][0]['byteLength']=len(new_payload)
    new_payload+=b'\0'*((-len(new_payload))%4);tail=struct.pack('<II',len(new_payload),bin_type)+new_payload
document['images']=[{'name':f'Original feline {kind} v1','uri':uri_prefix+f'feline-{kind}-v1.webp','mimeType':'image/webp'} for kind in ['albedo','normal','orm']]
document['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}]
document['textures']=[{'sampler':0,'extensions':{'EXT_texture_webp':{'source':i}}} for i in range(3)]
for key in ['extensionsUsed','extensionsRequired']:
    document[key]=sorted(set(document.get(key,[])+['EXT_texture_webp']))
for m in document['materials']:
    assert m['name'].startswith('FelinePBR_')
    pbr=m.setdefault('pbrMetallicRoughness',{});pbr['baseColorTexture']={'index':0,'texCoord':0};pbr['metallicRoughnessTexture']={'index':2,'texCoord':0}
    pbr['metallicFactor']=1;pbr['roughnessFactor']=1
    if m['name']=='FelinePBR_Paint':pbr['baseColorFactor']=[.29,.38,.42,1]
    if m['name'] not in ['FelinePBR_Glass','FelinePBR_Glow']:m['normalTexture']={'index':1,'texCoord':0,'scale':1}
    m['occlusionTexture']={'index':2,'texCoord':0,'strength':1}
    m.setdefault('extras',{})['felineMaterialProfile']='feline-pbr-v1'
encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
out=struct.pack('<III',magic,version,12+8+len(encoded)+len(tail))+struct.pack('<II',len(encoded),json_type)+encoded+tail
path.write_bytes(out)
# Copies are byte-identical and shared by every derivative; source PNGs remain.
for kind in ['albedo','normal','orm']:
    name=f'feline-{kind}-v1.webp';source=ROOT/'public/assets/textures'/name
    for folder in [ROOT/'assets/source/bastion-art-v2/textures']:
        folder.mkdir(parents=True,exist_ok=True);shutil.copy2(source,folder/name)
print('ATLAS_CONTRACT',path,len(out),'external maps',uri_prefix)

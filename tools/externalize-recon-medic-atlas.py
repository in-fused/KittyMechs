"""Strip byte-verified embedded shared WebPs; preserve material and graphics bytes."""
from pathlib import Path
import copy, hashlib, json, struct, sys
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]).resolve();destination=Path(sys.argv[2]).resolve()
private=(root/'.sites-runtime').resolve()
assert source.is_relative_to(private) and destination.is_relative_to(private)
assert source.parent==destination.parent and source!=destination
receipt_path=Path(str(destination)+'.externalization.json')
assert not destination.exists() and not receipt_path.exists()
sha=lambda b:hashlib.sha256(b).hexdigest()
data=source.read_bytes();magic,version,total,size,kind=struct.unpack_from('<IIIII',data)
assert magic==0x46546c67 and version==2 and total==len(data) and kind==0x4e4f534a
document=json.loads(data[20:20+size]);old=copy.deepcopy(document)
bin_size,bin_type=struct.unpack_from('<II',data,20+size)
assert bin_type==0x004e4942 and 28+size+bin_size==len(data)
payload=data[28+size:];views=document['bufferViews']
atlas={};atlas_rows=[]
for role in ['albedo','normal','orm']:
    name=f'feline-{role}-v1.webp';public=(root/'public/assets/textures'/name).read_bytes()
    local=(source.parent/'textures'/name).read_bytes();assert local==public
    atlas[sha(public)]=name;atlas_rows.append({'role':role,'name':name,'bytes':len(public),'sha256':sha(public)})
assert len(document['images'])==3
image_views=set();image_rows=[]
for index,image in enumerate(document['images']):
    assert image['mimeType']=='image/webp' and 'bufferView' in image and 'uri' not in image
    view_index=image['bufferView'];view=views[view_index];assert view.get('buffer',0)==0 and not view.get('extensions')
    start=view.get('byteOffset',0);content=payload[start:start+view['byteLength']]
    name=atlas[sha(content)];image_rows.append({'index':index,'name':name,'embeddedSha256':sha(content),'embeddedBytes':len(content)})
    image_views.add(view_index);image.pop('bufferView');image['uri']='textures/'+name
assert len(image_views)==3 and {r['name'] for r in image_rows}==set(atlas.values())
kept=[v for i,v in enumerate(views) if i not in image_views];spans=[]
for v in kept:
    if v.get('buffer',0)==0:spans.append((v.get('byteOffset',0),v.get('byteOffset',0)+v['byteLength']))
    e=v.get('extensions',{}).get('EXT_meshopt_compression')
    if e and e['buffer']==0:spans.append((e.get('byteOffset',0),e.get('byteOffset',0)+e['byteLength']))
merged=[]
for start,end in sorted(spans):
    assert 0<=start<=end<=len(payload)
    if merged and start<=merged[-1][1]:merged[-1][1]=max(merged[-1][1],end)
    else:merged.append([start,end])
rebased=[];new_payload=bytearray()
for start,end in merged:
    new_payload+=b'\0'*((-len(new_payload))%4);rebased.append((start,end,len(new_payload)));new_payload+=payload[start:end]
def offset(value):return next(new+value-start for start,end,new in rebased if start<=value<end)
graphics=[]
for old_index,v in enumerate(views):
    if old_index in image_views:continue
    for label,target in [('ordinary',v),('meshopt',v.get('extensions',{}).get('EXT_meshopt_compression'))]:
        if not target or target.get('buffer',0)!=0:continue
        start=target.get('byteOffset',0);length=target['byteLength'];new=offset(start)
        assert payload[start:start+length]==bytes(new_payload[new:new+length]),'Graphics payload changed'
        graphics.append({'oldView':old_index,'kind':label,'bytes':length,'sha256':sha(payload[start:start+length])})
        target['byteOffset']=new
mapping={old_index:new_index for new_index,old_index in enumerate(i for i in range(len(views)) if i not in image_views)}
def remap(value):
    if isinstance(value,dict):
        for key,item in value.items():
            if key=='bufferView':value[key]=mapping[item]
            else:remap(item)
    elif isinstance(value,list):
        for item in value:remap(item)
document['bufferViews']=kept;remap(document);document['buffers'][0]['byteLength']=len(new_payload)
assert document['materials']==old['materials'] and document['textures']==old['textures'] and document.get('samplers')==old.get('samplers')
assert document['nodes']==old['nodes'] and document['skins']==old['skins'] and document['animations']==old['animations']
assert 'EXT_texture_webp' in document['extensionsRequired']
new_payload+=b'\0'*((-len(new_payload))%4)
encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
result=struct.pack('<IIIII',magic,version,28+len(encoded)+len(new_payload),len(encoded),kind)+encoded+struct.pack('<II',len(new_payload),bin_type)+new_payload
destination.write_bytes(result)
receipt={'passed':True,'source':str(source),'destination':str(destination),'sourceSha256':sha(data),'sha256':sha(result),'sourceBytes':len(data),'bytes':len(result),'images':image_rows,'atlas':atlas_rows,'remainingPayloads':graphics,'materialsSamplersTexturesNodesSkinsAnimationsUnchanged':True,'method':'Exact embedded3WebP byte comparison with frozen public/local originals; remove only image bufferViews and unreferenced image ranges, rebase ordinary and EXT_meshopt byte offsets plus accessor bufferView references, compare every retained graphics/compression span byte-exact. No repaint or tint rewrite. Decoded bind/channel/sole proof follows separately.'}
receipt_path.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['passed','destination','sha256','sourceBytes','bytes']}))

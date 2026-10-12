from pathlib import Path
import hashlib,json,struct
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/inbox/factory-sign.png'
target=ROOT/'assets/source/environment-factory/derived/factory-sign.jpg'
target.parent.mkdir(parents=True,exist_ok=True)
image=Image.open(source).convert('RGB');size=image.size
image.thumbnail((512,512),Image.Resampling.LANCZOS);image.save(target,quality=92)
receipt={'provider':'Higgsfield','job_id':'6b150405-fd6a-4d4b-aa2d-a6c5d0390813',
 'requestedModel':'gpt_image_2_5','quality':'high','resolution':'2k','aspectRatio':'16:9','quotedCredits':2.75,
 'sourceUrl':'https://d8j0ntlcm91z4.cloudfront.net/user_3JqYmlg1yVwKHUeMJ7U0OUHJr9P/hf_20261004_040311_6b150405-fd6a-4d4b-aa2d-a6c5d0390813.png',
 'source':'assets/inbox/factory-sign.png','sourceDimensions':size,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'normalizedSource':'assets/source/environment-factory/derived/factory-sign.jpg','normalizedDimensions':image.size,
 'normalizedBytes':target.stat().st_size,'normalizedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
 'submittedParameters':{'quality':'high','resolution':'2k','aspect_ratio':'16:9','count':1},
 'purpose':'Original weathered feline-emblem industrial workshop sign; release acceptance recorded in independent critical review',
 'prompt':"Flat orthographic production video game texture for a weathered industrial workshop sign in an original feline mech world. The entire rectangular image is one aged ivory enamel faceplate with desaturated deep petrol green stenciled markings, bolt holes in the corners, fine scratches, restrained rust stains and realistic worn painted steel. Left third: a strong simple angular feline-head industrial emblem with two pointed ears, no existing franchise logo. Right two thirds: crisp readable large text exactly 'RAINLINE WORKS' above a smaller utilitarian serial line 'R-41'. A restrained ochre-and-charcoal hazard stripe on the bottom edge. Straight front view, no perspective, no surrounding scene, no lighting glow, no vignette, even neutral surface illumination suitable as an albedo map; weathering must not obscure typography. Original grounded industrial science-fiction art."}
runtime=ROOT/'public/assets/models/Factory_Workshop.glb'
if runtime.exists():
 data=runtime.read_bytes();json_length,kind=struct.unpack_from('<II',data,12)
 if kind!=0x4e4f534a:raise ValueError('Invalid GLB JSON chunk')
 document=json.loads(data[20:20+json_length]);binary_offset=20+json_length+8
 material=next(m for m in document['materials'] if m['name']=='Factory_Original_RainlineWorks_Sign_Paint')
 texture=document['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]
 image=document['images'][texture['source']];view=document['bufferViews'][image['bufferView']]
 offset=binary_offset+view.get('byteOffset',0);embedded=data[offset:offset+view['byteLength']]
 receipt.update({'runtime':runtime.relative_to(ROOT).as_posix(),'runtimeSha256':hashlib.sha256(data).hexdigest(),
                 'embeddedBytes':len(embedded),'embeddedSha256':hashlib.sha256(embedded).hexdigest()})
(ROOT/'assets/reference/higgsfield-factory-sign.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8')
print(json.dumps({key:receipt[key] for key in ['job_id','normalizedDimensions','normalizedBytes','normalizedSha256']}) ,flush=True)

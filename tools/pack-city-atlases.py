"""Private, exact-source city basecolor UV atlases. No generation or admission.

python tools/pack-city-atlases.py --output .sites-runtime/city-expansion/admission-drafts/atlas-pack-001
Requires the repository's existing glTF Transform/Meshoptimizer and Pillow.
Fresh output only; source GLBs, owner rasters and all public files stay read-only.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, features
import PIL

EXTRACT = r'''
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const [source,out]=process.argv.slice(1);await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(source),rows=[];
for(const [role,name] of [['works','Factory_Original_RainlineWorks_Sign_Paint'],['glass','modular_factory_facade_windows_glass']]){
 const material=doc.getRoot().listMaterials().find(m=>m.getName()===name);
 if(!material)throw Error('Exact original material missing: '+name);
 const texture=material.getBaseColorTexture(),bytes=texture?.getImage();
 if(!bytes){rows.push({role,material:name,hasBaseColorImage:false,baseColorFactor:material.getBaseColorFactor()});continue;}
 const mime=texture.getMimeType(),extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime];
 if(!extension)throw Error('Unsupported original raster MIME: '+mime);
 const file='Factory_Original_'+role+'.'+extension;await writeFile(join(out,file),bytes);
 const info=material.getBaseColorTextureInfo();
 rows.push({role,material:name,hasBaseColorImage:true,file,mimeType:mime,bytes:bytes.byteLength,
   sha256:createHash('sha256').update(bytes).digest('hex'),textureName:texture.getName(),
   baseColorFactor:material.getBaseColorFactor(),alphaMode:material.getAlphaMode(),
   texCoord:info.getTexCoord(),wrapS:info.getWrapS(),wrapT:info.getWrapT(),
   textureExtensions:info.listExtensions().map(e=>e.extensionName)});
}
await writeFile(join(out,'extraction.json'),JSON.stringify({source,method:'NodeIO original material baseColorTexture image bytes, no re-encoding',materials:rows},null,2));
'''

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def file_row(path, root):
    return {'file':path.relative_to(root).as_posix(),'bytes':path.stat().st_size,'sha256':sha(path)}

def main():
    root=Path(__file__).resolve().parents[1]
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    out=(root/args.output).resolve()
    admitted_root=(root/'.sites-runtime/city-expansion/admission-drafts').resolve()
    assert out.is_relative_to(admitted_root) and out!=admitted_root
    assert not out.exists(), 'Never overwrite a prior atlas candidate'
    sources_root=root/'assets/source/city-materials-v1'
    manifest_path=sources_root/'selected-private-candidates.json'
    owner=json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    source_by_name={s['name']:s for s in owner['sources']}
    factory=root/'public/assets/models/Factory_Workshop.glb'
    sign_provenance=root/'assets/reference/higgsfield-factory-sign.json'
    factory_provenance=root/'assets/reference/factory-provenance.json'
    protected={p:sha(p) for p in [manifest_path,factory,sign_provenance,factory_provenance]}
    out.mkdir(parents=True);extracted=out/'extracted';extracted.mkdir()
    subprocess.run(['node','--input-type=module','-e',EXTRACT,str(factory),str(extracted)],cwd=root,check=True)
    originals=json.loads((extracted/'extraction.json').read_text())
    sign_meta=json.loads(sign_provenance.read_text())
    factory_meta=json.loads(factory_provenance.read_text())
    original_by_role={r['role']:r for r in originals['materials']}

    def selected(name,crop=None):
        record=source_by_name[name]
        path=sources_root/record['draft']['file'].replace('\\','/')
        assert sha(path)==record['draft']['sha256'], 'Owner handoff image changed: '+name
        protected[path]=sha(path)
        with Image.open(path) as src:
            assert list(src.size)==record['draft']['dimensions']
            source_size=list(src.size);image=src.convert('RGBA')
        if crop:image=image.crop(tuple(crop))
        return image,{'name':name,'path':str(path),'jobId':record['jobId'],
                      'sourceSha256':sha(path),'sourceDimensions':source_size,
                      'cropPixelsTopLeft':crop,'ownerRaw':record['raw'],
                      'provider':owner['provider'],'rights':owner['licenseClaim']}

    def original(role):
        record=original_by_role[role]
        assert record['hasBaseColorImage']
        path=extracted/record['file'];assert sha(path)==record['sha256']
        with Image.open(path) as src:image=src.convert('RGBA');dimensions=list(src.size)
        return image,{'name':'Factory_Original_'+role,'path':str(path),
                      'sourceGlb':str(factory),'sourceGlbSha256':protected[factory],
                      'material':record['material'],'sourceSha256':record['sha256'],
                      'sourceDimensions':dimensions,'cropPixelsTopLeft':None,
                      'jobId':sign_meta['job_id'] if role=='works' else None,
                      'rights':sign_meta['provider']+' original generated project sign' if role=='works' else factory_meta['license']['architectureAndMatchedMaps'],
                      'retainedMaterial':record}

    signs=[original('works')]+[selected('City_Sign_'+kind) for kind in ['Civic','Dock','Medical','Transport']]
    glass_found=original_by_role['glass']['hasBaseColorImage']
    # Deliberate city-art replacement: the retained factory glass is a whole
    # multi-window/header sheet, unsuitable as one closed-window slot.
    windows=[selected('City_Window_Service')]
    crops=[[0,0,512,512],[512,0,1024,512],[0,512,512,1024],[512,512,1024,1024]]
    for index,crop in enumerate(crops):
        image,meta=selected('Residential_Window_Atlas',crop)
        assert image.size==(512,512)
        image.save(extracted/f'Residential_Window_Island_{index}.png')
        meta['island']=index;meta['croppedOriginal']=file_row(extracted/f'Residential_Window_Island_{index}.png',root)
        windows.append((image,meta))

    def pack(name,inputs):
        atlas=Image.new('RGBA',(1024,512),(24,32,32,255))
        sheet=Image.new('RGB',(1280,300),(28,34,36));draw=ImageDraw.Draw(sheet);rows=[]
        for slot,(image,meta) in enumerate(inputs):
            x=(slot%4)*256;y=(slot//4)*256
            payload=image.resize((252,252),Image.Resampling.LANCZOS)
            tile=Image.new('RGBA',(256,256));tile.paste(payload,(2,2))
            tile.paste(payload.crop((0,0,1,252)).resize((2,252)),(0,2))
            tile.paste(payload.crop((251,0,252,252)).resize((2,252)),(254,2))
            tile.paste(payload.crop((0,0,252,1)).resize((252,2)),(2,0))
            tile.paste(payload.crop((0,251,252,252)).resize((252,2)),(2,254))
            for a,b,c,d in [(0,0,0,0),(254,0,251,0),(0,254,0,251),(254,254,251,251)]:
                tile.paste(Image.new('RGBA',(2,2),payload.getpixel((c,d))),(a,b))
            atlas.paste(tile,(x,y))
            for px,py in [(0,0),(1,1),(255,255),(254,0)]:
                assert tile.getpixel((px,py))==payload.getpixel((min(251,max(0,px-2)),min(251,max(0,py-2))))
            draw.text((slot*256+4,5),f'{slot}: {meta["name"]}',fill='white',font=ImageFont.load_default())
            if 'island' in meta:draw.text((slot*256+4,20),f'island {meta["island"]}: {meta["cropPixelsTopLeft"]}',fill='#adc1c1')
            sheet.paste(tile.convert('RGB'),(slot*256,40))
            rows.append({'slot':slot,'source':meta,'slotPixelsTopLeft':[x,y,256,256],
                         'payloadPixelsTopLeft':[x+2,y+2,252,252],
                         'slotUV':{'uMin':(x+2)/1024,'uMax':(x+254)/1024,'vMin':(y+2)/512,'vMax':(y+254)/512},
                         'slotUVThreeFlipYTrue':{'uMin':(x+2)/1024,'uMax':(x+254)/1024,'vMin':1-(y+254)/512,'vMax':1-(y+2)/512},
                         'normalizedPayloadSha256':hashlib.sha256(payload.tobytes()).hexdigest()})
        target=out/(name+'.webp');atlas.save(target,format='WEBP',lossless=True,method=6,exact=True)
        with Image.open(target) as saved:assert saved.size==(1024,512) and saved.convert('RGBA').tobytes()==atlas.tobytes()
        sheet.save(out/(name+'-contact-sheet.png'))
        return {'name':name,'dimensions':[1024,512],'columns':4,'rows':2,'slotPixels':256,'insetPixels':2,'payloadPixels':252,
                'slots':rows,'unusedSlots':[5,6,7],'unusedColorRGBA':[24,32,32,255],
                'runtime':file_row(target,root),'contactSheet':file_row(out/(name+'-contact-sheet.png'),root)}

    result={'schema':1,'status':'PRIVATE_PENDING_RUNTIME_APPROVAL','sourceManifest':file_row(manifest_path,root),
            'builder':file_row(Path(__file__).resolve(),root),'factory':file_row(factory,root),
            'normalization':{'Pillow':PIL.__version__,'libwebp':features.version('webp'),'resize':'RGBA252x252 LANCZOS, full normalized source UV content; rectangular originals intentionally normalized into a square slot','edge':'Exact2px nearest-edge extrusion on all four sides/corners','encoder':'WebP lossless/method6/exact RGBA, decode checked pixel-identical','colorSpace':'sRGB basecolor only; no new normal/roughness/metalness/AO maps'},
            'uvContract':{'slotOrder':'Top-left row-major, slots0..3 first row, slots4..7 second row',
                          'slotUV':'Top-left-origin image/glTF rectangle for Three texture.flipY=false',
                          'slotUVThreeFlipYTrue':'Bottom-left-origin rectangle for Three texture.flipY=true',
                          'localV0TopFlipYFalse':'U=uMin+localU*(uMax-uMin); V=vMin+localV*(vMax-vMin), using slotUV',
                          'localV0BottomFlipYFalse':'U=uMin+localU*(uMax-uMin); V=vMax-localV*(vMax-vMin), using slotUV. Required for current cityGeometry bottom-origin localV if texture.flipY=false',
                          'localV0BottomFlipYTrue':'U=uMin+localU*(uMax-uMin); V=vMin+localV*(vMax-vMin), using slotUVThreeFlipYTrue',
                          'recommendedSampler':'ClampToEdgeWrapping; remap every panel UV into one payload, never repeat across the whole atlas',
                          'limits':'2px gutter protects the base texture/first mip vicinity; distant mip/anisotropic bleeding and physical aspect/readability require runtime inspection'},
            'existingGlassFound':glass_found,'extractedOriginalGlassRetained':glass_found,
            'existingWindowFallback':False,'fallbackReason':None,
            'windowSlot0Decision':{'kind':'DELIBERATE_OWNER_ART_REPLACEMENT',
                                   'replacement':'City_Window_Service',
                                   'reason':'Original factory glass contains a concrete header and multiple windows; the city slot needs an actual closed-window design',
                                   'originalExtraction':original_by_role['glass']},
            'existingWindowSlotScope':'Slot0 uses the owner-admitted service-window design; the extracted original factory glass remains retained separately and is not missing-source fallback',
            'atlases':[pack('city-sign-atlas-v1',signs),pack('city-window-atlas-v1',windows)],
            'limits':'Owner-admitted original source image normalization/cropping/UV packing only. No generated PBR, geometry/collision, final appearance or runtime admission claim.'}
    assert all(sha(path)==expected for path,expected in protected.items()), 'Read-only original changed'
    result['readOnlyInputs']=[file_row(path,root) for path in protected]
    result['allReadOnlyInputsUnchanged']=True
    (out/'atlas-receipt.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'output':str(out),'existingGlassFound':glass_found,'fallback':False,'windowSlot0':'City_Window_Service','atlases':[a['runtime'] for a in result['atlases']]}))

if __name__=='__main__':main()

"""Original analytic PBR atlas. No downloaded/provider imagery or fake baked AO.

Each tile's height field drives the matched OpenGL tangent normal. ORM contains
subtle cavity AO, surface roughness and metallic classification. Seeded chips
are sparse and small; broad material values carry readability at play distance.
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/source/pounce-art-v1/textures';OUT.mkdir(parents=True,exist_ok=True)
RUNTIME=ROOT/'public/assets/textures';RUNTIME.mkdir(parents=True,exist_ok=True)
SIZE=1024;TILE=256
# paint, warm trim, bare machined steel, rubber, optics, canopy, pilot, decals
PALETTE=[(104,120,105),(210,117,41),(83,95,96),(25,32,34),(225,250,246),(94,151,154),(158,95,47),(192,205,189)]
base=np.zeros((SIZE,SIZE,3),dtype=np.uint8);normal=np.zeros_like(base);orm=np.zeros_like(base)
rng=np.random.default_rng(773411)
for tile in range(16):
    role=tile%8;y,x=np.mgrid[0:TILE,0:TILE];edge=np.minimum.reduce([x,y,255-x,255-y])
    color=np.array(PALETTE[role],float)
    h=np.zeros((TILE,TILE),float);rough=np.full_like(h,[.58,.43,.31,.84,.22,.13,.68,.52][role]);metal=np.full_like(h,[.55,.72,.94,.02,.15,.05,.01,.4][role])
    cavity=np.ones_like(h);variation=rng.normal(0,.75,h.shape)
    if role in (0,1,2,7):
        # Continuous panel seam/border, a shallow inset and four flush rivets.
        seam=(edge>=14)&(edge<=16);h[seam]=-.11;cavity[seam]=.82;rough[seam]=.7
        bevel=(edge>=17)&(edge<=20);h[bevel]=-.03
        if tile>=8:
            # Secondary tile is a purposeful inset vent, not random grime.
            for row in range(62,200,22):
                slot=(abs(y-row)<3)&(x>45)&(x<211);h[slot]=-.16;cavity[slot]=.64
        for cx,cy in [(27,27),(228,27),(27,228),(228,228)]:
            d=np.hypot(x-cx,y-cy);h[(d<4)]=-.075;cavity[d<4]=.75;h[(d>=4)&(d<5)]=.025
        chips=(rng.random(h.shape)>.997)&(edge<24)&(edge>7)
        h[chips]=-.045;rough[chips]=.34;metal[chips]=.9
        variation[chips]-=12
        # Faint anisotropic machining visible primarily through normal/roughness.
        h+=.0015*np.sin(x*.7);rough+=.018*np.sin(x*.12)
    elif role==3:
        h=.008*np.sin(y*.30);rough+=.015*np.sin(x*.14)
    elif role==4:
        # White optic tile lets the glTF emissive/color factor control cyan.
        variation*=.1
    gx=np.gradient(h,axis=1);gy=np.gradient(h,axis=0)
    n=np.stack([-gx*3,gy*3,np.ones_like(h)],axis=-1);n/=np.linalg.norm(n,axis=-1,keepdims=True)
    offset=(tile//4*TILE,tile%4*TILE);ys=slice(offset[0],offset[0]+TILE);xs=slice(offset[1],offset[1]+TILE)
    base[ys,xs]=np.clip(color+variation[...,None],0,255).astype('uint8')
    normal[ys,xs]=np.clip((n*.5+.5)*255,0,255).astype('uint8')
    orm[ys,xs]=np.clip(np.stack([cavity,rough,metal],axis=-1)*255,0,255).astype('uint8')
rows=[]
for name,data in [('albedo',base),('normal',normal),('orm',orm)]:
    image=Image.fromarray(data);image.save(OUT/f'feline-{name}-v1.png')
    path=RUNTIME/f'feline-{name}-v1.webp'
    # Preserve normal/packed channels exactly; albedo allows perceptual coding.
    image.save(path,format='WEBP',lossless=name!='albedo',quality=92,method=6)
    rows.append({'name':name,'file':str(path.relative_to(ROOT)).replace('\\','/'),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'colorSpace':'sRGB' if name=='albedo' else 'linear'})
assert sum(r['bytes'] for r in rows)<=900_000
(OUT/'atlas-receipt.json').write_text(json.dumps({'size':SIZE,'seed':773411,'provenance':'Original offline analytic height/material fields; not a photogrammetry or high-poly AO bake','normalConvention':'OpenGL +Y; height derivative, UV0; WebP normal/ORM lossless','ormChannels':['AO','roughness','metalness'],'tiles':PALETTE,'maps':rows},indent=2))
print(json.dumps(rows))

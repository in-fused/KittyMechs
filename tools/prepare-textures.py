from pathlib import Path
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'public/assets/textures';out.mkdir(parents=True,exist_ok=True)
for file in (ROOT/'assets/source/legacy/PolyHaven').glob('*.jpg'):
    Image.open(file).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS).save(out/file.name.replace('_2k.jpg','.webp'),quality=86)
art=ROOT/'public/assets/art';art.mkdir(parents=True,exist_ok=True)
ImageOps.fit(Image.open(ROOT/'assets/inbox/rainline-key-art.png').convert('RGB'),(1920,1080)).save(art/'rainline-key-art.webp',quality=86)
armor=ROOT/'assets/inbox/armor-albedo.png'
if armor.exists():Image.open(armor).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS).save(out/'armor-albedo.webp',quality=88)
print('Prepared local WebP textures and Higgsfield art.')

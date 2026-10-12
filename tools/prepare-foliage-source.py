"""Normalize retained CC0 source textures; never alter the canonical package."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/source/environment-foliage'
OUT = BASE / 'prepared'
OUT.mkdir(parents=True, exist_ok=True)

def normalized(source):
    image = Image.open(source)
    # Pillow's direct I;16 -> RGB/L conversion clips values above 255. Preserve
    # the source's full normalized data range for roughness and other scalars.
    if image.mode in ('I;16', 'I;16L', 'I;16B', 'I'):
        image = image.convert('F').point(lambda value: value / 257).convert('L')
    return image

def save(source, name, size=512, alpha=None):
    image = normalized(source).convert('RGB').resize((size, size), Image.Resampling.LANCZOS)
    if alpha:
        image = image.convert('RGBA')
        image.putalpha(normalized(alpha).convert('L').resize((size, size), Image.Resampling.LANCZOS))
    image.save(OUT/name, **({'quality':92} if name.endswith('.jpg') else {}))

fir = BASE / 'fir_tree_01-blend-1k/textures'
for stem in ['bark', 'trunk_b', 'twig']:
    save(fir/f'fir_tree_01_{stem}_diff_1k.png', f'{stem}-diff.'+('png' if stem=='twig' else 'jpg'),
         alpha=fir/'fir_tree_01_twig_alpha_1k.png' if stem=='twig' else None)
    save(fir/f'fir_tree_01_{stem}_nor_gl_1k.png', f'{stem}-normal.jpg')
    save(fir/f'fir_tree_01_{stem}_rough_1k.png', f'{stem}-rough.jpg')
    rough=normalized(fir/f'fir_tree_01_{stem}_rough_1k.png').convert('L').resize((512,512),Image.Resampling.LANCZOS)
    Image.merge('RGB',(Image.new('L',rough.size,255),rough,Image.new('L',rough.size,0))).save(OUT/f'{stem}-arm.jpg',quality=92)
fern = BASE / 'fern_02-gltf-1k/textures'
save(fern/'fern_02_diff_1k.jpg', 'fern-diff.png', alpha=fern/'fern_02_alpha_1k.png')
save(fern/'fern_02_nor_gl_1k.jpg', 'fern-normal.jpg')
save(fern/'fern_02_arm_1k.jpg', 'fern-arm.jpg')
print('Normalized matched source maps to 512px; reconstructed actual leaf alpha.', flush=True)

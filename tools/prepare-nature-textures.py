from pathlib import Path
from PIL import Image, ImageFilter
root=Path(__file__).resolve().parents[1]/'assets/source/nature'
crop=(175,22,492,350)
diff=Image.open(root/'textures/fir_tree_01_twig_diff_1k.png').convert('RGBA').crop(crop).resize((512,512))
# One bough per card. Slight dilation preserves needle coverage in distant mip levels.
alpha=Image.open(root/'textures/fir_tree_01_twig_alpha_1k.png').convert('L').crop(crop).resize((512,512)).filter(ImageFilter.MaxFilter(3));diff.putalpha(alpha);diff.save(root/'fronds.png')
for old,new in [('fir_tree_01_twig_nor_gl_1k.png','fronds-normal.jpg'),('fir_tree_01_bark_diff_1k.png','bark.jpg'),('fir_tree_01_bark_nor_gl_1k.png','bark-normal.jpg')]:
    image=Image.open(root/'textures'/old).convert('RGB')
    if 'twig' in old:image=image.crop(crop)
    image.resize((512,512)).save(root/new,quality=83)
out=root.parents[2]/'public/assets/textures';out.mkdir(parents=True,exist_ok=True)
for path in (root/'terrain').glob('*.jpg'):
    Image.open(path).convert('RGB').save(out/(path.stem+'.webp'),quality=84)

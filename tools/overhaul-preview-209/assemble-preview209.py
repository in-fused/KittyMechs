"""Assemble actual rendered frames into temporal GIFs and chronological boards.
No pose/render edits; runs only as part of the separately approved preview job."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).parent
def assemble():
 receipt=json.loads((HERE/'preview-receipt209.json').read_text());rows=receipt['rows']
 if receipt['error'] is not None or len(rows)!=144:raise RuntimeError('209_PREVIEW_REQUIRES_COMPLETE144_FRAMES')
 output=[]
 for name in dict.fromkeys(r['name'] for r in rows):
  for view in ['side','front']:
   selected=[r for r in rows if r['name']==name and r['view']==view]
   if len(selected)!=8:raise RuntimeError('209_PREVIEW_EXPECTED8_TEMPORAL_FRAMES_PER_VIEW')
   frames=[];board=Image.new('RGB',(448*4,368*2),'white')
   for i,r in enumerate(selected):
    im=Image.open(ROOT/r['path']).convert('RGB');assert im.size==(448,336)
    frame=Image.new('RGB',(448,368),'white');frame.paste(im,(0,32));draw=ImageDraw.Draw(frame);draw.text((5,3),f"{name} {view} phase={r['canonicalPhase']:.3f} R={r['stance']:.3f}",fill='black');draw.text((5,17),'209 source plane; native contact UNQUALIFIED',fill='black');frames.append(frame);board.paste(frame,((i%4)*448,(i//4)*368))
   png=HERE/'preview'/f'{name}-{view}-temporal-board.png';gif=HERE/'preview'/f'{name}-{view}-motion.gif';board.save(png);frames[0].save(gif,save_all=True,append_images=frames[1:],duration=125,loop=0,disposal=2)
   output.append({'name':name,'view':view,'frames':8,'board':png.relative_to(ROOT).as_posix(),'motion':gif.relative_to(ROOT).as_posix(),'chronology':[{'phase':r['canonicalPhase'],'stance':r['stance'],'carrierY':r['carrierY']} for r in selected]})
 (HERE/'temporal-artifacts209.json').write_text(json.dumps({'writer':'CLOSED','scope':'actual209primary composed61 poses rendered on exact202 editable master; no native/contact claim','rows':output},indent=2));return output
if __name__=='__main__':print(json.dumps({'artifacts':len(assemble())}))

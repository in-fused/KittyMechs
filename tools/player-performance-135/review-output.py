from pathlib import Path
import json,statistics,math
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parents[2];p=r/'.sites-runtime/overhaul-20261010/motion135-public';out=r/'.sites-runtime/overhaul-20261010/motion135-review';out.mkdir(exist_ok=False)
d=json.loads((p/'evidence.json').read_text());rows=[]
for phase in d['phases']:
 name=phase['phase'];samples=[x['sample'] for x in d['samples'] if x['phase']==name];actors=[next(a for a in s['actors'] if a['name']=='Motion135') for s in samples];a,b=actors[0],actors[-1]
 rows.append({'phase':name,'samples':len(samples),'displacement':math.dist(list(a['position'].values()),list(b['position'].values())),'stances':sorted(set(x['stance'] for x in actors)),'fps':{'min':min(s['performance']['fps'] for s in samples),'median':statistics.median(s['performance']['fps'] for s in samples)},'drawCalls':sorted(set(s['performance']['calls'] for s in samples)),'prototypeON':all(s['feline']['enabled'] for s in samples),'cameraClear':all(s['camera']['clear'] for s in samples)})
(out/'phase-summary.json').write_text(json.dumps({'scope':'Actual ordinary public capture; counters do not certify affected human lag, art or contact','phases':rows},indent=2))
board=Image.new('RGB',(1440,math.ceil(len(rows)/3)*325),'#18232a');draw=ImageDraw.Draw(board)
for i,row in enumerate(rows):
 x=(i%3)*480;y=(i//3)*325;im=Image.open(p/(row['phase']+'.png')).convert('RGB');im.thumbnail((480,300));board.paste(im,(x,y+25));draw.text((x+7,y+6),row['phase'],fill='white')
board.save(out/'phases.jpg');print(json.dumps(rows))

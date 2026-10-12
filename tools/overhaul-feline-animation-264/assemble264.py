import json,pathlib,hashlib,struct,copy
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=ROOT/'assets/source/overhaul-feline-animation-264';OUT=ROOT/'.sites-runtime/shader-startup-238/animation264/preview'
r=json.loads((HERE/'preview-receipt264.json').read_text());assert r['error'] is None and len(r['rows'])==80
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13);artifacts=[]
for name in dict.fromkeys(row['name'] for row in r['rows']):
 for view in ('side','front'):
  rows=sorted((x for x in r['rows'] if x['name']==name and x['view']==view),key=lambda x:x['index']);assert len(rows)==8
  board=Image.new('RGB',(1536,640),(20,25,33));frames=[];durations=[]
  for i,row in enumerate(rows):
   im=Image.open(ROOT/row['path']).convert('RGB');tile=Image.new('RGB',(384,320),(20,25,33));tile.paste(im,(0,30));draw=ImageDraw.Draw(tile);draw.text((6,5),f"{name} {view}  {i+1}/8  {row['seconds']:.3f}s",font=font,fill='white');board.paste(tile,((i%4)*384,(i//4)*320));frames.append(tile)
   dt=rows[i+1]['seconds']-row['seconds'] if i<7 else rows[1]['seconds']-rows[0]['seconds'];durations.append(max(20,round(dt*1000)))
  path=OUT/f'{name}-{view}-board.png';board.save(path);gif=OUT/f'{name}-{view}-sequence.gif';frames[0].save(gif,save_all=True,append_images=frames[1:],duration=durations,loop=0)
  artifacts.append({'name':name,'view':view,'board':str(path.relative_to(ROOT)).replace('\\','/'),'gif':str(gif.relative_to(ROOT)).replace('\\','/'),'sourceSeconds':[x['seconds'] for x in rows],'gifDurationMilliseconds':durations,'playbackQualified':False})
def glb(path):
 data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+n]),data[28+n:]
original,bin0=glb(ROOT/'tools/overhaul-pack-221/output/Pounce_Anatomy221.glb');new,bin1=glb(HERE/'Pounce_Feline264.glb');changed={'FelineWalk','FelineTrot','FelineGallop','FelineUprightWalkLong','FelineUprightStride'}
complete=[a for a in original['animations'] if a['name'] not in changed and a['name']!='FelineTransitionArc106'];assert len(complete)==39
assert bin1[:len(bin0)]==bin0
for a in complete:assert next(x for x in new['animations'] if x['name']==a['name'])==a
for k in original:
 if k not in ('animations','accessors','bufferViews','buffers'):assert new[k]==original[k]
assert new['accessors'][:len(original['accessors'])]==original['accessors'];assert new['bufferViews'][:len(original['bufferViews'])]==original['bufferViews']
(HERE/'temporal-artifacts264.json').write_text(json.dumps({'writer':'CLOSED','artifacts':artifacts,'retained39ExactJSON':True,'entireActual221BinaryPrefixPreserved':True,'retainedNodesMeshesSkinsMaterialsExactJSON':True,'actualGLTFLoaderSourceComposer':'UNRUN','betweenKeyMixing':'UNRUN','source221RootNonrotationReplay':'UNRUN','contactQualified':False,'qualityApproved':False,'publicApproved':False},indent=2))
print(json.dumps({'boards':len(artifacts),'gifs':len(artifacts),'retained39':len(complete),'prefixBytes':len(bin0),'GLBclips':len(new['animations'])}))

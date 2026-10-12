from pathlib import Path
from html.parser import HTMLParser
import hashlib,json
r=Path('.');p=r/'tools/overhaul-native-observer-227';old=r/'tools/overhaul-loading-capture-219';dist=r/'.sites-runtime/overhaul-20261011/native225-private/dist'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
buildseal=r/'.sites-runtime/overhaul-20261011/native225-private/output-seal.json';assert row(buildseal)['sha256']=='8bbd979f0202c82c294857b6eccbe9982593de4227549d08606ac0cc2c3fc3e6';closed=json.loads(buildseal.read_text(encoding='utf-8'))
for x in closed['files']:assert row(r/x['path'])==x
parent=old/'source-seal.json';assert row(parent)['sha256']=='d6230ff62fd32aae67365d9cce59d9ab74193a5668df1ad62d4f51153463df7f';oldsealed=json.loads(parent.read_text(encoding='utf-8'))
for x in oldsealed['files']:assert row(r/x['path'])==x
pre=p/'preimage';pre.mkdir(exist_ok=True)
for name in ['capture.mjs','supervise.py','source-seal.json']:
 if (pre/name).exists():assert (pre/name).read_bytes()==(old/name).read_bytes()
 else:(pre/name).write_bytes((old/name).read_bytes())
(p/'network-classification.mjs').write_bytes((old/'network-classification.mjs').read_bytes())
supervisor=(old/'supervise.py').read_text(encoding='utf-8')
for a,b in [('loading219-supervisor','native227-supervisor'),('tools/overhaul-loading-capture-219/capture.mjs','tools/overhaul-native-observer-227/capture.mjs'),('KITTYMECH_219_ACTUAL_APPROVED','KITTYMECH_227_ACTUAL_APPROVED'),('219 root actual gate','227 root actual gate'),("'capSeconds':90","'capSeconds':180"),('start>=89','start>=179'),('90-(time.monotonic()-start)','180-(time.monotonic()-start)'),('start<=90','start<=180')]:supervisor=supervisor.replace(a,b)
needle="  (out/'native-preflight.json').write_text";assert supervisor.count(needle)==1;supervisor=supervisor.replace(needle,"  assert creation(370280)==134362153569448006,'227 exact retained server creation identity changed'\n"+needle)
(p/'supervise.py').write_text(supervisor,encoding='utf-8')
class Entries(HTMLParser):
 def __init__(self):super().__init__();self.module=[];self.styles=[];self.preload=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='script' and a.get('type')=='module':self.module.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'])
  if tag=='link' and a.get('rel')=='modulepreload':self.preload.append(a['href'])
retained=r/'.sites-runtime/overhaul-20261009/build-062/playable-root/dist/index.html';left=Entries();left.feed(retained.read_text(encoding='utf-8'));right=Entries();right.feed((dist/'index.html').read_text(encoding='utf-8'))
assert left.module==right.module==['/assets/index-jFb_gY9P.js'] and left.styles==right.styles
entryProof=json.loads((dist.parent/'entry-proof.json').read_text(encoding='utf-8'));assert entryProof['status']=='PASS' and entryProof['oneCanonicalEntry']
entryImports=[x['target'] for x in entryProof['graph'] if x['url']=='/assets/index-jFb_gY9P.js']
assert right.preload and all(path in entryImports for path in right.preload)
outputs=[x for x in closed['files'] if Path(x['path']).is_relative_to(dist)];asset=r/'tools/overhaul-pack-221/output/Pounce_Anatomy221.glb';assetrow=row(asset);assert assetrow['sha256']=='5147c2c2e46f4b2328d5d97ac091da70204244cb68882592d6328cec53489473' and assetrow['bytes']==6441480
envelope=json.loads((r/'tools/overhaul-build-envelope-226/protected-inputs.json').read_text(encoding='utf-8'));files=envelope['files']+closed['files']+oldsealed['files']+[row(buildseal),row(parent),row(retained),assetrow]+[row(r/path) for path in ['docs/overhaul/player-integration-226-handoff.md','docs/overhaul/critic/native218-source-review.md','docs/overhaul/critic/native222-integration-source-review.md','docs/overhaul/critic/native226-build-review.md']]
files=list({x['path']:x for x in files}.values())
for x in files:assert row(r/x['path'])==x
binding={'writer':'CLOSED','scope':'227 source-only one privatePVP native motion experiment; real062 HTML/exact225 outputs/packed221, no decoder or production changes','files':files,'buildSeal':row(buildseal),'retainedIndex':row(retained),'dist':dist.as_posix(),'outputs':outputs,'delivery':{'url':'/assets/private/Pounce_Anatomy221.glb?sha=5147c2c2e46f','asset':assetrow},'entryIdentity':{'module':left.module,'styles':left.styles,'retainedPreload':left.preload,'candidatePreload':right.preload,'candidateEntryImports':entryImports,'legacyPreloadOverhead':'Retained realHTML preloads oldvendor paths; no aliases/HTML transformation. Candidate graph uses its own exact vendor paths. Extra oldpreload downloads/parsing are potential observer overhead, not qualification.'},'server':{'pid':370280,'creationFILETIME':134362153569448006,'port':8799}}
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':'SOURCE_BINDING_PASS','protectedRows':len(files),'distRows':len(outputs),'entry':left.module}))

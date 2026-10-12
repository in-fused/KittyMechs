from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;parent=r/'tools/overhaul-native-observer-228';sha=lambda b:hashlib.sha256(b).hexdigest()
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':sha(b)}
assert not (f/'source-seal.json').exists(),'235 already closed'
parentSeal=parent/'source-seal.json';assert row(parentSeal)['sha256']=='566bd382a7b02e349258c3c0e63f8fb20e0c656e902ffb6678692bd453d6caa8'
for x in json.loads(parentSeal.read_text())['files']:assert row(r/x['path'])==x
for name in ['capture.mjs','supervise.py','guards.mjs','network-classification.mjs']:
 b=(parent/name).read_bytes();(f/(name+'.228-preimage')).write_bytes(b);s='\n'.join(b.decode().splitlines())+'\n'
 for a,z in [('overhaul-native-observer-228','overhaul-shader-observer-235'),('KITTYMECH_228','KITTYMECH_235'),('native228-observer-source-review','shader235-observer-source-review'),('native228-public','shader235-public'),('native228-supervisor','shader235-supervisor'),('Native228Host','Shader235Host'),('Native228Guest','Shader235Guest')]:s=s.replace(a,z)
 if name=='capture.mjs':
  a="const native=window.__nativeIntegration222?.read()??null;";assert s.count(a)==1;s=s.replace(a,a+"\n const shader=window.__shaderStartup232?.read()??null;")
  a='transport:d?.transport(),native,localReadiness';assert s.count(a)==1;s=s.replace(a,'transport:d?.transport(),native,shader,localReadiness')
  a="const fault=nativeFault227(r,packedSHA);if(fault)throw Error(fault+' '+o.name);";assert s.count(a)==1;s=s.replace(a,"if(r.shader?.fatal)throw Error('235 shader owner fatal '+r.shader.fatal);"+a)
  a="await o.page.locator('canvas').click({position:{x:720,y:450},timeout:remaining});return r;";assert s.count(a)==1;s=s.replace(a,"evidence.events.push({pilot:o.name,label:'canvas-input-admission-start',wallMs:Date.now()-started,remainingMs:remaining,shader:r.shader});await o.page.locator('canvas').click({position:{x:720,y:450},timeout:remaining});evidence.events.push({pilot:o.name,label:'canvas-input-admission-complete',wallMs:Date.now()-started,deadlineWallMs:deadline-started});return r;")
  s=s.replace("ONE private native motion/lifecycle experiment, not co-op checkpoint/contact/FPS qualification","ONE materially changed234 shader-startup+idle230 native motion/lifecycle experiment, not co-op checkpoint/contact/FPS qualification; original228 rejection retained")
 if name=='supervise.py':
  a='for pid in ids.ids[:ids.count]:owned[str(pid)]=creation(pid)';assert s.count(a)==1;s=s.replace(a,"for pid in ids.ids[:ids.count]:\n    stamp=creation(pid)\n    if stamp is not None:owned.setdefault(str(pid),stamp)")
  ast.parse(s)
 (f/name).write_text(s,encoding='utf-8',newline='\n')
dist=r/'.sites-runtime/overhaul-20261011/startup234-private/dist';buildseal=dist.parent/'output-seal.json';closed=json.loads(buildseal.read_text());assert closed['writer']=='CLOSED'
for x in closed['files']:assert row(r/x['path'])==x
binding=json.loads((parent/'binding.json').read_text());new=json.loads((r/'tools/overhaul-startup-integration-234/binding.json').read_text());files=binding['files']+new['files']+closed['files']+[row(buildseal),row(parentSeal)]
for seal in [parentSeal,r/'tools/overhaul-startup-integration-234/source-seal.json']:
 files.extend(json.loads(seal.read_text())['files']);files.append(row(seal))
files=list({x['path']:x for x in files}.values())
for x in files:assert row(r/x['path'])==x
class Entries(HTMLParser):
 def __init__(self):super().__init__();self.module=[];self.styles=[];self.preload=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='script' and a.get('type')=='module':self.module.append(a['src'])
  if t=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'])
  if t=='link' and a.get('rel')=='modulepreload':self.preload.append(a['href'])
left=Entries();left.feed((r/binding['retainedIndex']['path']).read_text());right=Entries();right.feed((dist/'index.html').read_text());assert left.module==right.module==['/assets/index-jFb_gY9P.js'] and left.styles==right.styles
proof=json.loads((dist.parent/'entry-proof.json').read_text());assert proof['status']=='PASS' and proof['oneCanonicalEntry'];imports=[x['target'] for x in proof['graph'] if x['url']==left.module[0]];assert right.preload and all(x in imports for x in right.preload)
binding.update(writer='CLOSED',scope='235 unchanged20s public input/canvas/native observation of materially changed234, actual shader diagnostics; no public promotion',files=files,buildSeal=row(buildseal),dist=dist.relative_to(r).as_posix(),outputs=[x for x in closed['files'] if Path(x['path']).is_relative_to(dist.relative_to(r))])
binding['entryIdentity'].update(candidatePreload=right.preload,candidateEntryImports=imports)
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
subprocess.run(['node','--check',str(f/'capture.mjs')],cwd=r,check=True)
print(json.dumps({'status':'SOURCE_PREPARED_ONLY','protectedFiles':len(files),'actualJobs':0}))

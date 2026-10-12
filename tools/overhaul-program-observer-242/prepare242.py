from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[2];f=Path(__file__).resolve().parent;p=r/'tools/overhaul-disk-observer-238';sha=lambda b:hashlib.sha256(b).hexdigest()
def row(q):
 b=q.read_bytes();return {'path':q.relative_to(r).as_posix(),'bytes':len(b),'sha256':sha(b)}
assert not (f/'source-seal.json').exists()
seal=p/'source-seal.json';assert row(seal)['sha256']=='7e643680d986e64d0f1ea5237bea1dbb2fb7162d1e4465208b8c9b44f988c89d'
for x in json.loads(seal.read_text())['files']:assert row(r/x['path'])==x
for name in ['capture.mjs','supervise.py','guards.mjs','network-classification.mjs']:
 raw=(p/name).read_bytes();(f/(name+'.238-preimage')).write_bytes(raw);s='\n'.join(raw.decode().splitlines())+'\n'
 for a,b in [('overhaul-disk-observer-238','overhaul-program-observer-242'),('KITTYMECH_238','KITTYMECH_242'),('disk238-observer-source-review','program242-observer-source-review'),('shader-startup-238/public','shader-startup-238/public242'),('shader-startup-238/supervisor','shader-startup-238/supervisor242'),('Disk238Host','Program242Host'),('Disk238Guest','Program242Guest')]:s=s.replace(a,b)
 if name=='capture.mjs':s=s.replace('ONE materially changed234 shader-startup+idle230 native motion/lifecycle experiment','ONE materially changed241 program-identity shader-startup240+idle230 native motion/lifecycle experiment')
 if name=='supervise.py':
  a='out.mkdir(exist_ok=False);start=time.monotonic()';assert s.count(a)==1;s=s.replace(a,"assert (r/'.sites-runtime/shader-startup-238').is_junction() and (r/'.sites-runtime/shader-startup-238').resolve()==Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve(),'242 D output run junction changed'\nout.mkdir(exist_ok=False);start=time.monotonic()")
  ast.parse(s)
 (f/name).write_text(s,encoding='utf-8',newline='\n')
dist=r/'.sites-runtime/shader-startup-238/private241/dist';buildseal=dist.parent/'output-seal.json';closed=json.loads(buildseal.read_text());assert closed['writer']=='CLOSED'
for x in closed['files']:assert row(r/x['path'])==x
binding=json.loads((p/'binding.json').read_text());new=json.loads((r/'tools/overhaul-program-integration-241/binding.json').read_text());rows=binding['files']+new['files']+closed['files']+[row(buildseal),row(seal)]
for q in [seal,r/'tools/overhaul-program-integration-241/source-seal.json']:rows+=json.loads(q.read_text())['files']+[row(q)]
rows=list({x['path']:x for x in rows}.values())
for x in rows:assert row(r/x['path'])==x,x['path']
class Entries(HTMLParser):
 def __init__(self):super().__init__();self.module=[];self.styles=[];self.preload=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='script' and a.get('type')=='module':self.module.append(a['src'])
  if t=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'])
  if t=='link' and a.get('rel')=='modulepreload':self.preload.append(a['href'])
left=Entries();left.feed((r/binding['retainedIndex']['path']).read_text());right=Entries();right.feed((dist/'index.html').read_text());assert left.module==right.module==['/assets/index-jFb_gY9P.js'] and left.styles==right.styles
proof=json.loads((dist.parent/'entry-proof.json').read_text());assert proof['status']=='PASS' and proof['oneCanonicalEntry'];imports=[x['target'] for x in proof['graph'] if x['url']==left.module[0]];assert right.preload and all(x in imports for x in right.preload)
binding.update(writer='CLOSED',scope='242 unchanged20s public/native/shader/canvas controls observation of materially corrected241. Original238fatal,235prebrowser,236storagefailure retained; no public promotion',files=rows,buildSeal=row(buildseal),dist=dist.relative_to(r).as_posix(),outputs=[x for x in closed['files'] if Path(x['path']).is_relative_to(dist.relative_to(r))])
binding['entryIdentity'].update(candidatePreload=right.preload,candidateEntryImports=imports)
(f/'binding.json').write_text(json.dumps(binding,indent=2),encoding='utf-8')
subprocess.run(['node','--check',str(f/'capture.mjs')],cwd=r,check=True);print(json.dumps({'status':'242_SOURCE_PREPARED_ONLY','protectedFiles':len(rows),'actualJobs':0}))

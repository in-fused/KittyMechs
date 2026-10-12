from pathlib import Path
from html.parser import HTMLParser
import hashlib,json
r=Path('.');p=r/'tools/overhaul-entry-215'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
seal211=r/'tools/overhaul-readiness-211/source-seal211.json';seal213=r/'tools/overhaul-loading-capture-213/source-seal.json'
assert row(seal211)['sha256']=='0c579f94b28e3560b27c90b578e98243622074e9c14e9e3aefad05a3bac3da47'
assert row(seal213)['sha256']=='7637c518072e0c1896aeab3407dd1f3f49b75600e8e2db1a66175d0e6acb09ab'
pre=p/'preimage';pre.mkdir(exist_ok=False);script=r/'tools/overhaul-readiness-211/build211.mjs';(pre/'build211.mjs').write_bytes(script.read_bytes())
class Modules(HTMLParser):
 def __init__(self):super().__init__();self.sources=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='script' and a.get('type')=='module':self.sources.append(a['src'])
index=r/'.sites-runtime/overhaul-20261009/build-062/playable-root/dist/index.html';h=Modules();h.feed(index.read_text(encoding='utf-8'));assert h.sources==['/assets/index-jFb_gY9P.js']
original=script.read_text(encoding='utf-8');s=original.replace(".sites-runtime/overhaul-20261011/readiness211-private", ".sites-runtime/overhaul-20261011/entry215-private")
needle='build:{outDir:out,emptyOutDir:false}';assert s.count(needle)==1;s=s.replace(needle,"build:{outDir:out,emptyOutDir:false,rollupOptions:{output:{entryFileNames:'assets/index-jFb_gY9P.js'}}}")
s=s.replace("import {resolve} from 'node:path';","import {resolve} from 'node:path';\nimport {proveEntry215} from './prove-entry.mjs';")
s=s.replace("worker208Included:false},null,2));","worker208Included:false},null,2));\nawait proveEntry215(out);")
(p/'build215.mjs').write_text(s,encoding='utf-8')
b=json.loads((r/'tools/overhaul-loading-capture-213/binding.json').read_text());rows=b['files']+json.loads(seal213.read_text())['files']+[row(seal211),row(seal213),row(r/'.sites-runtime/overhaul-20261011/loading213-actual/output-seal.json'),row(r/'node_modules/rollup/dist/rollup.d.ts')]
for x in rows:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps({'writer':'CLOSED','files':list({x['path']:x for x in rows}.values()),'retainedInitialModule':h.sources[0],'runtimeSemanticChange':False},indent=2)+'\n',encoding='utf-8')
(p/'static-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'PASS','source211Original':row(script),'originalPreimage':row(pre/'build211.mjs'),'original211LogicRetained':True,'RollupPrimaryType':'node_modules/rollup/dist/rollup.d.ts830 entryFileNames?: string | callback','buildOptionOnly':'rollupOptions.output.entryFileNames=assets/index-jFb_gY9P.js','otherChanges':'New output folder and readonly AST/receipt writer only','actualBuild':False},indent=2)+'\n',encoding='utf-8')
print('PASS fixed single retained entry source prepared; no build')

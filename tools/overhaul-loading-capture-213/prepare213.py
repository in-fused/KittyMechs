from pathlib import Path
from html.parser import HTMLParser
import json,hashlib
r=Path('.');p=r/'tools/overhaul-loading-capture-213';old=r/'tools/overhaul-loading-capture-212'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
assert row(old/'source-seal.json')['sha256']=='f15f99e09ee1891d7cb21f71c4fc84b42fc8b6a6ea1e13b8ea671355b7efd503'
sealed=json.loads((old/'source-seal.json').read_text())
for x in sealed['files']:assert row(r/x['path'])==x
pre=p/'preimage';pre.mkdir(exist_ok=False)
for name in ['capture.mjs','supervise.py','source-seal.json']:(pre/name).write_bytes((old/name).read_bytes())
class Entries(HTMLParser):
 def __init__(self):super().__init__();self.modules=[];self.styles=[];self.preloads=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='script' and a.get('type')=='module':self.modules.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'])
  if tag=='link' and a.get('rel')=='modulepreload':self.preloads.append(a['href'])
frozen=r/'.sites-runtime/overhaul-20261009/build-062/playable-root/dist/index.html';candidate=r/'.sites-runtime/overhaul-20261011/readiness211-private/dist/index.html'
left=Entries();left.feed(frozen.read_text(encoding='utf-8'));right=Entries();right.feed(candidate.read_text(encoding='utf-8'))
assert len(left.modules)==len(right.modules)==1 and len(left.styles)==len(right.styles)==1
assert left.preloads==right.preloads,'Changing preload topology exceeds213 adapter scope'
receipt=json.loads((r/'.sites-runtime/overhaul-20261011/readiness211-private/build-process-receipt.json').read_text());dist=r/'.sites-runtime/overhaul-20261011/readiness211-private/dist'
rows={('/'+Path(x['path']).relative_to(dist).as_posix()):x for x in receipt['outputs']}
mapping=[]
for kind,src,dst in [('module',left.modules[0],right.modules[0]),('stylesheet',left.styles[0],right.styles[0])]:
 assert src.startswith('/assets/') and dst.startswith('/assets/') and dst in rows
 actual=row(r/rows[dst]['path']);assert actual==rows[dst]
 mapping.append({'kind':kind,'retainedRequest':src,'candidateRequest':dst,'candidateRow':actual})
mappingDoc={'writer':'CLOSED','parser':'Python HTMLParser, actual module/stylesheet attributes; no filename guessing','retainedIndex':row(frozen),'candidateIndex':row(candidate),'mappings':mapping,'modulePreloadsUnchanged':left.preloads,'document':'Real existing network response; no fulfillment/rewrite/security-policy changes'}
(p/'entry-mapping.json').write_text(json.dumps(mappingDoc,indent=2)+'\n',encoding='utf-8')
s=(old/'capture.mjs').read_text(encoding='utf-8')
for a,b in [('tools/overhaul-loading-capture-212','tools/overhaul-loading-capture-213'),('loading212-actual','loading213-actual'),('KITTYMECH_212_ACTUAL_APPROVED','KITTYMECH_213_ACTUAL_APPROVED'),('Loading212Host','Loading213Host'),('Loading212Guest','Loading213Guest'),('__loadingCapture212','__loadingCapture213'),('212 ','213 '),('21220','21320'),('21260','21360')]:s=s.replace(a,b)
needle="const index=await readFile(folder+'/index.html','utf8'),injection='<meta name=\"kittymech-arena\" content=\"same-origin\"/><meta name=\"kittymech-client-report\" content=\"local\"/>';"
assert s.count(needle)==1
s=s.replace(needle,"const mapping=JSON.parse(await readFile('tools/overhaul-loading-capture-213/entry-mapping.json','utf8')),index=await readFile(mapping.retainedIndex.path,'utf8'),injection='<meta name=\"kittymech-arena\" content=\"same-origin\"/><meta name=\"kittymech-client-report\" content=\"local\"/>';\nconst expectedDocument=index.replace('</head>',injection+'</head>');\nconst entryMappings=new Map(mapping.mappings.map(m=>[m.retainedRequest,m.candidateRow]));")
route="if(path==='/'||path==='/index.html')return route.fulfill({contentType:'text/html',body:index.replace('</head>',injection+'</head>')});const row=files.get(path);"
assert s.count(route)==1;s=s.replace(route,"if(path==='/'||path==='/index.html')return route.continue();const row=entryMappings.get(path)??files.get(path);")
# Exact network HTML identity is checked before any public deployment command.
where='const profile=async(o,label,action)=>'
assert s.count(where)==1
s=s.replace(where,"const gotoRealDocument=async(p,url)=>{const response=await p.goto(url);if(!response||response.status()!==200)throw Error('213 real document HTTP identity missing');const body=await response.body();if(sha(body)!==sha(Buffer.from(expectedDocument)))throw Error('213 real server HTML differs from exact retained062 index+metadata');evidence.network.push({type:'real-document',url:response.url(),status:response.status(),sha256:sha(body),server:await response.serverAddr()});};\n"+where)
s=s.replace("await host.page.goto(origin+'/?debug=1')","await gotoRealDocument(host.page,origin+'/?debug=1')").replace('await guest.page.goto(invite.toString())','await gotoRealDocument(guest.page,invite.toString())')
(p/'capture.mjs').write_text(s,encoding='utf-8')
supervisor=(old/'supervise.py').read_text(encoding='utf-8').replace('loading212-supervisor','loading213-supervisor').replace('tools/overhaul-loading-capture-212/capture.mjs','tools/overhaul-loading-capture-213/capture.mjs').replace('KITTYMECH_212_ACTUAL_APPROVED','KITTYMECH_213_ACTUAL_APPROVED').replace('212 root actual gate','213 root actual gate')
(p/'supervise.py').write_text(supervisor,encoding='utf-8')
binding=json.loads((old/'binding.json').read_text());binding['scope']='213 real retained document plus exact211 bundle substitution;212 failed packet preserved';extra=sealed['files']+[row(old/'source-seal.json'),row(r/'.sites-runtime/overhaul-20261011/loading212-actual/output-seal.json'),row(p/'entry-mapping.json')];binding['files']=list({x['path']:x for x in binding['files']+extra}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
(p/'static-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'PASS','protectedRows':len(binding['files']),'mappings':mapping,'modulePreloadsUnchanged':left.preloads,'source212Seal':row(old/'source-seal.json'),'actualCapture':False,'change':'Only real initial document+entry/style route adapter, document HTTP SHA validation and213 names/output/receipt','unchanged':'211 source, native endpoints/assets/security, readiness/life/ACK/movement/CPU sampling/cleanup/budgets'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'STATIC_PASS','mapping':mapping,'protectedRows':len(binding['files'])}))

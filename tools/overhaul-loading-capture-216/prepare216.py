from pathlib import Path
from html.parser import HTMLParser
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-216';old=r/'tools/overhaul-loading-capture-213';dist=r/'.sites-runtime/overhaul-20261011/entry215-private/dist'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(sealpath,expected):
 assert row(sealpath)['sha256']==expected
 doc=json.loads(sealpath.read_text(encoding='utf-8'))
 for x in doc['files']:assert row(r/x['path'])==x
 return doc
parent=verify(old/'source-seal.json','7637c518072e0c1896aeab3407dd1f3f49b75600e8e2db1a66175d0e6acb09ab')
actual213=verify(r/'.sites-runtime/overhaul-20261011/loading213-actual/output-seal.json','92689323836948a427af8d8cb14daf2ae451143a64b14ef97ca2dbeaa7da0abf')
source215=verify(r/'tools/overhaul-entry-215/source-seal.json','49f3e8b65bc6f1a50b9d95e750c976a27c8b38a837a77182f7addb9b14396d03')
actual215=verify(r/'.sites-runtime/overhaul-20261011/entry215-private/output-seal.json','9779527fee9be7fa0c842661a4f9505fa45cf36c8fff5df449ba88ba0147d588')
receiptPath=r/'.sites-runtime/overhaul-20261011/entry215-private/build-process-receipt.json'
assert row(receiptPath)['sha256']=='af5349024e4abf01251c9492fe93b80e154d15c88fea8604fbcb7f22fada43c9'
receipt=json.loads(receiptPath.read_text(encoding='utf-8'));assert receipt['status']=='TERMINAL' and receipt['exitCode']==0 and receipt['protectedMatch'] and receipt['oldEntryAbsent']
class Entries(HTMLParser):
 def __init__(self):super().__init__();self.modules=[];self.styles=[];self.preloads=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='script' and a.get('type')=='module':self.modules.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'])
  if tag=='link' and a.get('rel')=='modulepreload':self.preloads.append(a['href'])
frozen=r/'.sites-runtime/overhaul-20261009/build-062/playable-root/dist/index.html'
left=Entries();left.feed(frozen.read_text(encoding='utf-8'));right=Entries();right.feed((dist/'index.html').read_text(encoding='utf-8'))
assert left.modules==right.modules==['/assets/index-jFb_gY9P.js']
assert len(left.styles)==1 and left.styles==right.styles and left.preloads==right.preloads
rows={'/'+Path(x['path']).relative_to(dist).as_posix():x for x in receipt['outputs']}
for path in left.modules+left.styles+left.preloads:assert path in rows
identity={'writer':'CLOSED','retainedIndex':row(frozen),'candidateIndex':row(dist/'index.html'),'canonicalModule':left.modules[0],'styles':left.styles,'preloads':left.preloads,'sameRequestPaths':True,'aliasMappings':[],'buildReceipt':row(receiptPath),'entryProof':row(r/'.sites-runtime/overhaul-20261011/entry215-private/entry-proof.json'),'document':'Real retained server network response unchanged, exact existing metadata injection verified before deployment'}
(p/'entry-identity.json').write_text(json.dumps(identity,indent=2)+'\n',encoding='utf-8')
pre=p/'preimage';pre.mkdir(exist_ok=False)
for name in ['capture.mjs','supervise.py','source-seal.json','entry-mapping.json']:(pre/name).write_bytes((old/name).read_bytes())
s=(old/'capture.mjs').read_text(encoding='utf-8')
for a,b in [('tools/overhaul-loading-capture-213','tools/overhaul-loading-capture-216'),('loading213-actual','loading216-actual'),('KITTYMECH_213_ACTUAL_APPROVED','KITTYMECH_216_ACTUAL_APPROVED'),('Loading213Host','Loading216Host'),('Loading213Guest','Loading216Guest'),('__loadingCapture213','__loadingCapture216'),("'213 ","'216 "),("'21360s","'21660s"),('.sites-runtime/overhaul-20261011/readiness211-private/dist','.sites-runtime/overhaul-20261011/entry215-private/dist'),('.sites-runtime/overhaul-20261011/readiness211-private/build-process-receipt.json','.sites-runtime/overhaul-20261011/entry215-private/build-process-receipt.json'),('entry-mapping.json','entry-identity.json')]:s=s.replace(a,b)
needle='const entryMappings=new Map(mapping.mappings.map(m=>[m.retainedRequest,m.candidateRow]));'
assert s.count(needle)==1
s=s.replace(needle,"if(!mapping.sameRequestPaths||mapping.aliasMappings.length!==0||mapping.canonicalModule!==build.canonicalEntry||build.canonicalEntry!=='/assets/index-jFb_gY9P.js'||!build.oldEntryAbsent)throw Error('216 same canonical entry identity missing');")
needle='const row=entryMappings.get(path)??files.get(path);'
assert s.count(needle)==1;s=s.replace(needle,'const row=files.get(path);')
assert 'entryMappings' not in s and 'index-DpxkElY8.js' not in s
assert 'COPY INVITE ↗' in s and 'COPY INVITE ↗' in (old/'capture.mjs').read_text(encoding='utf-8')
(p/'capture.mjs').write_text(s,encoding='utf-8')
s=(old/'supervise.py').read_text(encoding='utf-8')
for a,b in [('loading213-supervisor','loading216-supervisor'),('tools/overhaul-loading-capture-213/capture.mjs','tools/overhaul-loading-capture-216/capture.mjs'),('KITTYMECH_213_ACTUAL_APPROVED','KITTYMECH_216_ACTUAL_APPROVED'),('213 root actual gate','216 root actual gate')]:s=s.replace(a,b)
(p/'supervise.py').write_text(s,encoding='utf-8')
binding=json.loads((old/'binding.json').read_text(encoding='utf-8'));binding['scope']='216 STATIC real retained document with exact215 same canonical entry/receipt-listed sibling chunks; no URL alias or source211 semantic change'
extra=parent['files']+actual213['files']+source215['files']+actual215['files']+[row(old/'source-seal.json'),row(r/'.sites-runtime/overhaul-20261011/loading213-actual/output-seal.json'),row(r/'tools/overhaul-entry-215/source-seal.json'),row(r/'.sites-runtime/overhaul-20261011/entry215-private/output-seal.json'),row(p/'entry-identity.json')]
binding['files']=list({x['path']:x for x in binding['files']+extra}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
receipt={'writer':'CLOSED','status':'STATIC_PASS','protectedRows':len(binding['files']),'actualCapture':False,'canonicalModule':identity['canonicalModule'],'aliasMappings':[],'parent213':row(old/'source-seal.json'),'build215':row(receiptPath),'copiedPublicSelectorsExact':True,'change':'216 identities/output/approval gate,215 exact receipt paths, no old-to-different entry alias; fixed canonical entry identity guard','unchanged':'211 source/readiness, native endpoints/assets/security,20/60/20/80/90 bounds, living local input/ACK/body camera predicate, W observation, CPU sampling, ownership/cleanup'}
(p/'static-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))

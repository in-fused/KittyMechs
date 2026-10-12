from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-217';old=r/'tools/overhaul-loading-capture-216'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
parent=old/'source-seal.json';assert row(parent)['sha256']=='c4794176bafd821310582ac71b143998be69bcf2718bab5dbf04d2990088d180'
closed=json.loads(parent.read_text(encoding='utf-8'))
actual=r/'.sites-runtime/overhaul-20261011/loading216-actual/output-seal.json';assert row(actual)['sha256']=='a0ee4ca2acf951b1ac374ef97dc846c110dcf8b7d3e244f182df585706bd0710'
outputs=json.loads(actual.read_text(encoding='utf-8'))
for x in closed['files']+outputs['files']:assert row(r/x['path'])==x
pre=p/'preimage';pre.mkdir(exist_ok=False)
for name in ['capture.mjs','supervise.py','source-seal.json']:(pre/name).write_bytes((old/name).read_bytes())
s=(old/'capture.mjs').read_text(encoding='utf-8')
for a,b in [('tools/overhaul-loading-capture-216','tools/overhaul-loading-capture-217'),('loading216-actual','loading217-actual'),('KITTYMECH_216_ACTUAL_APPROVED','KITTYMECH_217_ACTUAL_APPROVED'),('Loading216Host','Loading217Host'),('Loading216Guest','Loading217Guest'),('__loadingCapture216','__loadingCapture217'),("'216 ","'217 "),("'21660s","'21760s")]:s=s.replace(a,b)
before="await host.page.keyboard.press('Tab');const invite=new URL(await host.page.getByLabel('Squad invite').inputValue());"
after="let invite;await host.page.keyboard.down('Tab');try{invite=new URL(await host.page.getByLabel('Squad invite').inputValue({timeout:10000}));}finally{await host.page.keyboard.up('Tab');}"
assert s.count(before)==1;s=s.replace(before,after)
assert [c for c in s if ord(c)>127]==[c for c in (old/'capture.mjs').read_text(encoding='utf-8') if ord(c)>127]
(p/'capture.mjs').write_text(s,encoding='utf-8')
s=(old/'supervise.py').read_text(encoding='utf-8')
for a,b in [('loading216-supervisor','loading217-supervisor'),('tools/overhaul-loading-capture-216/capture.mjs','tools/overhaul-loading-capture-217/capture.mjs'),('KITTYMECH_216_ACTUAL_APPROVED','KITTYMECH_217_ACTUAL_APPROVED'),('216 root actual gate','217 root actual gate')]:s=s.replace(a,b)
(p/'supervise.py').write_text(s,encoding='utf-8');(p/'entry-identity.json').write_bytes((old/'entry-identity.json').read_bytes())
binding=json.loads((old/'binding.json').read_text(encoding='utf-8'));binding['scope']='217 public held-Tab invite read+finally release, otherwise exact216 capture/215 same-path entry/211 readiness'
extra=closed['files']+outputs['files']+[row(parent),row(actual),row(r/'src/ui/Hud.tsx'),row(p/'entry-identity.json')]
binding['files']=list({x['path']:x for x in binding['files']+extra}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
(p/'static-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'STATIC_PASS','protectedRows':len(binding['files']),'actualCapture':False,'publicControlChange':{'before':before,'after':after},'sourceHud':row(r/'src/ui/Hud.tsx'),'source216':row(parent),'actual216':row(actual),'nonASCIISelectorBytesExact':True,'unchanged':'Same211/215/062;20/60/20/80/90;owner/life/ACK/readiness/body/network/profile/native cleanup;existing10s invite timeout. No DOM/state/clipboard injection.'},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'STATIC_PASS','protectedRows':len(binding['files']),'publicControlChange':{'before':before,'after':after}}))

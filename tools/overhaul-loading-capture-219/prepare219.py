from pathlib import Path
import hashlib,json
r=Path('.');p=r/'tools/overhaul-loading-capture-219';old=r/'tools/overhaul-loading-capture-217'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
parent=old/'source-seal.json';assert row(parent)['sha256']=='bbaa6675452c985bd494ed84bbc4f639f652fc5531bc3ffbda7cda44c7f1d004'
closed=json.loads(parent.read_text(encoding='utf-8'));actual=r/'.sites-runtime/overhaul-20261011/loading217-actual/output-seal.json';assert row(actual)['sha256']=='6d873efdb37da9e91cc28a6e33b7d7e001fc81f340523191c4126d96706c3d47';outputs=json.loads(actual.read_text(encoding='utf-8'))
for x in closed['files']+outputs['files']:assert row(r/x['path'])==x
pre=p/'preimage';pre.mkdir(exist_ok=False)
for name in ['capture.mjs','supervise.py','source-seal.json']:(pre/name).write_bytes((old/name).read_bytes())
s=(old/'capture.mjs').read_text(encoding='utf-8')
for a,b in [('tools/overhaul-loading-capture-217','tools/overhaul-loading-capture-219'),('loading217-actual','loading219-actual'),('KITTYMECH_217_ACTUAL_APPROVED','KITTYMECH_219_ACTUAL_APPROVED'),('Loading217Host','Loading219Host'),('Loading217Guest','Loading219Guest'),('__loadingCapture217','__loadingCapture219'),("'217 ","'219 "),("'21760s","'21960s")]:s=s.replace(a,b)
s="import {isOptionalTelemetryAbort219} from './network-classification.mjs';\n"+s
before="const bad=evidence.network.find(r=>r.type==='requestfailed'||r.type==='http-error');"
after="const bad=evidence.network.find(r=>(r.type==='requestfailed'&&!isOptionalTelemetryAbort219(r,origin))||r.type==='http-error');"
assert s.count(before)==1;s=s.replace(before,after)
before="o.page.on('requestfailed',r=>evidence.network.push({pilot:name,type:'requestfailed',url:r.url(),error:r.failure()}));"
after="o.page.on('requestfailed',r=>{const row={pilot:name,type:'requestfailed',method:r.method(),url:r.url(),error:r.failure(),wallMs:Date.now()-start};if(isOptionalTelemetryAbort219(row,origin))row.optionalTelemetry={classification:'DIAGNOSTIC_ABORT',initiator:'UNKNOWN',rendererReportDelivery:'UNAVAILABLE',scope:'Optional telemetry transport only; no human lag/performance qualification'};evidence.network.push(row);});"
assert s.count(before)==1;s=s.replace(before,after)
assert [c for c in s if ord(c)>127]==[c for c in (old/'capture.mjs').read_text(encoding='utf-8') if ord(c)>127]
(p/'capture.mjs').write_text(s,encoding='utf-8')
s=(old/'supervise.py').read_text(encoding='utf-8')
for a,b in [('loading217-supervisor','loading219-supervisor'),('tools/overhaul-loading-capture-217/capture.mjs','tools/overhaul-loading-capture-219/capture.mjs'),('KITTYMECH_217_ACTUAL_APPROVED','KITTYMECH_219_ACTUAL_APPROVED'),('217 root actual gate','219 root actual gate')]:s=s.replace(a,b)
(p/'supervise.py').write_text(s,encoding='utf-8');(p/'entry-identity.json').write_bytes((old/'entry-identity.json').read_bytes())
binding=json.loads((old/'binding.json').read_text(encoding='utf-8'));binding['scope']='219 exact optional diagnostic POST/client-report ERR_ABORTED classification only; all other217 guards/211/215/062 unchanged'
extra=closed['files']+outputs['files']+[row(parent),row(actual),row(r/'src/game/rendering/clientReport092.ts'),row(p/'entry-identity.json')]
binding['files']=list({x['path']:x for x in binding['files']+extra}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
(p/'static-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'STATIC_PASS','protectedRows':len(binding['files']),'actualCapture':False,'classification':{'requiredType':'requestfailed','requiredMethod':'POST','requiredExactURL':'http://localhost:8799/client-report','requiredFailure':'net::ERR_ABORTED','initiator':'UNKNOWN','rendererReportDelivery':'UNAVAILABLE'},'source217':row(parent),'actual217':row(actual),'nonASCIISelectorBytesExact':True,'unchanged':'211/215/062;20/60/20/80/90;both healthy local/native/input/ACK/body readiness;public held-Tab invite+W lane;all other errors fatal;cleanup. No production changes.'},indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':'STATIC_PASS','protectedRows':len(binding['files'])}))

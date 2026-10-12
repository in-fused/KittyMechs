from pathlib import Path
import json,hashlib
r=Path('.');p=r/'tools/overhaul-native-integration-222'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
binding=json.loads((p/'binding.json').read_text(encoding='utf-8'))
extras=[row(r/'tools/overhaul-native-214/raw209-contract214.json'),row(r/'docs/overhaul/critic/startup220-source-review.md'),row(r/'docs/overhaul/critic/native218-source-review.md')]
assert extras[1]['sha256']=='e1035718757d4ad142981acaa1368f9ba10659cb64759feab1a29f32cdde42f2'
binding['files']=list({x['path']:x for x in binding['files']+extras}.values())
for x in binding['files']:assert row(r/x['path'])==x
(p/'binding.json').write_text(json.dumps(binding,indent=2)+'\n',encoding='utf-8')
assert json.loads((p/'registry-fixture-receipt.json').read_text())['status']=='PASS'
(p/'compile-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'PASS','command':'node node_modules/typescript/bin/tsc -p tools/overhaul-native-integration-222/tsconfig222.json --pretty false','exitCode':0,'elapsedSeconds':7.67578,'diagnostics':[],'syntaxNodePluginBuild':'PASS','protectedRows':len(binding['files']),'actualBuild':False,'actualBrowser':False,'actualNativeWorld':False,'loaderQualificationBinding':'PENDING_ACTUAL221_PROOF_REQUIRED'},indent=2)+'\n',encoding='utf-8')
files=[row(x) for x in sorted(p.rglob('*')) if x.is_file() and '__pycache__' not in x.parts and x.name!='source-seal.json' or x.is_file() and x.parent==p/'preimage' and x.name=='source-seal.json']
seal=p/'source-seal.json';seal.write_text(json.dumps({'writer':'CLOSED','status':'PRIVATE_INTEGRATION_SOURCE_ONLY_UNADMITTED_PROOF_PENDING','files':files},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceSeal':row(seal),'files':len(files),'protectedRows':len(binding['files']),'loaderProof':'PENDING_UNBOUND','actualBuild':False,'actualGameplay':False}))

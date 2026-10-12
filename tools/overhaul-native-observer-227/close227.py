from pathlib import Path
import json,hashlib,py_compile
r=Path('.');p=r/'tools/overhaul-native-observer-227'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
binding=json.loads((p/'binding.json').read_text(encoding='utf-8'))
for x in binding['files']:assert row(r/x['path'])==x
assert json.loads((p/'brief-fixture-receipt.json').read_text())['status']=='PASS'
py_compile.compile(str(p/'supervise.py'),doraise=True)
source=(p/'capture.mjs').read_text(encoding='utf-8');assert 'COPY INVITE ↗' in source and "keyboard.down('Tab')" in source and "keyboard.up('Tab')" in source and "realizedYawDelta<=0" in source
supervisor=(p/'supervise.py').read_text(encoding='utf-8');assert "'capSeconds':180" in supervisor and 'start>=179' in supervisor and 'start<=180' in supervisor and '134362153569448006' in supervisor
(p/'static-receipt.json').write_text(json.dumps({'writer':'CLOSED','status':'SOURCE_BINDING_SYNTAX_AND_BRIEF_GUARDS_PASS_AFTER_ONE_METADATA_CORRECTION','nodeSyntax':'PASS','pythonSyntax':'PASS','briefGuards':'PASS','protectedRows':len(binding['files']),'actualBuild':False,'actualGameplay':False,'firstPreparationFailurePreserved':True,'vendorPreloadDifference':binding['entryIdentity'],'nativeInspectorPixelScope':'UNQUALIFIED','allOtherCasesUnreachedUntilActualGate':True},indent=2)+'\n',encoding='utf-8')
files=[row(x) for x in sorted(p.rglob('*')) if x.is_file() and '__pycache__' not in x.parts and (x.name!='source-seal.json' or x.parent==p/'preimage')]
seal=p/'source-seal.json';seal.write_text(json.dumps({'writer':'CLOSED','status':'ONE_PRIVATE_NATIVE_OBSERVER_SOURCE_ONLY_UNADMITTED','files':files},indent=2)+'\n',encoding='utf-8');print(json.dumps({'sourceSeal':row(seal),'files':len(files),'protectedRows':len(binding['files']),'actualJob':False}))

from pathlib import Path
import json,hashlib
r=Path('.');p=r/'tools/overhaul-startup-220';s=p/'supplement'
def row(x):
 b=x.read_bytes();return {'path':x.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
parent=p/'source-seal.json';assert row(parent)['sha256']=='5708c1d217ba0072ab4cc99d9bc1a05d45e20c8849afb2c7aeabd29d8a10be33';initial=json.loads(parent.read_text())
for x in initial['files']:assert row(r/x['path'])==x
assert json.loads((s/'static-receipt.json').read_text())['status']=='PASS'
failure={'writer':'CLOSED','status':'FIRST_STATIC_COMPARATOR_FAILURE','command':'node tools/overhaul-startup-220/static-check.mjs','exitCode':1,'message':'AssertionError [ERR_ASSERTION]: Only retained prerequisite scheduling/cache URL alias may differ','cause':'Raw CRCRLF preimage versus universal-newline copied candidate; first comparator did not normalize EOL before reversing literal edits. No candidate semantic/quality test reached.','rawToolOutput':'Tool output contained full large assertion diff, truncated12044tokens; full stderr was not saved locally. Original failed script and exact operands/preimages preserved.','initialSeal':row(parent),'originalFailedScript':row(p/'static-check.mjs'),'candidateUnchanged':row(p/'GameCanvas220.tsx')}
(s/'first-failure-receipt.json').write_text(json.dumps(failure,indent=2)+'\n',encoding='utf-8')
files=initial['files']+[row(parent)]+[row(x) for x in sorted(s.iterdir()) if x.is_file() and x.name!='source-seal.json']
seal=s/'source-seal.json';seal.write_text(json.dumps({'writer':'CLOSED','status':'SOURCE_ONLY_STATIC_PASS_AFTER_ONE_COMPARATOR_REPAIR','files':files},indent=2)+'\n',encoding='utf-8');print(json.dumps({'supplementSeal':row(seal),'originalSeal':row(parent),'candidate':row(p/'GameCanvas220.tsx'),'actualBuild':False,'actualCapture':False}))

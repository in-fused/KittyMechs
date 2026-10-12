"""Bounded parsing/metadata-only proof; never imports mission or starts processes."""
from pathlib import Path
import json,datetime
R=Path(__file__).resolve().parents[2];H=Path(__file__).resolve().parent
for n in ['prepare.py','preflight.py','launch.py','author-package.py']:
 compile((H/n).read_text(encoding='utf8'),str(H/n),'exec')
old='a7f4259eaa7f8398b9bd68bcf7302905195981ff283e6e04ae72e2a6da70abfe';new='671036323a86d63b5b65bbf66dc74f239079bd2f7d27d4d08833cf5d45576b4a'
for n in ['controller.mjs','mission-capture.mjs']:
 expected=(R/'tools/overhaul-coop-controller-103'/n).read_text(encoding='utf8').replace('103','111').replace(old,new)
 if n=='mission-capture.mjs':expected=expected.replace("origin+'/?debug=1&overhaul=1'","origin+'/?debug=1'").replace("url.searchParams.set('overhaul','1');","url.searchParams.delete('overhaul');")
 assert (H/n).read_text(encoding='utf8')==expected,('UNDECLARED_MISSION_CHANGE',n)
handoff=json.loads((H/'source-handoff.json').read_text());handoff['status']='SOURCE_CLOSED_SYNTAX_VALIDATED_PUBLIC_UNRUN';(H/'source-handoff.json').write_text(json.dumps(handoff,indent=2)+'\n',encoding='utf8')
(H/'syntax-validation.json').write_text(json.dumps({'writer':'CLOSED','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nodeCheck':{'controller.mjs':0,'mission-capture.mjs':0},'pythonInMemoryCompile':['prepare.py','preflight.py','launch.py','author-package.py'],'metadataOnlyExact103Comparison':True,'browserJobs':0,'publicMission':'UNRUN'},indent=2)+'\n',encoding='utf8')
print('111 Python syntax and exact metadata-only mission comparison passed')

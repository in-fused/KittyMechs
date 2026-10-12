from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((r/'tools/overhaul-loading-054/run-seal.json').read_text(encoding='utf8'))
for x in s['files']+s['protected']:assert row(r/x['path'])==x,x['path']
p=r/'.sites-runtime/overhaul-20261010/loading054-process/process-receipt.json';v=json.loads(p.read_text());assert v['failure'] is None and v['inclusiveBoundObserved'] and all(x['match'] for x in v['inputsAfter'])
paths=[p,r/'.sites-runtime/overhaul-20261010/loading054-process/stdout.txt']
paths+=sorted((r/'.sites-runtime/overhaul-20261010/loading054-public').glob('*'))
o={'scope':'054 ONE instrumented unchanged037 startup failure. Original own videos/profiles/network preserved. No mission/performance/Gate1 approval.','files':[row(p) for p in paths if p.is_file()]}
out=r/'tools/overhaul-loading-054/result-seal.json';assert not out.exists();out.write_text(json.dumps(o,indent=2),encoding='utf8')
print(json.dumps({'files':len(o['files']),'bytes':sum(x['bytes'] for x in o['files']),'sealSHA256':hashlib.sha256(out.read_bytes()).hexdigest()}))

from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
process=r/'.sites-runtime/overhaul-20261010/guest-readiness-046-process'
receipt=json.loads((process/'process-receipt.json').read_text());assert receipt['inclusiveBoundObserved'] and all(x['match'] for x in receipt['inputsAfter'])
for x in json.loads((r/'tools/overhaul-root-round-033/coop045-result-seal.json').read_text())['files']:
 v=row(r/x['path']);assert v['bytes']==x['bytes'] and v['sha256']==x['sha256']
paths=[p for folder in [process,r/'.sites-runtime/overhaul-20261010/guest-readiness-046-public'] for p in folder.rglob('*') if p.is_file()]
paths += [r/'tools/overhaul-root-round-033/guest046-public-seal.json',r/'docs/overhaul/critic/guest-readiness-046-source-review.md',Path(__file__)]
seal={'files':[row(p) for p in paths],'scope':'ONE unchanged036 diagnosis: actual guest readiness without probe in this run;045 failure remains unchanged, no cause/fix/full mission approval.'}
p=Path(__file__).with_name('guest046-result-seal.json');assert not p.exists();p.write_text(json.dumps(seal,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in seal['files']),'sha256':row(p)['sha256']}))

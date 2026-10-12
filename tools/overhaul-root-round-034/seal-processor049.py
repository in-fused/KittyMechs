from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
process=r/'.sites-runtime/overhaul-20261010/moving-recoil-049-processor';q=json.loads((process/'process-receipt.json').read_text());assert q['exitCode']==1 and q['inclusiveBoundObserved'] and all(x['match'] for x in q['inputsAfter'])
paths=[p for folder in [process,r/'assets/source/overhaul-moving-recoil-049',r/'tools/overhaul-moving-recoil-049'] for p in folder.rglob('*') if p.is_file() and p.name!='critic-result-closure.json']
paths += [Path(__file__),r/'tools/overhaul-root-round-034/recoil049-processor-seal.json',r/'docs/overhaul/moving-recoil-049.md',r/'docs/overhaul/critic/moving-recoil-049-processor-source-review.md']
s={'files':[row(p) for p in paths],'scope':'049 first packagingFAIL eventrelative0 timing requirement, rawsourceframe1 offset; laterquaternion/motion/referenceguards unreached. No candidate or shipping/no rerun;050distinctclockrepresentationmustpreservefailure.'}
p=Path(__file__).with_name('recoil049-result-seal.json');assert not p.exists();p.write_text(json.dumps(s,indent=2));print(json.dumps({'files':len(paths),'bytes':sum(x['bytes'] for x in s['files']),'sha256':row(p)['sha256']}))

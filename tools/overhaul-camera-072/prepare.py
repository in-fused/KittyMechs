from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'tools/overhaul-camera-071'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=(old/'cover-check.ts').read_text()
before="import {prepareVisualEnvelope,createVisualEnvelopeSample,sampleVisualEnvelope} from '../../src/game/camera/visualEnvelope';"
after="import {prepareWeightedVisualEnvelope007 as prepareVisualEnvelope,createWeightedVisualEnvelopeSample007 as createVisualEnvelopeSample,sampleWeightedVisualEnvelope007 as sampleVisualEnvelope} from '../../src/game/camera/weightedVisualEnvelope007';"
assert s.count(before)==1;s=s.replace(before,after).replace('tools/overhaul-camera-071/cover-result.json','tools/overhaul-camera-072/cover-result.json')
(h/'cover-check.ts').write_text(s,encoding='utf8')
source=json.loads((old/'source-seal.json').read_text());paths={r/x['path'] for x in source['files']}
paths.update([h/'cover-check.ts',Path(__file__),old/'cover-result.json',old/'run-seal.json',r/'src/game/camera/weightedVisualEnvelope007.ts',r/'.sites-runtime/overhaul-20261010/camera071-cover/stdout.txt',r/'.sites-runtime/overhaul-20261010/camera071-cover/process-receipt.json'])
(h/'run-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['node','--import','tsx','tools/overhaul-camera-072/cover-check.ts'],'scope':'Distinct fixture-only072 usesactualshipping weighted007 geometry reader, no asset normalization/game/camera/assertion edit. Original071pre-nativefailure preserved.'},indent=2),encoding='utf8')
wrapper=(r/'tools/overhaul-moving-r-065/run-once.py').read_text().replace('moving-r065-curve','camera072-cover');(h/'run-once.py').write_text(wrapper,encoding='utf8');print('One072 actualshipping geometry fixture prepared, unrun.')

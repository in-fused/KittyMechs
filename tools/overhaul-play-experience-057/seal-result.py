from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2]
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
paths=[]
for label in ['baseline','candidate']:
 seal=json.loads((r/f'tools/overhaul-play-experience-057/{label}-seal.json').read_text())
 for x in seal['files']+seal['protected']:assert row(r/x['path'])==x,x['path']
 proc=r/f'.sites-runtime/overhaul-20261010/experience057-{label}-process';v=json.loads((proc/'process-receipt.json').read_text());assert v['exitCode']==0 and v['failure'] is None and v['inclusiveBoundObserved'] and all(x['match'] for x in v['inputsAfter'])
 paths.extend(p for folder in [proc,r/f'.sites-runtime/overhaul-20261010/experience057-{label}'] for p in folder.glob('*') if p.is_file())
paths.extend(p for p in (r/'.sites-runtime/overhaul-20261010/experience057-motion').glob('*') if p.is_file());paths.extend([r/'.sites-runtime/overhaul-20261010/experience057-cleanup.json',r/'.sites-runtime/overhaul-20261010/experience057-comparison.json',r/'.sites-runtime/overhaul-20261010/live039-http-verification.json',Path(__file__)])
o=r/'tools/overhaul-play-experience-057/result-seal.json';assert not o.exists();o.write_text(json.dumps({'scope':'ONE038baseline+ONE039candidate originalownvideos/PNGs/native/input/camera/timing, sourceimmutable, independentreviewpending. Sequentialcomparisonlimited, actualIABlag/fullmissionremainunqualified.','files':[row(p) for p in paths]},indent=2),encoding='utf8');print(row(o))

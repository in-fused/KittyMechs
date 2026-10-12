from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
folders=[r/'.sites-runtime/overhaul-20261010'/name for name in ['profile069-play','profile069-process','rescue-hull070-tests','rescue-hull071-tests','camera071-cover','camera072-cover','camera073-cover','render-rescue074-build','render-rescue074-play','render-rescue074-process']]
paths={p for f in folders for p in f.rglob('*') if p.is_file()}
paths.update([h/'build-seal.json',h/'play-seal.json',h/'summary.json',Path(__file__),r/'docs/overhaul/critic/render-rescue-074-source-review.md',r/'docs/overhaul/critic/render-rescue-074-play-review.md',r/'.sites-runtime/overhaul-20261009/build-044/receipt.json',r/'.sites-runtime/overhaul-20261010/live044-http-verification.json'])
paths.update(r/'tools'/folder/file for folder,file in [('overhaul-camera-073','cover-result.json'),('overhaul-camera-072','cover-result.json'),('overhaul-camera-071','cover-result.json'),('overhaul-profile-069','summary.json')])
(h/'result-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'scope':'Preserved069 profile, originalfailures070/071/072/073, corrected071rescue10PASS,074build/publicplay/actualcritic. No userlag/fullgoal acceptance.'},indent=2));print(json.dumps({'files':len(paths),'SHA256':hashlib.sha256((h/'result-seal.json').read_bytes()).hexdigest()}))

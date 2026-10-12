from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((h/'test-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files'])
paths=[Path(__file__),h/'test-seal.json',r/'docs/overhaul/critic/moving-r-support-068-source-review.md'];paths.extend(p for n in ['moving-r067-provider-tests','moving-r068-provider-tests'] for p in (r/'.sites-runtime/overhaul-20261010'/n).rglob('*') if p.is_file())
o=h/'result-seal.json';assert not o.exists();o.write_text(json.dumps({'files':[row(p) for p in paths],'scope':'Preserved0670-test importfailure and ONE068 actualfixedsupport fixture. No runtime/controller/renderedmovement admission.'},indent=2),encoding='utf8');print(row(o))

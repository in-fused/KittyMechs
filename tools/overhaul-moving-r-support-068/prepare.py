from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'tools/overhaul-moving-r-support-067'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=json.loads((old/'source-seal.json').read_text());assert all(row(r/x['path'])==x for x in s['files']+s['protected'])
failure=r/'.sites-runtime/overhaul-20261010/moving-r067-provider-tests';v=json.loads((failure/'process-receipt.json').read_text());assert v['exitCode']==1 and all(x['match'] for x in v['inputsAfter'])
out=h/'ground-support.check.test.ts';assert not out.exists();out.write_text((old/'ground-support.check.test.ts').read_text().replace("../../../src/game/entities/groundSupport067","../../src/game/entities/groundSupport067"),encoding='utf8')
out=h/'ground-support.vitest.config.ts';assert not out.exists();out.write_text((old/'ground-support.vitest.config.ts').read_text().replace('tools/overhaul-moving-r-support-067/','tools/overhaul-moving-r-support-068/'),encoding='utf8')
paths={r/x['path'] for x in s['files']+s['protected']};paths.update([h/'ground-support.check.test.ts',h/'ground-support.vitest.config.ts',Path(__file__),old/'source-seal.json',old/'source-handoff.json',r/'tools/overhaul-root-round-027/run-seal.py']);paths.update(p for p in failure.rglob('*') if p.is_file())
out=h/'test-seal.json';assert not out.exists();out.write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['node','node_modules/vitest/vitest.mjs','run','--config','tools/overhaul-moving-r-support-068/ground-support.vitest.config.ts'],'scope':'Distinct068 fixture-only relative-import correction; original067source/failure unchanged; ONE30s attempt needs independent source gate. No game/provider edits.'},indent=2),encoding='utf8');print(row(out))

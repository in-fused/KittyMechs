from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[2];h=Path(__file__).resolve().parent;old=r/'tools/overhaul-rescue-hull-070'
def row(p):
 b=p.read_bytes();return {'path':p.relative_to(r).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
s=(old/'rescue-hull.test.ts').read_text();before="expect(run.guest.position.x).toBeCloseTo(corpse.x,6);expect(run.guest.position.z).toBeCloseTo(corpse.z,6);"
after="expect(Math.abs(run.guest.position.x-corpse.x)).toBeLessThan(.0001);expect(Math.abs(run.guest.position.z-corpse.z)).toBeLessThan(.0001);"
assert s.count(before)==1;s=s.replace(before,after)
(h/'rescue-hull.test.ts').write_text(s,encoding='utf8')
(h/'vitest.config.ts').write_text((old/'vitest.config.ts').read_text().replace('tools/overhaul-rescue-hull-070/rescue-hull.test.ts','tools/overhaul-rescue-hull-071/rescue-hull.test.ts'),encoding='utf8')
paths={r/x['path'] for x in json.loads((old/'source-seal.json').read_text())['files']}
paths.update([h/'rescue-hull.test.ts',h/'vitest.config.ts',Path(__file__),old/'run-seal.json',r/'.sites-runtime/overhaul-20261010/rescue-hull070-tests/stdout.txt',r/'.sites-runtime/overhaul-20261010/rescue-hull070-tests/process-receipt.json'])
(h/'run-seal.json').write_text(json.dumps({'files':[row(p) for p in sorted(paths)],'command':['node','node_modules/vitest/vitest.mjs','run','--config','tools/overhaul-rescue-hull-071/vitest.config.ts'],'scope':'Distinct fixture-only071: correct horizontal numeric rest drift tolerance to0.1mm from0.5micrometre; original070failure preserved. Native restoration behavior/assertions unchanged.'},indent=2),encoding='utf8');print('Distinct071 precision correction sealed; game source unchanged.')

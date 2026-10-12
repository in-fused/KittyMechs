"""Pure local math tests only; invokes installed Three oracle, never graft/job."""
from pathlib import Path
import ast, json, math, subprocess
from interpolation import sample_exact
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
oracle=json.loads(subprocess.check_output(['node',str(HERE/'step-boundary-oracle.mjs')],cwd=ROOT,text=True))
text=(ROOT/'tools/overhaul-identity57-runtime-005/inventory.py').read_text();tree=ast.parse(text)
code=ast.get_source_segment(text,next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='sample'))
ns={'math':math};exec(compile(code,'immutable005-linear-slerp','exec'),ns);linear=ns['sample'];rows=[]
for c in oracle['cases']:
    actual=sample_exact(c['path'],c['t'],c['times'],c['values'],'STEP',linear)
    assert list(actual)==c['expected'],c
    rows.append({'path':c['path'],'time':c['t'],'actual':list(actual),'expectedThree':c['expected']})
# LINEAR vectors still interpolate; STEP must never SLERP quaternions.
assert sample_exact('translation',2,[1,3],[(0,2,4),(4,6,8)],'LINEAR',linear)==(2,4,6)
q=sample_exact('rotation',2,[1,3],[(0,0,0,1),(0,0,1,0)],'LINEAR',linear)
assert all(abs(a-b)<1e-14 for a,b in zip(q,(0,0,math.sqrt(.5),math.sqrt(.5))))
for interpolation in ['CUBICSPLINE','UNKNOWN']:
    try:sample_exact('translation',2,[1,3],[(0,2,4),(4,6,8)],interpolation,linear)
    except RuntimeError as e:assert 'ANALYTICAL_SAMPLER_INTERPOLATION_UNSUPPORTED' in str(e)
    else:raise AssertionError('Unsupported interpolation accepted')
(HERE/'pure-interpolation-test-result.json').write_text(json.dumps({'status':'PASS_PURE_LOCAL_MATH_ONLY','STEPOracleCases':rows,'linearVectorAndSlerpPreserved':True,'CUBICSPLINEAndUnknownRejected':True,'BlenderBrowserExportBuildNativeJobs':0},indent=2)+'\n')
print(json.dumps({'STEPThreeOracleCases':len(rows),'LINEARVectorSlerp':'PASS','CUBICSPLINEUnknown':'STOP','heavyJobs':0}))

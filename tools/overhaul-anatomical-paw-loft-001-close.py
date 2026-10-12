"""Close the observed one-job source result without changing frozen inputs."""
from pathlib import Path
import datetime, hashlib, json
root = Path(__file__).resolve().parents[1]
folder = root / 'assets/source/overhaul-anatomical-paw-loft-001'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
if (folder/'closure.json').exists(): raise SystemExit('Closure exists; no overwrite.')
seal = json.loads((folder/'seal.json').read_text())
checks = []
for row in seal['files']:
    path = root / row['path']
    checks.append(dict(row,currentSha256=sha(path),currentBytes=path.stat().st_size))
    assert checks[-1]['currentSha256'] == row['sha256'] and checks[-1]['currentBytes'] == row['bytes']
receipt = json.loads((folder/'receipt.json').read_text())
assert receipt['status'] == 'SOURCE_FAILURE_STOP' and receipt['actualFrameCount'] == 1
state = json.loads((folder/'first-failure-full-state.json').read_text())
review = root/'docs/overhaul/critic/anatomical-paw-loft-001-result-review.md'
assert sha(review) == 'ddff26fa039e286e648cef561bdb93c1376e06a1617746f9d799d6ac6ee69113'
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
result = '''# Anatomical paw loft001 — closed source failure

One root-serialized Blender job69238 exited0, observed12:41:30UTC. Semantic result is SOURCE_FAILURE_STOP at plant tick0: one actual frame, no leg lift or claw cycle. Raw authoritative UTC12:40:50.935501→12:41:27.097822 (36.162321 seconds); PowerShell date rendering in local−04 is not a different raw clock.

The complete constructed diagnostic source has73 bones,88 new mechanical parts plus2 retained evaluated meshes,68,993 vertices and137,416 triangles. It preserves actual source catalog, full matching-clock bone/geometry state, copied editable master/rawGLB and three views. Failure92 rows comprise36 actual surface crossings and56 containment records; reverse parity into retained multisolid geometry has UNKNOWN union semantics, so these are not56 certified union penetrations. Retained vertices inside closed new chassis and real joint surface crossings establish the failure independently. The initial floor minimum−3.8743019104003906e−7 native metres is arithmetic-only evidence; no floor failure was reported.

Independent High result reviewDDFF26FA039E286E648CEF561BDB93C1376E06A1617746F9D799D6AC6EE69113 accepts constructed editable diagnostic components only and DENIES complete paw/source, movement, art, native/runtime and Gate1. All three actual views show jagged ankle joins, flat clipped toes and crowded stacked journal/pad rows under a sparse glossy body. No art approval, native force or ordinary gameplay evidence.

All11 frozen input rows remain exact; four protected hashes also match source receipt before/after. No shape, pose, angle, interface, threshold or helper repair/rerun follows. The literal factory correction and output namespace change did not change the intended geometry recipe. Future work needs a separately authorized underlying anatomy/load-surface/wrist-interface decision, not another offset or exemption loop. Full four-mech/three-map brief remains ACTIVE/INCOMPLETE. Production/public/build015 are unchanged;016 remains unadmitted.
'''
(folder/'RESULT.md').write_text(result,encoding='utf-8')
closure = {'status':'CLOSED_SOURCE_FAILURE_STOP','closedUtc':now,'sessionId':69238,'processExitCode':0,'observedProcessClosedUtc':'2026-10-10T12:41:30Z','rawStartUtc':receipt['startedUTC'],'rawCloseUtc':receipt['closedUTC'],'semantic':receipt['firstFailure'],'actualFrameCount':1,'rawInterferenceCounts':{'surface':36,'containmentRecords':56},'retainedMultisolidUnionParity':'UNKNOWN','sourceArtMotionNativeRuntime':'DENIED_UNQUALIFIED','criticResultSha256':sha(review),'sealedChecks':checks,'activeJobs':0,'writersClosed':True,'automaticRepairRetry':False,'goal':'ACTIVE_INCOMPLETE'}
(folder/'closure.json').write_text(json.dumps(closure,indent=2),encoding='utf-8')
files = [p for p in folder.iterdir() if p.is_file() and p.name!='output-seal.json']
output = {'createdUtc':now,'status':'CLOSED_PRESERVED_SOURCE_FAILURE','files':[{'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]}
(folder/'output-seal.json').write_text(json.dumps(output,indent=2),encoding='utf-8')
print(json.dumps({'closureSha256':sha(folder/'closure.json'),'outputSealSha256':sha(folder/'output-seal.json'),'files':len(files),'bytes':sum(p.stat().st_size for p in files),'closedUtc':now}))

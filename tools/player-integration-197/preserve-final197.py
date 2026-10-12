from pathlib import Path
import hashlib, json, shutil, os, datetime
r = Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
prior = r / '.sites-runtime/overhaul-20261010/handoff-075'
assert sha(prior / 'manifest.json') == '3233e3fb10b4eef11877c6e857187657bc95f508db593963c52ce8b262cb5984'
old = json.loads((prior / 'manifest.json').read_text(encoding='utf8'))
for x in old['files']:
    assert sha(prior / 'files' / x['path']) == x['sha256'], x['path']
assert sha(r / 'docs/overhaul/motion-design-reassessment-197.md') == '3971bdfb0c9f05b7f58ccfca085e229fd78d5d8d7d02ce9e663014a28c6fd5a4'
note = '''
## Final197 preservation and causal decision

075 VERIFIED: manifest3233e3fb10b4eef11877c6e857187657bc95f508db593963c52ce8b262cb5984;269files243779478B; all248 working runtime rows and437 frozen rows MATCH062. Ignored editable motion master/raw and144 composed frames included. This is source progress, not a playable upgrade.

Read-only motion-design-reassessment-197.md CLOSED SHA3971bdfb0c9f05b7f58ccfca085e229fd78d5d8d7d02ce9e663014a28c6fd5a4. Actual pure-UP elbows cross center before the composer; the source quad-rest elbow pole selects a medial upright branch. Final covariant R loft has an inward anatomical sign despite passing covariance checks. Axial keys are present and not erased; sampled pelvis-to-chest contraction gallop17.26mm/trot1.76mm/UP3.83mm, broad single-joint armor shells and no scapular carrier constrain visible shape. Numeric clearance did not establish anatomical correctness.

Root chooses alternative2 for the next motion design: coordinated source anatomy/articulation plus actual axial load and independent shoulder/elbow/wrist tasks, retaining immutable old detailed masters/material language. The existing57-rest/geometry freeze was a candidate preservation choice, not a user requirement. Another same-rig amplitude or clearance iteration is rejected. A new anatomy design must explicitly budget retargeted action compatibility, all original gameplay ownership and native body-envelope/camera before authoring/integration; no new anatomy job is authorized by this documentation alone. This does not reopen CLOSED architecture003 or discard networking/native world.

201 co-op specialist is preparing explicit retired encounter tokens and fresh same-life/current-health/native-rest handoff within unchanged177 budgets. Root approved protocol design, not actual play yet. No new server or port. Full goal remains ACTIVE/INCOMPLETE.
'''
def atomic(p, value):
    temp = p.with_name(p.name + '.197-final-tmp')
    temp.write_text(value, encoding='utf8')
    os.replace(temp, p)
p = r / 'docs/overhaul/player-integration-197-handoff.md'
atomic(p, p.read_text(encoding='utf8') + note)
p = r / 'docs/overhaul/resource-limit-handoff-20261010.md'
atomic(p, '# Verified197 preservation:075 manifest3233e3fb10b4eef11877c6e857187657bc95f508db593963c52ce8b262cb5984; final overlay076 contains this exact pointer.269files243779478B,248runtimeMATCH062. No playable upgrade. Motion causal reassessment chooses articulated source anatomy rather than another same-rig retune;201 co-op prep active, no actual play approval yet.\n\n' + p.read_text(encoding='utf8'))
dest = r / '.sites-runtime/overhaul-20261010/handoff-076'
dest.mkdir(exist_ok=False)
rows = []
for name in ['docs/overhaul/player-integration-197-handoff.md', 'docs/overhaul/resource-limit-handoff-20261010.md',
             'tools/player-integration-197/preserve-final197.py', '.sites-runtime/overhaul-20261010/continuation-verification-075.json']:
    p = r / name; q = dest / 'files' / name
    q.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, q)
    assert sha(p) == sha(q), name
    rows.append({'path': name, 'bytes': p.stat().st_size, 'sha256': sha(p)})
manifest = {**old, 'createdUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'parents': old['parents'] + [{'path': str(prior), 'manifestSHA256': sha(prior / 'manifest.json')}],
            'files': rows, 'count': len(rows), 'bytes': sum(x['bytes'] for x in rows),
            'scope': 'Final197 exact preservation and anatomy-ownership decision;201 static preparation pending, no new gameplay approval.'}
(dest / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
assert all(sha(dest / 'files' / x['path']) == x['sha256'] for x in rows)
out = {'status': 'VERIFIED', 'overlay': str(dest), 'manifestSHA256': sha(dest / 'manifest.json'),
       'count': len(rows), 'bytes': manifest['bytes'], 'prior075Verified': True}
(r / '.sites-runtime/overhaul-20261010/continuation-verification-076.json').write_text(json.dumps(out, indent=2), encoding='utf8')
print(json.dumps(out))

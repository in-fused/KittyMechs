from pathlib import Path
import hashlib, json, os, datetime

root = Path(__file__).resolve().parents[2]
run = root / '.sites-runtime/shader-startup-238'
assert run.is_junction()
assert run.resolve() == Path('D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238').resolve()
review = root / 'docs/overhaul/critic/player251-actual-review.md'
assert review.is_file(), 'Independent actual review must close first'
out = run / 'review254'
assert not (out / 'output-seal.json').exists(), 'Closed output is immutable'

def receipt(path):
    p = root / path
    return {'path': path, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}

refs = [
    'tools/overhaul-grounded-motion-250/source-seal.json',
    'tools/overhaul-grounded-motion-253/source-seal.json',
    'tools/overhaul-grounded-integration-252/source-seal.json',
    'tools/overhaul-player-controls-251/source-seal.json',
    '.sites-runtime/shader-startup-238/private252/output-seal.json',
    '.sites-runtime/shader-startup-238/public251/output-seal.json',
    '.sites-runtime/shader-startup-238/supervisor251/output-seal.json',
    'docs/overhaul/critic/grounded250-design-review.md',
    'docs/overhaul/critic/grounded252-source-review.md',
    'docs/overhaul/critic/player-controls251-observer-source-review.md',
    'docs/overhaul/critic/player251-actual-review.md',
    'assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend',
]
missing = [p for p in refs if not (root / p).is_file()]
assert not missing, missing
manifest = {
    'writer': 'CLOSED', 'goal': 'ACTIVE_INCOMPLETE',
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'publicUpgradeApproved': False, 'affectedHumanLagResolved': False,
    'scope': 'One materially changed private252 build and one actual251 two-client controls observation; original-video CPU review only. No public promotion.',
    'storage': {'terminal': '4811be_EXIT0', 'scratchGiB':34.77,'historyGiB':0.15,'CFreeGiB':40.17,'DFreeGiB':688.52,'deleted':0},
    'health': {'status':'ok','rooms':0,'players':0,'tickRate':60,'listener':8799,'pid':370280,'edgeOrBlenderCount':0},
    'limitations': ['Limited material-point arithmetic is not force/contact or whole-gait approval.', 'Instrumented mixed RAF is not a matched human-lag benchmark.', 'Video timestamps approximate scenario labels and cadence may alias.', 'Paired combat, climbing, destruction and cooperative mission were not tested by251.'],
    'references': [receipt(p) for p in refs],
}
(out / 'change-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
rows = [receipt(p.relative_to(root).as_posix()) for p in sorted(out.rglob('*')) if p.is_file()]
(out / 'output-seal.json').write_text(json.dumps({'writer':'CLOSED','goal':'ACTIVE_INCOMPLETE','files':rows},indent=2),encoding='utf-8')
print(json.dumps({'writer':'CLOSED','files':len(rows),'outputSeal':receipt((out/'output-seal.json').relative_to(root).as_posix())}))

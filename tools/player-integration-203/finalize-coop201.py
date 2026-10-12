from pathlib import Path
import hashlib, json, shutil, subprocess, os, datetime
r = Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
seal = r / 'tools/overhaul-coop-201/source-seal.json'
assert sha(seal) == 'cfab5008d83a72391ff915620ba36236887b49c626e83fc15798b5de6b6eb909'
old = json.loads(seal.read_text(encoding='utf8'))
dest = r / '.sites-runtime/overhaul-20261010/coop201-source-initial'
dest.mkdir(exist_ok=False)
for row in old['files']:
    p = r / row['path']; assert sha(p) == row['sha256'], row['path']
    q = dest / 'files' / row['path']; q.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, q); assert sha(q) == row['sha256']
shutil.copy2(seal, dest / 'source-seal.json')
assert sha(dest / 'source-seal.json') == 'cfab5008d83a72391ff915620ba36236887b49c626e83fc15798b5de6b6eb909'
def atomic(p, text):
    tmp = p.with_name(p.name + '.203-tmp'); tmp.write_text(text, encoding='utf8'); os.replace(tmp, p)
p = r / 'tools/overhaul-coop-201/mission-capture.mjs'
text = p.read_text(encoding='utf8')
before = "if(post.actor.hp<=0){record.exit='pilot-downed';throw Error(name+' downed during encounter');}"
after = "if(post.actor.hp<=0){record.exit='pilot-downed';const error=Error(name+' downed during encounter');if(post.actor.hp===0&&post.actor.downed){error.actorDowned=true;error.rescueRequired201=name;}throw error;}"
assert text.count(before) == 1
atomic(p, text.replace(before, after))
report = {'writer': 'OPEN', 'scope': 'Root final static correction before first actual201 play; second post-aim down branch now uses same typed actual hp0/downed rescue as pre-aim branch.',
          'parentSealSHA256': sha(dest / 'source-seal.json'), 'parentArchive': str(dest),
          'before': before, 'after': after, 'checks': []}
out = r / 'tools/overhaul-coop-201/root-static-correction203.json'
out.write_text(json.dumps(report, indent=2), encoding='utf8')
for command in [['C:/Program Files/nodejs/node.exe', '--check', str(p)],
                ['C:/Program Files/nodejs/node.exe', '--import', 'tsx', 'tools/overhaul-coop-201/protocol-fixture.mjs']]:
    done = subprocess.run(command, cwd=r, text=True, encoding='utf8', capture_output=True, timeout=30)
    report['checks'].append({'command': command, 'exitCode': done.returncode, 'stdout': done.stdout, 'stderr': done.stderr})
    out.write_text(json.dumps(report, indent=2), encoding='utf8')
    assert done.returncode == 0, report['checks'][-1]
report['writer'] = 'CLOSED'; report['status'] = 'PASS_STATIC_ONLY_ACTUAL_PLAY_PENDING'
out.write_text(json.dumps(report, indent=2), encoding='utf8')
p = r / 'docs/overhaul/coop201-handoff.md'
atomic(p, p.read_text(encoding='utf8') + '\nRoot203 final static closure correction: original CLOSED cfab5008 packet copied and hash-verified byte-exact in .sites-runtime/overhaul-20261010/coop201-source-initial BEFORE editing. The second post-aim hp0/downed branch had retained an untyped error and could bypass rescue classification. It now uses the same actual hp===0/downed typed dispatch as the pre-aim branch. One node syntax and existing saved-health/order fixture were rerun after this edit, PASS; no actual browser run or new protocol variant. root-static-correction203.json records commands/operands. Original packets remain recoverable; final source seal supersedes initial source readiness.\n')
p = r / 'tools/overhaul-coop-201/static-receipt.json'
static = json.loads(p.read_text(encoding='utf8'))
static['rootFinalCorrection'] = 'root-static-correction203.json; final main syntax and saved-health/order fixture PASS; initial source packet archived before correction.'
for row in static.get('sourceHashes', []):
    if 'path' in row:
        q = r / row['path']
        if q.is_file(): row['sha256'] = sha(q)
atomic(p, json.dumps(static, indent=2))
paths = {row['path'] for row in old['files']} | {'tools/overhaul-coop-201/root-static-correction203.json'}
final = {**old, 'parentArchive': str(dest), 'parentSealSHA256': sha(dest / 'source-seal.json'),
         'closedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'files': [{'path': name, 'bytes': (r/name).stat().st_size, 'sha256': sha(r/name)} for name in sorted(paths)]}
atomic(seal, json.dumps(final, indent=2))
assert all(sha(r / row['path']) == row['sha256'] for row in final['files'])
print(json.dumps({'status': 'FINAL_SOURCE_READY', 'sealSHA256': sha(seal), 'mainSHA256': sha(r/'tools/overhaul-coop-201/mission-capture.mjs'), 'count': len(final['files']), 'parentArchiveVerified': True}))

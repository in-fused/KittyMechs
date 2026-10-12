from pathlib import Path
import json,hashlib,re,subprocess
root=Path('.');out=Path('tools/overhaul-coop-204')
def row(p):
 b=p.read_bytes();return {'path':p.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
parent=Path('tools/overhaul-coop-201/source-seal.json')
assert row(parent)['sha256']=='2045aa6f91aebca672cd23a56fcb44edd7998c7af3127bfd78d037c81eb03e48'
old=json.loads(parent.read_text(encoding='utf8'))
for r in old['files']:assert row(Path(r['path']))==r,r['path']
a=Path('tools/overhaul-coop-201/mission-capture.mjs').read_text(encoding='utf8');b=(out/'mission-capture.mjs').read_text(encoding='utf8')
pattern=r"'[^'\r\n]*[^\x00-\x7f][^'\r\n]*'"
assert re.findall(pattern,a)==re.findall(pattern,b),'Non-ASCII public selector bytes changed'
assert 'motionToken:()=>motion201.active()' in b
for p in ['controller.mjs','mission-capture.mjs','command-envelope.mjs','geometry204.mjs','fixture204.mjs']:
 subprocess.run(['node','--check',str(out/p)],check=True,timeout=10)
protected=[Path(r['path']) for r in old['files']]+[parent,Path('docs/overhaul/critic/coop201-actual-review.md'),Path('.sites-runtime/overhaul-20261010/coop201-public/evidence.json'),Path('.sites-runtime/overhaul-20261010/coop201-public/native-keyframes.json'),Path('.sites-runtime/overhaul-20261009/build-062/receipt.json')]
# Actual imported local source closure: source-only hashes, no game execution.
seen=set();todo=[out/'mission-capture.mjs',out/'fixture204.mjs']
while todo:
 p=todo.pop().resolve()
 if p in seen:continue
 seen.add(p)
 if p.suffix not in ['.mjs','.ts','.tsx','.js','.json']:continue
 text=p.read_text(encoding='utf8')
 for relative in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",text):
  q=(p.parent/relative).resolve()
  if not q.exists():
   q=next((Path(str(q)+suffix) for suffix in ['.ts','.tsx','.mjs','.js','.json'] if Path(str(q)+suffix).exists()),q)
  assert q.is_file(),str(q)
  todo.append(q)
protected+=list(seen)+[Path('src/game/input.ts'),Path('src/game/camera/CameraRig.tsx'),Path('shared/simulation.ts'),Path('shared/math.ts'),Path('shared/config.ts')]
protected=[p.resolve().relative_to(root.resolve()) for p in protected]
(out/'protected-inputs.json').write_text(json.dumps({'writer':'CLOSED','files':[row(p) for p in sorted(set(protected))]},indent=2)+'\n',encoding='utf8')
(out/'static-receipt.json').write_text(json.dumps({'status':'PASS','syntaxFiles':5,'selectorBytes':'MATCH_201','retained201Files':'ALL_MATCH_FINAL_SEAL','motionTokenInjection':'EXPLICIT_PRESENT','fixture':'ONE_FAILURE_ONE_REPAIR_PASS7','actualPublic204':'NOT_RUN','bounds':{'workMs':420000,'cleanupMs':30000,'childMs':450000,'rootMs':480000,'iterationsPerWaypoint':35,'routeWaypoints':12,'routeEvents':4}},indent=2)+'\n',encoding='utf8')
paths=[p for p in out.rglob('*') if p.is_file() and p.name!='source-seal.json']+[Path('docs/overhaul/coop204-design.md')]
(out/'source-seal.json').write_text(json.dumps({'writer':'CLOSED','status':'SOURCE_CANDIDATE_UNADMITTED_UNRUN','files':[row(p) for p in sorted(paths)]},indent=2)+'\n',encoding='utf8')
print(json.dumps({'seal':row(out/'source-seal.json'),'main':row(out/'mission-capture.mjs'),'controller':row(out/'controller.mjs'),'handoff':row(out/'HANDOFF.md'),'protectedRows':len(set(protected))}))

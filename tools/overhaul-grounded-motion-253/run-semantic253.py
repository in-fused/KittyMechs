from pathlib import Path
import hashlib, json, shutil, subprocess, time
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).parent
receipt={'scope':'one authorized normalized-orientation fixture; no runtime edits','steps':[]}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
runtime_names=['groundedFeet253.ts','footClock253.ts','sourceTask253.ts','nativeOwner253.ts','NativeActor253.tsx','skinSole250.ts','contactObservation253.ts']
before={name:sha(HERE/name) for name in runtime_names}
try:
 fixture=(HERE/'motion253.test.ts').read_text()
 assert 'const rawAngle=' in fixture and 'clone().normalize().angleTo' in fixture
 assert 'rawSelfAngle>2e-5' in fixture and 'fixedChildEndpointDifference' in fixture
 assert 'RELEASE_ORIENTATION_DISCONTINUITY' in fixture and 'INDEPENDENT_SAME_VERTEX_MISMATCH' in fixture
 assert (HERE/'preimages/first253-actual-cases253.json').is_file()
 assert (HERE/'preimages/duplicate-raw-angle-actual-cases253.json').is_file()
 receipt['fixtureSHA256']=sha(HERE/'motion253.test.ts');receipt['runtimeBefore']=before
 node=shutil.which('node');assert node
 commands=[('type',[node,str(ROOT/'node_modules/typescript/bin/tsc'),'--project',str(HERE/'tsconfig253.json')],15),('fixture',[node,str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(HERE/'motion253.test.ts')],30)]
 for label,command,cap in commands:
  start=time.monotonic();result=subprocess.run(command,cwd=ROOT,capture_output=True,timeout=cap)
  (HERE/(label+'-semantic253.stdout')).write_bytes(result.stdout)
  (HERE/(label+'-semantic253.stderr')).write_bytes(result.stderr)
  receipt['steps'].append({'name':label,'command':command,'capSeconds':cap,'exit':result.returncode,'elapsedSeconds':time.monotonic()-start})
  (HERE/'semantic-terminal253.json').write_text(json.dumps(receipt,indent=2))
  if result.returncode:break
 receipt['runtimeAfter']={name:sha(HERE/name) for name in runtime_names}
 assert before==receipt['runtimeAfter']
except Exception as error:
 receipt['wrapperFailure']=repr(error)
finally:
 (HERE/'semantic-terminal253.json').write_text(json.dumps(receipt,indent=2))
 print(json.dumps(receipt))
 if receipt.get('wrapperFailure') or any(s['exit'] for s in receipt['steps']):raise SystemExit(1)

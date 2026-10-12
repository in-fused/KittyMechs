from pathlib import Path
import json,hashlib,datetime
r=Path(__file__).resolve().parents[2]
p=r/'tools/overhaul-art-player-038.mjs';s=(r/'tools/overhaul-art-player-037.mjs').read_text()
s=s.replace('art-player-037','art-player-038').replace('localhost:8803','localhost:8804').replace('Fresh build030 strikeintent036 and pause037','Fresh build031 levelview038, strikeintent036 and pause037')
old=" await host.keyboard.down('KeyI');try{await wait('public level look restored',s=>s.r.input.look.pitch>=.04,2500);}finally{await host.keyboard.up('KeyI');}"
new=" await host.keyboard.press('KeyV');await wait('public V level view settled',s=>s.r.input.look.pitch>=.03&&s.r.input.look.pitch<=.09&&!s.r.input.look.levelView&&!s.r.input.keys.includes('KeyV'),3000);await sample('explicit level view settled after deliberate dive');await host.screenshot({path:resolve(output,'level-recovery.png')});"
assert old in s;s=s.replace(old,new,1)
s=s.replace("  await sample('ordinary dynamically steered road destination '+z);","  await sample('ordinary dynamically steered road destination '+z);if(s.r.input.look.pitch<.03||s.r.input.look.pitch>.09)throw Error('Level view lost on ordinary route');await host.screenshot({path:resolve(output,'road-'+Math.abs(z)+'.png')});",1)
p.write_text(s)
doc=r/'docs/overhaul/level-view-038.md'
doc.write_text('''# Explicit level view038

Player problem: after looking down for a dive, manually holding I overshot to +.54312 and obscured ordinary streets in037. V (or touch LEVEL VIEW) now recovers smoothly to +.06 without changing yaw or movement. Vertical mouse, I/K or touch aim cancels recovery; pause/blur cancels it. Native movement/contact/strike thresholds, assets and CameraRig are unchanged. Deliberate down-look dives remain available before V.

Bounded root implementation, independent High critic. One focused installed-control test run, one build, one public two-client capture retaining pounce/pin, moving stances, jumps, deliberate dive and three streets. Capture requires settled [.03,.09] and released V before touring. Screenshots/video judge camera readability; tests cannot approve art/gait/contact or Gate1. First genuine failure stops this packet. No automatic repair chain. Source/review target22:17, actual review22:28, cleanup22:30UTC.

Disk constraint: no deletions. Freeze031 reuses only SHA-matching immutable030 files via hardlinks; changed source/build files copied. Mutable workspace files are never hardlinked. Checkpoint assets are immutable across both builds. Build031 is unapproved until independent result review;028 remains recommended.
''')
paths={x['path'] for x in json.loads((r/'tools/overhaul-root-round-029/player037-test-seal.json').read_text())['files']}
paths.update(['src/ui/Hud.tsx','src/ui/TouchControls.tsx','tools/overhaul-art-player-038.mjs','tools/overhaul-root-round-030/prepare038.py','tools/overhaul-root-round-030/implement038.py','docs/overhaul/level-view-038.md'])
rows=[{'path':p,'bytes':(r/p).stat().st_size,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest()} for p in sorted(paths)]
for mode,cmd,cap in [('test',['cmd.exe','/d','/c','node_modules\\.bin\\vitest.cmd run tests/feline-strike-input.test.ts tests/overhaul-view-input.test.ts tests/overhaul-view-aim.test.ts tests/strike-intent-036.test.ts --maxWorkers=1 --no-file-parallelism'],90),('build',['cmd.exe','/d','/c','npm.cmd run build'],180),('capture',['node','tools/overhaul-art-player-038.mjs'],150)]:
    target=r/f'tools/overhaul-root-round-030/player038-{mode}-seal.json';assert not target.exists()
    target.write_text(json.dumps({'frozenUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':rows,'command':cmd,'inclusiveCapSeconds':cap,'scope':'ONE level-view038 integration; stop on first genuine failure'},indent=2))
print(json.dumps({'rows':len(rows),'sourceFrozen':True}))

from pathlib import Path
import json, hashlib, datetime
r=Path(__file__).resolve().parents[2]
closure=r/'tools/overhaul-mission-traversal-040/critic-result-closure.json'
assert closure.is_file(), 'Independent result closure required'
review=r/'docs/overhaul/critic/mission-traversal-040-result-review.md'
assert review.is_file()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
text=f'''

## Closed packet040 and exact continuation032

Updated {datetime.datetime.now(datetime.timezone.utc).isoformat()}. Packet040 is CLOSED; full finite overhaul remains ACTIVE / INCOMPLETE. No shipping production changes, no new build, no mission-capture retry, no promotion. Build031/8804 remains the reviewed LIMITED FUNCTIONAL PREVIEW. Build032/8805 remains a preserved diagnostic candidate with locally improved extraction facades; finished art, contact, universal climbing, destruction and full Gate1 remain unaccepted.

One immutable032 native diagnostic completed twelve comparisons in7.219s inclusive, exit0, all14input rows unchanged. Four mission-spine4 cases reached the shipping endpoint for Pounce/Bastion in both stances (.0451-.2783m final distance; maximum lateral .000841m). Eight relay-link1/west-return2 fixtures started penetrating old maintenance2 (.724-.888m) or forecourt4 (.119m); they are invalid fixture observations, not ordinary traversal blockage proof. Eleven unchanged synthetic .05m contract failures remain. No production fix justified.

ONE public two-client CO-OP attempt stopped during staging,34.219s inclusive, exit1, all14inputs unchanged: different shared-world hashes at room2BC2FF tick652. No required relay/core/extraction phase, navigation, organic revive, new climb or support collapse was qualified.110same-tick comparisons:109match,1mismatch. Independent derived reconstruction of the retained guest652 state, removing ONLY the newly inserted MissionGuest, reproduces the exact recorded host652 world and actor hashes. Raw host652 fullstate was not keyframed. This supports a join-state identity boundary, not divergent physics; future parity evidence needs an explicit snapshot revision or causal join boundary, without omitting world fields. The failed first attempt stays failed and must not be renamed or rerun. No production mutation followed.

Evidence .sites-runtime/overhaul-20261010/mission-traversal-040-native and mission-traversal-040-public; raw root receipts mission040-native-process and mission040-public-process. Actual failure.png and original host video preserved; video SHA789365e16bc414ee2f86e3792046f0d357bbf094a789cb7efbdc42a9511e50f5. One 2Hz relative-PTS board in mission-traversal-040-motion. Full native keyframes26,1177110B; evidence271029B, progress262372B. Actual result seal17rows17506507B. Independent review SHA{sha(review)}; closure SHA{sha(closure)}. Source/diagnostic/result jobs and writers closed.

Latest allowance23:13UTC84%used/16%remaining, ordinary usage allowed. Reserve final10% for verifying playable roots and exact handoff. Do not redeem resets or declare completion at the allowance boundary. Continue finite actual player/art/contact improvements within the existing architecture; do not restart engine comparison, repeat full repository research, or create proof-only loops. Whole-hand source032 still fails IntegratedWristArmor nonrigidweights; do not omit armor or alter weights/matrices merely to force a certificate.

Require .sites-runtime/overhaul-20261010/continuation-verification-032.json VERIFIED after copying. Exact restore: preserved-007/files, then handoff-027/files,029/files,030/files,031/files,032/files IN ORDER. These names refer to .sites-runtime/overhaul-20261009/preserved-007 and .sites-runtime/overhaul-20261010/handoff-* respectively. No deletions. Large ignored editable assets remain in verified027;039 Blender master in031;040 sources/decisions in032. Runtime evidence and frozen playable roots remain at original paths. Never restore failed incomplete028. Never edit any immutable frozen roots or shared hardlinks.

All original scope remains required: convincing feline quadruped and upright transformation, coordinated paired combat, climbing on every supported building, consequential support destruction/persistent ruins, dependable cooperative checkpoint/revive/lifecycle; detailed distinct four mechs, dense three maps, all modes/progression/pickups/audio/loading/performance. First district is not final scope. Passing tests or preserving a limited preview does not complete this goal.
'''
for name in ['current-state.md','resource-limit-handoff-20261010.md','active-bounded-work-20261010.md','playable-checkpoints.md']:
 p=r/'docs/overhaul'/name
 old=p.read_text(encoding='utf8')
 assert '## Closed packet040 and exact continuation032' not in old
 if name=='resource-limit-handoff-20261010.md':old=old.replace('# Exact continuation handoff031','# Exact continuation handoff032',1)
 p.write_text(old+text,encoding='utf8')
print('040 truth and exact032 recovery instructions saved; copy+verify still required')

from pathlib import Path
import hashlib
r=Path(__file__).resolve().parents[2]
p=r/'docs/overhaul/critic/startup-rig-055-result-review.md'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='04d0d3eb464cdd2a05617ea8821e7e5b4f9ea2f70219f7694ec37948f90e5863'
p=r/'docs/overhaul/startup-rig-055-result-handoff.md';s=p.read_text(encoding='utf8')
old='Independent actual055 result review is pending at initial handoff writing; consult docs/overhaul/critic/startup-rig-055-result-review.md and final closure before any retention/promotion claim.038 is currently served for the candidate test; never infer full acceptance from being live.'
assert old in s
s=s.replace(old,'Independent actual055 result review CLOSED: RETAIN038 as a LIMITED startup checkpoint. Review SHA04d0d3eb464cdd2a05617ea8821e7e5b4f9ea2f70219f7694ec37948f90e5863; closureSHAbda7e0d99c2d17879650d71f29c94f184ebcd7670bf42b157ec5d0e0b13f053a. Both own PNGs and exact native/visual fields were independently inspected; original videos preserved rather than claimed fully reviewed. DENY dependable/repeated startup, fullmission, performance improvement, art/contact and Gate1.038 is the live LIMITED default on the same8799address. All writers/heavy jobs closed. Latest ordinary usage allowed,93%used/7%remaining; no reset credit redeemed.')
p.write_text(s,encoding='utf8')
current='''# Current finite KittyMech overhaul

Full goal ACTIVE / INCOMPLETE under docs/research/new-overhaul-task-prompt-20261009.md. Architecture003 closed. No Unreal, paid generation, recurring loops or quota-completion claims. Lead SolMedium; hard specialists/critic SolHigh; Standard speed requested.

Live http://localhost:8799/?overhaul=1 serves independently accepted LIMITED STARTUP CHECKPOINT038, receipt02aa67e8cc26074a035540dfd6a0e5babf750ac73cc676c833b67788e9ec1a9c, session62009/pid351268. Same address reused, idle037 server stopped only after0rooms/players verification; all immutable roots/source assets preserved.

055 resolves the actual initially selected public034 Pounce rig before World/Session descent and shares the exact cache URL with the actor. Standard prerequisites, late toggles/fallbacks, native ownership and genuine completed-visual readiness stay intact.10focused existing checks and one build passed. ONE normal two-client startup passed: host8.339s/guest14.090s within unchanged20s, both own self/peer views and actual bound owner/completed eight-corner visual,115exact publication comparisons matched. No profiler/injection/mission navigation/retry. Critic retains038 LIMITED; dependable repeated startup/fullmission/performance/art/contact/Gate1 are DENIED.

054 instrumented unchanged037 startup failed and preserved profiles/traces: guest model transfers finished but owner absent; substantial sampled first-use shader/program work, not proof of prior sole cause/GPUtime or uninstrumented FPS. Earlier045/053 failures remain. Taylor's extreme Lowest-setting lag remains unresolved in actual IAB; CUA fails kernel-assets os3. Screenshot33host/20guestFPS in055 is not qualification.

038 retains036 moving-fire gait/startup fixes and037 native squad-extraction guard (every connected pilot alive/inside4.5m;27native tests passed earlier). Movement/contact/combat/art/destruction/complete mission acceptance remains outstanding.050 head-reaction candidate is quarantined, never shipped or retried. Four distinct mechs/three populated maps/modes/progression/weather/audio/performance extension remains required after accepted integrated district; Gate1 is unaccepted.

Current cleanup: healthok0rooms0players,0matchingownedheadless launches,sole8799listener351268; current inventory only. All writers/heavy jobs closed.93%used/7%remaining ordinary usage allowed. Exact055 evidence/verdict/hashes, restore chain and bounded next normal checkpoint/revive/play action: docs/overhaul/startup-rig-055-result-handoff.md. New source delta037 usable only after continuation-verification-037 VERIFIED; parent036 verified. Full earlier state is preserved in source deltas. No further job in this packet.
'''
(r/'docs/overhaul/current-state.md').write_text(current,encoding='utf8')
prefix='> FINAL054/055: Live8799 now serves independently accepted LIMITED startup038 (receipt02aa67e8cc26074a035540dfd6a0e5babf750ac73cc676c833b67788e9ec1a9c,session62009/pid351268). Exact initial selected034 dependency order fixed;10tests/buildPASS, ONEordinary two-client startupPASS8.339s/14.090s at20s boundary,115publicationmatches/bothownviews. Fullmission/dependable startup/performance/art/contact/Gate1 DENIED; goal ACTIVE / INCOMPLETE.93%used/7%remaining. Exact handoff docs/overhaul/startup-rig-055-result-handoff.md. Source delta037 valid only after continuation-verification-037 VERIFIED. Older defaults below historical.\n\n'
for name in ['playable-checkpoints.md','resource-limit-handoff-20261010.md','active-bounded-work-20261010.md']:
 p=r/'docs/overhaul'/name;p.write_text(prefix+p.read_text(encoding='utf8'),encoding='utf8')
print('055 final handoff/current default recorded; full goal incomplete.')

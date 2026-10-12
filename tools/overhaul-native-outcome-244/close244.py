from pathlib import Path
import json, hashlib, os
r=Path(__file__).resolve().parents[2]
out=r/'.sites-runtime/shader-startup-238/review244'
assert out.parent.is_junction()
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(p,text):
 p.parent.mkdir(parents=True,exist_ok=True)
 tmp=p.with_name(p.name+'.tmp244');tmp.write_text(text,encoding='utf-8');os.replace(tmp,p)
provenance={'writer':'CLOSED','scope':'Previously decoded actual242 host video; no new game execution','orderedGrid':'ordered-pose-grid.png','composition':'24 samples from existing 12FPS frames, video18 through23.75 seconds at quarter-second intervals; 6 columns by4 rows; cropped actual pixels','limitations':'Sampling can alias gait. Video timestamps are not native/Node clocks. No per-paw world support/contact measured.','fullFrameIdentity':'Root inspected PROGRAM242HOST HUD in first-full-frame.png','critic':'docs/overhaul/critic/program242-actual-review.md'}
atomic(out/'composition-provenance.json',json.dumps(provenance,indent=2))
rows=[{'path':p.relative_to(r).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(out.rglob('*')) if p.is_file() and p.name!='output-seal.json']
assert not (out/'output-seal.json').exists()
atomic(out/'output-seal.json',json.dumps({'writer':'CLOSED','scope':'CPU review of actual242 retained recording; no replay; critic rejects convincing gait/public upgrade','files':rows},indent=2))
handoff='''# Current handoff — ACTIVE / INCOMPLETE

This supersedes player-integration-236-handoff.md. Architecture003 remains closed. Full brief remains four distinct mechs, three populated maps and accepted movement/combat/climbing/destruction/cooperative missions; no district or final milestone accepted.

Game Studio and Game Playtest were read October9 at23:00:16UTC (7:00PM EDT), within the first minute of this overhaul. Actual Playwright/browser testing and local Blender authoring were used. Companion game-dev CLI was unavailable. Evidence: tools/player-integration-193/plugin-usage-audit193.json. Reading a skill does not imply every optional plugin tool ran. The X post remains inaccessible (403).

Storage prerequisite now passes under owner AGENTS.md policy: 48GiB scratch cap, 2GiB history, C>=30GiB and D>=100GiB. Last cleanup terminal0: scratch34.17/history0.15/C40.22/D689.12GiB; deleted0. Bulky current run is C junction .sites-runtime/shader-startup-238 -> D:/CodexStorage/KittyMech-Web/.sites-runtime/shader-startup-238. No historical snapshot reconstruction. Preserve ordinary editable assets/source/overhaul-anatomy-motion-202/Pounce_Anatomy202.blend and authoring sources.

Public LIMITED062 unchanged, http://localhost:8799/, sole listener PID370280, retained exec9510/native birth134362153569448006. Latest health ok/0rooms/0players/60Hz; no Edge/Blender jobs. Before replacing verify exact identity/receipt/idle, stop and consume9510, reuse8799. User Lowest ON/OFF severe lag remains unresolved.

CLOSED238 first actual234 browser attempt failed finite shader queue exhaustion before body draw. Exact changing signature field unknown; do not replay or claim timeout. CLOSED240 replaces self-invalidating scene-property signature with renderer-selected program identities and bounded current-body program ownership. Same20-second startup/max4 accepted sets; one animation owner and canonical222 registry retained. Capture ceases after admission. Sources tools/overhaul-shader-variant-240, integration241, observer242. No more shader retuning justified by subsequent result.

CLOSED241 one private build terminal0/session35733/24.735s; single canonical helper/Canvas/owner/registry verified. Output .sites-runtime/shader-startup-238/private241. CLOSED242 one actual two-client run terminal1/session36395/39.687s, all10 cleanup operations closed,28 known process identities retired, protected before/after match, errors0. Both clients completed body/input/canvas admission within original20s: host5.603s, guest8.843s. Host actual W/S traveled4.7879/4.6648m, legs visibly articulate. S autofaces travel by about pi, not true backpedal. Test stops at wrong idle-J body-yaw assertion; original failure preserved. R, air, pair, guest movement and remaining lifecycle cases UNRUN.

CLOSED243 source diagnosis: J/L are LOOK. Stationary body stays still while look/aim changes; body turns under movement/action. Earlier neutral940 predates keyup; released stable955 not acknowledged at952, later989 acknowledges it. Future distinct scenario must verify idle look/camera/aim plus post-keyup stable packet ACK; test actual body steering separately with aligned W+J/W+L. Do not change runtime merely to satisfy erroneous oracle.

CLOSED244 CPU review decodes original host recording only; 12FPS/quarter-second crops can alias motion, video time differs from native clock. Current actual-summary and ordered-pose-grid in review244. Independent program242 critic accepts private startup and visible articulation ONLY; rejects grounded feline gait, suspended-looking short paw strokes, subtle load transfer and overall presentation. No player upgrade, matched steady-FPS/human-lag, contact, combat, climbing, destruction or co-op approval.

Next finite implementation work: align distinct player-control observation and inspect real moving steering plus both upright transformations. Diagnose actual rendered paw/support/load behavior before changing geometry/stride/pose ownership; no invented pixel-to-world contact claims. Make a coordinated motion improvement where evidence supports it and have High independent critic inspect actual temporal gameplay. Do not repeat full prior runs for green tests, reopen architecture, add listeners or build archive chains. All specialists now idle; max2 implementation plus critic, Sol6.1 High for difficult physics/animation/review, lead Medium/Standard. Goal stays ACTIVE and explicitly incomplete.
'''
atomic(r/'docs/overhaul/player-integration-245-handoff.md',handoff)
atomic(r/'docs/overhaul/resource-limit-handoff-20261010.md',handoff)
refs=['docs/overhaul/player-integration-245-handoff.md','docs/overhaul/critic/program242-actual-review.md','docs/overhaul/control243-diagnosis.md','tools/overhaul-shader-variant-240/shaderStartup240.tsx','.sites-runtime/shader-startup-238/private241/output-seal.json','.sites-runtime/shader-startup-238/public242/output-seal.json','.sites-runtime/shader-startup-238/supervisor242/output-seal.json','.sites-runtime/shader-startup-238/review244/output-seal.json']
manifest={'writer':'CLOSED','scope':'Small source/reference manifest; no source snapshot, junction traversal or historical archive reconstruction','references':[{'path':p,'sha256':sha(r/p)} for p in refs]}
atomic(r/'tools/overhaul-native-outcome-244/change-manifest.json',json.dumps(manifest,indent=2))
print(json.dumps({'writer':'CLOSED','reviewFiles':len(rows),'reviewSeal':sha(out/'output-seal.json'),'handoff':'docs/overhaul/player-integration-245-handoff.md'}))

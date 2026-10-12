from pathlib import Path
import hashlib, json, os

r = Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
seals = {}
for n in (197, 198, 199, 200):
    folder = 'overhaul-phase-transition-197' if n == 197 else f'overhaul-far-city-{n}'
    p = r / 'tools' / folder / 'source-seal.json'
    data = json.loads(p.read_text(encoding='utf8'))
    assert data['writer'] == 'CLOSED'
    for row in data['files']:
        assert sha(r / row['path']) == row['sha256'], row['path']
    seals[n] = sha(p)
critic = r / 'docs/overhaul/critic/phase-transition197-source-review.md'
assert sha(critic) == 'faa9dcfe92dd2b163f1d2ec660bcfa143985b37dcfe941f9fac5904d05936669'
text = f'''# Continuation197 CLOSED — source motion rejected; city authoring stopped

The full finite overhaul remains ACTIVE/INCOMPLETE. Retained062 is still the sole playable8799, PID370280/session9510; root observed its live session and listener this continuation. Receipt5b7a3bdafbfbd1af414f8d7cbb62beb7bf12ca31125b4d06f5b9a691f18ec70c. No063, production source-task import, new public asset or gameplay upgrade. Human Lowest OFF/ON extreme lag remains unresolved. Previous plugin-response turn verified original GameStudio usage and dispatched review, not a playable improvement. Completed197 source work and the independent verdict are actual new evidence changing next action.

197 completed one editable phase-conditioned choreography and source-task composer, retained57-joint rest/geometry/39 original clips and lossless appended animation streams. Actual master02e36882a4112678369c2cb4330401ce54113426b4b078657a1b2a2e73bcd176; delivery825f13b1fda3fc80ee1b29431c7c19d602699752a0cbc03d38e2027d7d116762. Author terminal0/69.515s; final primary cubic browser decoder terminal0/9.875s,1958 cases; composed-pose preview terminal0/22.265s,144 PNGs/nine temporal boards. Exact loaded-source normal max19.958818um and source-parent covariance pass are not native material contact, art or human-performance approval. The original196 HR -12.273mm counterexample was reproduced before comparison. Idle-R coverage and source-frame protocol were repaired with exact first/second revisions preserved, explicit root authorization and unchanged numerical/visual guards; no further variant.

Independent critic DENY_SOURCE_INTEGRATION197, SHA{sha(critic)}. All nine boards and selected full frames reviewed. Lower/outboard R forepaw return is visibly improved; gallop thorax remains largely straight and upright forearms cross at the waist. Do not integrate the extra owner/cost into the playable checkpoint. Two source visual rejections194/197 require underlying visual-load/anatomy/independent-upper-body reassessment, not another amplitude/sample/clearance iteration. Bounded read-only source diagnosis is recorded separately in motion-design-reassessment-197.md when closed; it does not authorize another authoring job.

198/199 produced no far-city asset.198 crashed at legacy Blender CustomData copying, then stopped after a wrong29-root fixture (actual24facades+8architecture=32).199 derived actual inventory but compared sourceRGB tuples to importedRGBA, so the failed shader guard was structurally invalid; actual imported numeric operands were not saved. Both immutable negative packets remain preserved.200 was a distinct raw-corner ingestion adapter, not a new city representation: source positions/winding/material/schema and actual imported operands saved before guards; first48 glazing triangles matched. Its ONE Blender author PID364304 terminal exit11/1.922s under165cap crashed reading a FloatColor RNA view after CustomData mutation. Original city master MATCH. No further repair/retry, geometry/maps/master/export or preview. Exact crash/NPZ retained; this is an authoring-boundary failure, not a demonstrated art failure or performance result. Do not launch another far-city candidate from these packets automatically.

Closed seals:197={seals[197]};198={seals[198]};199={seals[199]};200={seals[200]}.197 has208 files243311616B. Root process-inventory197.json found no Edge/Chrome/Blender process at that sample; managed CUA services were retained. Absence of an orphan test browser at one instant does not explain affected-IAB lag. No process settings changed or arbitrary processes killed.

Next bounded gameplay work201 is explicitly authorized for the existing two-client cooperative mission. Specialist may prepare new tools/overhaul-coop-201 only; root approval/GPU ownership is required before ONE normal-play job<=120s within existing177 pulse/replan limits. Correct organic encounter interruption by retiring movement tokens, releasing input and obtaining fresh matching-life/current-world/native-rest ACK/health evidence before reacquisition. Downed actors must use the actual partner revive/lifecycle. Do not ignore HP guards, override bots/health/positions, increase budgets or accept parity assertions as a completed mission.201 proposal/job state is separate; no201 actual job was authorized at this closure. Current checkpoints and source retained; first district and all four mechs/three maps/modes/progression/destruction/climbing/art/performance remain incomplete.

Preserve these CLOSED assets and receipts in075 atop verified074 (4bf46de313233c74f86fbef29e7661fda66a2f02671873353fd06fc5f7ee26e3), then inspect continuation-verification-075.json for the actual manifest hash. No cleanup before hash-verified preservation. No runtime restart, paid tool, new dependency, recurring automation or completion claim.
'''
def atomic(p, value):
    tmp = p.with_name(p.name + '.197-tmp')
    tmp.write_text(value, encoding='utf8')
    os.replace(tmp, p)
atomic(r / 'docs/overhaul/player-integration-197-handoff.md', text)
pointer = r / 'docs/overhaul/resource-limit-handoff-20261010.md'
old = pointer.read_text(encoding='utf8')
heading = '# Latest: continuation197 CLOSED; retain062; full scope incomplete\n\n'
assert not old.startswith(heading)
atomic(pointer, heading + 'Use docs/overhaul/player-integration-197-handoff.md.197 source-motion critic DENIED integration;198/199/200 city authoring stopped without assets or runtime changes. Sole8799 remains062 PID370280/session9510; affected-human lag unresolved. Closed sources/master/144 renders/forensic receipts are preserved075 atop074; see continuation-verification-075.json for exact verification.201 bounded co-op protocol preparation is authorized separately, actual job requires root approval; no automatic art retry or new port. Goal ACTIVE/INCOMPLETE. Historical pointers below are superseded.\n\n' + old)
print(json.dumps({'status': 'CLOSED_DOCUMENTATION', 'seals': seals, 'criticSHA256': sha(critic)}))

# MovingR067 integrated source review

Verdict: APPROVE ONE unchanged root-serialized controller fixture, followed by typecheck only if the fixture passes. This is permission to measure the frozen candidate, not approval to ship or a finding that moving R is convincing. No reviewer jobs or implementation edits were made.

The 15 source-seal rows were independently checked with no size/hash mismatch. Seal SHA256: `63707f8f7bf037f8b25baa75cbbc612370a1f230fe40dde0fe17b2d0f291ba4d`. Controller SHA256: `2f1e3281f6247e416318d9c458eff215c8a6bd8c9cab5d2b3854d3fd9447f9f8`. Fixture SHA256: `7cb9a4d909b73914bcb11c4ec22419837fcf1870e3e7424e2e17cfd4d9d93dd5`. The original provider067 zero-test import failure remains failed; distinct068 passed its three actual Rapier tests. Its result seal `1f3d7fc8471a5962f00bdaabc460f7fa6cc984f2a34543d74926972f2713e3d2` was also verified.

The source has one mixer/pose owner. It restores authored local rotations before mixer evaluation, then applies rotation-only fixed-length foot correction after the source pose. The existing carrier/mount remains applied once. Current authored bend poles, measured link lengths, rear hock offset and paw orientation determine the solve. Unreachable targets recover rather than stretch or clamp. Fixed support leases are checked against current world/frame, generation, life, collider identity, shape and pose; loss releases the anchor. Fore release during R and retained rear stance/swing use the same ordinary-gait lifecycle. I found no concrete source defect that warrants blocking this bounded execution.

Allowed commands, once only, first failure stops the sequence:

```powershell
node --import tsx tools/overhaul-moving-r-067/controller-check.ts
npm run typecheck
```

The fixture measures actual loaded 058E geometry on a declared fixed-plane Rapier world. Standing anchors, support removal, generation change and repeated-source-clock cache checks are meaningful. Moving/back/turn and R checks establish execution/lifecycle coverage; they do not require every rear foot to retain a small residual throughout those motions. A pass therefore cannot establish planted moving R. The fixture writes its detailed record on success; an earlier assertion may preserve only process output rather than a complete matching-clock failure history. Report that limitation honestly if it fails. Build and ordinary-play admission require a separate result decision.

The lowest weighted foot-family marker includes toes/claws and is derived once at bind pose. It is neither an authored functional sole nor proof of the lowest current full geometry under articulation. Point support does not establish full-pad support, sweep clearance, server contact, moving-support transport or structural bank revision. Influence ramps and recovery can visibly permit slip; actual standing/moving/reverse/turn R and exit poses must be judged from real ordinary play, including knee/hock, claw/floor and whole-body presentation.

Performance is unqualified. Startup extraction scans weighted geometry for four feet. Shared support inventory scans the native world once per presentation frame, and per-limb solves perform several model world-matrix updates across the detailed hierarchy. Pooling avoids repeated math-object allocation but does not prove affordable actor-roster cost; small diagnostic arrays remain allocated. Preserve actual timing rather than infer a performance gain.

Reviewer writer CLOSED. Full gameplay, contact, art and Gate1 remain INCOMPLETE; no automatic retry or post-seal correction is authorized by this review.

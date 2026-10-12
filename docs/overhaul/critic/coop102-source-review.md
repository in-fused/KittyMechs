# CO-OP102 source review

Verdict: DENY execution of the sealed101/102 packet. Source review only; no syntax, preflight, browser, native, build or gameplay job was run by this reviewer. Writer CLOSED.

Two concrete blockers require a distinct preserved source correction before any attempt:

1. `tools/overhaul-coop-controller-101/mission-capture.mjs:208` waits for a fresh neutral packet to be acknowledged through `r.actor.lastInput` while the squad is failed/downed. `shared/simulation.ts:465` takes the failed-state branch and returns after `advanceCoop`, before the alive-actor `lastInput` assignments at529/547. `setInput` stores `p.input` and `p.received` at336 without updating that actor field. Therefore the required fresh sequence cannot satisfy this ACK condition while failed, and the mandatory retry stops before pressing E. The actual retry owner reads fresh `p.input` in `advanceCoop` at672 and tracks interact release/rising edges in `shared/overhaulCoop.ts:46`; that is a different receipt contract. Correct the observer to witness the real failed-state retry lifecycle without inventing an actor movement ACK or weakening the post-retry attempt/checkpoint/roster assertions. This is a source-derived observer incompatibility, not an observed gameplay retry defect.

2. Both browser launches, contexts and pages at13–16 precede the owned try/finally at224. A normal exception creating the second browser/context can leave the first process unretired and skip evidence/cleanup. The unchanged root033 supervisor kills descendants only on timeout, not ordinary nonzero exit. Its presence does not cover that failure path. All partial setup handles need owned bounded finalization and partial failure evidence; each available browser must still be retired if another close fails. Retain the original work/cleanup/supervisor bounds and original sealed UNRUN source.

The movement redesign is materially different from075: distant public movement leases are capped at250ms, near movement releases immediately after its first intended successful post-mark send, followed by the specific sequence receipt, fresh neutral input and two low-speed native ticks. The three optical nonprogress observations stop rather than relaxing camera reach. Actual convergence and the420s mission budget remain unproven.

The proposed objectives, actual public revive, planned real AI squad failure, rising-E checkpoint restoration, both living pilots within the original3D4.5m extraction zone and full committed-publication parity are retained. Planned native failure/retry is a gameplay phase, not permission for another capture after an unexpected failure. No injection, game edit, timeout extension or native guard waiver was found in this focused inspection. These merits do not remove the two blockers.

All23 source101 sealed rows matched actual bytes/SHA256. Pinned identities:

- 101 source seal: `7f85cf53ca25465b91db0d1adb9c5b09fa5dfc7be0da4e4514180d98c1fa5ae3`.
- Controller: `e1450910a2064edec94d449026fa33470adfb1d9cc751887fb7455fa03698c8a`.
- Mission: `69969bcf31f4bc0ce320b34ea594753579bc75d1eddf6c1f1a157e707f2aaf74`.
- Root prepare: `16cffca00094e6a46c5e53a5aa24af44a73f1cd53d8f939c7942ed048a464ecf`.
- Root launcher: `dc50360cd4fd6b429b03f26a7ebc774154ce8141e13583c852f61d0efc0d2157`.
- Root preflight: `4025059562582f27986297378293be3be50d3204438e5c7021278e41247dd7b0`.
- Root480s supervisor: `1e53204a5fcb0c843e0726a28276bc117eee6e01d149343624e397073bb87fcc`.
- Required immutable049 receipt: `a7f4259eaa7f8398b9bd68bcf7302905195981ff283e6e04ae72e2a6da70abfe`.

No mission, presentation, contact, actual IAB performance or full-scope qualification follows. Preserve live049 LIMITED and prior failed packets. Review CLOSED; jobs0; game edits0.

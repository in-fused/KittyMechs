# Authoritative publication identity 041

041 is a new bounded production fix and a new public mission attempt. 040 is closed and is not rerun. VERIFIED031 and diagnostic032 source/build/asset receipts remain immutable. The production change owns only `server/arenaRooms.ts` and a narrow optional metadata type in `shared/types.ts`; focused real-room coverage is added to `tests/arena-failure.test.ts`. `server/index.ts` already sends the returned admission snapshot and requires no change. No gameplay, tick/time, hull, route, objective, asset or controller changes are made.

The defect is that actor admission/removal can change the authoritative world between publications at the same simulation tick. Tick alone identifies the physics clock, not a particular observed committed world. A server-owned publication carries `{roomEpoch, sequence, kind}`. The room epoch is a UUID allocated for that room object's publication lifetime; the safe-integer sequence increases for every generated admission/bootstrap or broadcast snapshot. It is independent of simulation tick/time. All members of a broadcast receive the same snapshot identity and the same once-encoded full state. An immediate join snapshot gets a distinct bootstrap identity even if its tick equals an earlier broadcast. Removal is visible with a new identity at the next broadcast. Retirement clears identity/room/client registration before fallible cleanup. A recreated room with the same code gets a new epoch. Safe-integer exhaustion throws into existing retirement/fail-stop handling rather than reusing an identity.

`GameSnapshot.publication` is optional for unchanged standalone/offline Simulation consumers. Server publications always attach it. Existing network consumers can retain/ignore this additive field without an input/layout migration. Capture041 requires valid publication metadata and has no tick-only fallback. This is an actual authoritative observation fix; fields are not removed to make parity appear successful.

## Root's serial validation and one capture

No tests, build, browser or other runtime job was executed by the source author. Only the new capture's `node --check` syntax check ran. Root should first run the meaningful existing room/retirement suites with the new publication case:

```powershell
node node_modules/vitest/vitest.mjs run tests/arena-failure.test.ts tests/overhaul-network-receipt.test.ts tests/overhaul-arena-clock.test.ts
npm run build
```

The new real native room/WebSocket test proves same-tick join has different actor content and distinct publication identity; the subsequent host/guest broadcast has equal complete native state and the same identity; removal publishes a new sequence while retaining tick/time; a retired room makes no subsequent snapshot calls; and recreating its code starts a distinct epoch. Existing native-step, snapshot, admission and cleanup failure tests retain fail-stop coverage. Root also owns independent critic review before capture and any necessary checks beyond this focused list.

After successful focused tests/build and fresh frozen candidate build033 is served with authority/page on port8806, root sets its exact receipt hash and runs one new capture:

```powershell
$env:KITTYMECH_BUILD_RECEIPT = '<exact frozen build033 receipt SHA256>'
node --import tsx tools/overhaul-mission-identity-041/mission-capture.mjs
```

Default output `.sites-runtime/overhaul-20261010/mission-identity-041-public` must be fresh. The existing040 pilot is copied into the new041 directory; the sealed040 source remains unchanged. Root must preserve the first genuine041 outcome without automatic retries. Work guard155s reserves15s for close/save, target≤170s inclusive, with root enforcing the180s hard process cap and recording actual inclusive elapsed time. At most one technical repair is permitted for this finite packet.

## Exact identity comparison and preserved mission

Both pages observe full ordinary WebSocket snapshot frames read-only. Per-frame canonical shared-world/actor SHA256 records retain tick/time/room plus publication metadata. Comparison keys are exactly `[room, roomEpoch, sequence]`; the matched publication must also have identical tick, time, full actors and all shared world fields. Monotonic sequence is checked per page/room epoch; sequence gaps are permitted because bootstrap is delivered only to its joining recipient. Missing/invalid identity, repeated/nonmonotonic sequence or a matched-identity world mismatch is an explicit first failure. Immediate bootstrap records include actor IDs/hash and a complete keyframe with reason `explicit-admission-bootstrap`. Different bootstrap/broadcast identities at the same tick are recorded, not silently compared or discarded.

The explicit hash selector preserves040's full native fields—protocol/layout and native construction versions, actors including lifecycle/native pose, projectiles/events/fields/cover, complete structure HP/broken masks/revisions, rubble/ruins/bonded material, CO-OP/supply/objective/checkpoint/phase/winner state—and adds publication identity. There is no recipient interest/delta filtering, input rewriting, or authority state injection. The actual server still encodes the same complete broadcast once for all room members.

Every observed frame is bounded to4000/page; recent match maps300/page. Full native keyframes are stored separately at bootstrap, semantic mission/checkpoint/lifecycle/climb/ruin/supply changes, first observed wear and approximately1Hz host. Compact full-state budget20MB, combined JSON target≤30MB, with explicit incomplete evidence on cap exhaustion. Phase-event summaries avoid repeating complete worlds/input-event histories. Host viewport1440×900, file960×600; no guest video or audio. Root records actual storage and video outcomes.

The pilot retains the full required ordinary two-client CO-OP route: west relay, east relay, storm core and extraction. All four required objectives and `phase='extracted'` must be observed on both clients, with at least three matched committed publications. No covert checkpoint-only outcome qualifies. Public UI and keyboard controls remain unchanged from frozen040; movement is released and actual low velocity, neutral acknowledged input and two distinct authority ticks are awaited before approach coordinates are rechecked. Organic combat/revive can occur without injected damage or HP. Wear/collapse/climb is claimed only if naturally observed. First failure, declared finite bound and unfinished phase remain explicit. A successful source seal is not mission/build approval.

The handoff and source seal in this directory record owned paths, byte counts/SHA256, read-only dependencies and exact root commands. Independent review plus actual root results determine acceptance; source author made no runtime claim.


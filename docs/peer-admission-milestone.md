# Browser invite admission repair

2026-10-06. This iteration restores the tested local Peer multiplayer path using the installed library. It is a bounded source/local integration milestone, not public deployment or completion of the continuous game goal.

## Problem and change

The expanded Rainline two-player initial snapshot measures 18,157 JSON bytes. Installed PeerJS 1.5.5 rejects JSON messages at 16,300 bytes with `message-too-big`, without sending them. A guest previously cancelled its 25-second watchdog on any message, including welcome; the host's channel error retired the guest without closing its connection. Together these create a welcome-without-battlefield loading hang. The earlier failed baseline/candidate traces establish successful signaling and JSON negotiation, but did not capture the handled serializer error itself. A new controlled real-browser comparison captures that rejection directly.

`src/game/network.ts` now requests reliable binary serialization, which uses the installed BinaryPack chunking path. The guest cancels its join deadline only after an accepted compatible snapshot. Timeout and terminal errors fence later data, clean channels and retain a readable error. Host channel errors remove and close the owned guest once while preserving a healthy authority. WebSocket behavior, input/schema versions, Rapier, movement, art, maps, dependencies and default-off physical rubble remain unchanged.

BinaryPack changes explicitly present optional `undefined` fields to `null`, whereas JSON omits them. This was observed for optional player roles and event properties. Three actual native snapshot round-trips pass unchanged structural/action admission and preserve the tested structure, position and life/ACK fields. This does not prove byte-identical parity of every snapshot property.

## Retained evidence

All paths below are beneath `.sites-runtime/peer-admission-001/` unless specified otherwise.

| Check | Result and scope |
| --- | --- |
| Frozen source | 588 files; only `src/game/network.ts` and `tests/jump-network.test.ts` differ from the previous sealed landing-buffer source. |
| Focused validation | 146 passed across eight files; includes real native jump-buffer/authority checks and mocked transport lifecycle tests. |
| Static/build | Lint, type checking and Vite build pass. Fresh root build matches all 81 frozen candidate build files. Fingerprint `8d7536b54ad675c5aa879450562fc82d750f23ccdd557d2d5b781603be1ff76c`. |
| Full suite | 1,340 passed, one failed, eight skipped across 100 files. The failure remains `city-rubble-grounding.test.ts` supported-descending witness, also present before this repair. This is not an all-pass result. |
| Native BinaryPack | Actual two-player PvP and eight-player co-op/PvPvE snapshots admit after installed pack/unpack. JSON payloads 19,791/39,871/39,997 bytes; binary 14,460/28,289/28,632 bytes. Native eight-player fixtures are not eight real browser clients. |
| Controlled real RTC | Installed JSON rejects the 39,871-byte native-derived JSON fixture with zero RTC packets. Binary reconstructs it exactly from two observed packets of 16,331 and 11,588 bytes. This fixture was JSON-parsed, so its undefined fields were already omitted. |
| Unchanged browser regression | All five jump-delivery cases pass: solo, dedicated guest and Peer guest both-form delayed presses/cancellation, touch delivery and version rejection. These are delayed input-delivery cases, not the near-landing buffer edge matrix. |
| Cold late joining | Existing Caracal cold-load test passes while the Bastion host retains authority, contacts and live controls. |
| Teardown/rehost | Existing live-guest Peer teardown and fresh-host test passes. |
| Actual two-player co-op | Fresh ordinary UI joins, binary signaling, matching guest ID/owner on both clients, 123 structures and an admitted 29,534-byte JSON-equivalent snapshot. Host/guest move 3.2697/3.0832m with stable life. 136 displayed guest rows show one upright air transition, 0.56333m rise, final ground and matching issued/processed/ACK 1. This is ordinary scene evidence, not atomic screenshot/native-flight timing. |
| City route and damaged late join | `peer-city-fourth-001` passes the existing ordinary-control Pounce route, actual roof mantle, both forms, jump/drop, accepted facade pulse damage and a late Lynx guest seeing the same broken mask/display opening. Report bodies and readiness values are extracted and hash-bound. |
| Real failure UI | Labelled synthetic Peer hosts send welcome then omit/reject battlefield state. Ordinary guest UI shows readable failure after 25,463/25,438ms, no admitted snapshot, channel closure and return to hangar. These are transport failure fixtures, not gameplay authorities. |

The actual co-op snapshots, inputs, ACKs, signaling and PNGs are in `coop-game-observer-002`. City raw attachments are in `peer-city-fourth-001/extracted`. Controlled serializer and native records are in `live-serializer-002` and `binary-probe-001`. Ordinary controls remain the only gameplay input path; diagnostics read detached published state.

The first focused attempt retained six failures because new tests expected the previous timeout wording; the readable error expectation was updated, not its timing or rejection assertions. Its source copies and tool-result summary remain retained. The first serializer observer delivered the fixture but returned before its final native message listener recorded the second packet; a separately saved successor waits one ordinary task before collecting that listener. The first co-op observer failed its own direct access to asynchronous input diagnostics; its successor awaits them and binds the documented `generation:actorId` owner. Neither observation failure is relabelled as a successful execution.

City attempts 001/002/003 remain failed: an incorrect fixture import path, a host snapshot dereference before lazy authority publication, and a client-only guest-tile readiness requirement which is impossible for an authority host. The final separately saved fixture uses source-backed host readiness: authority true, no guest owner, populated native world, rendered center, actual grounded actor and the original 30FPS gate. Its native body count is coarse readiness, not proof of nine native terrain tiles. All original route, roof, damage, guest and deadline assertions remain intact. No game source was changed for these harness repairs.

## Boundaries and next work

Producer/source/build manifests and the requested independent critic receipt bind the final state. The final review lives under `.sites-runtime/critic/peer-admission-001/source-local-integration-review-001/`; its decision defines approval scope. Private port 8815 was closed only after exact PID, creation time, executable, arguments and listener ownership matched. Friend server, parent, tunnel and awake-helper identities and health stayed unchanged. The original Unreal folder was not edited or deleted.

Peer joining is now qualified within these local browser sessions. Strict native first-receipt near-landing buffer positives/expiry/cancellation on Peer, the earlier dedicated upright positive gap, WAN/NAT/TURN behavior, all-eight-browser load, sustained bandwidth/backpressure and hardware performance remain separate work. The existing structural parser's full-schema/local-actor completeness also remains a broader admission hardening task; actual gameplay evidence here explicitly binds the welcomed actor to its input owner and authority ID.

All four formal release areas remain **PENDING**, public deployment approval is **false**, and the friend link retains its previous frozen build. Physical rubble stays denied/default-off. Distinctive authored feline/upright movement and art, denser districts on every map, universal supported climbing/contact wear and full support-dependent destruction remain requirements. No commercial AAA completion or regression-free guarantee follows from this repair. The continuous goal remains active.

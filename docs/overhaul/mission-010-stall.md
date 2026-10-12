# Mission010 retained-clock diagnosis

Evidence: `.sites-runtime/overhaul-20261009/mission-010/evidence.json`, both saved WebMs and `failure.png`; build006. Native idle profile001 is not active-combat qualification.

Both admitted snapshots stop at tick3612/time60.199999999997864. Phase and co-op status remain active; bot-0 has42.2HP, both pilots195.8HP. Last inputs freeze at2410/2369. Two guest tracking episodes observe that identical tick for44/41iterations and exit the wall watchdog. Host camera frameClock advances from93.952 to125.341, guest91.425 to122.54, while both report about30FPS. This is not a stopped render loop. Final harness failure is a route stall, not downing or all-down.

The retained screenshot explicitly shows `Disconnected` and `Connection to the arena ended. Return to hangar to reconnect.` That text is produced by `connectServer`'s WebSocket onclose handler in `src/game/network.ts`. It leaves the last valid snapshot retained. Thus a closed transport explains the fixed clock; parser rejection alone does not close that socket. Page errors measure JavaScript exceptions, not connection health. There are no ruins in the last admitted state, but no raw later packet exists to rule out a subsequent first break or rejection.

The server advances occupied rooms through `advanceArenaRooms`, then snapshots/JSON through `broadcastArenaRooms`. Native step, actor/input admission or serialization exceptions retire a room with code1011. `retireArenaRoom` currently reports cleanup errors but discards the original cause from logs. The input rate guard closes with1008/`Input flood` if more than150messages arrive within one wall-second bucket. Clients send inputs at30Hz, so ordinary steady input is below that limit; queued input after a long authority callback could create a burst, but no retained close receipt proves this happened. Server send backpressure skips packets at256KB rather than closing directly.

`snapshotAdmission` rejects malformed/nonmonotone structural, ruin, action and local ACK state without installing it; `acceptSnapshot` currently collapses structural and local ACK failure to false. These paths require raw received/admitted clocks to distinguish from an authority stall. A readonly health request after capture closure returned rooms0/players0. Because all browser contexts had already closed, that cannot establish when or why the original room disappeared. An unjoined new WebSocket receives no snapshots; joining would introduce an actor and cannot recover this room's lost receipt.

Next bounded diagnostic should record, without changing authority or parser rules:

- WebSocket last raw message type/tick/time/byte length, received/admitted counts, rejection stage, last accepted tick, receipt wall time and CloseEvent code/reason/wasClean.
- Original server retirement cause plus room tick/time; per-timer slow-call receipt distinguishing step from snapshot/serialization/send; rate-limit close receipt including message count/bucket age and recent callback duration.
- Ordinary capture includes connection/error/receipt alongside native and camera clocks and exits explicitly on disconnect, retaining failure instead of describing it as a movement blockage.

An isolated ordinary run can then distinguish1008input backlog,1011native/serialization retirement,1006transport closure, or continuing raw ticks rejected by schema/local ACK. No gameplay/runtime cause fix is justified until that receipt exists. The original room is gone; instrumentation does not manufacture its missing receipt.

Approved bounded receipt implementation (UNRUN):

- `server/arenaRooms.ts` logs the original retirement exception with authority room/tick/time/member count before cleanup. Existing close and cleanup behavior remains unchanged.
- `src/game/networkReceipt.ts` owns opt-in raw-packet/admitted clocks and schema/local ACK/decode counters, first failure and detached close event. `runtime.ts` records the existing admission result without changing it. `network.ts` records actual UTF-8 packet length and CloseEvent code/reason/wasClean, preserves the earlier user error, and includes an otherwise unreported close cause in its message.
- `src/debug/diagnostics.ts` adds readonly `transport()` with connection/error/phase and detached receipt; the existing sight hook is unchanged.
- `tools/overhaul-mission-play.mjs` retains the receipt in ordinary samples, records transport failures and aborts the active pilot/objective/lifecycle poll on disconnect instead of reporting a delayed movement blockage. No route/combat constants changed.
- `tests/overhaul-network-receipt.test.ts` contains three focused UNRUN cases: raw-vs-admitted clock rejection, detached close/first-cause preservation, and original exception logging before failing cleanup.

No server restart, fresh room/WebSocket join, actor/input mutation, native/test/browser/lint/typecheck job or balance/parser/rate-limit patch was performed during the asset quiet window. Qualification and one ordinary diagnostic run await root release and a build containing this receipt.

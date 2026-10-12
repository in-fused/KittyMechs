# Independent review: direct-address join lifecycle

Reviewer: art/independent-critic agent, separate from the networking implementer. Reviewed 2026-09-26. Scope: `UKMNetworkSubsystem::JoinAddress`, `BeginDirectTravel`, `OnDestroyed`, failure/watchdog paths, `AKMPlayerController::JoinExpedition`, and `KittyMech.Network.DirectAddressValidation`.

Disposition after independent re-review: **the identified source-level issue is fixed; accepted for native compile/test, with runtime acceptance still pending.** No networking source was changed by this reviewer.

## Resolved P2 — canonicalize bare hostnames before ClientTravel

The implementation now uses `NormalizeDirectAddress`, clears output before validation, emits explicit `host:port` with Unreal's configured default port when omitted, and checks `FURL` validity, intended nonempty host, port, no options/portal, internal protocol and nonlocal destination. `JoinAddress` stores and passes only that canonical value, including the post-destroy path.

The revised native test checks actual `FURL` interpretation for IPv4, dotted and single-label hosts, the map-shaped name `RainlineReach`, explicit/configured ports, whitespace and leading-zero normalization. Rejected inputs must leave no previous destination. Static inspection confirms these changes address the original finding. The test has not been executed in Unreal by this reviewer.

Original finding, retained for traceability:

`KMNetworkSubsystem.cpp:20-37` accepts a single-label string such as `RainlineReach` or `KITTY-PC`. `JoinAddress` then passes that string unchanged through `BeginDirectTravel` to `ClientTravel` at line 239. `ClientTravel` also accepts local map names, so this validation does not guarantee a network destination. In particular, an existing short map name remains a valid local-travel request rather than an unambiguous server address. The current test rejects a slash-prefixed asset path but never checks the meaning of an accepted string after Unreal URL parsing.

Requested correction, now present in source: normalize a validated host to an explicit host/port travel address, using the configured default port when the user omits it, and assert the result's `FURL` host/port/options semantics. A map-name-shaped hostname remains a valid hostname but becomes a network request rather than loading that local map.

Evidence boundary: the accepted-character path and unchanged `ClientTravel` call were inspected directly. The engine was not run; the interpretation hazard follows the documented API contract, not a claimed runtime reproduction. Epic documents `ClientTravel` as accepting either a map name or network address, and `FURL.Host` as empty for local URLs: [ClientTravel API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/APlayerController/ClientTravel), [FURL API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/FURL).

## Accepted source structure

- Controller delegates only from the local controller, centralizing direct-join state in the subsystem.
- Busy/offline-recovery checks precede a join. Inputs are trimmed, ports are bounded and option/path characters are excluded.
- Existing named-session cleanup retains the pending direct destination and initiates travel only after successful destruction. Failure clears the pending destination and returns offline.
- Direct travel starts the same watchdog operation as session-based travel. Failure cleanup clears pending destinations and prevents repeated offline-travel requests.
- The review found no additional definite source blocker in this bounded path. This is not a claim that asynchronous engine/provider behavior was tested.

## Required acceptance evidence

1. Compile the exact target engine build and execute **`KittyMech.Network.DirectAddressValidation`**, which now includes canonical-URL assertions. Require that exact successful test path in the automation report; a positive test count alone is insufficient.
2. On the two existing PCs, test offline direct join with/without an explicit port, hostname join, current-host-to-another-host join and invalid/unreachable targets. Confirm that only the intended destination is contacted and the local map is not selected by a bare hostname.
3. Exercise session destroy success, immediate refusal, callback failure and timeout; double-click Join during each pending operation; disconnect during travel; then retry a valid address. Require exactly one travel attempt, no stale pending address and usable offline recovery after failure.
4. Verify host departure returns the client to the intended offline state and that the locally retained checkpoint is not represented as the remote host's saved progress.

Current evidence: static source review and official API documentation only. No Unreal compile, native automation, live network connection, fault injection or packaged two-PC performance test was executed by this reviewer.

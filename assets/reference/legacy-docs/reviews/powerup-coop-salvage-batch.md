# Power-up and co-op salvage: bounded acceptance

Editor34 built successfully. Independently reviewed the fresh accepted receipts, native result and relevant engine/event logs below; no blocking discrepancy found.

## Primary mobility capacitor

`Artifacts/Validation/Runtime/20260927-025830-135-ac6511a1a0c5484285c4fd62bf5a4545-Pickups.MobilityRefill` reports native Success (zero errors, one warning) and launcher acceptance. Its explicit sandbox/saved-directory paths match the isolated run. Both kits retain the capacitor when primary mobility is already ready and funded, refill an energy deficit sufficiently for real GAS activation, and clear the primary cooldown without changing signature timing. Pounce consumes its original combo charges without gaining another. Fixture counts match the reviewed sequence: four resets, six resource edits, four grants, six item requests and nine ability attempts.

The earlier run `20260927-025608-931-b6afec9b56fd47a3ba6a572f774b2490-Pickups.MobilityRefill` remains distinct: native assertions passed, but the launcher rejected its missing saved-directory receipt field. The corrected receipt and fresh run establish acceptance; the earlier artifact is not retroactively promoted.

Accept standalone PIE inventory/ability behavior only. Item grants, resource deficits, resets and enemy removal were fixture operations. This does not establish world pickup acquisition, client/server power-up behavior, natural combat use or rendered feedback.

## Guest salvage collection

`Artifacts/Validation/CoopSmoke/20260927-025907-285-b1c60ab0e4ef44b18f2d16bb2a385c22` reports PASS for both real processes. Engine logs confirm connection/join and successful exits. The guest's ordinary movement and the host's replicated observation agree on approximately 417 cm southward displacement with a stable Concrete movement base.

After explicitly logged enemy removal and checked pair placement, the guest observed the available salvage prompt and called the production interaction RPC. Both peers observed shared mask one and unavailable cache. Repeated host/guest public requests left the mask unchanged. Production checkpoint retry restored unbanked mask zero and cache availability on both peers. The guest left through the production session API and returned offline; the host continued its world for the required interval. No unsupported Concrete/stable-subobject error was found.

The immediate guest duplicate was issued about 0.1 seconds after collection and may be rejected by the controller's 0.15-second throttle. Unavailable caches are also excluded from target selection. Therefore this run proves repeated public requests are harmless, not that a duplicate reached the collection method. Direct collection idempotency is separately covered by the mission fixture reviewed in `salvage-expedition-batch.md`.

Accept this bounded localhost Editor-game/NullRHI RPC, replication, reset and departure result. It does not establish navigated discovery, rendered HUD correctness, banked-save reload across two machines, Internet operation, combat interaction or packaged multiplayer acceptance.

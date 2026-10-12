# Mech briefing and ability feedback review

Independent disposition: accepted for this bounded source and localhost replication milestone. Rendered menu/HUD and packaged execution remain pending.

The equipped-mech briefing reads the confirmed chassis and current tuning. Named HUD abilities distinguish downed, cooldown, insufficient energy and ready states; Pounce displays remaining free leaps/window, and recipients display active shelter time. The summary sits above controls in the right menu column, leaving Deploy beside chassis selection. Replicated `ComboExpiresAt`, primary cost, availability and primary execution now share the expiry-aware charge predicate, preventing stale free-charge or shortened-cooldown treatment after expiry. Numerical ability tuning is unchanged. Source review found no blocking issue.

## Actual two-process evidence

`Artifacts/Validation/CoopSmoke/20260927-052606-447-d7986460089a4a3ba93fb8b4be20bc5f` contains launcher `result.json`, both native receipts, events and retained logs. Launcher and both receipts report PASS with `abilities_complete=1`; both processes exited. Reviewed logs contain no matched fatal/error, unsupported-object or unresolved-reference messages.

- Host uses mapped signature and primary input. Both peers observe three Pounce charges, then two after the actual rising leap, then expiry. The guest verifies the same server deadline; the harness checks the nine-second window and rising movement rather than merely assigning charge values.
- After two explicitly checked fixture placements, the guest uses mapped Bastion signature. Both peers observe shelter on both mechs, matching deadlines and expiry. The harness checks the eight-second execution window.
- One explicit host energy-zero edit produces unavailable primary with no cooldown on both peers. One explicit damage event downs the host; both ability getters become unavailable on both peers. A fixture revive prepares clean departure.
- Guest leaves through the production session path and returns offline; host continues ticking afterward. The inherited ordinary-movement check also passes with matching host/guest position and stable Concrete base.

The fixture removes one enemy, places the pair twice, edits one energy attribute, inflicts one downing hit and calls one cleanup revive. These are disclosed test setup, not combat-playthrough evidence. The test exercises normal mapped ability input and actual replicated state, but does not measure shelter damage reduction, all combo consumption paths, arbitrary latency, physical controls, rendered text or performance. Editor45 compiled the feature; Editor46 compiled only the corrected fixture positions. Package14 and its rendered gameplay checks are separate pending evidence.

## Packaged functional UI observation

Independently viewed Package14 captures from `Artifacts/Validation/GameplaySmoke/20260927-053529-256-d2ee15ede5ec46cab02ecfbc968e483c`:

- `00_menu.png`: the Pounce briefing is readable in the right column, including primary/signature costs, timing, defense and power-up explanations. Pilot/chassis choices and Deploy remain visible in the left column. The longer guide does not bury Deploy.
- `08_signature.png`: the actual gameplay HUD identifies Aimed leap and Chained pounces beside keyboard/gamepad bindings. Primary reads `READY / FREE LEAP`; signature reads `USE LEAP: 3 LEFT / 9.0s`. Defense and map bindings are visible, alongside health/energy and current mission progress. This is useful functional feedback for the captured Pounce state.

At the initial image review the directory had no terminal result/receipt, so no completion was inferred then. The subsequent terminal review confirms `acceptance.json` exit code 0 and full-Package14 provenance, with `evidence-validation.json` accepting the `lower-pounce-v2` scripted workload. `Artifacts/Validation/gameplay-14-launch.log` records validation completion. The retained native timing covers 10,675 frames totaling 180.1457 seconds. This supports completion of scripted Pounce combat/recovery and the two inspected functional UI states, not an entire expedition or Bastion's rendered shelter state.

Performance is not accepted: 12 retained frames exceed 50ms, with the worst 218.0307ms. No frames were excluded and no optimization claim is made. The offscreen run and selected PNGs do not establish all resolutions/UI scales, physical-controller use, human comprehension, on-screen presentation or mission pacing. No shading acceptance is inferred. No blocking feature issue remains within this reviewed batch's scope.

## Preserved failed attempt

`Artifacts/Validation/CoopSmoke/20260927-052208-758-e8542ceb03d74016bf0a04d4b3736a62` fails after both-peer combo checks at shelter placement. The old guest position Y=-700 put its radius62 capsule into the service wall beginning at Y=-750. The fixture now uses Y=-250/+250, preserving collision-aware `TeleportTo` and actual capsule-overlap rejection, with each successful placement counted. No production collision or gameplay rule was relaxed. Run01 establishes no shelter pass; run02 supplies the completed evidence.

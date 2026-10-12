# Shutter co-op review

Independently inspected actual receipts/events/logs and the promoted shutter source. Accept the corrected result within the specific localhost fixture scope below.

Baseline `Artifacts/Validation/CoopSmoke/20260927-032105-069-387119dcd96b467699f27c34170eb01d` reproduces the fault: the host had fully opened the panel before guest launch, but the guest's first pre-actor observation of replicated `bOpen` found panel height 250 instead of 850, with a 0.01667-second tick. The guest failed immediately without allowing interpolation to catch up. The launcher ultimately reported the host timeout; the guest receipt identifies the actual pose failure.

The production correction replicates authoritative panel height, applies its initial received value immediately, and then interpolates toward subsequent authoritative heights. Closing-path occupancy checks remain on both authority and client; authority retains automatic reopen.

Intermediate run `20260927-032409-858-cf62fad4dc8e4a9ba41f58b8a9cbda91` remains FAIL. Its host log records a fatal missing reflected `ReplicatedPanelHeight` property after the initial promotion/build. Root attributed this to preserved draft timestamps preventing header regeneration. After refreshing source timestamps, Editor37 rebuilt successfully; no acceptance is inferred from the intermediate compile alone.

Fresh run `Artifacts/Validation/CoopSmoke/20260927-032643-191-c0edff12f8304909b4341a51782c0998` passes both processes and launcher checks. First guest open observation is height 850 with a 0.01667-second tick, before chassis/pilot settling. Events then establish empty close/open on both peers, refusal to close on an occupied footprint, actual descent to height 809.67, and guest entry using ordinary movement input over 40 sampled entry ticks followed by automatic reopen and clear capsule checks. The guest leaves normally; the host continues its world. The inspected logs show successful join/exits and no Error/Fatal match.

Enemy removal, pair placement and repositioning are explicitly logged fixtures. This is two-process Editor-game/NullRHI localhost evidence for immediate open-state joining and this anti-crush sequence. It does not establish arbitrary-latency safety, every possible entry direction, joining mid-descent, rendered smoothness, Internet/second-PC operation or packaged multiplayer behavior. No remaining blocker was found within the tested scope.

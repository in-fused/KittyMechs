# Ordinary cooperative mission014 — extraction reached, review pending

Build010/support-3, two actual UI clients, corrected pilot formation, unchanged full character colliders and NPC gameplay. Only normal keyboard/mouse/UI controls; readonly diagnostics and snapshots. Both clients reached `extracted`, WEST/EAST/STORM CORE/extraction complete. Optional sky-uplink/city-grid were not required or completed. No page errors. Host video at 640×400; actual game viewport 1440×900, guest recorded through state receipts rather than video.

- west relay interaction: native time 62.433s; MissionHost HP 183.7, kills 2, MissionGuest HP 220.0, kills 0.
- east relay interaction: native time 97.600s; MissionHost HP 220.0, kills 2, MissionGuest HP 171.6, kills 1.
- core interaction: native time 157.100s; MissionHost HP 185.3, kills 4, MissionGuest HP 220.0, kills 2.
- extraction: native time 215.267s; MissionHost HP 220.0, kills 4, MissionGuest HP 220.0, kills 2.

After staging: 199.150000s native / 201.913000s wall = 98.63%. Occasional diagnostics around 55FPS, 276 calls and 1.186M triangles are not warmed performance qualification. The prior mission013 botInput CPU spike remains unresolved.

Evidence: `.sites-runtime/overhaul-20261009/mission-014/evidence.json`, host `page@0597d80ace438edfdd94ee0644ed7aad.webm`, `ordinary-route-review.png` (five actual frames, sixth tile blank) and `extraction-video-frame.png` (actual final results screen). Native final snapshot tick12916/time215.266667 is identical on both clients. Screens show authored portal/signage/vehicles but sparse repeating distant structures; no art/movement approval inferred.

Independentcritic workingreview approves boundedmissionpath/extraction/clientstateagreement, deniesfinishedart/motion andfulllifecycle (docs/overhaul/critic/mission-play-014-review.md). Recorded tick5049 step1729.6105ms includes1723.737msbotInput/1687msCPU, anotheractualbotstagehitch. Real revive, all-down/fail, checkpoint retry and late joining remain unverified in ordinary play. Gate1 and the complete four-mech/three-map overhaul remain INCOMPLETE. Lifecycle pilot now chooses a real alive ground enemy and accepts its ordinary fire, but that changed pilot has not run. No HP injection or NPC nerf.

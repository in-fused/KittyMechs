# Finite overhaul architecture decision - October 9, 2026

Retain React/R3F, Three r180, Rapier and the existing networking. Replace weak game systems behind explicit authority and presentation contracts. The bounded two-candidate comparison is complete.

The final frozen ordinary-keyboard route used the same 16-building district, eight Pounce rigs, materials, fixed60Hz harness,1920x1080 DPR1, antialiasing,1024 shadows,no postprocessing,Edge155 and actual GTX1070Ti via ANGLE D3D11. R3F:985frames,59.94FPS,p50 16.6ms,p95 18.8ms,p99 21.1ms. Imperative Three:976frames,59.88FPS,p50 16.7ms,p95 19.1ms,p99 23.3ms. Median draw calls131 each. Both consumed two jump commands and two transform commands and recorded quad to upright to quad. No measured advantage warrants migration.

Evidence: `.sites-runtime/overhaul-20261009/comparison-003/` JSON, WebM and screenshots; frozen harness `benchmark-v3-latched-commands` on5174. Comparison001 lacked the R3F Meshopt decoder. Comparison002 lost quick transform commands between authority ticks in imperative Three; it is invalid for matched stance selection. Shared input now latches discrete commands until consumed. Comparison003 determines selection.

This measures representative rendering, not full-game destruction, weather, IK, multiplayer or streaming. Full-game60FPS is unproven. WebGPU adapter exposure is recorded; no measured concrete shader/compute requirement justifies migration now.

Simulation owns contacts, damage, paired locks, structural closure and missions. One compiled component model supplies visible parts, collision, climbing and support IDs. R3F presents authority state. Preserve lifecycle guards, input epochs and late joins. Keep editable Blender masters and optimized GLBs without paid generators.

This decision does not approve integrated movement, combat, art, destruction or missions. Those remain incomplete pending independent review.

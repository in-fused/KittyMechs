# Optional workshop roof route review

Disposition: no blocking topology, map or fixture finding; both-kit native walking results passed. Acceptance is bounded to the tested ordinary-walking routes.

The existing southern workshop roofs have surfaceZ3280. The new bridge and landing surfaces match that height; the center bridge overlaps each roof100cm and the east approach bridge overlaps its roof150cm. Ramps rise1280cm over2500cm and2100cm horizontally, approximately27.1 and31.4 degrees. With the existing thickness/endpoint convention, their small end lips remain below the55cm character step height. Actual collision and walking across those seams must still be verified by runtime.

The new northernmost solid edge isY=-5350, south of the required road boundaryY=-5300; the main south connector and authored encounter bays are unchanged. The relocated cache1 is centered above the eastern roof at6000,-6800,3330, with its bottom on the roof and no crate collision. A standing mech has a short above-roof interaction line. Both normal walking entrances connect back to the existing upper district. The tactical map represents both entrances, the roof connection and cache state.

The existing UniversalRoutes fixture adds four roof legs after its original six connectors. Only the first roof leg uses a setup placement; the remaining three retain the actual previous arrival, checking grounded support and overlap before continuing. Walking crosses the east ramp/bridge/roof, center bridge, western landing and descending ramp with ordinary movement, no jump or ability. Existing progress, corridor, discontinuity, resource and collision gates remain; the launcher requires10 routes,7 setup placements and3 continuation markers. AI is excluded by the existing geometry fixture, and walking to the cache's location is not a collection assertion. No combat, network, visual-polish or performance claim follows from source review.

## Actual walking evidence

Editor51 compiled. Independently reviewed native `Automation/index.json`, `routes-evidence.txt` and launcher `acceptance.json` for:

- Pounce: `Artifacts/Validation/Runtime/20260927-065234-325-ed151973abdc472ea4be88114f1eba17-UniversalRoutes.Pounce`.
- Bastion: `Artifacts/Validation/Runtime/20260927-065521-883-4565bfe20a8146f688e74a60facff617-UniversalRoutes.Bastion`.

Both native reports record Success, zero errors and one warning; both launchers accept world checks. Each receipt records10 passed legs,7 setup placements, zero traversal teleports, zero jump/ability calls and zero falling samples. Roof legs7–9 each explicitly retain the prior actual arrival without placement.

Pounce reaches the east roof near6048,-6800,3407, crosses to2449,-6800,3407, turns through2402,-5649,3407 and descends to5051,-5601,2127. Bastion reaches equivalent positions within the original tolerances. These actual center heights match the roof/upper-district floor heights plus the capsule and normal floor clearance. All original six connector checks also pass; the added loop did not replace their acceptance.

This establishes ordinary walking through the tested continuous east-to-north roof loop for both kits, including bridge/landing seams. It does not establish every direction/edge path, salvage collection itself, live combat, co-op replication on these new surfaces, visual signage readability or performance. Package17 remains a separate build step; no extra tests were run for this review.

## Packaged route-map check

`Artifacts/Validation/package-17-receipt.json` confirms a successful49-file build with input hashes unchanged. Independently viewed `Artifacts/Validation/RenderSmoke/20260927-070726-725-d8d4240d94a94f99bec4fd30184f60a1/render-smoke.png`; its native receipt records PASS, ordinary Bastion model activation and actual Tab map input.

The packaged map visibly identifies `WORKSHOP ROOFS +33m / OPTIONAL`, connects the roof path to two amber ramp segments, and places the SALVAGE marker on the roof connection. The original district connectors and objective states remain visible. This is sufficient functional map communication for the added route; no blocker or further visual iteration is requested. The screenshot does not add collection, co-op, human-navigation or performance evidence beyond the previously bounded walking results.

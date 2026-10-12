# Supported mantle contact design

The tested fixed forepaw roof hook is unreachable at the current powered-vault entry height. A later hook may precede the sampled loss of shipping-pose wall contacts, but a continuous supported pull has not been established. Keep the production mantle unchanged until one complete contact bridge passes the original limb, native-owner and full-hull constraints.

## Measured entry constraint

The witness is the north face of seed 7734 spawn-west. Its wall plane is z=33 m, wall top is 8.62 m, and the actual native roof floor is 8.9200005603 m. The original Pounce carrier remains a 1.75 m radius, 2.6 m high rounded cylinder with its centre 0.3 m above the actor position.

At actor position (-30, 6.8, 34.84), the candidate forepaw hip is (-29.4159999847, 7.1599997736, 34.1078397449). Its fixed roof patch pivot is (-29.4159999847, 9.0552824789, 32.8640080247); the other forepaw is symmetric in x. The roof patch has five actual owned native queries, and the full carrier hull is clear. The patch is nevertheless unreachable: the requested hip-to-paw distance is 2.2669834321 m against an allowed 1.3707152080 m, or 0.98 times the unchanged 0.6958603150 + 0.7028286728 m limb lengths. Native ownership alone cannot admit this grip.

For this same posture and frozen patch, the normal gap is 1.2438317202 m. The permitted vertical gap is therefore only sqrt(1.3707152080² - 1.2438317202²) = 0.5759712087 m. The hip must reach at least 8.4793112703 m, which requires actor height **8.1193114966 m** with the measured 0.3599997736 m forehip offset. Equality consumes the entire 0.98 reach allowance; it is a necessary bound, not an admission height with margin.

The first-gap receipt is [contact-witness.json](../../.sites-runtime/overhaul-20261009/fixed-mantle-solve-001/contact-witness.json). The solve stopped at its first sample. It does not establish the later pull, nor global impossibility.

## Original wall ascent and the proposed later hook

Current `advanceClimb` commits ordinary upward movement only after prospective `faceGripMasks` and `continuingFaceGrip` accept the next pose. It checks the real original footprints and owner receipts before replacing current contacts. A rejected upward pose holds the last sound posture. The existing authored one-paw exception is limited to 0.1 seconds; it cannot certify a new unsupported mantle bridge.

The current early-vault condition is actor height minus 1 m plus 2.6 m at least wall top minus 0.2 m. On this face that triggers around **6.82 m**, before the measured fixed hook can reach. Therefore an ordinary production ascent to 8.12 m is not an existing verified route. A redesign must defer that height-only vault transition and continue the original prospective wall-contact acceptance above it. A blocked controller move or rejected source posture must still hold or detach under the existing rules; it must never authorize a lift to the hook height.

The preserved [132-point shipping-pose sample](../../.sites-runtime/overhaul-20261009/mantle-feasibility-001/geometry.json) provides a limited geometric overlap: at normal offset 1.84 m, original decoded poses at actor heights 8.1 and 8.2 m each have two owned hind-wall patches, with normalized reach about 0.783 and 0.798. Sampled wall contacts persist to 8.7 m, and every sampled shipping pose has no admitted contacts at 8.8 m. The necessary forehook bound is about 0.681 m below that first sampled gap.

Those source samples include the decoder's automatic ledge blend. The fixed-contact solve uses its own single Cling/Mantle blend. The samples do not prove that the same continuous posture can retain the hind-wall pair while placing the fore pair. The source-supported route to the later hook is conditional on resolving that posture and proving every intervening movement and contact transition.

## Concrete contact schedule

| Stage | Contacts that must remain stationary | Permitted body motion and transition |
| --- | --- | --- |
| Wall ascent | Each currently planted original wall patch during its stance interval | Ordinary accepted ascent to a posture above the measured hook bound with reach margin. Replace the early height trigger with actual prospective roof-hook admission. |
| First fore grip | Two proven hind-wall patches | Reach and plant forepaw 0 onto the actual finite roof inset. Keep body height fixed during this placement unless the retained wall pair proves the complete proposed motion. |
| Second fore grip | Hind-wall pair and forepaw 0 | Place forepaw 1; retain each admitted pivot and paw orientation. Begin pulling only when both fore-roof patches are reachable, exactly solved and owned. |
| Pull | Both fore-roof patches | Raise and rotate the torso along a continuously accepted carrier path. Release a hind-wall anchor only while both fore patches remain sound. Shoulder compression follows the same solved body posture. |
| Hind purchase | Both fore-roof patches until replacement support exists | After full-hull edge clearance, plant each hindpaw on an actual roof patch. Inward carrier movement must pass native casts and preserve the retained fore pair. |
| Roof transfer | Both hind-roof patches while forepaws replant inward | Release and replant forepaws successively. Finish on a native supported landing, then return ownership to the ordinary roof gait. |

The pull requires a real torso change. In the fixed pure-Cling posture, the same fore patch has an upper actor-height bound of about **9.271 m**. Full roof clearance for the existing landing target is roof floor + 1.12 m, about **10.040 m**. A vertical translation with the same upright posture cannot cover that interval. The candidate must lower the forehip relative to the rising carrier through original torso rotation/blending, or make a proven contact handoff before that limit. No tested path currently satisfies this requirement. If the continuous solve fails there, preserve the exact failing hip, target, original limb lengths, retained contacts and native blocker receipt rather than extending limbs or dropping support.

## One pose owner and native admission

Add a serializable optional mantle-contact state only after the geometry bridge is proven. Each plant identifies the paw, wall/roof surface, source face and owner IDs/revisions, immutable world pivot and paw quaternion, and plant sequence. Derive its eight footprint corners from the original rig. Keep transient native collider handles authority-local. Revalidate all five query points against current permitted owners; a plant's mask bit means that its exact solved footprint is currently admitted.

One shared helper in `buildingVault.ts` should choose the torso pose and fixed targets. Both `buildingGripPose` and Actors consume that result. Each decoder/render rig uses one AnimationMixer, samples the same shipping clips at the same authority phase, and then applies the same fixed-length two-bone IK and frozen paw orientation. A retained pivot must not follow a new animated endpoint. Cloth and body presentation consume that same solved pose owner. Camera changes cannot admit support.

Simulation integration must transactionally preview the next body position, torso pose and retained/new patches; cast and intersect the complete original hull; and commit only the jointly accepted result. Stage changes must preserve retained receipts rather than unconditionally clear all masks. Cancellation, disruption, owner retirement and exhausted energy retain existing detach semantics. Mantle movement receives no timer, reach, hull or source-ownership waiver.

## Required qualification

The next bounded candidate needs an ordinary native ground jump, airborne wall catch and source ascent through the later-hook height. Every pull/transfer tick must identify at least two admitted planted patches, original solved corners, current native owners and full-hull clearance. It must show successive fore placement, stationary pivots during body movement, hind purchase before fore release, and a supported roof landing. A failure before the hook cannot be replaced by actor injection at 8.2 m.

Focused rejection cases must cover a finite roof-edge miss, a full-hull blocker with positive initial gap, retired wall/roof owners, release/cancel during pull, and snapshot/history parity for retained plants. An ordinary lean capture must expose the paws and edge during ascent, pull and transfer, then show sustained roof movement. The [air-catch inspection](critic/aircatch-working-inspection-001.md) remains an approval of its bounded physical outcome and a denial of convincing mantle presentation; this design does not change that verdict.

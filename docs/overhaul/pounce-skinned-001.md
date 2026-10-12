# Pounce skinned prototype 001 — CLOSED, UNADMITTED

Actual task start 2026-10-10 07:45:18 UTC; hard deadline 08:25:18 UTC. One complete new skinned representation was authored. The sole Blender author/export/render job, exec session **96580**, started approximately 08:00:44 UTC and closed exit 0 after **164.422 seconds** at approximately 08:03:30 UTC. No second Blender/native/render job, geometric retry or literal API repair occurred. The exclusive heavy slot was released immediately after closure. A 0.35-second immutable JSON/GLB arithmetic readback is separately identified below; it does not alter the model or motions. All writers are closed at this handoff.

Only `assets/source/overhaul-pounce-skinned-001/` and this document were written. No public, runtime, native, protocol, shared or production tool migration occurred. Live Pounce remains v3. Gate1 and the full goal remain INCOMPLETE.

## Frozen source and complete artifacts

`pre-author-freeze.json` was written **08:00:42.952203 UTC**, before Blender initialization or any candidate asset existed. It seals:

- `author.py`: `E6C2E11ECF2E6097B44AC64BCA9BA7ED6283F24B2743EAC91834C68D88DBABC1`
- `CONTRACT.md`: `8A6D6C6015C4AD25A865FCC9FC4BA7AF911AF37E7BEBFDA97AFAA1E87BB03325`

The pre-author preparation corrected foot-state handoff logic and clarified the mass description. These were pre-job script/description changes, not a post-gate geometry repair. The author and contract remain unchanged after the freeze. Previous failed rigid frames, anatomy seal, and original v1/v3/v5/v6/v7/v8 masters all match their protected pre-job hashes in `source-receipt.json`.

Complete editable `Pounce_Skinned_001.blend` (5,064,256 bytes), raw `Pounce_Skinned_001.raw.glb` (3,181,136 bytes), original `source-receipt.json`, complete `author-job-001.log`, and three `review-{quad,rise,upright}-normal.png` images are preserved. The fixed-camera quad view crops an extended forepaw and the upright view crops the top of the head; these are actual source-review images with a framing deficiency, not complete full-body or gameplay proof. No corrective rerender occurred.

- Blend SHA256: `63FDC9B9EA96459D8943AB519CA6E7CC3F2D39DCB21F0B74915359E8109BD400`
- Raw GLB SHA256: `2A12EC71E453C811FAAD006CBFA29B99DC395F995A13D20974E3F2982C429EAB`
- Final file hashes and UTC are in `seal.json`; that seal does not relabel the candidate as passed.

## Representation and observed source result

One closed weighted anatomical skin connects tapered thorax, abdomen, pelvis, broad neck, scapulae/haunches and upper/lower limbs. It uses the original v3 skeleton/bind with up to four normalized nearest-segment weights; separate rigid segmented armor uses the same skeleton. Source axes are X right / -Y forward / Z up, with declared .8 native scale. Existing retained geometry includes **130 original detailed parts: 18 head, 68 complete paw parts, 16 tail parts**, plus canopy/pilot/turbine assemblies. Their source vertices/faces/material assignments are retained; original rigid body covers are explicitly removed only in this new candidate.

Skin topology has **13,440 vertices, 13,438 faces, zero nonmanifold edges, one connected island**. Maximum normalization error is `4.74974513e-8`. These establish sampled topology/weights, not collision/support or animation acceptance. The mass declaration is a NEW finite **1,800 kg prototype approximation**, consistent with the existing rubble-interaction budget, not a globally calibrated native Pounce chassis. Explicit chassis/skin/armor/head/limb/paw/cockpit/turbine/tail partitions sum to 1,800 kg. Source receipts contain lumped bone/vertex-centroid COM and point-mass inertia samples; these do not establish native reaction forces or manufacturing mass.

Required named stand/quad/upright/R/turn clips are baked; original air, climb, hit, death and other actions remain **UNQUALIFIED** for the changed body. Actions containing `Pair` were omitted. Original `PounceTackleAttacker`/`PounceTackleVictim` happen to remain in the raw export but are also **UNQUALIFIED**, not paired-source approval. The `unsupportedPairs` field remains true. Root-free candidate clips and the root-moving source diagnostic are separate.

## Genuine failures — no repair/retry

The earliest source geometry rejection is **FelineUprightWalk frame 0**: retained head versus new dorsal/fore-upper armor, BVH **head polygon 68 / armor polygon 195**. The receipt retains the sampled intersection witnesses. The checked surface sets are explicit in `author.py`; this is not exhaustive armor/skin/contact clearance. Upright idle, R and upright turn samples also retain related intersections. There was no geometry cut, head shift, armor waiver or extra candidate.

Individually authored gait/turn requested reach maxima stay below 1.0 (quad Gallop **.996301**, upright Walk **.92336**). Their sampled native-scaled fixed-chain errors remain below 0.6 micrometers. This does not qualify their native contacts. The connected source circuit fails separately:

- First recorded maximum target error above 5 mm native: frame **64**, **t=1.066666667 s**, **accelerateQuad**, speed **5.566116862 m/s**, carrier source **[0,-1.412230492,0]**, yaw 0. **FL/HR are prescribed planted; FR/HL are swinging.** Recorded maximum target error is **.0306239096 m native**.
- `circuit-forensics.json` is explicitly **DERIVED** from immutable raw GLB Idle joint heads/lengths plus the original planner arithmetic and recorded carrier sequence. It identifies **HL**, swinging, hip source **[-.729999959,.936000004,1.599999743]**, requested target local **[-.729999975,1.908050472,.145774667]**, world **[-.729999975,.495819981,.145774667]**. Original chain length **1.712906384 m source**, requested distance **1.749186292 m**, ratio **1.021180322**. Derived clamp error **.0306239269 m native** agrees with the original receipt to submicrometer precision; maximum agreement difference across this pre-turn segment is **2.86103e-7 m native**. The original Blender job did not emit raw per-chain requested targets; this instrumentation gap remains explicit.
- Therefore the first planner failure occurs during acceleration, **before R or its contact handoff**. A target chosen from an earlier swing/carrier state becomes unreachable as that prescribed carrier accelerates. The candidate cannot claim a useful supported continuous circuit. It does not establish that a continuous feline anatomy or the original hull is globally impossible.
- Maximum circuit requested reach is **1.210680999** and maximum requested target error is **.290301518 m native**. The actual baked root-moving circuit is additionally invalid: transformed chain error reaches **29.4982147 m**, skin floor **-23.9062897 m**, and large diagnostic proxy excursions. World-carrier application through the pose hierarchy is not a valid transported skeleton. Those values cannot be treated as physical anatomical bounds or support evidence. No pose-application repair was attempted after the genuine head/armor failure.

The approximate diagnostic body envelope is not a native full-shape query. Skin/head comparisons and full rigid floor checks do not establish containment of every tail/cockpit/armor pose in the actual Rapier carrier. Quad head exceeds the diagnostic radial bound by about **.057964 m**, and cancellation samples expose further gaps. Exact full native hull/terrain/support, .20 m obstacle clearance, responsive arbitrary-clock cancellation, planted sole slip/yaw, climbing, paired contact and two-client ordinary motion were **NOT RUN / NOT QUALIFIED**.

The final result is a complete preserved **failed source prototype**, with no runtime admission. Appearance review may identify additional deficiencies from the actual pixels. Further work would require a separately authorized underlying planner/pose-ownership and head/armor reassessment; no automatic candidate 002 or public replacement follows this packet.

# Two-rig locomotion feasibility — CLOSED, unimplemented

Writer: CLOSED. One finite OFF measurement packet; no production candidate, source asset mutation, browser, Blender, build or server job. No gameplay acceptance or human-lag claim. Production source preimages were captured before measurement. This task stops at the first measured source/task ownership blocker, as authorized by the parent.

## Actual OFF inputs and method

The standard Pounce route uses `public/assets/overhaul/pounce-v3/Pounce_Overhaul_v3.glb`, SHA256 `dee43000cfaa77cda9801db7916344b8b3cc5eb7d71589dd8d54cca1a0d6758b`, 1,249,484 bytes. Its actual decoded skin has 25 joints and upper/lower/paw chains, without ON121 hind hocks. Nine relevant clips exist, each with 75 channels. Sampled limb-local translations remain fixed within 2e-5.

`measure-off141.mjs` uses local NodeIO and actual glTF LINEAR quaternion/vector interpolation plus the parent transform hierarchy, at 121 phases per clip. `off-measurements141.json` contains the decoded paw-pivot positions and chain lengths. These are source-space pivots, **not skinned sole witnesses, rendered marker measurements, ground contacts, or native certificates**. Fitting a stance does not repair the source.

The phase interval is the actual exported first-to-last key interval. OFF offsets use `(phase-offset) mod 1`; ON123 uses its own validated metadata convention. Values below are unchanged current `felineMotion.ts` Pounce metadata, not a new fitted animation policy. Distance is native metres per cycle at player scale .8.

| Clip | Actual key interval seconds | Duty | OFF offsets FL/FR/HL/HR | Declared native distance |
|---|---|---:|---|---:|
| FelineWalk | .0166666675–1.1666666269 | .70 | 0/.5/.75/.25 | .8228571429 |
| FelineTrot | .0166666675–.6999999881 | .55 | 0/.5/.5/0 | 1.6000000000 |
| FelineGallop | .0166666675–.5166666508 | .44 | 0/.08/.46/.54 | 3.0181818182 |
| FelineUprightWalkLong | 0–1.2000000477 | .70 | unloaded/unloaded/0/.5 | 1.3142857143 |
| FelineUprightStride | 0–.8999999762 | .57 | unloaded/unloaded/0/.5 | 2.0771929825 |

## First blocker: declared stance is not an admitted source endpoint

Under the existing OFF gallop metadata, FL phase 0 is stance. Its decoded endpoint/chain-length ratio is **.9988560783**, beyond the existing strict `< .98` admission in `pawContact.ts:63`; HL stance reaches **.9856308821**. FL source stance pivot height spans **.0377805055 m** at player scale; its best constant-distance stance fit has **.0175377047 m** maximum residual and a fitted cycle distance **3.0071442224 m**, versus declared **3.0181818182 m**. These observations identify an incompatible source/task contract. They do not prove the unchanged geometry can never support an improved body trajectory.

The current OFF contact owner already admits this distinction: `Actors.tsx:309–326` can retire the lease and use `legacyRawFallback`, allowing a raw authored request under the wider geometric joint limit. Such a fallback cannot qualify a real plant in the proposed shared owner. Changing metadata or retaining that fallback would conceal the actual source endpoint problem; arbitrarily dropping the body would create a new unvalidated body/collision trajectory.

The source author helper `tools/build_feline_mech.py:339–343` clamps requested two-segment endpoints at `a+b-.002`. This is corroborating author-source evidence, not a claim that this current helper alone reconstructs the byte-exact retained GLB.

Moving R supplies a second ownership conflict: actual TransformUp/Down hind pivots vary only about .00035/.00031 in source Y and .00155/.00194 in source Z across the entire transition. They have no travelling recovery cycle. `Actors.tsx:128,153` attenuates locomotion by `1-transitionWeight` and gives the whole transition clip that weight. A native travelling carrier therefore cannot receive coherent hind stepping by preserving that whole-pose owner. ON121 instead has live quad/upright contributors plus the neutral106 arc; its continuous gait-band event reconciliation remains required independently.

## One next coordinated source/runtime remedy

Authorize a single explicit **per-rig body-and-endpoint task contract**, then integrate it through one shared locomotion-only owner. OFF needs a validated pelvis/ribcage load trajectory and admissible ground-stance endpoint trajectory for its fixed three-bone chains, preserving its native stride distances and the existing .98 guard. Moving R must contribute body/forelimb transition tasks while hind travel and authored recovery continue; forelimbs unload and replant by actual task events. Retain the old clips for their supported native action contracts, but stop assigning their entire R pose ownership during grounded travelling locomotion. Validate the OFF task source against the actual decoded rig before production integration; if that task cannot fit its unchanged chains, stop for an anatomical source correction rather than waive reach.

The same adapter can then consume ON121's measured five-gait metadata and OFF's validated task metadata, reconcile limb events at continuous band changes/reversal/R, preserve recovery and load transfer before a **single** fixed-chain solve, and restore the original owner on combat/air/climb/pair interruption. The adapter must not route both old contact IK and the new owner to the same chain. Native hull/carrier, source rest/binds/local joint translations, materials, camera and supported non-locomotion actions remain intact. This is a coordinated ownership redesign, not another contact-threshold change.

Only after that complete source delta: directed phase/band/reversal/R/interruption-restoration tests and tsc, independent source review, then one ordinary oblique ON/OFF gameplay gate. No current packet test could establish that missing body/task contract, so no speculative production adapter, tests or tsc were run.

## Receipts and correction disclosure

`node tools/overhaul-locomotion-task-141/measure-off141.mjs` exited 0 (1.86418 s). The initial stance-fit diagnostic accidentally used the opposite mount sign and two guessed upright constants. It is retained as `off-stance-fit141.initial-unqualified.json` and must not be used as evidence. One genuine correction restored `-.8 * sourceZslope` and the actual `.70/1.15` and `.57/1.48` source constants; the corrected `node tools/overhaul-locomotion-task-141/fit-off141.mjs` exited 0 (.5223149 s). The final corrected JSON is the qualified numerical diagnostic, with the pivot-only limitations above. No motion curve, duty, native distance or production guard was tuned.

`unchanged-game.json` compares captured source preimages with the active files. `source-seal.json` seals this CLOSED packet and immutable input copies. The packet deliberately contains no proposed production delta.

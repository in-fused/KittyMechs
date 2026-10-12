# Feline movement direction

Owner feedback from a real friend session makes movement continuity and truthful scenery the release priorities. Preserve immediate controls and authoritative collision while making the visible chassis carry its weight through its paws. Screenshots, generated trailers and stationary FPS cannot establish movement quality.

Stray is a reference for observation and iteration. Its developers describe studying their studio cat Oscar and repeatedly refining small jumps, transitions and responsive controls in [PlayStation's interview with BlueTwelve](https://blog.playstation.com/?p=367025). The [official introduction](https://www.playstation.com/en-us/games/stray/a-spoiler-free-introduction-to-stray/) also highlights feline body language and vertical exploration. Use those principles to author original KittyMech behavior and assets.

## Current candidate

Ground contact uses actual fixed collision under the whole paw footprint. A paw holds a world-space support anchor during stance, then releases before reach or direction becomes strained. Fixed-length joints preserve the rig. The coastal candidate uses a complete real five-hit envelope for body clearance and a conservative fitted plane with unchanged all-hit tolerance for planting. Bounded carrier settling requires complete applicable footprints and at least two valid stance supports. Air, transformation, traversal, death and respawn release contact explicitly. Every moving/fading footprint stays current within the one-query budget.

Authored quaternions are restored before each mixer update and captured before IK/head/tail corrections. Unchanged animation tracks can skip their writes; this prevents a previous correction from becoming the next authored pose or accumulating through held idle. Frame-stamped contact diagnostics now pair results with the actual displayed air/form/climb state. These changes retain the source rig lengths, clips and responsive authority inputs.

The authored-turn candidate appends left/right angular footfalls to all seven rigs. Pounce uses compact sequential steps, Bastion short steps with longer support, Lynx lighter diagonal coordination and Caracal staggered stable steps. Realized displayed heading advances the shared turn phase; connection stalls stop it, and reversal crossfades the mirrored poses. Actual horizontal travel gates the pose, including blocked movement. The same swing/support mixture drives all three contact passes. These clips are restricted to grounded quadruped motion; upright, form, air, traversal and death gates retain their separate poses. Existing body heading authority remains responsive and can still turn very rapidly on a reversal; these steps do not finish that broader movement problem.

## Next authored movement slice

The upright candidate appends four clips to each retained player rig: a longer walk, faster stride, and left/right hind-paw turns. All 28 older clips, geometry, skins, binds and materials remain exactly equal after decoding the optimized assets; the three Sentinel rigs and other admitted models remain byte-identical. Runtime gait weights and phase share realized displayed travel with start/stop hysteresis. Turning uses actual signed angular travel, and every contributing raised hind paw releases through the same support mixture in probing, landing admission and final IK. Forepaws stay in the raised guard. Bastion retains prolonged double support; Lynx has a brief running-flight pose while authority grounding remains unchanged.

| Chassis | Full-speed cycle travel | Designed individual steps/s | Quadruped launch | Preserved upright launch |
|---|---:|---:|---:|---:|
| Pounce | 2.077 m | 4.68 | 12.2 m/s | 5.76 m/s |
| Bastion | 1.601 m | 3.50 | 9.4 m/s | 5.20 m/s |
| Lynx | 2.643 m | 5.33 | 12.4 m/s | 6.56 m/s |
| Caracal | 1.756 m | 4.73 | 10.5 m/s | 5.60 m/s |

These are physical rig profiles and authoritative launch values. Cadence follows actual distance; there is no playback cap, limb stretch or delayed heading. Gravity, horizontal acceleration, air control, aiming and Pounce's separate ability launch remain unchanged. The source mixed poses retain their pre-IK hind-paw floor dips explicitly; actual shipping fixed-floor tests correct them through the existing obstruction/rigid-IK path with 4 mm clearance. That test alone does not establish moving terrain, aiming, carrier, network or visual acceptance. Independent compiled comparison remains required before release.

| Chassis | Direction |
|---|---|
| Pounce | Compact shoulder gathering before a leap, forepaw reach, hindquarter drive, then separate fore/hind landing absorption. Keep the leap input responsive. |
| Bastion | Longer planted support, deliberate short repositioning steps and a low center of mass; a brace should visibly transfer load through the hind legs. |
| Lynx | Low stalking walk, quick diagonal acceleration and a light banking turn with purposeful tail counterbalance. Direction changes still need discrete paw repositioning. |
| Caracal | Measured travel, upright alert head/ears, wider stable support while repairing and controlled settling after actions. |

Build on the turn slice with further turn blending, acceleration, braking and landing. Turning should reposition paws rather than rotate a planted body through them. The head can lead a look, shoulders follow, and the tail counterbalances; weapon aim and the camera must remain coherent with authority. Smooth transitions should blend corresponding footfalls rather than independently cycling neighboring gaits. Upright turning now has candidate authored steps; discrete supported landing sequences remain additional authoring work.

The next bounded candidate is original quadruped start/brake bracing over the existing gait and turn support. Detect sustained starts, stops and signed reversals from actual displayed position segments and presentation-time advancement, with hysteresis; command velocity alone is insufficient when a hull is blocked. Keep authority input/yaw responsive and preserve paw phases. Cancel the brace during air, transformation, traversal, death and reset, and hold it during a stalled presentation clock. Qualify weapon/ability composition, brief taps, blocked starts, reversals, slopes and network arrival histories before release.

Frame-stamped diagnostics and actual two-client tests now qualify sampled takeoff/form admission against displayed state, removing the earlier roughly 100 ms packet/pose mismatch. A later landing event should preserve actual KCC impact time and downward speed until applicable paws reacquire support. Supported fore/hind absorption still needs original authoring and moving-route acceptance; do not infer impact strength from packet arrival or invent a floor.

Contextual vaults and roof approaches should use admitted geometry, full-hull clearance and real supported landings. General building access remains future work. Dynamic platforms and arbitrary uneven edges need separate qualification; a failed static paw receipt must release cleanly rather than invent a floor.

The retained authored-turn review's coastal endpoint near (-141,-27), at roughly 10% grade, rejected all strong plants and left about 22 cm of clearance. The new ordinary route captures gain sustained two-front-paw support for all four chassis; remaining hind soles still lack full support. Exact CPU fixture orientation gains different per-limb support and must not be substituted for the rendered route. Steeper sites remain rejected under unchanged caps. Continue improving uneven support and body placement without relaxing footprint truth or stretching limbs; this is partial adaptation, not universal grounding.

Cold model loading must also preserve the live arena. Asset-local boundaries isolate new actors and prop batches from Session/World lifecycle owners. The actual old browser-host test froze through a held new-chassis download; the candidate keeps movement, time, membership and existing contacts alive. Released version 10 also retains overlapping guest collider tiles and bounds terrain-worker ownership, backlog and failure recovery, as documented in `movement-world-next.md`. Further streaming and wider contact qualification remain part of the continuing goal.

## Acceptance

Use ordinary menu, keyboard, mouse and network input on compiled production builds. Check all four chassis on actual level and graded terrain, slow turns, abrupt reversals, stops, jumps, forms, roof traversal and respawns. Compare continuous footage with the preceding approved release. Record paw slip, whole-carrier discontinuities, sole penetration, rigid segment lengths, camera obstruction and frame pacing. Exercise repeated hangar returns and delayed guest snapshots. Keep failing evidence and require the independent critic to approve the repaired source fingerprint before replacing the friends build.

Higgsfield can support original decal textures, visual development and explicitly labeled motion references. Rendered video is not a playable rig or an animation export. Actual joint motion and collision require implementation and gameplay review.

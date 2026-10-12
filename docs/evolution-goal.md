# KittyMech evolution goal

The active goal is to keep improving the browser game through reviewed, playable iterations. The visual ambition is an original feline robot action game with cinematic transformation and combat spectacle. Animal-form robot films and games are inspiration for weight, silhouette and motion; the game's designs, names, assets and mechanics remain its own.

## First evolution milestone

- Dynamic, synchronized weather fronts for Rainline, Ember and Frostline, with wind, changing visibility/lighting and bounded particles. Reduced flashes suppress lightning pulses.
- Readable area effects with actual shared combat rules: distinct damage, slowing, shielding and healing behaviors; telegraphs show the relevant footprint.
- A first hind-leg combat stance for the four chassis, with deliberate transformation timing, different movement/fire/ability tradeoffs, distinct clips and meaningful authoritative collision. The default direction keeps a feline silhouette; owner feedback can steer the form.
- Keyboard and touch controls, co-op/PvP/PvPvE replication, visual/performance regression checks and independent critic approval before publication.

## Authored traversal and destruction milestone

The first playable slice uses one admitted workshop facade and one breakable retaining wall per theater. Climbing requires four paws, ground, suitable facing/reach, energy and clear headroom/landing. Destruction uses replicated damage states, exact matching collision removal and pooled cosmetic debris. This foundation is now followed by the vertical/co-op milestone below; arbitrary building access and structural destruction remain ahead.

Rainline's retaining wall at (-59,-7), Ember's at (-35,-53), and Frostline's at (58,-113) survive required-lane filtering. Each has a stable authored ID and 180 HP. Authority retires the exact body once and remembers destruction across chunk reloads and late joins, while keeping graded foundations. Guests remove the model and local cover collider; navigation and bot paths invalidate. A destroying rocket still has the intact wall block that same explosion. The implementation bounds state to twelve cover entries and cosmetic debris to 32/64/96 instances by quality; this slice currently admits one wall per theater.

Climbable workshops are Rainline(-36,52), Ember(34,50), and Frostline(35,25). Their visible steel service facades sit outside the original roof overhang and share exact collision; full roof decks cover the reachable visible roof footprint. Surface reach is chassis radius-.02 through radius+1.3, with full lateral body clearance. Grab costs 8 energy; active climbing/mantling drains 7/s and cling 3/s, without attached regeneration. Four chassis have different ascent rates and zero-root-motion grab/cling/climb/mantle clips with wall/roof IK. Authority uses a 2.6m hull, lifts its bottom above the ledge before crossing, checks the landing continuously, and retains that envelope for a .3s release fade. Release, stale input, death and depletion detach safely; a sphere sweep keeps the actual world-up camera outside solids. Arbitrary surfaces and structural fracture remain future work.

## Vertical co-op expedition milestone

Two admitted service facades per theater now support actual rooftop combat. Forward roofs add an optional SKY UPLINK, a guardian, a Scout that physically climbs and pursues, and two breakable 100 HP cargo banks. Its LOS-limited 60 m EMP suppresses enemy weapons for eight seconds without gating the main mission. Roof/cargo field polygons and debris use actual support.

Co-op relay/core captures advance a shared safe respawn/late-join checkpoint, while living pilots remain in place. Six room-randomized repair/energy/coolant caches use grounded beneficial E claims, exact line of sight and 55–75 second relocation. Repair supports nearby visible allies. Three Higgsfield faceplates are admitted runtime textures with retained generation and normalization receipts.

All seven rigs use 25 bones and accepted authority combat timestamps. Players have 28 clips and Sentinels 17, including angular turn steps, authored recoil, abilities, hurt and collapse. Distinct chassis stride lengths/duty/weight and combat poses build on the four silhouettes. Actual source deformation/composition and shipping GLB audits complement production captures; these are bounded prototype approvals, not a finished AAA certification.

## Movement and streaming repair direction

Owner friend-session feedback makes fluid feline contact and reliable visible collision release priorities. Local bodies now sample live 60 Hz authority; guests use a bounded coherent timeline shared with the camera, and gait/support timing follows visible travel. Disabled corpse colliders no longer obstruct KCC movement. Every solid tree stays rendered on all presets, forward tiles prepare before crossing, and a worker builds exact terrain while the coarse underlay remains until readiness. Fuller source-photograph foliage stays within budget. Actual motion/contact/streaming and real network play require independent acceptance before release; short FPS alone is insufficient.

Stray is a reference for deliberate feline weight, paws and transitions. Original chassis silhouettes, rigs and game rules remain distinct. Production animation quality, arbitrary surface contacts and richer realistic architecture remain ongoing work.

## Ground contact and environment art milestone

All four player chassis now use actual fixed-collider paw receipts, whole-footprint support checks, bounded stance anchors and fixed-length joint correction. The visual body settles into measured slope clearance and releases smoothly when support changes. A separate upward paw retraction keeps raised edges clear without lifting the whole torso suddenly. Ground anchors release for air, forms, traversal, death and respawn; dynamic platforms and arbitrary uneven surfaces remain future qualification.

Detailed Rainline workshops use a retained official CC0 modular factory package. Fuller scanned firs have three instanced detail levels and fern clumps have two; matched PBR maps, actual UVs, alpha coverage and root/proxy fit have decoded shipping regression checks. An original Higgsfield Rainline Works sign is embedded in the workshop with source/job/hash provenance. Every solid tree retains a visible level on every preset. Canonical source packages and editable derivatives stay in the art snapshot.

Physics owners now release colliders and simulation resources before Rapier's provider frees the world. Ordinary server, training and live-peer returns are regression tested; exceptional subtree cleanup ordering has separate CPU evidence. Production contact, frame pacing, resource transitions, normal multiplayer and the independent source fingerprint remain release gates. This milestone does not complete AAA art or authored feline transitions; see [the motion brief](feline-motion-direction.md).

## Authored angular footfalls milestone

Original left/right quadruped turn clips are appended to all seven editable rigs. The four chassis use different support duration, step sequencing, lift and head/tail anticipation. Actual presented heading travel advances their phase, while actual horizontal travel gates the low-speed mixture. Stalled snapshots hold phase; reversals crossfade mirrored poses. The same mixture governs ground support, body settling and landing admission. Authority heading and input remain unchanged in this renderer milestone.

A release-completion contact repair replaces the scheduled probe with one at the current rotated footprint before a paw leaves its old anchor. This prevents the reproduced stale downhill ceiling from clipping a Caracal toe during an abrupt slope turn, within the existing twenty-cast frame bound. Existing mesh/skin/index data and every old animation channel are preserved exactly after decoding. Independent turn, slope, multiplayer, lifecycle and performance evidence gates release. Authored braking, acceleration, landing and upright turns remain further work.

## Ongoing production direction

Develop chassis-specific motion, attacks and defenses; improve encounters, materials, geometry and sound; qualify long sessions and target hardware. Preserve responsiveness and current multiplayer modes. Durable hosting remains deferred. Higgsfield supports admitted visual/texture/concept assets where useful; generated concept art must be labeled and must not substitute for playable geometry.

Every release requires fresh independent approval of mechs, maps/world, combat/AI and integration. A rejected area returns for repair. `release:check` validates the approval receipt against covered source/assets. Record observed regressions and remaining limitations honestly. This goal has no completion deadline, commercial AAA certification or promise of zero future regressions.

No recurring automation is scheduled by this document. Scheduling remains separate from the active goal and the owner can steer or pause it. All implementation and retained assets stay in KittyMech-Web. The original Unreal folder remains read-only until its established deletion condition is met.

# 279 CLOSED — compiled retained lamp navigation, NPC and mission source proposal

Writer CLOSED. PASS_COMPILED_LAMP_NAVIGATION_SOURCE_ONLY. One implementation, no gameplay replay or admission. Existing shared/navigation.ts,177 planner/geometry-source, native colliders, propCollider and retained public062 are unchanged; exact preimage comparisons are protected-inputs279.json. storage:clean ran first/zero deletions. New unused canonical shared/lampNavigation279.ts is within the authorized nonconflicting helper scope; existing production imports do not use it until source routing is admitted.

## Geometry and ownership

Helper uses the SAME retained rainlineLampMeshCollision001.json source716 vertices/752 triangles and the native Float32 scaled vertex law. Instance translation/yaw/pivot match createRetainedLampColliderDescriptors. Each triangle is clipped against the actual query minY/maxY band, then its resulting projected polygon participates in an exact continuous horizontal segment-to-polygon distance test with the caller's unchanged clearance. Per-triangle and aggregate AABBs only prune. There is no generic whole-lamp box, sparse segment sampling, new radius/tolerance, fake floor or native collider mutation. Overhead source geometry excluded by body band remains excluded.

WeakMap cache is keyed by the actual prop object and exact x/y/z/yaw/scale/minY/maxY signature; any placement/band change recompiles. No stale snapshot/body/cache admission. All query operands finite/positive/ordered guards retained; invalid queries reject. Near-boundary Float32 native rotation/readback rounding and live physics/controller behavior still require real integration review; this is static navigation geometry, not a certified dynamic contact path.

## Drop-in source binding

patch-manifest279.json is authoritative. NEW shared/lampNavigation279.ts is a canonical module with correct ./data JSON import. It has the exact tested helper body, with only import path adapted from tools-local fixture location (equality asserted at closure).

Replace contents at canonical shared/navigation.ts with navigation279.ts; canonical tools/overhaul-coop-177/planner.mjs with planner279.mjs; canonical177/geometry-source.mjs with geometry-source279.mjs. Keep their original module identities/relative imports. Do NOT load navigation279.ts under its tools path without its fixture adapter. Fixture copies are explicitly for local checks and rewrite imports only; they are not runtime routing source.

NPC Navigation adds lamp occupancy to cold cells using its unchanged CLEARANCE2.3 and current propActive filter, continuous lamp checks to grid edges, and final continuous validation of assembled street connectors. All CELL/MAX_SEARCH/cache invalidation/terrain/city/structure masks remain unchanged. A rejected assembled street path currently returns no route, rather than widening search; this can reduce availability and must be examined in real NPC play.

Mission planner adds lamp continuous segment/endpoint checks with existing CLEAR1772.85 and unchanged endpoint extra ARRIVAL1.1; geometry-source point predicates use the same helper. Original search/pulse/controller/terrain/occupancy/arrival budgets unchanged. These candidates do not change NPCs on retained062 by client overlay alone: future authoritative server/Simulation's canonical shared/navigation import must ALSO bind the candidate. Root owns that separate native integration decision.

## Finite checks and limits

First scoped type preflight failed only on fixture .mjs declarations/dynamic lastBlock typing; exact logs/receipt/fixture preimage preserved under preimages/type-preflight-first. Corrected type adapter enables existing JavaScript imports without checkJs and declares dynamic fixture row type; no algorithm/runtime changes. Corrected type exit0/2.391s, ONE directed suite exit0/.656s (cap30). No suite retry.

23 directed boolean cases plus native shape-array/index correspondence, invalid-operand rejection, actual NPC/mission integration checks. Actual road instance(-2.5,-.08,12),scale.9/yaw0 rejects failed277 continuous segment/native1.75/planner2.85 and entire3.95 arrival radius. x=-8 bypass and its arrival region are lamp-clear. Actual native factory vertex/index arrays match compiled source law. Tests cover .5/.9/1.4 scale and0/pi/2/-.73 yaw/translated pivot, a lower body band excluding the arm versus actual elevated arm band, whole mesh above body, cache pose/band mutation, and invalid scale/band.

Real old NPC Navigation considered the failed target cell walkable; candidate rejects it and accepts the bypass cell. Candidate NPC path from(-8,18) to(-8,6) is nonempty and every returned segment is independently checked lamp-clear by the helper. Mission planner/geometry-source actual candidate functions reject the lamp segment/target with RETAINED_LAMP_TRIMESH. The isolated mission geometry fixture deliberately excludes actors/other solid blocks to isolate lamp ownership; it is not a whole-city/current-publication route proof. Actual terrain/city/actor/ruin interactions, runtime cost, mission completion and public feline art/contacts/human lag remain unqualified.

One next gated integration: bind canonical NPC+mission candidates, preserve original authority/publication/occupancy/control limits, independently review source, then root ordinary route/NPC gameplay. No automatic replay or public promotion from this source PASS.

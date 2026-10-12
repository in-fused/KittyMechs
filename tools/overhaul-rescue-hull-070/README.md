# Rescue hull query 070

Source-only candidate. The one shipping change is `advanceCoop.restore` in
`shared/simulation.ts`: its Cuboid query becomes the RoundCylinder dimensions
already used by `setHull` for a quadruped actor. A Pounce's square query previously
rejected diagonal solids outside its actual circular hull. A small solid centered
1.5 m along each horizontal axis illustrates this: its nearest corner is 2.051 m
from the actor center, beyond the actual 1.75 m outer radius.

The query center remains the existing **60 mm above the restored hull center**.
This packet matches the actual shape and dimensions; it does not claim identical
query and native poses or eliminate that existing floor clearance policy. All
query filters, self exclusions, actor separation, stance reset, protection,
timers, interaction priority and input handling remain byte-for-byte unchanged.
Genuine circular penetration still rejects restoration.

`rescue-hull.test.ts` uses real Rapier and Simulation, the same controlled native
damage setup as `tests/overhaul-coop-native.test.ts`, then accepted normal stored
E input and native 60 Hz steps. It checks diagonal cover revival at the three
second threshold, genuine overlap retaining full channel progress until actual
obstacle removal, and ordinary terrain-floor revival followed by accepted
movement. NPC removal and direct accepted damage are fixture setup, not public
mission evidence. The included existing native co-op suite protects ordinary
rescue, ray obstruction and lifecycle behavior. All tests are prepared, unrun.

The sealed 056 public failure never engaged E. This independent code defect is
not established as its cause. Full cooperative mission completion, checkpoint
and public rescue remain unqualified. No browser/native jobs, builds or tests
were executed by this author.

The original source is preserved under `preimages/simulation.ts`; the final
source must equal that preimage with exactly one literal constructor replacement.
Root owns the focused test command, typecheck, build and any public validation.

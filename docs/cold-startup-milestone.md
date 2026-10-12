# Selected surface loading and deployment cancellation

2026-10-06. This bounded iteration reduces unnecessary theater texture loading and lets a pilot cancel an initial deployment. It uses the installed React Three Fiber/Drei/Three stack; no dependency, physics, protocol, model, animation, map, enemy or area-effect change is admitted here. The original Unreal project stays read-only. The improvement goal remains active.

The previous surface hook loaded the complete eleven-texture tuple for every theater. The new hook starts the selected URLs together, before any suspense read, and uses single-URL cache keys for the seven common textures. Rainline requests nine unique core surface textures; Ember and Frostline each request eight. Their ground normal uses the same cached rock-normal object. All nine roles, existing diffuse color spaces, repeat wrapping, anisotropy and material normal-scale signs are preserved. Shared textures are never disposed or cleared by a consumer.

Both initial loading surfaces now offer **Cancel deployment**, calling the existing generation-fenced `leaveGame` path. It is an ordinary pointer/keyboard button, including before input hooks mount. Cancellation cannot run while a long synchronous main-thread operation blocks the browser event loop.

Opt-in diagnostics expose detached metadata for committed surface-hook leases. They report shared object identities, roles and consumer counts; they do not prove shader binding, GPU residency or visible pixels. Unique lease tokens own cleanup. Registration follows the page's already-installed debug API after returning to the hangar removes URL parameters. Dynamically deleting/replacing that API while mounted is not an implemented diagnostic opt-out.

## Current qualification

The final source inventory has **599 files**, and the root/frozen candidate production builds match across **83 files**. Fingerprint: `f394de512a661796a6dd13b8012f13cf9b3d4ba2d2daea60122d168962cd6fae`. Source and build bindings are in `.sites-runtime/cold-startup-001/source-004.json`, `candidate-built-004.json` and `root-build-004/receipt.json`.

- Focused ownership/diagnostic tests: **16 passed in two actual files**. Full lint, type checking and production build pass. The native full suite was not rerun for this render/diagnostic/UI change; the predecessor's experimental rubble grounding failure remains retained.
- Browser004: **six passed**. Three cold theaters hold all unused theater textures indefinitely while the selected scene becomes playable. Every role URL/configuration and returned metadata detachment is checked. Four theater deployments/revisits reuse common texture identities, request each of the eleven core URLs once across the page, retire leases/contacts/native snapshots and use later input-owner generations. A held needed texture starts alongside its eight partners, finishes after cancellation without reviving the scene, and supports redeployment.
- The unchanged late-chassis browser test passes: a cold remote Caracal load leaves the host's native progress, existing contacts and ordinary movement live, then adds the remote contacts on reveal.
- Cancellation observer003: **three passed**, with six visible captures. Selected Bastion GLB, HDR and the exact built lazy-game module are each held during initial loading. Ordinary cancellation retires state; completion after leaving does not restore gameplay; redeployment succeeds. Actual Rainline hook-role metadata and mutation/re-read detachment are checked again.

Browser source, terminal/raw output, JSON report and copied captures are retained under `browser-004`; supplemental records and captures are under `cancellation-observer-003` with their terminal wrapper in `cancellation-job-003`. Representative screenshots show the current terrain, props and mech presentation. They are not a pixel-identical comparison or an art-quality approval.

## Cold Peer startup observation

Three fresh local Peer guest contexts were measured against the exact sealed area-effects predecessor, then three against texture candidate002. Ordinary host controls cast a native four-second shield before the guest joins. Read-only native/effect diagnostics, long-task observation and forwarded WebGL API timing add measurement overhead. No randomization, WAN test or hardware-wide benchmark is claimed.

| Observation median | Predecessor | Texture candidate002 |
| --- | ---: | ---: |
| First native guest snapshot | 923 ms | 871 ms |
| First actual area-render callback | 4,397 ms | 3,891 ms |
| First FPS probe | 6,605 ms | 5,274 ms |
| Initial shield drawn in the three traces | 0 / 3 | 0 / 3 |

The callback is not a pixel timestamp; the FPS probe is later and includes startup, so it is not steady gameplay frame rate. WebGL observations retain only calls exceeding two milliseconds, not total GPU work. Negative/inverted worker resource timings remain in raw evidence and are excluded from network-latency conclusions. Long scene work remains. The initial field still expires before a submitted visible dome: **cold transient visibility is not repaired**.

The paired observation applies to candidate002. Final004 changes only the diagnostics-session gate and qualification tests from that candidate; all selected texture loading, role configuration and rendering content remain exact. Final004's functional browser evidence is separate. The reused candidate profile receipt has stale baseline wording; the actual private port/process/source binding and corrected interpretation are in `profile-comparison-001.json` and `profile-successor-002.json`. Neither raw receipt is rewritten.

## Retained failures and limits

Candidate001 completed static checks but was superseded at critic preflight: a held initial loading overlay intercepts the HUD pause pointer target. A real cancel button fixed that product limitation. Its first Vitest command named an absent `peer-protocol.test.ts`; only the two actual files/16 tests count.

Browser002 retained five warm-leave failures from an unsupported empty diagnostic-owner assertion. Actual two-cycle ownership observation shows native/contact/lease retirement, pending zero, no hangar-generated jump intent and a later owner generation, while historical ledger owner metadata remains. The critic approved correcting that test contract without changing input/runtime code. These zero-issued/cancel traces do not qualify nonzero jump/strike watermark replacement or all direct runtime-reset seams.

Browser003 then retained a genuine observer lifecycle failure on the second theater; cancellation observer002 retained the same missing-lease problem on redeployment. Reading the URL flag at every mount disabled new diagnostics after leave cleared the query. Final004 follows the installed opt-in page session and passes those scopes. All failed runs remain available.

Disk space fell below ten megabytes during qualification. An initial recursive NTFS compressor followed the dependency junction; it was identified and stopped. Subsequent compression used explicit file paths and verified all 2,725 frozen source/build hashes, plus all 123 then-immutable private gait-evidence hashes. Duplicate immutable candidate001/002/004 files were atomically replaced with equal-byte hardlinks; 172,698,361 logical duplicate bytes were deduplicated, with every content hash retained. **All linked frozen sources/builds must remain immutable; future changes require independent copies.** Root source/dist, the Unreal reference and friend deployment are not linked by this operation. Compression/deduplication receipts are retained, and no evidence content was removed.

The parallel gait specialist produced private append-only cubic clip candidates for all four chassis while preserving existing graphics, binds and 32 clips. Those candidates are **not integrated or approved**. Their standalone continuity improvement still requires composed paw-contact, source-tagged physical hull/guard, actual runtime appearance and download/performance qualification; they add roughly 1.35 MB per rig. The private manifest/proposal remains under `.sites-runtime/quad-swing-continuity-001` for a separate iteration.

Independent admission authority is the critic's `source-local-integration-review-001` report under `.sites-runtime/critic/cold-startup-001`. This document does not approve a public deployment. Formal mech/map/enemy/integration release areas stay **PENDING**; physical rubble stays **DENIED / DEFAULT OFF**. The private test servers are closed by exact process identities, preserving the existing friend server, parent, tunnel and awake service. No public release, commercial AAA completion or regression-free guarantee follows from this milestone.

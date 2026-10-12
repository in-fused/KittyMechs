# Corrected meshopt fixture079 — SOURCE ONLY, UNRUN

078's first fixture stopped at its invalid single-buffer assertion (2 !== 1), before any containment pose ran. The failed result, fixture, game candidate and original source seal remain unchanged. This is a fixture loader correction; it supplies no evidence for or against game bounds.

The distinct079 fixture imports `GLTFLoader` and `MeshoptDecoder` from the installed `three-stdlib`, exactly as Drei's shipping `core/Gltf.js` does, and uses the same function-or-object decoder setup. Local loader source confirms EXT_meshopt_compression resolves each compressed view from its extension's buffer0 and decodes it into the view's virtual buffer1. Its decoder contains the installed embedded WASM; no download, install or service is required.

The fixture validates GLB v2 JSON/BIN chunk boundaries, BIN buffer0 and its permitted chunk padding, virtual no-URI buffer1 with fallback=true, required meshopt, every compressed source range and decoded virtual range, and decoded count × stride length. It preserves both buffers, all original accessor/view indices, extension records, attributes, animations, geometry and skin ownership. As before, CPU loading excludes images/materials/textures only and substitutes the identical BIN bytes as buffer0's data URI. The virtual fallback buffer remains URI-less and unchanged; no invented fallback bytes or normalized geometry are supplied.

All original pose, exact-weight, every-vertex local/world/Float32 containment, source-byte/bind/parent and stale-attribute fail-open assertions remain unchanged. Candidate/pin hashes are unchanged. The sole other edits are the079 input/output paths and declared external ceiling. Output is `tools/overhaul-performance-079/containment-result.json`; first failure stops and existing output cannot be overwritten.

Root command after independent source gate: `node --import tsx tools/overhaul-performance-079/containment-check.ts`. ONE inclusive30-second ceiling, unchanged inner15-second guard; no additional fixture iteration is authorized here. No baseline, build or candidate observation until this corrected fixture passes. Decoder initialization, loading and all pose walks count toward the bounds. This packet contains no executed fixture or cost result.

Exact dependencies, original078 failure and unchanged candidate are pinned by `tools/overhaul-performance-079/source-seal.json`, including installed ESM/CJS loader/decoder entry paths and loader utility dependencies. Writer CLOSED. No game changes or child jobs. Full scope INCOMPLETE.

# Render282 fixture correction review

Writer: CLOSED.

Decision: APPROVE_ONE_FIXTURE_ONLY_COMPONENT_DECODER_CORRECTION. No281 runtime/build/public or performance admission follows.

Actual281 stopped at POSITION componentType5122 versus an assumed5126, before any instance-bound assertion. InstalledThree normalizes signedInt16 with max(raw/32767,-1), including the asymmetric negative endpoint. Supporting the actual asset representation is a legitimate decoder correction, not a bounds/tolerance waiver. Preserve the original failed source/terminal.

282 must retain accessor offsets/byteStride and normalized semantics, preferably using the actual Int16 BufferAttribute representation. Do not decode into doubles and silently round them into the old Float32BufferAttribute before treating that as the original vertex set. Unsupported layouts remain rejected. The one corrected finite suite must retain all-vertex containment, scaled/rotated instances, count compaction/zero/restoration, moved bounds and the district ownership/frustum proxy assertions, without changing281 runtime or tolerances. A proxy count is not actual shadow/render preservation or GPU saving. Source and actual admission remain separate after the result; increased draw calls or visible loss can reject the candidate.

Bindings:281 seal `60398bc891b17cb4a2bfb7d9d73f4047e9a1c7e9cee058d6b4c8ccfb82e4b9aa`; failed fixture `af587756ade4340d13c2b1079000a1276ef92b995feeac12d7911f15566e5d7d`; terminal `19d916267d7d5c4b0475c927f63d0e65f7c6f1bcc5cbaba88bfb852f6cbc4d56`. Human Lowest lag remains unresolved.

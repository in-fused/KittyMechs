# 079 independent first-failure review

**DENY culling/performance qualification; accept preserved fixture failure only.** The corrected-loader fixture stopped with `Weighted visual envelope007: binding matrix changed; reprepare`, before any completed model row. No baseline, build or candidate observation may follow this failed stage. Production culling/net cost remain unqualified; frozen045 stays unchanged.

The retained result has status `FIRST_FAILURE_STOP`, empty models and inner elapsed approximately161.27ms; root reports2.922s exit1 with all inputs matching. Unlike078, parsing advanced far enough to encounter the bounds guard. This is not proof of changed geometry, source bind data, weights or an actual visible-culling failure.

Source inspection supports an attached-skin cache lifecycle mismatch: moving the fixture's parent after initial preparation changes mesh world transforms, while the helper calls inherited `updateWorldMatrix(true,true)`. Installed SkinnedMesh refreshes its attached `bindMatrixInverse` in its `updateMatrixWorld` override, not that inherited method. The strict007 attached-inverse comparison can therefore reject a stale cached inverse before the source bind/inverse-bone checks. The shared error wording is insufficient to claim which original binding data changed; no completed containment receipt exists.

A distinct directed matrix-cache lifecycle correction may be independently reviewed without weakening the guard, changing geometry/pose samples or extending15s. It must establish completed world and attached inverse caches in the actual production update order; arbitrary bind rewrites are not equivalent. Original078/079 failures remain immutable. This review authorizes no repair or rerun itself. Root's finite reassessment boundary requires retiring this direction if its next fixture fails, rather than another tolerance or waiver loop.

No reviewer jobs or game edits. Full goal and actual user-lag resolution remain INCOMPLETE/unqualified. Review writer CLOSED.

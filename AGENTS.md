# Storage policy — owner requested October 11, 2026

The owner explicitly requested deletion of historical builds and preserved snapshots and prevention of further storage bloat. This policy supersedes older project notes that require retaining every numbered build/handoff or reconstructing deleted snapshot chains. Deleted historical receipts are not a reason to regenerate archives.

- Keep active source, editable source assets, dependencies, and the current playable `dist` on C: (SSD).
- Put new bulky scratch/test artifacts under `D:\CodexStorage\KittyMech-Web\.sites-runtime`. Existing junctions from `.sites-runtime` preserve legacy paths. Do not copy or traverse junction targets into another snapshot.
- Before a build, capture, or preservation step, run `npm run storage:clean`. Stop if its budget check fails: C: needs 30 GiB free; D: needs 100 GiB free; total scratch is capped at 48 GiB logical; numbered build/snapshot history at 2 GiB.
- Create each new run with `pwsh -NoProfile -File tools/new-artifact-run.ps1 -RunName <task-name>`. It creates a D: directory plus a C: junction; never create a new bulk run directly on C:.
- Use one current run directory per task. Keep only one recent build and one recent snapshot. The cleanup tool has a 24-hour in-use grace period; unpinned history older than seven days expires. Do not create another full repository copy for every iteration.
- Never nest `.sites-runtime`, `.git`, `node_modules`, prior snapshots, or build output inside a source snapshot. Prefer a small change manifest and Git history; preserve uncommitted editable source in its ordinary source location.
- Before an exceptional snapshot, estimate its size and budget. A `.storage-pin` may protect a genuinely active run, but pinned data still counts toward the cap. Remove stale pins when a run closes. Do not use pins to evade the budget.
- The live LIMITED062 server currently uses `.sites-runtime/overhaul-20261009/build-062/playable-root`. Retention explicitly protects it. Do not delete it or change its source while it runs. A storage cleanup restored all 437 receipt-matching files after a partial deletion; its HTTP service was verified healthy. Historical builds and handoff/preserved snapshots elsewhere were intentionally removed at the owner's request.
- Never delete source/assets, application installs, user documents, or unrelated projects to meet a quota. Do not automatically move executables, databases, or whole profiles between drives.

These are safety limits, not an NTFS quota. Direct tools can bypass npm hooks, so apply the same check to every artifact-producing command. If the budget cannot be met within authorized generated output, report the exact remaining folders.

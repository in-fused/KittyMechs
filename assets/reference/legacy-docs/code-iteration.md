# Guarded code-only iteration

`Tools/Stage-CodeIteration.ps1` creates a separate diagnostic tree at `Artifacts/Builds/CodeIteration/Windows`. It preserves the full Package03 tree in `Artifacts/Builds/Windows`. It never invokes Unreal, UBT, UAT, cooking or packaging. Full packaging remains a final acceptance gate.

After a serialized successful `Tools/Build.ps1 -Step Game`, supply its unique retained log and actual UTC start timestamp:

```powershell
./Tools/Stage-CodeIteration.ps1 -BuildLog Artifacts/Validation/game-build-04.log -BuildStartedUtc '<actual recorded UTC timestamp>'
./Tools/Test-GameplaySmoke.ps1 -GameExe Artifacts/Builds/CodeIteration/Windows/KittyMech/Binaries/Win64/KittyMech.exe -BuildKind CodeIteration
```

The stager requires newly written executable, PDB and target receipt; an up-to-date/no-work build is not enough. `-VerifyOnly` performs the same read-only preflight without copying or replacing files. A failed check requires investigation or a fresh full package, rather than bypassing the check. Failed or partial copies have no accepted adjacent receipt and cannot launch through the guarded runner.

The complete original 49-file Package03 inventory is rehashed before staging and again afterward. The first iteration copies and verifies that entire tree. Subsequent stages require the previous receipt's exact inventory. Only `KittyMech/Binaries/Win64/KittyMech.exe` and `KittyMech.pdb` may change; all archive, configuration, bootstrap and dependency bytes remain the original package's bytes. Source Config, Content and the project descriptor must still match the exact original package-input file set and hashes.

The Game target must remain Win64 x64 Development Game with the same engine version and exact runtime dependency path/type set. The 1,005 dependency contents are compared with `package-03-dependency-baseline.json`. That snapshot was taken from installed files **after Package03 and before Game04**; it is not retrospective proof of every original cooked dependency. Loose NonUFS dependency bytes additionally match Package03's packaged inventory. Existing cooked-archive hashes are immutable. This scope supports bounded diagnostics; it does not replace a later full cook/package.

Each stage retains its supplied build log, target receipt, source/protected-input hashes, complete resulting inventory and explicit `verified_code_iteration_not_recooked` receipt. The launcher automatically recognizes the fixed iteration tree, verifies its adjacent receipt against the retained per-stage receipt and checks every staged file before launching. Its launch/acceptance manifests identify CodeIteration separately from FullPackage. Existing gameplay, CSV, input and screenshot acceptance gates are unchanged.

Current evidence: both scripts pass PowerShell parsing. No code iteration has yet been staged or run; independent review is pending.

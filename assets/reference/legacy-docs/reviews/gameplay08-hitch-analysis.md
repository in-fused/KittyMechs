# Gameplay08 hitch analysis

Read-only analysis of the full Package04 `lower-pounce-v2` run `20260926-212343-785-42bf3edfca3247999c5779ab2f4b17d6`. **All 10,665 native frames remain included:** 180.151978 seconds of summed native FrameTime, 59.200 mean FPS, p95 16.70538 ms, p99 17.099432 ms, worst 255.1078 ms, and 12 frames above 50 ms. Capture wall time is180.001522s. The 12 slow frames total2,420.186ms; none is excluded, corrected, replaced, or used to calculate a separate improved headline statistic.

Eleven hitches correlate one-to-one with the eleven PNG completions. Each appears at request-frame index+2, with its CSV end callback3.525–8.732ms after the recorded PNG processed callback. The remaining hitch is native frame0 at capture startup. This is strong evidence to investigate capture overhead first, not proof that the game has no independent hitch source.

The table uses actual callback timestamps, not reconstructed cumulative-frame timestamps. Unreal's capped FrameTime measurement is taken after its tick-rate wait and explicitly does not align exactly with the CSV frame boundary; do not interpret a same-row event/counter as an exact causal interval. [Installed timing implementation](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Core/Private/ProfilingDebugging/CsvProfiler.cpp:4369>).
| Native frame | FrameTime ms | End callback s | PNG request → processed s | Correlation / same-row game-thread ms |
| ---: | ---: | ---: | --- | --- |
| 0 | 150.6566 | 0.034582 | 0.034429 → 0.143321 | Capture startup; not attributed to PNG completion; 81.149 |
| 2 | 111.0620 | 0.150826 | 0.034429 → 0.143321 | 00_menu; 75.052 |
| 116 | 209.9441 | 2.243889 | 2.017391 → 2.240364 | 01_deployed; 184.434 |
| 247 | 187.6180 | 4.598377 | 4.393594 → 4.594589 | 02_mobility; 163.866 |
| 645 | 219.3306 | 11.436297 | 11.198641 → 11.430239 | 03_shield_hit; 194.085 |
| 688 | 218.8753 | 12.357519 | 12.121106 → 12.348787 | 04_first_kill; 193.405 |
| 1248 | 255.1078 | 21.957327 | 21.684777 → 21.951387 | 04a_relay_before_interact; 217.952 |
| 1251 | 233.6025 | 22.223746 | 21.972023 → 22.218158 | 05_relay_a; 204.839 |
| 1748 | 204.7297 | 30.708373 | 30.486281 → 30.704076 | 06_downed; 178.021 |
| 1934 | 197.1947 | 33.990901 | 33.776568 → 33.985913 | 07_recovered; 169.250 |
| 1937 | 217.3238 | 34.241825 | 34.007846 → 34.236678 | 08_signature; 187.418 |
| 10378 | 214.7409 | 175.237647 | 175.006014 → 175.232795 | 09_final_patrol; 190.652 |

The screenshot intervals range108.892–266.610ms. At the eleven completion-associated rows, GameThreadTime is75.052–217.952ms, while reported GPUTime is14.496–32.575ms. These asynchronous/overlapping counters cannot be subtracted or added to allocate blame. Installed screenshot processing reads pixels, calls synchronous `SaveImageByExtension` (which compresses then writes), and only then broadcasts the processed callback. This provides a plausible mechanism for the correlation, without separating readback wait, compression, filesystem work or other game-thread work in this capture. [Screenshot save](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Engine/Private/GameViewportClient.cpp:2362>), [processed callback](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Engine/Private/GameViewportClient.cpp:2584>), [compression/write implementation](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Engine/Private/ImageUtils.cpp:109>).

Frame0 has four reported PSO misses and startup/thread counters spanning earlier work; its150.6566ms cannot be assigned to a particular gameplay action. The worst frame1248 also contains the relay input event and0.5542ms of ActorSpawning, and frame1934 is near F5 retry/signature startup. Those overlaps prevent claiming the full stalls are solely screenshots. Conversely, the same large stall pattern at the final stationary PNG makes combat alone an inadequate explanation. FileIO/PerFrameKB is zero on all12 rows, but that counter does not prove absence of synchronous PNG writes; no write-specific timing was captured. Missing later-introduced counters in early CSV rows remain `null` in the analysis, never fabricated as zero.

## GPU memory interpretation

The four GPUMem columns exist at every serialized row, but all four contain zeros on20 rows. Treat those rows as unestablished availability/sampling, not zero memory use. Nonzero local budget is7,292MiB; recorded local usage ranges184.4688–345.7188MiB (maximum at frame971). Nonlocal/system budget is7,495.7939MiB; recorded nonlocal usage peaks50.9688MiB. Values are labelled MB in CSV but the installed writer divides bytes by1024². [Writer](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/RHI/Private/RHIStats.cpp:91>).

The D3D11 path queries DXGI and publishes only on query success; DXGIUtilities assigns local/nonlocal `Budget` and `CurrentUsage` to these fields. [D3D11 query](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/Windows/D3D11RHI/Private/D3D11RHI.cpp:359>), [DXGI field mapping](<C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/RHICore/Private/DXGIUtilities.cpp:56>). Microsoft defines these as the OS-assigned application budget and current application usage, not physical GPU capacity or total whole-device usage. [DXGI documentation](https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_4/ns-dxgi1_4-dxgi_query_video_memory_info).

These are bounded diagnostic samples, **not VRAM acceptance**: there is no per-row success/freshness bit, no separately admitted memory budget test, and no sustained worst-scene/network load. Do not convert the small recorded usage into a whole-system headroom or leak-free claim.

## Next experiment

First repeat the unchanged Package04/v2 workload in another fresh sandbox with the same renderer, settings, seed, PNG policy and all-frame gates. This tests reproducibility of the eleven-completion pattern and the separate startup spike. Then use a separately labelled, bounded diagnostic capture with CPU/RHI/file-write tracing focused on screenshot readback, compression and save, plus the same exact gameplay and11 PNG milestones. Any additional tracing flags/scopes need their own reviewed harness change; none was enabled here. Compare call durations and screenshot timestamps, record tracing overhead, and retain every frame. Do not remove screenshots, discard frame0, shorten the run, or relax the50ms diagnostic threshold to manufacture a performance pass. A later asynchronous-capture candidate would require its own reviewed implementation and equivalent image/completion/correctness checks.

## Evidence and reproducibility

[Analysis script](C:/Users/Taylor/Documents/GitHub/KittyMech/Artifacts/Validation/Gameplay08Analysis/analyze.py) and [analysis JSON](C:/Users/Taylor/Documents/GitHub/KittyMech/Artifacts/Validation/Gameplay08Analysis/hitches.json) preserve input SHA256s, exact counter column positions, every hitch's±2 native-frame neighborhood, screenshot intervals and memory statistics. Retained run-file hashes were checked unchanged before/after analysis. No engine job or Source/Config/Content change occurred. The performance skill informed evidence discipline; no `game-dev` sealed/admitted bundle, optimization goal, causal improvement, hardware certification or on-screen presentation claim is made.
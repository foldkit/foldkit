# Final preview rendering comparison

The measured code is `75a3990d55302c163a6d56282d43e33fc34a6a0b`, compared with actual main `a471adb24d750ab9e8d8312edad53ff6f26d961b`. Later handoff or evidence commits do not change that timed code identity.

| Variant   | Main median | Candidate median |   Added |  Change |
| --------- | ----------: | ---------------: | ------: | ------: |
| Naive     |    493.0 ms |         562.8 ms | 69.8 ms | +14.16% |
| Optimized |    221.4 ms |         274.8 ms | 53.4 ms | +24.12% |

The candidate remains slower in this workload. Rendering performance remains a release-review item; no acceptance of the gap is assumed. This comparison covers the whole candidate and does not isolate the cost of individual features. Differences from the November 4 batches do not establish a speedup.

| JavaScript bundle |    Main gzip | Candidate gzip |        Added |
| ----------------- | -----------: | -------------: | -----------: |
| Naive             | 99,031 bytes |  143,124 bytes | 44,093 bytes |
| Optimized         | 99,741 bytes |  144,454 bytes | 44,713 bytes |

Compression uses Node's `gzipSync` defaults, matching the earlier retained batches. HTML is verified but excluded from these JavaScript totals.

The unchanged Todo workload, optimized view, harness and driver ran through four fresh functional preflights followed by eight cyclic rounds. All 32 samples are retained, with no discarded run. Each slot appears in each ordinal position twice. The reported total measures synchronous and instrumented callback execution, excluding boot and waiting between steps. Every paired round, range and printed representative counter remains in [analysis.json](analysis.json) and the complete [raw log](timing-final.log).

The arithmetic and integrity checks pass. After refreshing the altered log hashes, the evidence controls still reject a wrong representative counter and an omitted sample. The driver reports the fifth run's counters: 400 synchronous events, 400 animation-frame callbacks and zero other buckets. It does not print every run's counters. Independently reported bucket medians do not sum to the total median.

The quiet batch ran from 06:05:05 to 06:12:17 UTC on November 5, using Node 22.22.3, Vite 8.3.5, Effect 4.1.0, Playwright 1.63.0 and Chromium 153.0.8010.12 on an Apple M1 Max. Build/test and browser-check work was paused. Before/after host captures are retained; they are not continuous host profiling.

Main's previously built artifacts were copied byte for byte from the independently reviewed November 4 inputs. All 349 main core/plugin Source and package-manifest blobs were rechecked against Git, and both main variants passed fresh functional preflights. The candidate freezes 1,837 Source/config/distribution inputs, with canonical core/plugin output verified against the copied artifacts. Dependencies use individual package links and one physical Effect runtime; no new installation was performed. Each branch keeps its own existing completion adapter around the identical workload.

[artifacts-summary.json](artifacts-summary.json) records Source pins, inventory digests, bundle hashes, helper hashes and toolchain details. Full original inventories and analysis inputs remain at `/private/tmp/foldkit-final-preview-rendering-20261105`. The compact analysis omits only the duplicated top-level artifact inventory; all measurement and verification fields are retained. [capture-integrity.json](capture-integrity.json) identifies the original captures. [capture-formatting.json](capture-formatting.json) records formatting hashes and parsed-value equality. Raw timing and preflight logs are copied unchanged.

The copied harness has no Git metadata, so the unchanged driver prints `unknown` and a Git diagnostic. Its archive and tracked files are independently pinned to `03fff17ad22407115a91937ddab680e40fe0c7c7`. The complete previous 64 samples and their raw inputs remain untouched in the November 4 evidence.

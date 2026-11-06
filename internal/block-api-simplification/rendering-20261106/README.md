# Preview rendering comparison

The measured code is `9e2c0d309c070ba7a99b1669c3f69094c7ba2003`, compared with actual main `a471adb24d750ab9e8d8312edad53ff6f26d961b`. Subsequent evidence-only commits preserve that timed code identity.

| Variant   | Main median | Candidate median |   Added |  Change |
| --------- | ----------: | ---------------: | ------: | ------: |
| Naive     |    637.1 ms |         672.8 ms | 35.7 ms |  +5.60% |
| Optimized |    207.2 ms |         269.4 ms | 62.2 ms | +30.02% |

The candidate is slower in this workload. It is slower in all eight optimized paired rounds and seven of eight naive rounds. The optimized main samples range from 195.9 to 209.7 ms; the candidate ranges from 237.4 to 282.9 ms. Rendering and bundle costs require release review; no acceptance of the gap is assumed.

This comparison measures the whole candidate against main. It does not isolate individual features. The scoped Context cache has separate CPU and allocation evidence in [its report](../../preview-rendering-scope-cache-20261105.md); this batch does not close or explain the larger gap. Differences from the November 5 batch do not establish that an individual change improved or regressed performance.

| JavaScript bundle |    Main gzip | Candidate gzip |        Added |
| ----------------- | -----------: | -------------: | -----------: |
| Naive             | 99,031 bytes |  144,232 bytes | 45,201 bytes |
| Optimized         | 99,741 bytes |  145,589 bytes | 45,848 bytes |

Compression uses Node's `gzipSync` defaults, matching the retained earlier batches. HTML is verified but excluded from these JavaScript totals.

The unchanged Todo workload, optimized view, harness and driver ran through four fresh functional preflights followed by eight cyclic rounds. All 32 samples are retained; none was discarded. Each slot appears in each ordinal position twice. The reported total measures synchronous and instrumented callback execution, excluding boot and waits between steps. Every paired round, range and printed representative counter is retained in [analysis.json](analysis.json) and the complete [raw log](timing-final.log).

The arithmetic and integrity checks pass. Controls refresh the altered log hashes and still reject a wrong representative counter and an omitted sample. The unchanged driver prints the fifth run's counters: 400 synchronous events, 400 animation-frame callbacks and zero other buckets. It does not print every run's counters. Independently reported bucket medians do not sum to the total median.

The quiet batch ran from 06:13:29 to 06:20:41 UTC on November 6, using Node 22.22.3, Vite 8.3.5, Effect 4.1.0, Playwright 1.63.0 and Chromium 153.0.8010.12 on an Apple M1 Max. Builds, tests and other browser checks were paused. Before/after host captures are retained; they are not continuous host profiling.

Main's existing artifacts were copied byte for byte from the reviewed November 4 inputs. All 349 main Core/plugin source and package-manifest blobs were rechecked against Git, and both main variants passed fresh functional preflights. The candidate freezes 1,858 source/config/distribution inputs; canonical Core/plugin output matches the copied artifacts. Dependencies use individual package links and one physical Effect runtime, without a new installation. Each branch uses its existing completion adapter around the identical workload.

[artifacts-summary.json](artifacts-summary.json) records source pins, inventory digests, bundle hashes, helper hashes and toolchain details. Full original inventories and analysis inputs remain at `/private/tmp/foldkit-final-preview-rendering-20261106`. The compact analysis omits only the duplicated top-level artifact inventory; all measurement and verification fields are retained. [capture-integrity.json](capture-integrity.json) identifies original captures, and [capture-formatting.json](capture-formatting.json) records formatting hashes and parsed-value equality. Raw timing and preflight logs are copied unchanged.

The copied harness has no Git metadata, so the unchanged driver prints `unknown` and a Git diagnostic. Its archive and tracked files are independently pinned to `03fff17ad22407115a91937ddab680e40fe0c7c7`. Earlier evidence remains unchanged.

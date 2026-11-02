# Rendering comparisons

## Final stabilization candidate versus main

The final batch covers reviewed code commit `db69206779b4e4c37d9cefe02acb21ca3d2e9ed3` against pinned actual main, `a471adb24d750ab9e8d8312edad53ff6f26d961b`. All 32 valid samples, paired round totals, source and artifact hashes, public-type/build/preflight results and cleanup are in [stabilization-batch.json](./stabilization-batch.json). No samples were discarded. The earlier 128 samples and diagnostic profile remain unchanged, for 160 official samples across five batches.

| Variant   | Actual main | Final stabilization |             Change |
| --------- | ----------: | ------------------: | -----------------: |
| Naive     |    529.8 ms |            644.1 ms | +114.3 ms / +21.6% |
| Optimized |    203.7 ms |            256.3 ms |  +52.6 ms / +25.8% |

The naive animation-frame median is 496.0 ms on main and 599.7 ms on the candidate; synchronous dispatch is 35.2 and 45.1 ms. Optimized rendering records 163.4 and 208.1 ms in animation-frame callbacks, and 41.2 and 48.5 ms synchronously. Other buckets are zero. The driver's reported representative sample for each slot has 400 synchronous events and 400 animation-frame callbacks. Page-error and cross-origin-isolation checks cover every run.

| Bundle    | Actual main gzip | Final stabilization gzip | Added versus main | Added versus earlier e6 |
| --------- | ---------------: | -----------------------: | ----------------: | ----------------------: |
| Naive     |         99,030 B |                139,122 B |          40,092 B |                    34 B |
| Optimized |         99,737 B |                140,499 B |          40,762 B |                    32 B |

Candidate raw JavaScript is 446,467 B naive and 453,130 B optimized, each 138 B above the earlier e6 payload. Gzip growth versus main is 40.5% and 40.9%. Bundle growth and the execution gap remain review items, rather than approved tradeoffs.

This is a whole-branch comparison. The earlier e6/main and be0/e6 incremental comparisons below are separate batches. Differences between their absolute totals and this batch do not establish an improvement or regression caused by the three stabilization fixes. No further profiles or timing repetitions were run.

All 625 captured source/config inputs match the exact db69 Git blobs. The same two scratch-only completion adapter bodies, Todo/update/init/view workload, driver and instrumentation are retained. Isolated core/plugin and both client builds, the strict public adapter typecheck, and all four unchanged functional preflights pass. The 349 core and 11 plugin JavaScript files match the canonical final artifacts byte for byte. All browsers and servers closed; ports 38377, 38378 and 38379 have no listeners, and no headless Chromium process remains.

The primary tools remain Node 22.22.3, Effect 4.1.0, Vite 8.3.5, TypeScript 7.1 beta, Playwright 1.63.0 and Chromium 153.0.8010.12. Dependency refresh removed an old `@effect/vitest` link tied to Vitest 5.0.2. The first new preparation stopped at that link and is preserved as `stabilization-source`; it started no benchmark server or timing. The successful `stabilization-db692-source` uses stable current dependency links, including Vitest 5.0.3, with workspace targets redirected into its isolated tree and one Effect runtime. The frozen main bundles are unchanged. This remains a matched-toolchain comparison rather than fresh independent branch installations.

The compact receipt records relative evidence paths under the preserved workspace. Reproduction uses `prepare-stabilization-db692.mjs`, `adapt-stabilization-db692.mjs`, `build-stabilization-db692.mjs`, `install-stabilization-db692.mjs`, `audit-stabilization-db692-coverage.mjs`, `preflight-stabilization-db692.mjs` and `time-stabilization-db692.mjs`. These are separately named copies of the established preparation utilities; the timed driver is unchanged. Timing results refuse overwrite. Root integration `final-5z56yM` and app tests `test-LfYpte` remain separate receipts.

## Preceding preview versus e6 (earlier batch)

The incremental comparison uses the exact pre-migration preview, `be0cb38108693068da30eb835e6eb33d6d5762c8`, and reviewed current branch, `e6f141f35327b6cea47b08538b086b0bd45b19d3`. Its 32 valid samples, paired round totals, bucket medians, hashes and cleanup receipt are preserved in [incremental-preview-batch.json](./incremental-preview-batch.json). Every sample is retained.

| Variant   | Preceding preview |  Current |          Change |
| --------- | ----------------: | -------: | --------------: |
| Naive     |          669.4 ms | 680.6 ms | +11.2 ms /+1.7% |
| Optimized |          303.6 ms | 290.3 ms | -13.3 ms /-4.4% |

For naive rendering, the animation-frame median changes from 613.5 to 624.9 ms and synchronous dispatch from 56.9 to 55.2 ms. Optimized rendering changes from 242.2 to 232.9 ms in animation-frame callbacks and from 60.1 to 57.4 ms in synchronous dispatch. Other buckets are zero. The driver's reported representative sample for each slot has 400 synchronous events and 400 animation-frame callbacks. Cross-origin isolation and page-error checks cover every run.

These observed changes are small relative to the separate main comparison below. One machine-specific batch does not establish statistical equivalence or a general performance improvement. It measures aggregate changes from the preceding preview under this workload. The Todo app has no InMessages, children or Commands, so their dispatch and graph costs are not directly exercised. Absolute execution totals from the separate main batches cannot be subtracted to apportion causes.

The entire canonical benchmark source is unchanged between the two commits. The preview uses its original `prepareBlock`/`assemble` completion without edits. Current reuses the saved Layer-owned completion adapter in exactly two application completion modules. Todo, init, update, both view bodies, entry points, HTML, selectors, Vite configuration, driver and instrumentation are identical. Both public typechecks and all four unchanged functional preflights pass. All 624 current source/config inputs match the sealed current payload byte for byte. Both branches use identical plugin JavaScript and the same pinned toolchain.

### Incremental bundle size and bounded attribution

| Variant   | Preview gzip | Current gzip | Raw JS increment | Gzip increment |
| --------- | -----------: | -----------: | ---------------: | -------------: |
| Naive     |    131,212 B |    139,088 B |         26,919 B | 7,876 B /+6.0% |
| Optimized |    132,606 B |    140,467 B |         26,946 B | 7,861 B /+5.9% |

The unified `block/makeDefinition.ts` entry chooses between native and contracted implementations from runtime configuration. It therefore retains both implementation paths in these bundles. Splitting that entry would require an API redesign; the bounded audit found no small safe bundle fix. The additional approximately 7.9 KB gzip remains for user review and is not an approved tradeoff. The October 26 broad main attribution is historical evidence, rather than attribution of this migration-specific increment. Exact source and bundle hashes are recorded below and in the receipt.

## Main baseline versus e6 (earlier batch)

The earlier main-versus-current balanced batch covers code commit `fd4f03253faa782eaa7f45d043127e3bf21ad572`, whose production sources match reviewed `e6f141f35327b6cea47b08538b086b0bd45b19d3`. It restores the optimized path's benefit, while retaining a measurable gap against actual main. Its 32 samples remain in [final-batch.json](./final-batch.json). The preceding initial and repaired main comparisons are unchanged. All 128 samples from those four earlier batches remain intact.

| Variant   | Actual main | Final candidate |            Change |
| --------- | ----------: | --------------: | ----------------: |
| Naive     |    543.9 ms |        623.3 ms | +79.4 ms / +14.6% |
| Optimized |    195.8 ms |        259.6 ms | +63.8 ms / +32.6% |

These numbers sum instrumented callback and synchronous execution time, rather than wall-clock completion time. For the optimized variant, the animation-frame median rises from 156.9 to 211.5 ms and synchronous dispatch from 39.1 to 47.8 ms. Other buckets are zero. The driver's reported representative sample for each slot has 400 synchronous events and 400 animation-frame callbacks. Cross-origin isolation and page-error checks cover every run. Bucket medians are independent and need not sum to the median total.

| JavaScript bundle | Actual main gzip | Final candidate gzip |             Added |
| ----------------- | ---------------: | -------------------: | ----------------: |
| Naive             |         99,030 B |            139,088 B | 40,058 B / +40.5% |
| Optimized         |         99,737 B |            140,467 B | 40,730 B / +40.8% |

This compares the entire candidate branch against main. It does not isolate the cost of construction, InMessages, or any other individual change. Bundle growth and the remaining execution gap require review; neither is claimed solved by the repair.

## Initial regression and verified repair

The first complete batch found a substantial regression. Its 32 valid samples remain unchanged in [initial-batch.json](./initial-batch.json).

| Variant   | Actual main | Initial candidate |              Change |
| --------- | ----------: | ----------------: | ------------------: |
| Naive     |    541.0 ms |          703.1 ms |  +162.1 ms / +30.0% |
| Optimized |    199.7 ms |          734.3 ms | +534.6 ms / +267.7% |

The constructor-owned default view created a fresh Html builder adapter on each render. That changed a lazy view argument's identity and invalidated its cache. The repair caches the adapter per acquired implementation and underlying builder. Three focused Scene regressions verify reuse and graph isolation; reverting to a fresh adapter or sharing one across acquisitions fails those checks.

The repair changes one core JavaScript file, `experimental/constructed/runtime.js`. Its public declarations are unchanged by the runtime fix; two intervening declaration differences only expose an existing type for nameability. The plugin JavaScript and scratch completion adapter are unchanged. Both repaired bundles and all four slots passed the unchanged functional verifier before the second full batch. Compare each candidate with its own batch's main controls, since absolute timings vary between batches.

The repaired verification batch remains in [repaired-batch.json](./repaired-batch.json), with all 32 samples retained:

| Variant   | That batch's main | Repaired candidate |            Change |
| --------- | ----------------: | -----------------: | ----------------: |
| Naive     |          533.4 ms |           587.2 ms | +53.8 ms / +10.1% |
| Optimized |          188.0 ms |           248.9 ms | +60.9 ms / +32.4% |

Final review then added original-Definition plan authentication and one stable constructor-body snapshot. These run during graph construction, before official measurements reset after boot. Relative to the repaired snapshot, only `experimental/contracted/runtime.js` changes among core JavaScript files. Every other core JavaScript file, all plugin JavaScript, and all renderer/view/update/lazy paths are byte-identical. The only declaration change is a type-only family InMessage validation tuple; its regression test is verification-only. The final snapshot, strict public adapter types, both production builds and all four functional preflights passed before the final full batch. These startup-only changes are covered by that final batch; the earlier receipt is not presented as evidence for their exact code.

## Bounded CPU diagnosis before final review fixes

After the official repaired batch and before the final review fixes, one optimized browser CPU profile was captured for main and one for the repaired candidate. No profile of the final commit was captured; the renderer/view/lazy implementation is unchanged from that profiled snapshot. The unchanged runner and workload were used, with a 100 microsecond sampling interval. [profile-summary.json](./profile-summary.json) records top self and inclusive functions, generated bundle URLs and positions, original source positions, hashes, callback counts and cleanup.

Hidden source maps were built afterward from each frozen tree. Both generated JavaScript files match the profiled production bundle hashes exactly.

| Sampled function or phase | Main inclusive | Repaired inclusive |
| ------------------------- | -------------: | -----------------: |
| `renderSync`              |       36.70 ms |           52.94 ms |
| View phase                |       18.70 ms |           24.46 ms |
| Patch phase               |       16.72 ms |           20.21 ms |
| Mount registration walk   |         Absent |            7.48 ms |

The recursive `assertLayeredMountsAreRegistered.walk` at `packages/foldkit/src/runtime/renderer.ts:401` is the candidate's largest sampled bundle self function: 7.32 ms self and 7.48 ms inclusive. It traverses cached lazy VNodes as well as newly authored nodes. This validation already exists at the candidate's starting commit, `be0cb38108693068da30eb835e6eb33d6d5762c8`; it was not introduced by this construction migration. View and patch work also rise in this pair.

The scan is a concrete contributor in this diagnostic pair. These samples cannot apportion the official timing gaps. The profiles include boot and idle waits, and profiling changes measured execution. Inclusive rows overlap. No further CPU profiles or optimization were performed; the final timing batch covers the subsequent startup-only corrections. Any future scan optimization must preserve the existing test that rejects an unregistered Mount added to a reused lazy VNode: `packages/foldkit/src/runtime/mountLayer.test.ts`, “revalidates an unregistered Mount added to a reused lazy VNode before patching.” A blanket skip for previously visited nodes would lose that behavior.

## Method and provenance

- Actual GitHub main: `a471adb24d750ab9e8d8312edad53ff6f26d961b`.
- Final stabilization code: `db69206779b4e4c37d9cefe02acb21ca3d2e9ed3`, with 625 exact source/config inputs. Its separate 32-sample receipt is `stabilization-batch.json`.
- Preceding preview: `be0cb38108693068da30eb835e6eb33d6d5762c8`. Reviewed current: `e6f141f35327b6cea47b08538b086b0bd45b19d3`. The latter matches all 624 sealed source/config inputs used by the current bundles.
- Harness: `03fff17ad22407115a91937ddab680e40fe0c7c7`; Chromium `153.0.8010.12`.
- Unchanged workload: 100 additions, 100 toggles and 100 deletions. Boot settles before measurements reset and is excluded from official totals.
- Each official batch contains eight rounds and four slots, with cyclic rotation. Each slot occupies every ordinal position twice. All 160 official samples across five batches are retained.
- Root coordination kept the machine free of other builds, tests, checkers and browser jobs during all five timing batches and the paired profiles.
- Both branches use the same cached Effect 4.1.0, Vite 8.3.5 and TypeScript 7.1 beta. This is a matched-toolchain comparison, rather than a fresh installation of each branch's lockfile.
- The candidate uses a saved scratch-only keyed Definition / Layer-owned completion adapter. Todo/update branches, both view bodies, HTML, selectors, parameters, instrumentation and driver remain unchanged. Ordinary Program/Runtime integration typechecks.
- The final sealed snapshot's 349 core and 11 plugin JavaScript files match the reviewed canonical artifacts byte for byte. All 624 captured source/config inputs and public declarations match the code snapshot recorded at `fd4f03253faa782eaa7f45d043127e3bf21ad572`. Driver/workload hashes remain unchanged.

Receipts contain working-tree fingerprints, production JavaScript/declaration and adapter hashes, all reported totals, bucket medians and bundle hashes. The unchanged driver retains printed per-round totals to 0.1 ms and reported bucket medians; it does not retain unrounded per-sample totals, buckets or counters. Displayed counters come from one representative sample per slot, the fifth run in these eight-round batches. Page-error and cross-origin-isolation checks cover every run. Measurements remain machine and browser specific.

Full snapshots, exact adapter patches, source maps, raw profiles, build logs and timing output remain outside the repository under `/private/tmp/foldkit-rendering-final-20261101-k5puc9oc/`. The original workspace and benchmark repository were untouched. All five timing drivers and the diagnostic pair exited successfully; their browsers and servers closed, with no remaining listeners on ports 38377, 38378 or 38379.

## Sealed current payload boundary

| Payload                          | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| Captured Git-visible tree        | `34c546abd625a4691f93220150b30c58457d0f1144460df883e540322f9ccd8b` |
| Captured source/config inputs    | `228dbb3105e221355c9c1dca17ec02b3759cf0b59ecdbdf2b1e9b9f91b41ea86` |
| Core JavaScript tree, 349 files  | `214a35409ee176ca890ec9f869e8eb056fd345982e3452e9ea3bc2bd16a73f4a` |
| Plugin JavaScript tree, 11 files | `02f4bee0817121fb2bef25cfc7d3110681af0d13f303fd15d0cd9b9604ff5e24` |
| Saved final adapter patch        | `b05c146a439f925db143da4622879635067fe5a42c64f08de9014058fc5613ec` |
| Final raw timing output          | `a7ce6eb9a01eab45e99cf4e325bb554dfa3a9fb5267863fffeb45c4bb4c4a40e` |

The tree fingerprint describes the captured payload, including repository metadata files present then. The later amended code commit was verified against every captured source input and built artifact before timing. Adapter file bodies are identical in all candidate snapshots; saved patch headers name their separate snapshot paths.

## Incremental comparison payload boundary

| Payload                                 | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| Exact preview source archive            | `b9b05339847a670f384a28f38810cca2eafd2bac80a4cd68a769bd7d2ca47ad5` |
| Preview source/config inputs            | `8031174e91c919b51b7f8000f44b276904940fe3d6d05aaabc627a80ce3d081d` |
| Preview core JavaScript tree, 293 files | `79ad67f93b4d7fb009127b5c34c5c3a538dc49c9d529399cd97fd364d68a3121` |
| Preview naive bundle                    | `78b790bd8feb0073b859f612f61bcc6b73dd3929c24a72d892fc607be760b9da` |
| Current naive bundle                    | `e5426364fc473abdd5d6682865301701f32c2b2edc341a9f71394f39a288226c` |
| Preview optimized bundle                | `7b9f19e1d8fd65ef5f7d0bda662e4f00b501531e5eb0eae7fd97770c43455ca0` |
| Current optimized bundle                | `0a891c9bf84f55e41fd7a93e44879282a9fcf500bc89fb1ff5157e04484491c1` |
| Incremental raw timing output           | `8733ff8f46d372a0ba2f28a253ce6a5288f947810b2bcd94c7161e5465ed87f8` |

## Reproduction

The preserved workspace contains `time-final.mjs` (initial), `time-repaired.mjs` (repaired), `time-sealed.mjs` (final), `preflight-sealed.mjs`, `audit-sealed-coverage.mjs`, `sealed-commit.json`, `profile-pair/build-maps.mjs` and `profile-pair/analyze.mjs`, each tied to saved immutable inputs. Timing scripts refuse to overwrite results. Run official timing only after arranging a quiet machine.

The additional `incremental-preview/` directory contains `PREPARATION.md`, `prepare.mjs`, `build.mjs`, `install.mjs`, `preflight.mjs`, `audit.mjs`, `time.mjs`, `curate.mjs`, the immutable preview archive and the exact two-file completion diff. Its timing wrapper invokes the same frozen `driver/run.mjs` with eight balanced rounds and 100 items; it refuses to overwrite results. No additional CPU profile was captured for this comparison.

The portable [profile driver](./profile-pair.mjs) accepts the prepared frozen benchmark directory and a fresh output directory:

```sh
node internal/layered-constructor/rendering-final/profile-pair.mjs /path/to/frozen-benchmark /path/to/fresh-profile-output
```

It verifies saved driver, instrumentation and bundle hashes, then reproduces the historical paired optimized profile against the saved main/repaired slots using the unchanged runner. It requires the prepared snapshot's existing Playwright dependency and local Chromium. The server listens only on loopback. The canonical report includes compact receipts, rather than bulk bundles, source maps or raw CPU profiles. Publication has not been authorized by this work.

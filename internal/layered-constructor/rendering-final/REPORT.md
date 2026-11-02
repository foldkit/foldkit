# Final rendering comparison

## Final reviewed candidate

The final balanced batch covers code commit `fd4f03253faa782eaa7f45d043127e3bf21ad572`. It restores the optimized path's benefit, while retaining a measurable gap against actual main. All 32 final samples are preserved in [final-batch.json](./final-batch.json); none were discarded. Both preceding batches remain separate and unchanged, retaining all 96 official samples.

| Variant   | Actual main | Final candidate |            Change |
| --------- | ----------: | --------------: | ----------------: |
| Naive     |    543.9 ms |        623.3 ms | +79.4 ms / +14.6% |
| Optimized |    195.8 ms |        259.6 ms | +63.8 ms / +32.6% |

These numbers sum instrumented callback and synchronous execution time, rather than wall-clock completion time. For the optimized variant, the animation-frame median rises from 156.9 to 211.5 ms and synchronous dispatch from 39.1 to 47.8 ms. Other buckets are zero. Every sample has 400 synchronous events and 400 animation-frame callbacks, with cross-origin isolation and no browser errors. Bucket medians are independent and need not sum to the median total.

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
- Harness: `03fff17ad22407115a91937ddab680e40fe0c7c7`; Chromium `153.0.8010.12`.
- Unchanged workload: 100 additions, 100 toggles and 100 deletions. Boot settles before measurements reset and is excluded from official totals.
- Each official batch contains eight rounds and four slots, with cyclic rotation. Each slot occupies every ordinal position twice. All 96 official samples across three batches are retained.
- Root coordination kept the machine free of other builds, tests, checkers and browser jobs during all three timing batches and the paired profiles.
- Both branches use the same cached Effect 4.1.0, Vite 8.3.5 and TypeScript 7.1 beta. This is a matched-toolchain comparison, rather than a fresh installation of each branch's lockfile.
- The candidate uses a saved scratch-only keyed Definition / Layer-owned completion adapter. Todo/update branches, both view bodies, HTML, selectors, parameters, instrumentation and driver remain unchanged. Ordinary Program/Runtime integration typechecks.
- The final sealed snapshot's 349 core and 11 plugin JavaScript files match the reviewed canonical artifacts byte for byte. All 624 captured source/config inputs and public declarations match the code snapshot recorded at `fd4f03253faa782eaa7f45d043127e3bf21ad572`. Driver/workload hashes remain unchanged.

Receipts contain working-tree fingerprints, production JavaScript/declaration and adapter hashes, all reported totals, bucket medians and bundle hashes. The unchanged driver prints per-round totals to 0.1 ms and does not expose raw per-sample bucket data. Measurements remain machine and browser specific.

Full snapshots, exact adapter patches, source maps, raw profiles, build logs and timing output remain outside the repository under `/private/tmp/foldkit-rendering-final-20261101-k5puc9oc/`. The original workspace and benchmark repository were untouched. All three timing drivers and the diagnostic pair exited successfully; their browsers and servers closed, with no remaining listeners on ports 38377, 38378 or 38379.

## Final payload boundary

| Payload                          | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| Captured Git-visible tree        | `34c546abd625a4691f93220150b30c58457d0f1144460df883e540322f9ccd8b` |
| Captured source/config inputs    | `228dbb3105e221355c9c1dca17ec02b3759cf0b59ecdbdf2b1e9b9f91b41ea86` |
| Core JavaScript tree, 349 files  | `214a35409ee176ca890ec9f869e8eb056fd345982e3452e9ea3bc2bd16a73f4a` |
| Plugin JavaScript tree, 11 files | `02f4bee0817121fb2bef25cfc7d3110681af0d13f303fd15d0cd9b9604ff5e24` |
| Saved final adapter patch        | `b05c146a439f925db143da4622879635067fe5a42c64f08de9014058fc5613ec` |
| Final raw timing output          | `a7ce6eb9a01eab45e99cf4e325bb554dfa3a9fb5267863fffeb45c4bb4c4a40e` |

The tree fingerprint describes the captured payload, including repository metadata files present then. The later amended code commit was verified against every captured source input and built artifact before timing. Adapter file bodies are identical in all candidate snapshots; saved patch headers name their separate snapshot paths.

## Reproduction

The preserved workspace contains `time-final.mjs` (initial), `time-repaired.mjs` (repaired), `time-sealed.mjs` (final), `preflight-sealed.mjs`, `audit-sealed-coverage.mjs`, `sealed-commit.json`, `profile-pair/build-maps.mjs` and `profile-pair/analyze.mjs`, each tied to saved immutable inputs. Timing scripts refuse to overwrite results. Run official timing only after arranging a quiet machine.

The portable [profile driver](./profile-pair.mjs) accepts the prepared frozen benchmark directory and a fresh output directory:

```sh
node internal/layered-constructor/rendering-final/profile-pair.mjs /path/to/frozen-benchmark /path/to/fresh-profile-output
```

It verifies saved driver, instrumentation and bundle hashes, then reproduces the historical paired optimized profile against the saved main/repaired slots using the unchanged runner. It requires the prepared snapshot's existing Playwright dependency and local Chromium. The server listens only on loopback. The canonical report includes compact receipts, rather than bulk bundles, source maps or raw CPU profiles. Publication has not been authorized by this work.

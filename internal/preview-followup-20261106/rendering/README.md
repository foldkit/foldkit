# Preview follow-up rendering comparison

The frozen timed source is `29b3f80e4048996e43f3d3b1262870a96c3b005b`,
compared with actual main `a471adb24d750ab9e8d8312edad53ff6f26d961b`.
The implementation was rebased onto protected integration `4a196d9f05` as
`5184951f81`; its entire tree is identical to the timed implementation.
The source inventory is the durable identity when integration changes a commit
parent. Reuse timings only for unchanged browser artifacts, with an explicit
equivalence receipt for later source.

| Batch | Variant   | Main median | Preview median |    Added | Batch change |
| ----- | --------- | ----------: | -------------: | -------: | -----------: |
| 1     | Naive     |    582.0 ms |       534.9 ms | -47.1 ms |       -8.09% |
| 1     | Optimized |    216.7 ms |       284.6 ms |  67.9 ms |      +31.33% |
| 2     | Naive     |    473.8 ms |       411.9 ms | -61.9 ms |      -13.06% |
| 2     | Optimized |    180.7 ms |       254.6 ms |  73.9 ms |      +40.90% |

The optimized preview is slower in all 16 paired rounds. The naive results do
not establish an improvement. In [batch 1](measurements/batch-1/final-analysis.json),
naive main ranges from 210.1 to 705.5 ms and the preview from 257.1 to 787.2 ms.
Optimized main ranges from 109.8 to 363.6 ms and the preview from 132.9 to
452.3 ms. In [batch 2](measurements/batch-2/final-analysis.json), naive main
ranges from 338.6 to 616.4 ms and the preview from 230.4 to 614.3 ms. Optimized
main ranges from 108.0 to 233.9 ms and the preview from 229.6 to 302.4 ms.

Host snapshots show high load by the end of each capture. On ten logical CPUs,
batch 1's one-minute load average rises from 6.48 to 26.98, and reported free
memory falls from about 12.2 GB to 0.25 GB. After verification, load settled
enough to run one confirming batch against the identical frozen artifacts.
Batch 2 starts at 4.12 and ends at 18.42, with reported free memory falling
from about 9.8 GB to 7.0 GB. The lead's builds, tests and other browser checks
were paused during both batches. These snapshots do not establish a
continuously quiet machine or explain individual samples.

Both batches retain the concern about optimized rendering. They do not establish
a stable regression percentage or attribute it to the new Binding, initializer
or testing APIs. This is a whole-preview comparison with main. The user has not
accepted the remaining rendering or bundle costs.

| JavaScript bundle |    Main gzip |  Preview gzip |        Added |
| ----------------- | -----------: | ------------: | -----------: |
| Naive             | 99,031 bytes | 146,915 bytes | 47,884 bytes |
| Optimized         | 99,741 bytes | 148,252 bytes | 48,511 bytes |

Both batches use the exact same artifacts. Compression uses Node's `gzipSync`
defaults. The totals include JavaScript, not HTML. These are whole-preview costs.

## Method and controls

Each batch runs the unchanged 100-item Todo workload and optimized view through
four fresh functional preflights followed by eight cyclic rounds. Every
implementation occupies each ordinal position twice per batch. All 64 samples
are retained; none was discarded.

The raw [batch 1 output](measurements/batch-1/timing-final.log) and
[execution receipt](measurements/batch-1/timing-final-execution.json) cover
03:04:19.045 through 03:11:31.637 UTC on November 7, 2026. The confirming
[output](measurements/batch-2/timing-final.log) and
[execution receipt](measurements/batch-2/timing-final-execution.json) cover
03:27:19.931 through 03:34:32.119 UTC. The port was closed after each run.

Both integrity analyses pass. Controls refresh mutated log hashes and still
reject a wrong workload counter and an omitted sample. The unchanged driver
reports the representative fifth run's 400 synchronous events, 400
animation-frame callbacks and zero other buckets. It does not report counters
for every run. Independently computed bucket medians do not sum to the total.

The confirming execution reaches the original frozen driver and harness through
documented symlinks. Its initial analysis rejected the differing path strings.
The retained repeat analyzer compares their real filesystem identities while
preserving every byte-hash, workload and counter check. Extra negative controls
reject a copied driver at another physical location and a different harness.
The driver, harness, workloads, runtime artifacts and raw execution receipts
were not changed to make the analysis pass.

The run uses Node 22.22.3, Vite 8.3.5, Effect 4.1.0, Playwright 1.63.0 and
Chromium 153.0.8010.12. Current and main variants use matched cached dependency
links with one physical Effect runtime. No package manager or independent fresh
installation ran during capture. Later installed-package checks are separate
verification, not new benchmark inputs.

## Provenance

The [artifact receipt](measurements/batch-1/final-artifact-receipt.json) records
the source, distribution, bundle, harness, driver and dependency identities.
The [source inventory](measurements/batch-1/candidate/source.json) freezes all
1,885 candidate inputs. The analyzer's sorted inventory digest is
`79dab014a2c05cd930264be4f29b264e53a7056ab808ddff0e061576afc92fe0`.
Batch 2 retains the exact same artifact-receipt hash, with separate execution,
preflights, host captures and analyzer controls.

The harness comes from `03fff17ad22407115a91937ddab680e40fe0c7c7` of the
user's Lustre benchmark repository. Its archive and 162 tracked files are
checked independently because the copied harness has no Git metadata. The
driver is unchanged from the previous retained capture. Batch 1 keeps the
previous analyzers; batch 2 records the physical-path validation above.
All 349 main Core/plugin source and manifest blobs match the actual main commit.
The candidate's canonical Core/plugin distribution matches the frozen copy.

Raw files live under `measurements/`, which the existing formatter excludes.
The copy manifests for [batch 1](measurements/batch-1/retained-files.json) and
[batch 2](measurements/batch-2/retained-files.json) record their hashes. Logs,
receipts, source inventory, driver, preflights and retained synthetic controls
are copied byte for byte. Each compact analysis omits only its duplicated
top-level artifact inventory, retained separately. Redundant positive-control
analyses are omitted; their inputs and successful logs remain. The original
packets are `/private/tmp/foldkit-preview-followup-rendering-20261106` and
its `-repeat` counterpart.

These captures are not general performance guarantees. Ordering and integrity
controls do not remove host variability, establish a causal explanation or
replace release review of the optimized-rendering and bundle costs.

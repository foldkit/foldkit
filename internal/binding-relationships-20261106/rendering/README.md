# Binding adoption rendering comparison

The timed code is
`bf92d1da26453a7c80031d9480935967886880a4`, compared with actual main
`a471adb24d750ab9e8d8312edad53ff6f26d961b`. That candidate commit may be
replaced by an amendment and need not remain a public ancestor. The durable
timed identity is therefore the frozen source inventory and digest. A later
candidate must compare its source with that inventory and freshly build both
workloads. Reuse this timing only when all production JavaScript and HTML
artifacts are byte-identical; retain the source differences and comparison
receipt separately. Type-only import sorting and declaration-test repairs can
change source or declarations without changing the code the browser executes.

| Variant   | Main median | Candidate median |    Added |  Change |
| --------- | ----------: | ---------------: | -------: | ------: |
| Naive     |      637 ms |           596 ms | -41.0 ms |  -6.44% |
| Optimized |    230.9 ms |         370.1 ms | 139.2 ms | +60.29% |

The batch is highly variable. Main's naive samples range from 292.8 to 746.6
ms, while the candidate's range from 531.2 to 680.3 ms. Main's optimized
samples range from 137.7 to 349.4 ms, while the candidate's range from 211.2 to
389.0 ms. The candidate is faster in four of eight naive paired rounds and
slower in four. It is slower in seven of eight optimized paired rounds.

These data cannot establish a stable improvement or regression amount. They
measure the whole candidate against main and cannot attribute either result to
the Binding API or migration. In particular, the optimized result still shows
a rendering concern. The user has not accepted that concern or the measured
gap.

| JavaScript bundle |    Main gzip | Candidate gzip |        Added |
| ----------------- | -----------: | -------------: | -----------: |
| Naive             | 99,031 bytes |  146,704 bytes | 47,673 bytes |
| Optimized         | 99,741 bytes |  148,072 bytes | 48,331 bytes |

These are whole-candidate JavaScript bundle deltas, not Binding-specific
sizes. Compression uses Node's `gzipSync` defaults. HTML is verified but is not
included in the JavaScript totals.

## Capture and controls

The unchanged 100-item Todo workload, optimized view, harness and driver ran
through four fresh functional preflights followed by eight cyclic rounds. All
32 timing samples are retained and none was discarded. Each of the four slots
appears in each ordinal position twice. The raw samples and every paired round
are in [analysis.json](analysis.json); the byte-identical driver
output is in [timing-final.log](timing-final.log).

All four preflights completed successfully from 00:23:48.998 through
00:23:53.080 UTC on November 7, 2026. The timed batch ran from
00:23:53.081 through 00:31:05.282 UTC. Builds, tests and other browser checks
were paused, and the benchmark port was closed afterward. The before/after host
captures are retained, but they are not continuous host profiling.

The host snapshots report a load average of 5.69 before and 5.28 after on 10
logical CPUs. Those two observations do not establish a cause for the sample
variation.

The arithmetic and integrity analyzer passed. The controls refresh mutated log
hashes and still reject a wrong representative counter and an omitted sample.
The unchanged driver prints the fifth run's counters for each slot: 400
synchronous events, 400 animation-frame callbacks and zero other buckets. It
does not print counters for every run. Independently reported bucket medians do
not sum to the total median.

The run used Node 22.22.3, TypeScript 7.1.0-beta, Vite 8.3.5, Effect 4.1.0,
Playwright 1.63.0 and Chromium 153.0.8010.12 on an Apple M1 Max.

## Provenance

The full authoritative immutable receipt remains at
`/private/tmp/foldkit-binding-adoption-rendering-20261106-prepared/final-artifact-receipt.json`.
The durable [artifact summary](artifacts-summary.json) pins that receipt and its
source, distribution, bundle, harness, driver, workload and helper identities.
The retained [source inventory](source-inventory.json) freezes all 1,883
candidate source, configuration and distribution inputs under digest
`aa9f86b486d129ccb328af1d4d71410582060a57ab14ebb2d377019b1bc3f0a9`.
It also records 162 harness files under digest
`a9e4e465f6ea603414633417baf964bafc5e37de63aeef2e7457f00a949d160a`,
the candidate bundles, copied main bundles, adapter identity, driver hashes,
toolchain and dependency links.

Main's artifacts are byte-for-byte copies of the independently reviewed
November 4 inputs. All 349 main Core/plugin source and package-manifest blobs
were checked against Git, and the copied main variants passed fresh preflights.
The candidate's canonical Core/plugin distribution matched the frozen copy.
Dependencies use matched cached package links with one physical Effect runtime;
no package manager or fresh independent install ran for this batch.

The retained evidence includes:

- all 32 samples, paired rounds, comparisons and verification fields in
  [analysis.json](analysis.json);
- source, artifact, bundle, harness and driver pins in
  [artifacts-summary.json](artifacts-summary.json);
- all 1,883 measured candidate inputs in
  [source-inventory.json](source-inventory.json);
- the candidate build receipt in [candidate-build.json](candidate-build.json);
- the exact execution receipt in
  [timing-final-execution.json](timing-final-execution.json);
- analyzer mutation controls in
  [analysis-controls.json](analysis-controls.json);
- host snapshots in [host-before.json](host-before.json) and
  [host-after.json](host-after.json); and
- all raw preflight logs and their receipt under
  [preflight-final](preflight-final/results.json).

The original immutable packet remains at
`/private/tmp/foldkit-binding-adoption-rendering-20261106-prepared`.
[capture-integrity.json](capture-integrity.json) records each transformation.
The retained timing and preflight logs are copied byte for byte; the compact
analysis omits only the duplicated top-level artifact inventory.

## Limits

This is one same-batch comparison, not a general performance or statistical
equivalence claim. It uses matched cached dependencies rather than independent
fresh branch installs. The copied harness has no Git metadata, so the driver
reports an unknown revision; its archive and tracked files are pinned
independently. The run measures one workload and the complete candidate. It
does not isolate the Binding change or establish a stable rendering delta.

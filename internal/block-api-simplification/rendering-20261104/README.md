# Unified Block rendering analysis

This directory retains the measured unified Block comparison, the bounded
diagnosis, and the separate renderer-bookkeeping trial. The original 32 samples
remain in [initial/analysis.json](initial/analysis.json) and
[initial/timing-final.log](initial/timing-final.log).

## Initial measured result

The frozen candidate is `a79a7f77182e06aa5a4115a016a44d4826a8b9f0` and actual
main is `a471adb24d750ab9e8d8312edad53ff6f26d961b`.

| Variant   | Main median | Candidate median |  Change |
| --------- | ----------: | ---------------: | ------: |
| Naive     |    545.6 ms |         633.6 ms | +16.13% |
| Optimized |    201.5 ms |         260.1 ms | +29.08% |

The measurements sum synchronous and instrumented callback execution, excluding
boot and waiting between steps. All 32 samples are retained. Four functional
preflights, cyclic ordering, cross-origin isolation and representative counters
pass. The analyser accepts the original log and rejects a wrong counter or
missing sample after their hashes are refreshed. The source, artifact and
arithmetic audit passes independent review. This gap is not an approved runtime
tradeoff, and accepting compiler ceilings does not accept it.

Node's `gzipSync` reports 99,031/143,009 bytes for main/candidate naive bundles
and 99,741/144,328 bytes for optimized bundles. Compression settings differ from
some older receipts, so compare within this batch rather than subtracting older
gzip totals.

## Bounded diagnosis and trial

One optimized CPU profile per branch used the exact timed JavaScript and
unchanged runner. Hidden maps built afterward match those bytes. The
[diagnostic receipt](profiles/diagnostic-receipt.json) and
[mapped summary](profiles/summary.json) identify the full Mount-registration
walk as the candidate's leading mapped self hotspot: 6.452 ms self and 6.757 ms
inclusive. Sampled `renderSync` inclusive time is 35.343 ms on main and 49.929 ms
on the candidate. Boot and idle are included, profiling changes execution, and
inclusive times overlap. These samples do not apportion the official median gap.

Commit `7acdcf3380` replaces WeakMap/token visit bookkeeping with a renderer-owned
Set cleared in `finally`. It preserves the full walk, including cached lazy
VNodes, exact registration checks, duplicate/cycle handling, and rejection before
patching. All 331 tests across 15 relevant suites pass. Removing cleanup fails
the existing reused-lazy-Mount regression; restoration passes. All 369 public
declarations are byte-identical, and only `runtime/renderer.js` changes among
runtime JavaScript files.

The separate final batch retains another 32 samples in
[set-trial/analysis.json](set-trial/analysis.json) and
[set-trial/timing-final.log](set-trial/timing-final.log). Its source is
`7acdcf3380dccd560da0900aad487eaa3bd826cb`; main remains `a471adb24d750ab9e8d8312edad53ff6f26d961b`.

| Variant   | That batch's main | Final candidate |  Change |
| --------- | ----------------: | --------------: | ------: |
| Naive     |          547.9 ms |        605.0 ms | +10.42% |
| Optimized |          203.1 ms |        263.4 ms | +29.69% |

The optimized gap remains. This result does not establish an optimized speedup,
and differences between the two batches do not isolate the Set's causal effect.
The change preserves validation and removes persistent WeakMap/token bookkeeping;
the complete full-tree walk still runs. Rendering performance remains a release
review item, not an accepted tradeoff or a solved regression.

Both batches use eight cyclic rounds, four slots, 100 additions, 100 toggles and
100 deletions. All 64 samples remain available, with no discarded run. Each batch
passes its four fresh preflights and the unchanged/mutated evidence checks.
The final naive bundle is 143,012 bytes gzip against main's 99,031; optimized is
144,356 against 99,741. The resulting 43,981/44,615 byte increase compares the
whole preview with main. The trial adds 3/28 gzip bytes to the preceding candidate.
No bundle reduction is claimed.

## Analysis workflow

Full frozen inputs and receipts remain in
`/private/tmp/foldkit-unified-rendering-20261104`; the trial uses
`/private/tmp/foldkit-unified-rendering-set-20261104` and separate candidate slots.
The first receipt's canonical paths describe the original shared build. Its
[retention map](initial/historical-canonical-retention.json) identifies the
byte-identical frozen distributions after later shared rebuilds. Original
receipts and deployed candidate slots remain unchanged.

Three durable JSON copies follow repository formatting. Their
[formatting record](capture-formatting.json) retains original and formatted
hashes and confirms identical parsed values. Original receipt hashes still
refer to the retained raw captures. Timing logs are copied byte for byte.

The lead freezes the candidate, builds it, performs fresh functional preflights,
and runs the unchanged Lustre driver after other checks are quiet. Neither
analysis script builds applications, starts a browser, changes the harness, or
rewrites an existing output.

```sh
node internal/block-api-simplification/rendering-20261104/analyse-timing.mjs \
  /private/tmp/foldkit-unified-rendering-20261104/final-artifact-receipt.json \
  /private/tmp/foldkit-unified-rendering-20261104/timing-final-execution.json \
  /private/tmp/foldkit-unified-rendering-20261104/preflight-final/results.json \
  /private/tmp/foldkit-unified-rendering-20261104/timing-analysis.json
```

## Receipt contract

Paths in the artifact and execution receipts are absolute or relative to the
artifact receipt's directory. Each preflight's `log` is relative to its results
JSON. Hashes are lowercase SHA-256 hex. The existing `preparation.json` is read
through a hashed file reference; it retains `harnessRevision`,
`userHarnessUnmodified: true`, and the `driver` filename-to-hash record.

The artifact receipt has these required fields:

| Field                                               | Value                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `schemaVersion`, `evidenceKind`                     | `1`, and `"measured"` for the actual batch                             |
| `candidateCommit`, `sourceHead`, `mainCommit`       | Full commit hashes; candidate and frozen source HEAD agree             |
| `frozenAt`                                          | ISO timestamp before the final preflights                              |
| `sourceRoot`, `sourceInputs`, `sourceInputsSha256`  | Frozen source/config root, inventory, and its digest                   |
| `harnessRoot`, `harnessFiles`, `harnessFilesSha256` | Copied harness root and inventory, including `priv/instrumentation.js` |
| `driverRoot`                                        | Directory containing the unchanged driver and runner files             |
| `preparation`                                       | `{ "file": "preparation.json", "sha256": "…" }`                        |
| `artifactChecks`                                    | Component inventories described below                                  |
| `slots`                                             | Exactly four named slots, described below                              |

An inventory is an array of `{ file, sha256 }` records. Its digest is the
SHA-256 of UTF-8 lines `file + "\0" + sha256 + "\n"`, sorted by `file` using
ordinary code-point order. File bytes are rehashed during analysis. Inventory
membership is chosen and reviewed during freezing; the analyser verifies that
recorded inventory rather than discovering the relevant source files.

Each `artifactChecks` entry is
`{ component, canonicalRoot, frozenRoot, files, sha256 }`. Include `foldkit`
and `vite-plugin-foldkit`. Both roots must match the same recorded inventory
and digest. This checks the retained distribution files against the canonical
build; the lead establishes inventory completeness.

Each `slots[slot]` is `{ role, files }`. The roles, in driver `IMPLS` order,
are `main-naive`, `candidate-naive`, `main-optimized`, `candidate-optimized`.
A slot file is `{ file, sha256, bytes, gzipBytes }`, relative to
`harnessRoot/priv/implementations/<slot>/dist`. Record all deployed files.
The analyser checks bytes, hash, and Node `gzipSync(bytes)` size. Bundle totals
sum the JavaScript files; HTML is checked but excluded from bundle totals.

The execution receipt has these required fields:

| Field                                             | Value                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `status`, `exitCode`                              | `"complete"`, `0`                                                    |
| `startedAt`, `completedAt`                        | ISO timestamps around the complete driver process                    |
| `env`                                             | Actual `IMPLS`, `RUNS: "8"`, `HARNESS_DIR`, and the benchmark `PORT` |
| `driver`                                          | Path to the hash-verified `driverRoot/run.mjs`                       |
| `log`, `logSha256`                                | Raw combined driver output and its hash                              |
| `artifactReceiptSha256`, `preflightResultsSha256` | Hashes of the exact input JSON files                                 |
| `hostBefore`, `hostAfter`                         | Hashed `{ file, sha256 }` metadata captures                          |
| `timingIsolation`                                 | `{ buildsAndTestsQuiet: true, otherBrowserChecksQuiet: true }`       |
| `benchmarkPortClosedAfterRun`                     | `true`, after the runner verifies closure                            |

The isolation and port fields are the lead's execution attestations. Before/after
host snapshots do not prove continuous machine isolation. Additional toolchain,
adapter, reuse, or dependency-cache details belong in the artifact receipt;
`limitations` is copied into the analysis without replacing its standard limits.

Preflight results are four records
`{ slot, startedAt, completedAt, exitCode: 0, log, logSha256, artifactReceiptSha256 }`.
Each preflight follows the freeze and completes before timing. Its hash-checked
log must contain `VERIFY <slot>: OK`. Generate this receipt after the final
build, rather than reuse preliminary preflight logs from earlier bundles.

## Gates and observable limits

The analyser retains exactly 32 totals across eight cyclic rounds. Each slot
appears in every ordinal position twice. It rejects missing, duplicate,
out-of-order or malformed samples, and checks the reported total medians
against the already-rounded totals within 0.1 ms. It reports every paired
round, ranges, and raw/gzip bundle changes.

The unchanged driver rejects page errors and loss of cross-origin isolation
on every run. Its summary prints counters from the fifth run of each slot:
400 synchronous events, 400 animation-frame callbacks, and zero other buckets.
The analyser validates those four representative observations. It cannot
validate unprinted per-run counters or reconstruct all per-run bucket timings.
Independently reported bucket medians do not sum to the total median.

After actual raw output exists, run the same analyser against two private
mutations. Their execution receipts refresh the changed log hash, so rejection
must reach the intended counter/sample gate rather than merely fail a hash:

```sh
node internal/block-api-simplification/rendering-20261104/verify-controls.mjs \
  /private/tmp/foldkit-unified-rendering-20261104/final-artifact-receipt.json \
  /private/tmp/foldkit-unified-rendering-20261104/timing-final-execution.json \
  /private/tmp/foldkit-unified-rendering-20261104/preflight-final/results.json \
  /private/tmp/foldkit-unified-rendering-20261104/analysis-controls.json
```

The unchanged input must pass; a wrong representative counter and an omitted
sample must fail. Synthetic development controls use
`evidenceKind: "synthetic-control"` and remain separate from measured results.
The November 3 report and its scripts remain historical records.

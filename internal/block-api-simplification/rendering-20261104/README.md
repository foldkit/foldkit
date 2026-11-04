# Unified Block rendering analysis

This directory prepares analysis for the final candidate batch in
`/private/tmp/foldkit-unified-rendering-20261104`. It contains no measured
results. The lead freezes the candidate, builds it, performs fresh functional
preflights, and runs the unchanged Lustre driver after other checks are quiet.
Neither script builds applications, starts a browser, changes the harness, or
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

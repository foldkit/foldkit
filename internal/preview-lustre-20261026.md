# October 26 rendering workload comparisons

The prepared source is `978c07a093bdcdadf2a94cf8ab0e5f9e985a008d`, frozen as
`41ec430daf817d7dc592f8123211d405022752a2d434cadb4c6269e03b9223c4`.
Publication remains held. These are local supported-host comparisons, with
production builds of each checkout's own framework and benchmark application.

## Against main

Eight rotating rounds compare pinned main
`b702a5efbb74bebc056b798b414ddb923a82fbd5` with the prepared preview. All 32
samples pass the final empty-list/input checks and retain 400 synchronous events
and 400 instrumented animation-frame callbacks.

| Workload  | Main median (range), ms | Preview median (range), ms | Ratio of medians |
| --------- | ----------------------- | -------------------------- | ---------------- |
| Naive     | 516.5 (448.4–541.8)     | 588.6 (467.5–615.1)        | 1.140, +14.0%    |
| Optimized | 191.1 (160.6–204.0)     | 268.7 (232.0–291.1)        | 1.406, +40.6%    |

Median round-paired ratios are 1.094 and 1.363 respectively. Every paired ratio
favors main. The optimized ranges do not overlap; this is an observed cost,
not evidence of equal performance or a rendering speedup.

The synchronous bucket medians rise 40.2→49.8 ms and 43.2→54.8 ms. Most added
measured time is in the animation-frame bucket: 476.1→536.9 ms and
147.9→215.5 ms. That bucket includes callbacks, view construction and DOM/update
work. It does not isolate renderer CPU. Bucket medians do not necessarily sum
to the median total.

JavaScript grows from 298,040 to 411,787 raw bytes in the naive build and
300,443 to 418,401 in the optimized build. Gzip grows by 31,703 and 32,356 bytes,
about 33%. HTML and every bundle hash are retained in the
[raw evidence](benchmarks/lustre-20261026-main-preview.json).

Main uses its supported Runtime host; the preview uses Program and its completed
root Block. The Todo behavior and lazy/keyed view operations are equivalent.
This comparison measures those supported application paths together, including
the architecture changes. It does not identify which individual change caused
the gap.

## Against the published preview

A separately predeclared four-round control compares exact published
`1f6776fa7ececa766188df5201eefec6ba781b5d` with the same prepared source. It uses
the same driver, toolchain, workload, assertions and fresh contexts. All 16
samples pass; none is discarded and the batch is not selectively extended.

| Workload  | Published median (range), ms | Prepared median (range), ms | Ratio of medians |
| --------- | ---------------------------- | --------------------------- | ---------------- |
| Naive     | 584.6 (545.0–645.3)          | 613.1 (600.3–626.6)         | 1.049, +4.9%     |
| Optimized | 279.4 (272.6–303.6)          | 277.1 (248.6–282.5)         | 0.992, −0.8%     |

Median paired ratios are 1.057 and 0.992. Ranges overlap. The naive cost should
remain visible; the optimized result is effectively similar in this bounded
screen. This control does not reproduce the large main gap as an incremental
change from the published preview. It is not proof of zero regression or an
optimized speedup. Do not compare absolute values across the two batches.

Compared with the published preview, gzip grows by 1,790 naive and 1,807
optimized bytes. [All control samples and bundle identities](benchmarks/lustre-20261026-published-preview.json)
are retained separately from the main comparison.

## Method and limits

The canonical Lustre runbook adds 100 Todos, toggles all 100 individually and
deletes the first Todo 100 times. Totals sum instrumented callback and synchronous
event-handler execution; waits between actions are excluded. Boot settles before
reset and the final quiet-frame gate is unchanged. These are neither elapsed
interaction durations nor frame/presentation latencies.

- Harness: `lustre-labs/benchmark` at
  `03fff17ad22407115a91937ddab680e40fe0c7c7`; instrumentation SHA-256
  `6e3597e81ef7276d99f17cfa4c3430e05beb7768411a1a34bffa0026343f7f69`.
- Host: Apple M1 Max, 10 logical CPUs, Darwin 25.6.0, Node 24.22.1.
- Browser: Chrome 155.0.8059.85, Playwright 1.63.0, headless and cross-origin
  isolated. Every sample gets a fresh browser context and application state.
- Matched cached toolchain: Vite 8.3.5, Effect 4.0.0, official TypeScript
  7.1.0-beta for prerequisite libraries. Each baseline is a fresh exact git
  archive with isolated workspace links. This controls third-party tooling;
  it is not a fresh install of each baseline's historical lockfile.
- Production settings remain `es2022`, Oxc minification and disabled DevTools.
  The same empty external stylesheet is supplied to every implementation.
- Four variants rotate through each ordinal position. Eight rounds give every
  main-comparison variant two visits to each position; four rounds give the
  control one visit each. All valid samples are retained. There is no separately
  discarded warmup and no forced-GC control.
- Builds, source/declaration checks, tests and consumer rehearsals finish before
  each timing batch. Normal OS activity, user applications and existing servers
  remain intact. This is a small screen on one machine, not a large-application
  or long-session guarantee.
- Functional preflight also verifies add/toggle/delete, edit, filters,
  toggle-all/clear, and retained row identity across toggling and first deletion.
  Driver adaptations persist raw data and assert final DOM/event counts after
  the returned measurement snapshot; timing and runbook code are unchanged.

The repository driver is `internal/lustre-benchmark/bench/run.mjs`; use built
implementation slots with `HARNESS_DIR`, `IMPLS` and `RUNS=8` (or the predeclared
control's `RUNS=4`). The committed evidence includes tool versions, raw samples,
source/archive pins, bundle hashes, and driver hashes. Local orchestration and
logs are under `/private/tmp/foldkit-next-preview-signoff-final-20261026`.

The release review should retain the measured main cost. This screen provides no
basis for an API change or for claiming that all performance issues are solved.
Native TypeScript editor latency is a separate measurement and remains documented
in the earlier scoped reports.

## Subsequent runtime investigation

The [runtime followup](preview-runtime-investigation-20261026.md) preserves this
report's source pins and measurements. It adds CPU/allocation attribution,
phase counters, rejected experiments and a fresh main/unchanged-preview/fixed
comparison. The optimized candidate improves 12.7% against unchanged preview;
remaining main and bundle costs stay explicit. Publication remains held.

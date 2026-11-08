# Iterative Mount-validation experiment

## Scope

This is an instrumentation-free source experiment. It changes only the
renderer-owned traversal used to verify Layer-backed Mount registrations before
patching. It does not change validation coverage, registration identity,
missing-name deduplication, view scoping, operation graphs, Block boundaries, or
the benchmark.

The pre-experiment renderer was recorded before editing:

- source bytes: 34,801
- SHA-256: `f6cfca5de37e6a8fea745d600d3d7bea07ccd4df0afab68c99d683714329e805`
- Git blob: `5929e7a6cc0af92beba6feb322973e5cb157deeb`

Those bytes match published preview source
`54f8bcd443b4fd18952403a3d02e212abf872d58`.

The experiment adds one renderer-owned reusable VNode worklist. The existing
renderer-owned visited Set still guards shared and cyclic branches. Every
non-string child, including descendants of reused lazy VNodes, is pushed onto
the worklist. The same `finally` block clears both the visited Set and the
worklist after success or failure. Registration checks and the pre-patch call
site are unchanged.

The experiment renderer is 35,331 bytes with SHA-256
`6f92de8cc352909e7585e3d02b46f42300685d204d917a4572cdd74c10531e4a`
and Git blob `25c98e1cdfe33c24ca00788d8359e170ff21dc24`.

## Correctness checks

The focused instrumentation-free suites pass:

- `runtime/mountLayer.test.ts`
- `runtime/mountViewState.test.ts`
- `runtime/renderCommit.test.ts`
- `html/lazy.test.ts`
- `html/lazyOwnership.test.ts`
- `html/mountCapabilities.test.ts`
- `html/onUnmount.test.ts`

Result: 7 files and 102 tests passed.

The Foldkit source typecheck also passes with
`tsc -p packages/foldkit/tsconfig.json --noEmit`.

The existing reused-lazy regression is the meaningful mutation control. A
temporary mutation that stopped descending from the rendered root made
`revalidates an unregistered Mount added to a reused lazy VNode before
patching` fail because the expected error was absent. Restoring full descent
made the test pass. The mutation was not retained. No new regression duplicates
that coverage.

A LIFO worklist can reverse sibling traversal and change which qualified name
survives when one missing registration appears more than once. The new focused
regression proves the iterative walk retains the recursive walk's left-to-right
semantics: the last rendered name wins. Pushing children in their authored order
made the regression fail with `First/AnchorPanel`; restoring reverse pushes made
it pass with `Last/AnchorPanel`. That mutation was also removed.

## Frozen artifacts and timing procedure

Do not run this plan while builds, tests, or other browser work are active.

The frozen builds, preflight and completed timing receipts are retained in
`/private/tmp/foldkit-mount-iterative-20261107-32wcjI`. The procedure below was
used for the measured result. No CPU profile was taken after the timing batch
failed to show a reliable improvement.

1. Freeze two source directories from the exact candidate selected for timing.
   Copy the selected source once, then clone that frozen copy so every file,
   dependency, benchmark input, and tool version initially matches.
2. In the baseline copy only, install the recorded 34,801-byte renderer above.
   Keep the iterative renderer in the experiment copy. Inventory and hash every
   source/config input, and assert that `runtime/renderer.ts` is the only
   difference.
3. Build naive and optimized TodoMVC artifacts from each source with the same
   cached Effect 4.1.0, Vite 8.3.5, TypeScript 7.1 beta, benchmark sources, and
   `BUILD_VARIANT` configuration used by the retained final comparison. Do not
   add counters or profiling hooks.
4. Deploy six harness slots. The two baseline slots for each variant must be
   byte-for-byte copies of one build, not independent rebuilds:
   - `mount-baseline-naive-a`
   - `mount-experiment-naive`
   - `mount-baseline-optimised-a`
   - `mount-experiment-optimised`
   - `mount-baseline-naive-b`
   - `mount-baseline-optimised-b`
5. Record raw and gzip sizes and hashes for every served asset. Assert the two
   baseline naive slots are identical, the two baseline optimized slots are
   identical, and all four functional preflight roles report the expected DOM
   result without page errors. Preflight the duplicate slots as an additional
   deployment check.
6. Run the unchanged driver with those six slots in the order above and
   `RUNS=12`. Cyclic rotation then places every slot in every ordinal position
   twice, retaining 72 samples. Preserve synchronous and animation-frame
   buckets, all round totals, host snapshots, isolation attestations, and port
   closure.
7. Analyse experiment versus the same-round median of its two matching baseline
   copies. The baseline-A versus baseline-B distribution is the negative-control
   noise floor. Do not claim an improvement when the experiment's paired change
   is comparable to that duplicate-baseline spread or when optimized pairs do
   not improve consistently.
8. Only after the instrumentation-free batch, capture one optimized CPU profile
   per unique build if timing warrants diagnosis. A useful result must reduce
   validator self time without changing lazy decisions, update counts, patch
   behavior, or functional output.

The frozen source manifest inventories 9,147 published files and proves that
only `packages/foldkit/src/runtime/renderer.ts` differs. Cached dependencies are
shared by symlink, while both workspace package links remain inside their own
snapshot. Recorded versions are Effect 4.1.0, Vite 8.3.5, TypeScript 7.1 beta,
Playwright 1.63.0, and Node 26.13.0.

The published baseline rebuild is byte-identical to the final measured candidate
artifacts:

| Variant   | Baseline bytes / gzip | Experiment bytes / gzip |      Delta |
| --------- | --------------------: | ----------------------: | ---------: |
| Naive     |     475,519 / 147,123 |       475,638 / 147,171 | +119 / +48 |
| Optimized |     482,112 / 148,452 |       482,231 / 148,499 | +119 / +47 |

The two baseline deployments for each variant are byte-identical copies. All
six slots passed the unchanged functional browser preflight. The retained
receipts are `source-manifest.json`, `build-receipt.json`,
`artifact-receipt.json`, and `preflight/results.json` under the frozen workspace.
The approved timing configuration remains six slots, 12 cyclic rounds, and two
visits by every slot to every ordinal position.

## Measured result

The quiet batch, using the unchanged callback instrumentation, ran from
`2026-11-07T22:03:27.359Z` to
`2026-11-07T22:19:39.934Z`. It retained all 72 samples, discarded none,
verified cyclic ordering, closed Chromium and the server, and confirmed port
8588 was available afterward.

| Variant   | Baseline A | Experiment | Baseline B | Baseline midpoint | Experiment delta |
| --------- | ---------: | ---------: | ---------: | ----------------: | ---------------: |
| Naive     |   646.7 ms |   662.4 ms |   631.7 ms |          639.2 ms |         +23.2 ms |
| Optimized |   342.3 ms |   354.7 ms |   358.2 ms |         350.25 ms |         +4.45 ms |

The naive experiment was faster than the same-round baseline midpoint five
times and slower seven times; its paired median delta was +5.53 ms. The
optimized experiment split six faster and six slower rounds; its paired median
delta was -2.95 ms. Byte-identical baseline variation was larger than that
optimized paired median: the median absolute A/B difference was 16.4 ms, with a
129.3 ms maximum. The experiment's optimized median lay between the two
baseline medians.

Representative bucket medians also do not show an improvement. Optimized sync
was 71.4 / 73.6 / 77.3 ms for baseline A / experiment / baseline B, and
animation-frame time was 273.6 / 279.6 / 279.8 ms. Naive sync was 71.1 / 73.9 /
70.0 ms, and animation-frame time was 573.6 / 589.5 / 557.4 ms.

The experiment is rejected: it is not consistently faster, its optimized result
is within duplicate-baseline noise, and its naive median is slower than either
baseline. No CPU profile was taken. The iterative renderer and its focused
traversal-order regression were removed from the shared checkout; this report
and the frozen evidence remain. The final execution and arithmetic receipts are
`timing-execution.json` and `timing-analysis.json` in the frozen workspace.

Copies of the source, build, artifact, preflight, host, execution and arithmetic
receipts and the unchanged driver are retained under
[`preview-iterative-mount-validation-20261107/measurements`](preview-iterative-mount-validation-20261107/measurements).
These files preserve the measured bytes and hashes. The temporary workspace
retains the complete build trees.

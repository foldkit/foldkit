# InMessage checkpoint rendering comparison

The November 3 Lustre batch compares candidate
`8fc55dd925e4e5803ab8c9e9b4fb74a3ff7afbef` with actual main
`a471adb24d750ab9e8d8312edad53ff6f26d961b`. It includes the unchanged-child
identity repair and canonical InMessage update migration. The isolated unified
Block/direct Layer prototype is excluded.

| Variant   | Main median | Candidate median | Change |       Added gzip |
| --------- | ----------: | ---------------: | -----: | ---------------: |
| Naive     |    802.0 ms |         638.7 ms | −20.4% | 31,744 B / 28.9% |
| Optimized |    235.4 ms |         265.2 ms | +12.7% | 32,283 B / 29.2% |

All 32 samples are retained across eight cyclically rotated rounds. Each slot
appears in every ordinal position twice. The workload has 100 items; the
reported counters are 400 synchronous events and 400 animation-frame callbacks
per slot. All four functional preflights pass. Each timed run checks page errors
and cross-origin isolation. No build, test or other browser gate overlapped the
timing run.

The optimized candidate is slower in every paired round, by 4.9–69.7%, with a
29.8 ms increase in the total median. The synchronous median increases by
9.4 ms and the animation-frame median by 20.2 ms. These independently calculated
medians include several framework and browser costs and do not identify a cause.
Naive candidate samples are faster in six
rounds and slower in two. Main's naive range is 397.5–854.4 ms, compared with
580.7–676.3 ms for the candidate. The median improvement does not establish a
general speedup.

## Workload and artifacts

The unchanged driver and instrumentation match harness revision
`03fff17ad22407115a91937ddab680e40fe0c7c7`. The copied harness omits Git metadata,
so the driver reports its revision as `unknown`; byte hashes establish the
driver identity. Main bundles are reused after their hashes match the previous
frozen main checkpoint. Two scratch-only completion adapters support the current
Block API. Todo's Model, Messages, handler bodies, views, entries, HTML and
benchmark workload are unchanged.

At timing start, all 702 core and 24 plugin JavaScript/declaration artifacts
match the canonical built distributions. The selected source/config inventory
has 634 files and digest
`1044f3511fb52c5673d7da341828842003e12d58804c4e62bb0c77bccd23df51`.
Node 22.22.3, Effect 4.1.0, Vite 8.3.5, TypeScript 7.1 beta, Playwright 1.63.0
and Chromium 153.0.8010.12 are used. This is a matched cached-dependency
comparison, not fresh installations from each branch's lockfile.

Whole-host CPU metadata was captured immediately before and after timing, with
no user processes changed. This is not continuous host profiling. The local
benchmark server closed after execution.

After timing, the development-only non-HMR SSR reload fix changed the plugin.
Both benchmark clients were rebuilt against the current canonical core source
and that plugin build. Their JavaScript hashes are byte-identical to the timed
bundles, as recorded in the [rebuild receipt](./final-client-rebuild-receipt.json).
This does not claim the entire later plugin distribution is unchanged.

## Evidence

- [Analysis](./analysis.json): all samples, paired rounds, medians, ranges,
  artifact hashes, exact timestamps and limitations.
- [Raw output](./timing.txt): unchanged driver output, including its metadata
  warning and all samples.
- [Analysis script](./analyse-timing.mjs): validates completion, rotation,
  preflights, counters and hashes before writing results.
- [Analysis controls](./analysis-controls.json): the archived script accepts
  unchanged evidence and rejects a corrupted workload counter in a private copy.

The complete frozen source, builds, preparation, preflight logs, host metadata,
adapter and artifact receipt remain in
`/private/tmp/foldkit-inmessage-rendering-20261103/`. The retained analysis
script expects that evidence directory and refuses to overwrite its output.

This batch compares whole branches. Do not subtract separate batches to infer
the cost of an individual feature or claim the optimized regression is resolved.

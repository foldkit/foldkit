# November 8 rendering and verification checkpoint

The source at `6f1c988e1096b7285066892e8eabac74cda131ea` is pushed in
[#1922](https://github.com/foldkit/foldkit/pull/1922). Its exact-commit review,
normal local push gate, [CI](https://github.com/foldkit/foldkit/actions/runs/42463322048)
and [Examples E2E](https://github.com/foldkit/foldkit/actions/runs/42463322082)
pass. No new preview is published and no new Daybreak transfer is performed.

## Rendering result

One frozen TodoMVC campaign compares current source with main
`a471adb24d750ab9e8d8312edad53ff6f26d961b`, using naive and optimized variants.
The six slots include two identical main controls for each variant. All twelve
cyclic rounds and all 72 samples are retained, with no discarded samples or
timing retries.

| Variant            | Main control midpoint |  Current |       Difference |
| ------------------ | --------------------: | -------: | ---------------: |
| Optimized, primary |              266.7 ms | 336.5 ms | +69.8 ms, +26.2% |
| Naive, secondary   |             718.45 ms | 751.2 ms | +32.75 ms, +4.6% |

The optimized current was slower than its round-aligned main controls in all
twelve rounds. That is a material remaining performance gap before main. The
naive comparison is inconclusive against its control variation.

The measurement sums synchronous and wrapped callback/event work. It includes
idle animation-frame callbacks and excludes the MessageChannel task that arms
the next frame. It does not isolate time per render, paint time, whole-page CPU
or application latency. The result does not identify the cause or establish an
improvement over an earlier campaign.

All six functional slots, four source-matched count captures and 45 positive or
negative controls passed before timing. Independent review checked the source
and asset identities, ordering, all samples, arithmetic, work inventories and
cleanup. Driver summary medians use unrounded in-memory totals; the retained
individual totals are rounded to 0.1 ms. The detailed report preserves that
precision limit and the original failed protocol attempts.

The [outcome report](measurements/outcome/report.md),
[reproduction guidance](measurements/outcome/reproduction.md) and
[packet inventory](measurements/outcome/integration-inventory.md) accompany
the raw evidence and checksums. Exact main assets were reused from the
authenticated November 4 build. They were not rebuilt using the current
plugin. Current ordinary assets and hidden-map twins were built from the
frozen current source.

## Completed source changes

- An omitted contracted Block view declares an Element view with no inputs;
  `view: false` declares a viewless Block. The implementation still supplies
  the declared view. Explicit Document views and Schema-only assembly retain
  their contracts. Active consumers, scaffolds and guidance are migrated.
- Continuous animation-frame Subscription ticks render in the arriving frame.
  Deferred delivery resumes at the frame boundary with its existing budget
  and occurrence checks. The separate cadence evidence proves the reproduced
  frame-rate bug is fixed; it does not claim a rendering-time speedup.
- Two packed viewless fixtures explicitly opt out of the new Element default.
  Installed-consumer types and SSR pass in Chromium, Firefox and WebKit,
  with one Effect runtime. This corrects a candidate migration omission found
  by CI and changes no production implementation.

The [view proof](../view-default-proof/REPORT.md) records the explicit revision
of one compiler ceiling: layered Types increase from 336,291 to 336,346, or
55 Types. The lead selected that exception under overnight work authorization.
It is not a user-approved cost acceptance. All workload bodies, instantiation
ceilings and other Type ceilings are unchanged.

## Verification limits and next work

The complete normal local gates passed for the view migration and the packed
fixture correction. Each Website suite reported 21 passing cases and one
successful retry. The two first-attempt failures occurred in different cases
at the same five-second wait for the client runtime, before the accessibility
or keyboard assertions. A separate fresh-server, single-worker run without
retries passed. The startup timeout's cause is unresolved.

The [second readiness packet](measurements/website-readiness-followup/manifest.json)
preserves its original full-hook log, error context, retry trace and final-run
state. The [first readiness packet](../preview-frame-cadence-20261108/measurements/website-readiness/README.md)
and [packed-consumer report](../preview-packed-viewless-consumers-20261108.md)
retain the earlier evidence. The [source CI receipt](measurements/source-ci.json)
records the separately verified remote checks; benchmark receipts do not
claim to produce CI results.

Rendering cost, child-Layer editor latency and immediate child-operation
output precision remain open. Rejected rendering and typing prototypes have
not been adopted or counted as fixes. Further optimization should begin from
this source and use the retained research to avoid repeating rejected work.
Publication, a new Daybreak source transfer and merging to main remain held.

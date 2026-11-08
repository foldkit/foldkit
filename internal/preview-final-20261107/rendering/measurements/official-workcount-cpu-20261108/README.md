# Official work-count and CPU diagnostic

This directory preserves the exact ordinary CPU profiles, separate precise
coverage captures, source-matched hidden maps, receipts, decoders and failure
record for the retained official actual-main and published-preview assets. The
capture ran during the coordinated quiet window on 2026-11-08. No production
source was changed for this diagnostic.

The evidence is compacted with deterministic gzip. `manifest.json` records the
original and stored byte counts and SHA-256 hashes for every file; decompressing
a `.gz` entry reproduces the exact original bytes. The original unprivileged
CPU launch failed with `listen EPERM` before the browser started. Both its
incomplete receipt and explicit failure classification are retained under
`receipts/` and are not measurement evidence.

## Frozen identities and valid captures

- Actual main: `a471adb24d750ab9e8d8312edad53ff6f26d961b`.
- Published preview: `54f8bcd443b4fd18952403a3d02e212abf872d58`.
- Retained preview source head: `1117a93316ff8111d402bffc995067476ec97983`.
- Official artifact receipt SHA-256:
  `9e4713466acc76e4f063e257212f209bf8533828c92c36f6eab8cd49a9c2bbde`.
- Node executable SHA-256:
  `533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4`.
- Chromium 153.0.8010.12 executable SHA-256:
  `8319963f6625accf51c0dd4f55091ceaf9f09ed39e7a52fed4fae12b2a6b668a`.

Every accepted slot rehashed the served and executed JavaScript, ended with the
input present and an empty Todo list, and recorded exactly 400 synchronous and
400 animation-frame callbacks with no timeout, microtask or promise callbacks.
The accepted receipts report their owned browser and server closed. A final
listener check found no listener on ports 38471 or 38472.

## What the exact work counts establish

The primary optimized pair performs the same domain, descendant-view and outer
render work:

| Work | Actual main | Published preview |
| --- | ---: | ---: |
| Update dispatcher | 400 | 400 |
| Each of four exact Todo handlers | 100 | 100 |
| Outer optimized view | 401 | 401 |
| Todo row view and non-editing row view | 200 each | 200 each |
| `resolveOrCache` | 26,844 | 26,844 |
| Lazy argument equality | 26,739 | 26,739 |
| Keyed lazy invocation / cache write | 24,950 / 200 | 24,950 / 200 |
| Unkeyed lazy inner paths | 1,894 / 504 | 1,894 / 504 |
| `buildVNodeData` / `buildElement` | 3,906 / 3,906 | 3,906 / 3,906 |
| Child normalization | 3,906 | 3,906 |
| VNode visit | 31,248 | 31,248 |
| `renderSync` / frame body / root patch | 401 / 400 / 401 | 401 / 400 / 401 |
| `updateChildren` | 3,387 | 3,387 |

The equal row-view and lazy miss-path counts are important. The current scoped
view and HtmlBuilder identity do not cause extra cache misses in this workload.
That does not prove every nested Block or Mount boundary, but it rules out an
assumed general cache-key churn explanation here.

Preview-specific reached work includes:

- `trackedBoundaryOccurrencesAreCurrent`: 26,739 calls. This is an exact
  lifecycle-safety check added to the lazy hit contract; it produced no sampled
  self-time in this single profile and did not change miss counts.
- `assertLayeredMountsAreRegistered`: 401 calls and 160,063 recursive node
  visits.
- Scoped view, Program view and compiled view wrappers: 401 each.
- Composition and lowering update wrappers: 400 each.
- `transformFields`: 500.
- The newer Snabbdom child-pairing callback: 30,221 optimized calls.

Optimized preview calls `patchVnode` 30,621 times versus main's 4,681. The
additional calls mostly enter the newer pairing callback and immediately return
when old and new VNodes are the same object. Both slots still perform 4,682
`sameVnode` checks and 3,387 `updateChildren` calls. This is a real source
difference, not evidence of 25,940 extra DOM mutations. In the naive control,
both slots call `patchVnode` 159,436 times and `updateChildren` 131,606 times.

## CPU samples and the ordinary timing evidence

The official eight-round batch reported optimized medians of 207.4 ms for main
and 308.1 ms for preview, a 100.7 ms gap. The separate single instrumented CPU
invocation observed callback totals of 71.020 ms and 82.505 ms, an 11.485 ms
difference. Its source-mapped app-bundle self samples were 72.196 ms and 91.464
ms, a 19.268 ms difference. These are values from one profiling invocation, not
a reproduction attempt or an estimate of the ordinary timing gap. The
corresponding naive values were:

| Evidence | Actual main | Published preview | Difference |
| --- | ---: | ---: | ---: |
| Official eight-round median | 654.9 ms | 710.6 ms | +55.7 ms |
| Single instrumented callback total | 138.615 ms | 155.805 ms | +17.190 ms |
| Single instrumented app-bundle self samples | 143.039 ms | 163.564 ms | +20.525 ms |

The profiled callback fields use the same milliseconds and runner aggregation:
each raw `total` is exactly the sum of synchronous, timeout, animation-frame,
microtask and promise callback time after the boot reset. The ordinary protocol,
however, retains eight observations per slot in cyclic order and reports their
median; the profile protocol retains one fixed-order observation per slot with
Debugger and a 100 microsecond CPU Profiler enabled before boot. The ordinary
driver reuses one browser across 32 fresh contexts. The profile invocation
reuses one fresh browser across four fresh contexts. Neither driver declares an
explicit warmup.

Both paths use the exact same runner, server, 100-item workload, iframe size,
default Playwright viewport, CSS interception and Chromium version. The profile
receipt authenticates the Chromium executable hash; the ordinary receipt records
the version but not the executable hash. The ordinary parser reads per-run
totals printed to 0.1 ms and verifies the eight-run median. Its bucket medians
are calculated independently and cannot be summed to recover the total median.
The full protocol comparison and exact raw fields are preserved in
`analysis/timing-validity-check.json`.

The +11.485 ms callback difference and +19.268 ms app-bundle sample difference
must not be used to allocate or explain the ordinary +100.7 ms difference. The
profile remains evidence about reached JavaScript work and descriptive sampled
self time under that instrumented invocation. A later ordinary twelve-run table
batch used the same driver and duplicate byte-identical published-preview
optimized assets; its two baseline medians were 343.7 ms and 339.2 ms. That
batch further establishes that 71/82 ms is not representative ordinary timing,
but it does not establish why the instrumented invocation differs.

Within the optimized profile, the full mutually exclusive leaf buckets were:

| Bucket | Actual main | Published preview | Difference |
| --- | ---: | ---: | ---: |
| HTML/VNode construction | 22.962 ms | 22.020 ms | -0.942 ms |
| Renderer | 2.465 ms | 9.884 ms | +7.419 ms |
| Block/Program wrappers | 0 | 9.079 ms | +9.079 ms |
| Snabbdom | 11.142 ms | 13.445 ms | +2.303 ms |
| Garbage collector | 4.076 ms | 5.412 ms | +1.336 ms |
| Program/native | 321.614 ms | 306.833 ms | -14.781 ms |
| Empty-URL native or unmapped | 16.669 ms | 14.693 ms | -1.976 ms |
| Idle | 12,948.499 ms | 12,958.041 ms | +9.542 ms |

The Mount-registration walk has 6.787 ms self in optimized preview and 6.003 ms
in naive preview. It and wrapper work are reached costs in the profiled
invocation; their sampled magnitudes explain neither a fixed share nor the
remainder of the ordinary +100.7 ms difference. The GC and native bucket
directions are not stable across optimized and naive captures. The CDP profile
is 96% idle, includes boot and waits, and has one observation per slot. It
cannot distinguish whether ordinary timing's remaining disparity comes from
unsampled JavaScript variation, browser lifecycle work, GC, scheduling or other
batch effects.

Precise coverage ran in a separate fresh browser and changes V8 optimization
and cadence. Its elapsed values and CPU shape are invalid. Its work counts are
usable because all driver and DOM guards passed, but those counts describe work
under the coverage run and are not phase-separated. Both CDP spans begin before
the app iframe loads and end after the unchanged runner resolves; there is no
authenticated boot/workload boundary and no subtraction.

## Current-source next step

Do not default to caching Mount validation. A persistent or iterative cache over
mutable VNodes and lifecycle ownership was already constrained or rejected by
the retained ownership work, and the exact rejection contract must remain. Do
not reopen the rejected R52 ownership architecture, the unresolved R58 revision,
or the inconclusive R64 lazy-argument compiler path under a new name. The
26,739 current boundary checks also show why root view identity alone cannot
waive nested lifecycle checks.

The strongest bounded current-source experiment is instead to reconcile the
retained combined R11/R19 child-normalization and built-in tag-metadata package
onto the current source, after the current direct-Attribute work settles, and
measure that exact pair against an identical-code control. Current optimized
coverage reaches `buildElement`, `buildVNodeData` and child normalization 3,906
times and visits VNodes 31,248 times, so this is reached work. Historical commit
`8ba2ccb01678ff166ef6e23b24c717e258810f7f` removed a second child traversal and
repeated built-in tag classification. Its combined ordinary-300 result was
3.18% less callback time with a 95% interval of 1.96–4.39% less; standalone
child normalization was inconclusive, so the two changes must remain paired and
the historical percentage must not be transferred to current source.

The reconciliation must preserve fresh parent-owned child arrays, child VNode
identity, namespace and validation ordering, keyed/custom-element behavior,
built-in metadata initialization, root and scoped HtmlBuilder identity, lazy
cache keys, Mount lifecycle checks, SSR/hydration and source-free package
behavior. Re-run the exact descendant/lazy counts above as mutation controls.
Only then run the current official timing design with its identical-code
control. This is a practical source experiment backed by retained positive
evidence; it is not another ownership migration.

This evidence neither justifies nor rules out a Chrome lifecycle trace. If a
later trace is selected, it needs an authenticated workload boundary and the
same asset, runtime and driver guards; another boot-inclusive single
instrumented invocation would repeat the present limitation. R11/R19 remains a
bounded next source candidate because prior retained evidence is positive and
the current target work is reached, not because these profiles prove that it
will reduce the ordinary +100.7 ms gap.

## Retained research consulted

The recommendation above reconciles the following reports at research commit
`61606c6335` rather than reopening their parked paths:

- `internal/lustre-benchmark/core-performance-roadmap.md`.
- `internal/lustre-benchmark/retained-stack-review/report.md`.
- `internal/lustre-benchmark/retained-stack-review/pr-sequence.md`.
- `internal/lustre-benchmark/retained-optimized-attribution/report.md` (R60).
- `internal/lustre-benchmark/lazy-hit-contract-audit/report.md` (R61).
- `internal/lustre-benchmark/retained-framework-scorecard/checkpoint.md` (R65).

R60's allocation observations were sampled contexts, not exact or retained
memory. R61–R64 tested the substantial lazy-argument direction without a
confirmed primary net gain. R65 explicitly requires a new cost argument before
another profile and keeps ownership/fusion/cache retries parked. R11/R19 remains
the retained, reviewable construction package that is both reached by the
current workload and not already rejected.

# Composable updates

## Public API

Composition now exposes focused update composition directly. The ordinary
exhaustive `makeUpdate(record)` remains the default.

| Form                               | Responsibility                                        |
| ---------------------------------- | ----------------------------------------------------- |
| `makeUpdate(record)`               | Exhaustive local handlers and automatic child routing |
| `makeUpdate.cases(record)`         | Additional handlers for named local Messages          |
| `makeUpdate.each(handler)`         | A shared transition for every accepted dispatch       |
| `makeUpdate.on(tags)(handler)`     | A shared transition for selected local tags           |
| `makeUpdate.except(tags)(handler)` | A shared transition excluding selected local tags     |
| `makeUpdate.compose(...parts)`     | Apply pieces in order                                 |

A focused-only composition is a reusable bundle. Block completion requires
exactly one exhaustive update, including through nested bundles. Empty
compositions and multiple exhaustive updates are rejected. Child routing stays
inside the exhaustive update; the public API has no separate routing stage.

## Ownership and execution

Each applicable piece receives the preceding piece's Model and the original
Message. Shared callbacks receive `{ before }` as the third argument, followed
by declared dispatch context. `before` remains the outer dispatch's original
Model across grouping. Composition preserves direct and curried acquired calls.

Command intents collect in order. Their effects are not sequenced. Shared
callbacks cannot emit OutMessages, including through a connected child's parent
policy. Additional record handlers retain exact per-tag channels; competing
emissions for the same tag are rejected. Silent pieces preserve a prior
OutMessage. `makeInMessageUpdate` provides the same focused composition for
parent inputs, using its own InMessage union and Context. Commands from both
entry points produce ordinary local Messages. Init remains separate.

Plans are passive and Composition-owned. Dispatch admission happens before
application callbacks, and child delivery runs once at the exhaustive update's
position. Existing Model, Command, Service and registration validators remain
in use.

## Consumers

The canonical split-file consumer is
`packages/foldkit/declaration-tests/update-composition/`. It uses only public
Foldkit imports and native Composition methods. An extracted parent handler
invokes a child InMessage operation. A reusable bundle counts dispatches and
persists changed documents through a Command requiring a Service. Scoped
Stories cover local edits, accepted remote data, child edits, completion, and
acquired direct/curried update calls.

The Todo app uses `makeUpdate.except` and `compose` to describe persistence once
instead of returning the same Command from six handlers. Its save completion is
excluded. Other ordinary records remain ordinary records.

## November 3 whole-preview comparison with actual main

The [InMessage checkpoint report](rendering-inmessage-20261103/README.md)
records a new frozen 32-sample batch after the unchanged-child identity repair
and canonical InMessage update migration. Main and candidate medians are
802.0 / 638.7 ms for the naive workload (−20.4%) and 235.4 / 265.2 ms for the
optimized workload (+12.7%). Gzip increases by 31,744 and 32,283 bytes. All
preflights and counters pass, and the optimized candidate is slower in all eight
paired rounds. The report retains exact artifacts and limitations. It does not
establish a general naive speedup or isolate a regression cause.

## November 2 whole-preview comparison with actual main

This section retains the frozen November 2 benchmark checkpoint. The later
unchanged-child identity repair and canonical InMessage update migration alter
runtime source and are not measured by this batch. Final API release preparation
requires a new frozen candidate comparison; the original samples and artifact
claims below retain their checkpoint scope.

A fresh Lustre benchmark batch compared the current candidate source tree with
actual main, `a471adb24d750ab9e8d8312edad53ff6f26d961b`. The candidate has base
HEAD `da6e55193beb693b5400c9f95777d7c9fb41f257` and final selected
source/config digest `fc0a9ca18c3a152309aaccea91d39ca685073accd63c670d2c2921c6c7d6e0d2`.
At the benchmark checkpoint, only two selected files differed from the scratch
build snapshot, both test fixtures. Its 700 core and 24 plugin emitted
JavaScript/declaration files matched the live artifacts at that checkpoint.
Subsequent declaration-validator repairs and type-only name exports changed
four core declaration files. All 350 emitted core JavaScript files remain
byte-identical. The later UI portal and Menu fixes are outside this benchmark's
dependencies. The full source freeze receipt, build
logs, hashes, adapter, slot artifacts, preflights and raw timing output are
under `/private/tmp/foldkit-update-composition-rendering-20261102/`.

| Variant   | Actual main median | Current candidate median | Change | Bundle gzip change |
| --------- | -----------------: | -----------------------: | -----: | -----------------: |
| Naive     |           615.8 ms |                 447.8 ms | −27.3% | +31,735 B / +28.9% |
| Optimized |           197.2 ms |                 243.6 ms | +23.5% | +32,307 B / +29.2% |

The batch retained all 32 samples across eight cyclically rotated rounds, with
100 items. All four slots passed the unchanged browser functional verifier;
each timed run passed page-error and cross-origin-isolation checks. Reported
sample counters were 400 synchronous events and 400 animation-frame callbacks
per slot, with zero timeout, microtask or Promise callbacks. Sample ranges were
260.7–753.1 ms (main naive), 229.4–643.9 ms (candidate naive), 108.7–234.4 ms
(main optimized), and 116.0–291.1 ms (candidate optimized). The wide dispersion,
especially in the naive slots, makes this one batch weak evidence for a general
runtime conclusion. A user-owned Neovim LSP process had been observed using
substantial CPU and memory earlier that evening; it was left untouched, and no
same-time whole-host utilization sample was captured.

The current naive and optimized Todo `Model` and Message Schemas match main;
their update-handler bodies and both view bodies match exactly. The optimized
view keeps the same `createLazy` and `createKeyedLazy` paths, and both branches
use identical benchmark HTML, Vite configuration, selectors and driver. The
section hashes, 11 Message tags, handler equality and lazy call counts are
recorded in `workload-parity-final.json` in the evidence directory. The
candidate uses scratch-only adapters for the current `makeDefinition` and
`makeBlock` API; the exact two-file diff is
`/private/tmp/foldkit-update-composition-rendering-20261102/adapter-current-api.patch`
(SHA-256 `fbc4219c792c65e146d9271b42d3329b98e675c146eebc9dc180b579236c165c`).
The app workload and markup passed functional verification, but
the measurements include the whole current framework branch and do not isolate
composable updates or any other individual change.

These measurements are a distinct current-source versus main batch. The earlier
preview measurements in
`internal/layered-constructor/rendering-final/REPORT.md` remain separate: its
`be0` to `e6` batch measured +1.7% naive and −4.4% optimized, while the earlier
`db692` whole-preview versus main batch measured +21.6% naive and +25.8%
optimized. Cross-batch totals do not isolate the cause of the different results
and must not be subtracted to estimate individual feature costs. This fresh
batch began after the local package snapshot completed; no build, test or
browser gate overlapped the samples.

The two scratch workspaces used one cached Effect 4.1.0 runtime and matched
Vite 8.3.5, TypeScript 7.1 beta, Playwright 1.63.0, benchmark Vitest 4.1.12
and core Vitest 5.0.3 dependencies. The archived main workspace contained stale
links to unavailable Vitest 4.1.11 and 5.0.2 directories, so its scratch-only
links were redirected to those same cached versions; neither source lockfile
was changed. This is a matched cached-toolchain comparison, not two fresh
installs from the branches' lockfiles.

## Verification

Run:

```sh
node internal/update-composition/verify.ts
node internal/update-composition/types/verify.mjs
```

The native type probes cover inference, exact channels, rejected combinations,
source-free relocated declarations and copied declaration mutations. The small
`types/authoring.ts` helper derives the actual Composition's makeUpdate type;
it no longer declares a parallel authoring surface. `prototype.ts` is a native
method projection retained for the earlier experiment files.

The [conditional and repeated-part review](alternatives-review.md) records six
candidate typing defects found during independent review, their rejection
controls, and the accepted conditional and repeated focused forms. The repair
preserves every emitted JavaScript file.

Final integration, compiler, packed-consumer and security results are recorded
in the verification receipts and the current preview review checklist. Earlier
receipts keep their own source scope. Publication remains held.

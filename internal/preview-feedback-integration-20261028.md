# October 28 preview feedback integration

The [subsequent approved follow-up](step-inference-unhover-20261029.md) integrates
Scene.unhover and Model-aware general Step inference. This report retains the
original integration pin and dispositions below.

## Scope and release boundary

This work follows the [October 28 feedback refresh](preview-feedback-20261028.md)
and starts at `b75b14110d6ad3fc51c548c5d6c938dad2dc5016` on
`codex/workspace-example`. It integrates relevant Blocks/Layers reports and
contributions without changing the published Ready snapshot,
`f3be22cfeefed437164ad614d08b16d9000e0703`.

No release was published, branch merged, public reply posted or push performed.
Publication remains subject to the user's approval. Contributor PRs have not
been closed or marked merged by this local integration.

## Feedback dispositions

| Report or contribution                                                                                                       | Disposition                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#1844](https://github.com/foldkit/foldkit/issues/1844), large Root TS2589                                                   | Adopted indexed Commands-evidence extraction with the index-only fallback. The pinned 50-form reproduction fails before and passes after. It initializes all 50 forms and returns four Commands for its Action0 probe. No Command Effects were executed by that smoke check.                                                         |
| [#1834](https://github.com/foldkit/foldkit/pull/1834), contextual update records                                             | Adopted whole-record inference with per-handler validation. Direct Binding operations and Steps can mix with callbacks; direct and curried context dispatch remain checked.                                                                                                                                                          |
| [#1837](https://github.com/foldkit/foldkit/pull/1837) and [#1832](https://github.com/foldkit/foldkit/pull/1832), SSR reloads | Integrated module-runner loading, coherent Definition/declaration reevaluation, and entry HMR disposal. Tested actual split-file registrations and a scoped ManagedRuntime finalizer, overlapping and coalesced edits, lazy imports, and disabled HMR.                                                                               |
| [#1833](https://github.com/foldkit/foldkit/pull/1833), Scene Mount identity                                                  | Adopted renderer child matching and element identity. Tested keyed replacements/reorders, ancestor replacements, lazy views, shared VNodes, added/dropped markers, and hidden invocation identity.                                                                                                                                   |
| [#1835](https://github.com/foldkit/foldkit/issues/1835), Runtime cleanup leak                                                | Added element-owned cleanup so removing a retained element releases its original Mount even after `OnMount` was dropped. A normal patch does not release it early.                                                                                                                                                                   |
| [#1838](https://github.com/foldkit/foldkit/pull/1838), Subscription gates/activity                                           | Added entry-owned `when` and explicit Scene activity assertions. Preserved inactive queued-event delivery, parent/child gating, keep-alive dependencies, constructor errors, Services and Layer identity.                                                                                                                            |
| [New inferred-`any` report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6474438019)                            | Not reproduced in bounded published/current tests of mixed plain results, conditional Commands and OutMessages, with and without context, on TS6/TS7. Added accepted, rejected and relocated-consumer coverage. This is not a claim that the reporter's application cannot reproduce it; a complete failing consumer remains needed. |
| [#1823](https://github.com/foldkit/foldkit/pull/1823), Scene.unhover                                                         | Assessed separately as a testing convenience, not needed to repair the confirmed lifecycle reports in this pass. Not implemented or claimed fixed.                                                                                                                                                                                   |

Tanner Scadden's PRs supplied the contextual-update, SSR, Scene and Subscription
work; kattsushi supplied the pinned large-Root reproduction and evidence
extraction candidate. The integration includes independent source review and
local verification rather than relying on contributor-reported results alone.

## Public behavior and migration

- Contextual update records accept compatible Steps directly. Keep adapters
  that derive inputs or map payloads. The record-only API and exact per-Message
  contracts remain intact.
- Subscription `when` is optional and describes Model eligibility. A closed
  gate skips dependency projection and interrupts the Stream. Handler
  constructors still run at Runtime startup and retain their requirements and
  errors. Scene activity assertions do not prove a Stream is emitting.
- Scene now starts a Mount only when its element is inserted and ends it only
  when that element is removed or replaced. Changing or dropping `OnMount` on
  a patched element does not replace its running Mount. Corrected affected
  Pixel Art, Dialog and Workspace test assumptions without changing their
  views. A Dialog opened on a retained element still acquires through its
  ShowDialog Command; the initial Mount serves initially visible dialogs.
- SSR development cleanup requires HMR disposal registration. Disabled HMR
  does not promise disposal. The request latch has a one-second fallback if
  an update never reaches the runner; it does not guarantee a fully settled
  graph after that fallback.

Adopted Model-only gates in Stopwatch, Workspace activity, DragAndDrop
keep-alive auto-scroll and the counter guide. The broader adoption audit
retains data-bearing Option dependencies, socket/resource availability checks
and complex restart policies. Other supported Stream-local gates were not
mechanically rewritten. That audit is retained with the Subscription evidence.

Updated active Website guides/snippets, scaffold guidance, skills and
changesets. Historical reports, published announcements and the Ready snapshot
remain unchanged. Copyable SSR cleanup uses the current completed-Block API.

## Verification

- Core: 3,918 tests pass, one existing skip. UI: 1,336 tests pass. Workspace:
  154 tests pass. Stopwatch and Pixel Art suites pass.
- SSR plugin: 106 tests pass, two skips across the focused integration suites;
  the final resource-fixture adjustment separately passes both plugin forms.
- Core and affected Workspace, Stopwatch, Pixel Art, Website and Typing Game
  typechecks pass. Source and relocated emitted-declaration acceptance/rejection,
  native completion and inferred-configuration documentation checks pass.
- Website client and SSR production builds pass, including a preview-enabled
  local review configuration. Desktop checks cover four guides and five changed
  sections, including expanded counter/cleanup snippets. All 51 snippet
  registrations resolve; copy-control payloads match source, with no overflow
  or browser errors. These are local review artifacts, not a verified public
  deployment. Earlier dev SSR attempts hit a native Rolldown parser error;
  built-output checks do not establish that the dev-server failure is fixed.
  A bounded control in fresh processes reproduces the same native parser error
  through both `ssrLoadModule` and the environment runner, before the entry
  loads. The runner change is not necessary for the failure. Because this
  control keeps current source/generated API data/dependencies, it does not
  prove that the failure predates all candidate changes. The control uses
  middleware/test mode and records a sandbox WebSocket warning, so it does
  not substitute for a healthy normal development-server run. Keep this as an
  open triage item; production success does not close it.
- All public packages build. Strict packed SSR consumers pass with both Effect
  4.0.0/platform-browser 4.0.0 and Effect 4.0.6/platform-browser 4.0.6, including
  public types, hydration/refusal checks and a single Effect runtime.
- Broad and application lint pass, as does Effect lint on all 55 owned
  TypeScript files. The initial five fixture/import findings were repaired.
- The large-Root evidence mutation control passes before/after and confirms
  that dropping the index-only fallback loses an existing evidence contract.
  The simpler reported `any` shapes retain exact outputs and reject assignment
  of their update functions to string.
- A preservation integration test manually drives serialization callbacks.
  Its real debounce could race those calls under load. A finite one-hour test
  delay preserves scoped scheduling/cancellation without firing during manual
  probes. Runtime scheduling behavior was not changed.

## Performance decision

### Native editor comparison

Three repeated pairs per workload used the same isolated consumer paths,
source, compiler, driver and third-party dependencies. Only copied core/UI
package outputs varied between b75 and the candidate. Pair order was before /
after, after / before, before / after. Each process started fresh servers;
requests used incremental in-memory edits and validated their results. Builds,
tests and browser timings were idle. The larger consumer is the retained
16-group/16-map-Binding fixture, not a claim about a universal application size.

Medians in milliseconds:

| Operation                                   | Workspace before | Workspace after | 16 groups before | 16 groups after |
| ------------------------------------------- | ---------------: | --------------: | ---------------: | --------------: |
| First Binding hover                         |            484.6 |           442.4 |             96.1 |           134.1 |
| Post-edit Binding hover                     |            331.7 |           285.7 |             78.0 |            67.1 |
| First Binding completion                    |            508.2 |           452.6 |            123.4 |            97.9 |
| Post-edit Binding completion                |            289.4 |           306.6 |             53.4 |            68.0 |
| First completed-Block member completion     |            219.7 |           230.7 |            150.6 |           101.5 |
| Post-edit completed-Block member completion |             84.7 |            68.7 |             22.8 |            30.1 |
| Initial clean diagnostics                   |            381.3 |           404.0 |          1,964.3 |         2,056.1 |
| Error appearance                            |            245.7 |           210.8 |          1,922.1 |         1,901.1 |
| Error clearing                              |            208.8 |           211.5 |          1,887.1 |         1,909.8 |

Peak sampled RSS across the three runs ranged from 420–443 MiB before and
422–447 MiB after for Workspace; 443–511 MiB before and 441–545 MiB after for
16 groups. Every expected hover, completion member, clean diagnostic set,
introduced title error and clearing response validated. Workload hashes are
stable within each variant. The native server reports TypeScript 7.1.0-beta;
this is not a new tsrs comparison.

Results are mixed but practically comparable in this bounded screen. Some
operations improve; others are slower. It does not establish statistical
equivalence or responsiveness for arbitrary larger graphs. The approximately 1.9-second large-root diagnostics remain a
limitation. These numbers compare the new feedback integration with b75, not
with main or the state before the original performance work.

### Compiler counters

The original seven fixtures, source widths, compiler and budgets were measured
before any ceiling revision. Five pass unchanged. The only failures are the
wide-Subscription fixture's 548,740 instantiations / 24,583 types against
548,398 / 24,566, and the eight-group fixture's 299,721 types against 280,523.
Its 4,371,356 instantiations remain within the existing 4,515,010 ceiling.

The Subscription-only control adds 342 instantiations and 17 types to its wide
fixture, with no increase in either Workspace fixture. The whole-record
contextual inference change accounts for the other counter shift. Two private
encoding alternatives did not improve counts. A control adding unused helper
declarations while retaining the old broken signature reproduced the increase;
these counters include declaration discovery and are not editor timings.

The Machine fixture now passes at 71,432 instantiations / 13,728 types, within
its unchanged 83,700 / 18,800 ceilings. The former broad-barrel failure remains
recorded in the earlier alias report; it is not being hidden by a larger limit.

Independent evidence review approved three exact revisions: wide-Subscription
instantiations to 548,740 and types to 24,583, and eight-group types to 299,721.
The first two increase less than 0.1%; the last increases 6.84%. Every other
ceiling, fixture, width and compiler stays unchanged. This accepts a measured
compiler-cost tradeoff for verified authoring/evidence fixes and an additive
lifecycle API; it does not treat budgets as the only performance evidence.

The final gate passes all seven fixtures with these reviewed ceilings. No
fixture source, width, compiler or other ceiling changed.

### Production rendering comparison

Four rotating rounds retained all 16 samples against b75. Both sides used the
same unchanged Lustre benchmark source, pinned instrumentation/driver, build
settings, third-party packages and Vite plugin. Each imported its own copied
built core/UI packages, and the candidate outputs matched the final shared
build trees. Timing ran after the native benchmark and while builds/tests were
idle. Node 26.13.0, Vite 8.3.5 and Effect 4.0.0 matched; Chrome was 156.0.8078.73.

| Workload  | b75 median | Candidate median | Change |
| --------- | ---------: | ---------------: | -----: |
| Naive     |   532.3 ms |         523.6 ms |  −1.6% |
| Optimized |   235.2 ms |         238.0 ms |  +1.2% |

Round ranges were 344.1–549.0 / 444.0–541.0 ms for naive before/after, and
216.2–261.2 / 228.2–248.9 ms for optimized before/after. Differences between
medians are smaller than variation between rounds. All samples validated final
DOM and 400 synchronous / 400 animation-frame events, with no page errors.
This screen shows no material incremental renderer regression; it is not a
precise estimate of a percent-level speed change. It does not replace the
older main/published-preview comparison or remove its disclosed runtime gap.

Independent reviews of source safety, runtime/lifecycles and the exact compiler
ceiling decision passed. Review of the exact committed diff is required before
a push; its SHA and result belong in the local verification evidence.

## Evidence

Raw GitHub responses and pinned contribution heads:
`/private/tmp/foldkit-preview-feedback-20261028`.

Implementation, emitted consumers, compiler controls, full test logs, packed
SSR consumers and paired measurements:
`/private/tmp/foldkit-preview-feedback-implementation-20261028`.

Independent type-encoding controls and runtime source review:
`/private/tmp/foldkit-context-encoding-review-20261028`.

These are local evidence paths, not published experiment packs. The feedback
refresh is an activity inventory; this report records the later integration.

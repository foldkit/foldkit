# Feedback refresh, November 3

Checked GitHub read-only through **2026-11-03 04:32 UTC** against candidate
`4619df2f5b797e1803716c5367d5f72e6fd5052c`. Read the current issue bodies and
comments for #1874–#1876, PR #1877 and PR #1655's conversation, inline review
comments and submitted reviews. Also checked the latest repository updates,
#1511, #1857–#1858, PRs #1860 and #1864, and the status of #1871–#1872. No
external changes were made.

## Requested feedback

- [#1874](https://github.com/foldkit/foldkit/issues/1874) has no replies after
  its November 2 report. The candidate's
  [React host snippet](../../packages/website/src/snippet/embeddingReactHost.tsx)
  uses `useId()` for the rendered container and passes that same element to
  `Runtime.embed`; the active [Embedding guide](../../packages/website/src/page/core/embedding.md)
  states the unique-ID requirement. This report is addressed.
- [#1875](https://github.com/foldkit/foldkit/issues/1875) has no new replies.
  [PR #1877](https://github.com/foldkit/foldkit/pull/1877) has one latest
  contributor comment, [posted November 2](https://github.com/foldkit/foldkit/pull/1877#issuecomment-6587816307),
  and no submitted reviews or inline review comments. Both package copies of
  `relayLiveness.ts` compare PID and network namespace identities; an identified
  different network namespace is `Unreachable` and is not retired by either
  registry. The Linux-only registry tests use `skipIf(platform !== 'linux')`;
  the candidate CI runs on `ubuntu-latest` and includes tests for both affected
  packages. PR #1877's passing CI log shows `relayRegistry.test.ts` 21/21 and
  `mcpRelay.test.ts` 37 tests with 2 other skips, so those Linux-only cases ran.
  This is branch-logic and registry coverage, not an actual `unshare`/Docker
  namespace test in CI; those end-to-end cases remain contributor-reported.
- The uncovered relay edge is fixed in this candidate. When a record has
  namespace metadata but the reader cannot inspect its own namespaces,
  `checkRelay` returns `Unreachable` without probing the port; a refusal cannot
  prove the relay is gone when the network namespace relationship is unknown.
  Regressions cover both package copies, and the DevTools MCP registry test
  verifies the record remains on disk. The legacy record without namespace
  metadata still follows the existing PID/port behavior. The PR's separate
  real-namespace packed run remains contributor-reported; candidate tests use
  unavailable namespace data and a refusing port.
- [#1876](https://github.com/foldkit/foldkit/issues/1876) has no replies.
  The candidate uses Vite's environment-aware `hotUpdate` and returns the empty
  module list only for the client environment in
  [`index.ts`](../../packages/vite-plugin-foldkit/src/index.ts#L1230). The
  candidate report records all 72 affected plugin tests passing. Addressed.

## Other relevant updates

- PR #1655 has two new comments since October 30: [Artile's Work Orders
  comparison](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6512266466)
  and [Austeane's Binding allocation report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6532535076).
  There are no newer inline review comments or submitted reviews. The first is
  an alternative class-and-Layer API comparison, not a defect in this
  candidate. The second reports module-load cost from compiling child Model
  checks while making Bindings on the published preview. In the candidate,
  `Schema.is` and `Schema.toEquivalence` are inside the deferred initialization
  recipe in both
  [ordinary Binding](../../packages/foldkit/src/block/binding.ts#L1828) and
  [keyed Binding](../../packages/foldkit/src/block/keyedBinding.ts#L920), rather
  than running when a Binding is made. This addresses the reported
  module-scope cost; first initialization still pays the schema-check cost.
  No current-candidate 60-Binding startup benchmark is claimed. Keep the
  separate production-startup measurement in [#1857](https://github.com/foldkit/foldkit/issues/1857)
  open for that evidence.
- [#1511's November 1 reply](https://github.com/foldkit/foldkit/issues/1511#issuecomment-6561543868)
  adds a cache use case to the Back/Forward scroll report: update needs the
  traversal fact on the same URL-change dispatch so it can reuse page data
  before Subscriptions plan reads. The current `Scene.routing` path is an
  explicit test-delivery mechanism and does not report traversal or saved
  position. This is a separate, concrete runtime routing request, not fixed by
  the candidate's test helper. It has no approved deferral; keep it visible for
  an explicit scope decision rather than claiming routing completeness.
- The class-based alternative is still active: [#1858's November 1 design
  update](https://github.com/foldkit/foldkit/issues/1858#issuecomment-6555981100)
  and [PR #1860's November 1 review](https://github.com/foldkit/foldkit/pull/1860#pullrequestreview-5727434105)
  add a full inline/Layer authoring path and report model-wide reconcile costs,
  per-instance child gating, resource identity, and adapter/teaching concerns.
  The review also identifies a result-contract hole in that alternative's
  `.on/.onAll` at [#1858 comment 6550740516](https://github.com/foldkit/foldkit/issues/1858#issuecomment-6550740516).
  These findings apply to the alternative API, not this candidate's Definition /
  Composition contracts. Treat the alternative as a separate product decision;
  do not silently mix it into this release.
- [PR #1864](https://github.com/foldkit/foldkit/pull/1864) proposes additive
  `disposeAsync()` while retaining synchronous `dispose()`. The candidate
  instead implements the `Promise<void>` direction explicitly offered by
  [#1870](https://github.com/foldkit/foldkit/issues/1870): `dispose()` now
  returns the shared teardown Promise. This resolves #1870's race, but the
  newly active PR is a real compatibility/API-shape conflict to reconcile
  before integrating both changes. Neither path should be described as a new
  defect in the candidate.
- [#1871](https://github.com/foldkit/foldkit/issues/1871) and
  [#1872](https://github.com/foldkit/foldkit/issues/1872) remain open without
  new replies. External dispatch-frame support and a provided frame scheduler
  are relevant general host/testing capabilities. They are proposals, not
  reproduced regressions in the current candidate, and have not been approved
  for deferral. Keep them visible as separate scope questions.

## Coverage notes

The top 30 most recently updated repository issues/PRs were checked through
November 2; the newly active items relevant to this candidate are #1511,
#1858/#1860 and #1864 above. PR #1877's current checks are
[listed here](https://github.com/foldkit/foldkit/pull/1877/checks); the
passing `Lint, Typecheck & Test` log is
[run 41520489467](https://github.com/foldkit/foldkit/actions/runs/41520489467).
Earlier `final-feedback.md` text saying Linux execution was not established
should be updated to distinguish these passing Linux CI tests from the
contributor's separate real-namespace packed run, which CI does not repeat.

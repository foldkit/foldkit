# Constructor migration stabilization

This report records the pinned constructor checkpoint. The subsequent
[constructor and composable-update follow-up](../update-composition/REPORT.md)
implements the shared-update use case, restores ordinary host-handler
selection, and addresses the resulting security review findings. Its receipts
and the current preview checklist supersede the remaining-gate status below.

## Status

The construction and InMessage migration is committed at
`e6f141f35327b6cea47b08538b086b0bd45b19d3`. Dependency repairs and the
incremental rendering comparison are committed at
`d1537d453e09b8972cc0b73819e80e08830fdd22`. Both commits passed independent
review. Work is isolated; no external branch was pushed and publication is held.

The three feedback fixes are committed at
`db69206779b4e4c37d9cefe02acb21ca3d2e9ed3`. Independent review of that exact
26-file commit found no substantive findings.

Actual main `a471adb24d750ab9e8d8312edad53ff6f26d961b` is an ancestor of the
candidate. The November 2 GitHub refresh found no additional main commits.

## New feedback

| Report                                                                                    | Candidate behavior                                                                                                                                                                                                        | Verification                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Dialog self-close notification, #1867](https://github.com/foldkit/foldkit/issues/1867)   | An open Dialog emits `Closed` when native showing or resource acquisition fails, or when it unmounts. Already-closed and leaving Models do not duplicate it. Existing cleanup and `CompletedClose` behavior is preserved. | The regression failed before the fix. All 60 Dialog Story tests pass, including three real parent-fold cases.                                                                                                        |
| [Repeated stream Mount results, #1869](https://github.com/foldkit/foldkit/issues/1869)    | `Scene.Mount.resolve` handles the first result. `Scene.Mount.emit` supplies later declared Messages while that stream remains mounted. Source, occurrence, args, and ordinary pending-effect boundaries remain enforced.  | Eleven focused tests, public source and strict relocated declarations, a built-package smoke test, and eight deliberately failing controls pass.                                                                     |
| [Awaitable embed disposal, #1870](https://github.com/foldkit/foldkit/issues/1870)         | `dispose()` immediately disables the handle and returns one Promise for completed teardown. Await it before a different Program reuses the container. Same-Program sequencing remains automatic.                          | Focused runtime suites pass. The regression waits for an asynchronous finalizer and checks both repeated calls and reentrant disposal.                                                                               |
| [Same-dispatch post-update policy, #1868](https://github.com/foldkit/foldkit/issues/1868) | No shipping API. The prototype preserved the basic runtime behavior but rejected valid inline producers.                                                                                                                  | [Archived investigation](after-update/README.md). Further typing work awaits the explicit approval request following automatic approval review's rejection. This is not an approved deferral or a completed feature. |

The post-update hook is the only new report in this table without a completed
shipping fix. The three completed fixes do not close or defer that request.
The earlier prerelease-lockfile report remains unreproduced without its original
inputs; the release task board records that limitation separately.

## Dependencies

The [dependency report](dependency-advisories/README.md) records the compatible
updates and the remaining two moderate workspace findings, glob and minimatch.
There are no critical or high findings in the refreshed workspace audit. The
ordinary packed MCP/scaffold installation reports zero production findings for
that installed graph. These are different scopes.

The dependency-updated baseline passed all 22 integration groups in
`adoption-checks/verification/final-RatWvL/results.json`, all 35 application test
scripts with 720 tests in `test-uefrao`, and the default Chromium packed SSR gate
in `packed-adoption/verification/security-20261102T184848Z/receipt.json`.
Those receipts predate the three feedback fixes above.

## Combined feedback-fix verification

`adoption-checks/verification/final-5z56yM/results.json` records all 22 integration
groups passing against the feedback-fix source. The suites contain 4,030 core
tests with one intentional skip, 1,354 UI tests, and 1,527 Website tests. Source,
emitted and strictly relocated consumers, InMessage controls, active snippets,
application source checks, and all seven unchanged compiler budgets pass. The
budget-file hash is
`4c992d726e54c3ad3fac257040878fd5343c2dc0636fc7918f754947634cc30f`.

All 35 existing application test scripts pass 720 tests in
`adoption-checks/verification/test-LfYpte/results.json`. The inventory includes
38 packages; SSG and Typing Game's shared/server packages have no test script.
No application source changed during that run.

The complete existing default Chromium packed gate passes again in
`packed-adoption/verification/security-20261102T193317Z/receipt.json`: strict
peers, four exact Effect/platform 4.1.0 floors, one physical Effect runtime,
public TypeScript consumers, npm workspace execution, development relay,
production SSR, hydration/refusal behavior, and cleanup. All seven distribution
trees stayed unchanged during the gate. Temporary consumers and tarballs were
removed, and port 5199 was free afterward. This is the default Chromium scope,
not a new three-browser run.

Normal and Effect lint, application lint, dead-code analysis, dependency-cycle
checks, script typechecking, scoped formatting, changeset policy, public UI
exports, and Effect prebundle checks pass. Website production build passes;
TypeDoc reports zero errors with 484 core and 21 UI documentation warnings.
The initial prerender attempt hit Chromium's macOS sandbox startup restriction.
The unchanged normal command passes with local browser access and indexes all
225 pages. Logs are retained at
`/private/tmp/foldkit-feedback-website-{build,prerender,prerender-network}.log`.

## Performance

The final frozen-source batch compares actual main with `db69206779` in the
unchanged workload. Median instrumented execution time is 529.8 → 644.1 ms for
naive rendering (+21.6%) and 203.7 → 256.3 ms for optimized rendering (+25.8%).
All 32 valid samples are retained. Candidate gzip sizes are 139,122 and 140,499
bytes, adding 40,092 and 40,762 bytes over main. This is the whole preview/main
comparison, including work predating this migration.

The [incremental comparison](rendering-final/REPORT.md) uses the unchanged Lustre
workload and compares the preceding preview source `be0cb381` with migration
`e6f141f3`. Median instrumented time is 1.7% higher for the naive workload and
4.4% lower for the optimized workload. The mixed paired samples do not establish
equivalence or a general speedup. Both bundles add about 7.9 KB gzip.

The earlier main/e6 batch measured 14.6% higher naive time and 32.6% higher
optimized time. Its results and all earlier samples are preserved. Different
absolute totals across batches do not establish the effect of the three
feedback fixes. No measured cost is an approved release tradeoff. Timing
receipts retain their exact source pins and are not relabeled.

## Remaining gates

- Resolve the pending approval for the bounded #1868 typing experiment.
- Obtain authorization for fresh Daybreak transfer of the final candidate and
  relevant history, then assess its report. No migration source has been sent.
- Review the measured performance and bundle costs and the two remaining
  tooling advisories.
- Obtain separate publication approval. The explicit post-main deferrals for
  #1662 and #1663 remain recorded in the release task board.

The [review summary](REVIEW-SUMMARY.md) lists the API and consumer changes.
[stabilization-verification.json](stabilization-verification.json) records the
source hashes and final verification scopes; rendering has its own receipt.

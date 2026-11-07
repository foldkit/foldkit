# Preview release review

The comparison is the last published preview,
`90746b32d2ca8bc0476de7a051ace396ca590ae0`. This document supersedes the
November 5 candidate summary. The authorized Daybreak review of frozen candidate
`50d8e5f375e27b68b80932cc4ca766578f696f6f` is complete. Publication remains
held. No release has been dispatched.

## Changes since the published preview

- Declare a concrete Block once with `Block.make`, author through its typed
  helpers and Composition, and export its implementation with `makeLayer`.
  Constructors acquire explicit Bindings; ordinary Layers provide child
  implementations. Builders remain usable inline, locally and in separate
  modules. Model ownership, pure updates and occurrence lifecycles are retained.
- InMessages have a separate exhaustive update. `defineInMessageUnion` validates
  `RequestedX` and `InformedOfX` at their declarations; generated methods are
  `requestX` and `informOfX`. Real positional or generic operations remain
  available. Focused updates can compose without losing Commands, OutMessages,
  registrations, requirements or the original dispatch Model.
- Block-managed Model and Message Codecs must be synchronous and service-free,
  including generated child envelopes. The former `codec` configuration is
  removed. Pure transformations, Option and Date remain supported; explicitly
  effectful APIs such as Commands retain Effect Schema capabilities.
- Parent-owned Binding constructors name required, optional, optional keyed,
  keyed-array, Record, HashMap, custom and whole-variant storage explicitly.
  `activeWhen` replaces the direct-field `presentWhen` gate while retaining its
  occurrence semantics. Initialization helpers now share `foldkit/binding`.
- Child initialization has less manual placement wiring, including passive
  creation requests and Model-produced `makeInitIfMissingStep` selections.
  Keyed OutMessage folds can be passed directly or returned by a key-dependent
  producer. Host-owned handler contracts retain exact provider requirements.
- Single and Multi Listbox factories accept runtime Value Schemas, plus a
  view-only Item Schema for object options. Actual selection Messages and
  OutMessages use those Codecs, so finite application options no longer need
  repeated decoding or validation in their parent handlers.
- Scoped Block-aware Story and Scene runners acquire the selected implementation
  graph. Stories use `messageIn` for a local Message handled in a bound child.
  Immutable Model observations replace outer mutable captures. Application
  tests use qualified Story/Scene namespaces and stay with their owning feature.
- Active examples, Website, Typing Game, scaffold templates, snippets and skills
  follow the same Block layout, explicit child barrels, field-based Binding
  names, operation names, Schema aliases, UI imports and readability rules.
  Rendering helpers receive the fields, derived values or child Models they use;
  primary views and cohesive composers retain their owning Model.
- Lifecycle and tooling fixes include current-boundary Scene Mount delivery,
  occurrence retirement and same-key reacquisition, late Node response-body
  cancellation, valid empty/changing Menu state, source-excluded pointer drop
  positions, Dialog terminal cleanup, Query Runtime lifetime coverage, SSR
  request isolation, relay validation and SSR development repairs.
- Main's Effect/platform 4.1 update and compatibility ranges are integrated.
  A small scoped-view Context cache removes measured repeated construction;
  whole-workload rendering and bundle costs require their own comparison.

The active [migration guide](../packages/website/src/page/previewMigration.md)
and [upgrade instructions](../packages/website/src/page/previewUpgrade.md)
describe the consumer changes. Published announcements and their dedicated
snippets retain their historical APIs.

## Application review

The user's feedback was audited across every active Foldkit app in this
repository. The reports identify changed files and deliberate exceptions:

- [Architecture and naming](application-architecture-audit-20261105.md)
- [Rendering inputs](application-view-input-audit-20261105.md)
- [Story, Scene and URL-policy tests](story-message-in-and-test-audit-20261105.md)

Workspace retains one authoritative domain snapshot in the parent, with editor
baselines/drafts and interaction state in children. Current display data enters
through view inputs and update Context; unnecessary reconciliation broadcasts
are removed. Domain queries, Route helpers, workflow modules and initialization
now express their concrete responsibilities. Meaningful URL, loading, failure,
stale-completion, conflict and optimistic-rollback checks remain.

Other fixes include exact Query Sync filter and Job Application pronoun contracts,
an explicit `All` filter value, clearer Pixel Art operations, Typing Game barrel
organization and narrower render helpers throughout the apps. Native Select
demos and the SSR parser-equivalence fixture remain intentional native controls.
Dynamic string choices and init operations that replace wrappers or add parent
Commands retain their corresponding existing APIs.

## Feedback refresh

The November 6 refresh checked #1655's conversation and review threads, recently
updated issues and pull requests, and the known incoming contribution heads.
No new preview-PR discussion appeared after the assessed October 30 report.
The early repeat search found no issues or pull requests updated on November 6
at that checkpoint. The later push refresh found updates on #1895 and #1890:
#1895 has the same report body and no comments, and #1890 retains the same
empty-patch head `2223f2aa9166bf69c28aa149705de49a5e5ec75f` with no new comments.
Neither adds an unaddressed report or patch. A post-Daybreak direct API refresh
found no issue, pull request, issue-comment or review-comment updates since
17:00 UTC on November 6. The preview discussion still has 19 timeline entries,
with its latest update on October 30, and no inline review threads.
Main remains `a471adb24d750ab9e8d8312edad53ff6f26d961b`; its content was
already synchronized before this review round.

The six contributions in #1886, #1888, #1889, #1890, #1891 and #1893 are
integrated. #1890's refreshed head has no new patch. #1892's conditional-parent
workflow uses the preview's existing `CompletedClose` signal after native
cleanup; the separate main-targeted `FailedOpen` proposal was not adopted.
The [feedback disposition](preview-feedback-integration-20261105.md) records
provenance and the combined repairs.

Keyed lifecycle inspection from #1895 has a canonical Block/Layer proof using
the selected acquired implementation. Independent review also found and repaired
a candidate-only produced-fold child Message contract hole. The repair retains
the authored local Message contract behind an acquired complete child, including
children with generated descendant deliveries.

Only #1662 and #1663 have explicit approval for post-main deferral. Separate
bookmarked API explorations are not counted as implemented or implicitly
approved deferrals.

## Verification checkpoint

Candidate `50d8e5f375` passed the ordinary pre-push hook and pull request
checks. [#1896](https://github.com/foldkit/foldkit/pull/1896) then passed both
protected merge-group workflows and merged into preview as
`253cf72ed47ead5ee5a46e2530e10dcbaa1283e7`. The merged tree matches the
Daybreak snapshot exactly. No protected check was bypassed.

The final combined rerun after the framework follow-ups passed:

- All 44 declared package/application test projects: 9,247 tests passed.
- Recursive workspace typechecks, combined lint and formatting passed. Core and
  UI were rebuilt in dependency order; every declared build passed at the
  preceding checkpoint.
- Website browser checks: 22 passed; Workspace browser checks: 33 passed.
- Core accepted/rejected/emitted/relocated declaration gate passed, including
  `messageIn`, optional keyed children and Program requirement cases.
- The final keyed-fold and canonical keyed-Scene fixtures emit and reject under
  TypeScript 6 and 7; both outputs pass all four cross-version relocated
  consumer combinations without checkout or source paths.
- After user approval, all eight compiler workloads pass a single-checker gate
  with tighter ceilings calibrated against the current and previously accepted
  declarations. Workload sources and acceptance/rejection contracts are unchanged;
  the CLI controls continue rejecting invalid budgets and exceeded ceilings.
  [Controlled evidence](compiler-checker-partitions-20261106.md) records the
  duplicate parallel work and separate calibration.
- Generated-project smoke passed. The final packed SSR consumer rerun passed,
  including Chromium, Firefox and WebKit refusal/hydration checks and cleanup.
- Script checks: 239 passed. Script types, dead-code analysis, public exports,
  Effect prebundle, changeset and skill checks passed.

An initial restricted test run could not bind local test ports; its failures
are not counted as application failures. The rerun with local server access
passed. A build/lint overlap temporarily hid generated declarations and produced
broad type warnings; stable all-root Effect lint and exact TypeScript 6/7
consumer probes show no Listbox error/requirement leakage. Final verification
will keep builds and declaration consumers sequential.

## Daybreak review

The [November 6 review](daybreak-20261106/README.md) completed with no
substantiated new security finding or release-blocking correctness defect.
The original report and its receipt are preserved. Independent post-review
verification checked all 8,878 tracked entries, Git blob identities, file modes
and the literal symlink target against candidate `50d8e5f375`.

The review required no source changes. Its development cleanup observation
is already covered by the documented full-process restart procedure when HMR
is disabled. Inherited DevTools, relay, bootstrap and dependency caveats remain
explicit. This static review does not substitute for behavioral tests or accept
the separate rendering and bundle costs.

## Remaining release checks

The source commit `9e2c0d309c070ba7a99b1669c3f69094c7ba2003` passed independent
exact-commit review. The final [32-sample rendering comparison](block-api-simplification/rendering-20261106/README.md)
is complete against actual main. No samples were discarded.

| Workload  | Main median | Candidate median |  Change |
| --------- | ----------: | ---------------: | ------: |
| Naive     |    637.1 ms |         672.8 ms |  +5.60% |
| Optimized |    207.2 ms |         269.4 ms | +30.02% |

The optimized candidate is slower in every paired round. Gzip JavaScript adds
45,201 bytes in the naive workload and 45,848 in the optimized workload. The
small scoped Context-cache improvement does not close or explain this larger
gap. These costs remain for release review; acceptance is not assumed.

- Review the rendering and bundle costs above before publication.
- Review the two assessed moderate build-tool advisories below before publication.
- Retain the separate user publication approval. The approved private-source
  review is complete; no release or deployment has been dispatched.

A fresh dependency audit still reports two moderate build-tool findings, glob
and minimatch, with no high or critical findings. Their constrained parent ranges
and concrete exposure are [assessed separately](layered-constructor/dependency-advisories/README.md).
No audit exclusion or incompatible override hides them. The DevTools overlay's
warning for opaque inspected values during development Model preservation is
inherited; failed persistence leaves its live Model unchanged.

## Additional Binding request

The user requested explicit storage relationship constructors after the reviewed
preparation snapshot. The [prototype report](binding-relationships-20261106/README.md)
records its consumer and source/emitted proofs. The user approved the API and
only the two measured Workspace instantiation/type ceiling revisions. All eight
unchanged workloads pass those approved limits. Repository-wide adoption and
source/emitted/runtime verification pass on `codex/explicit-binding-adoption-20261106`.
The [new frozen rendering comparison](binding-relationships-20261106/rendering/README.md)
is complete. All 32 samples, four functional preflights and analysis mutation
controls pass. Its naive medians are 637.0 ms main and 596.0 ms candidate
(−6.44%); optimized medians are 230.9 ms and 370.1 ms (+60.29%). The wide
ranges, including one faster optimized candidate round, preclude treating these
percentages as stable performance estimates or attributing the change to the
Binding API. The optimized workload remains a release-review concern. Whole-
candidate JavaScript adds 47,673/48,331 gzip bytes. Earlier evidence above remains
unchanged. Package push gates and exact-commit review remain pending.

This work does not inherit the prior Daybreak verdict. Resolve its adoption
gate, complete migration and verification, then freeze and review the complete
candidate before requesting publication approval. Nothing in the preparation
PR or its successful merge authorizes publishing this prototype.

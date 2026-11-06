# Preview release review

The comparison is the last published preview,
`90746b32d2ca8bc0476de7a051ace396ca590ae0`. This document supersedes the
November 5 candidate summary. Publication and private Daybreak source transfer
remain held. No release has been dispatched.

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
The final repeat search found no issues or pull requests updated on November 6.
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

## Remaining release checks

- Independently review the exact resulting commit after the completed combined
  lint, formatting, declaration, runtime and consumer checks.
- Run the prepared fresh 32-sample rendering comparison against actual main.
- Resolve the remaining Machine compiler ceiling. Seven of eight unchanged
  workloads now pass, including both Workspace workloads after separating a
  compact private delivery contract from the constructed graph. Machine reports
  99,051 Instantiations and 22,486 Types against 83,700 and 18,800. Earlier
  [controlled evidence](compiler-checker-partitions-20261106.md) identifies
  TypeScript 7 checker-pool duplication in the former Workspace failure.
  Fixtures, canonical measurement options and budgets have not been altered.
- Obtain fresh Daybreak authorization for the exact final candidate and retain
  the separate publication approval.

A fresh dependency audit still reports two moderate build-tool findings, glob
and minimatch, with no high or critical findings. Their constrained parent ranges
and concrete exposure are [assessed separately](layered-constructor/dependency-advisories/README.md).
No audit exclusion or incompatible override hides them. The DevTools overlay's
warning for opaque inspected values during development Model preservation is
inherited; failed persistence leaves its live Model unchanged.

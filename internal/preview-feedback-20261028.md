# Preview feedback refresh, October 28

Checked GitHub on October 28, 2026, through 19:54 UTC, against local candidate
`b75b14110d6ad3fc51c548c5d6c938dad2dc5016`. The published preview remains
`f3be22cfeefed437164ad614d08b16d9000e0703`.

This pass discovers and prioritizes feedback. It does not reproduce the new
reports, approve contributor changes, or establish that they are fixed in the
candidate. No external comments, merges or publication were performed.

## New reports to verify first

1. [New migration reply on #1655](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6474438019)
   reports that a handler mixing a plain Model result with an OutMessage result
   can make the entire update infer as `any`. Reproduce on the current candidate
   and check the inferred update itself, Command requirements and OutMessage
   contracts in source and emitted declarations. Existing rejection of an
   explicitly `any` handler does not establish that this reported escape is
   covered. The report also repeats the mixed local/connected diagnostic issue
   and previously assessed API/documentation requests. Reconcile those with
   the [earlier dispositions](stabilization-feedback-20261027.md) before doing
   work twice. The current adjacent Schema type-alias guidance is newer than
   the published snapshot this reporter tested.
2. [#1844](https://github.com/foldkit/foldkit/issues/1844) supplies a standalone,
   generated 50-form Root composition that hits TS2589 on published declarations.
   The author reports that a candidate Commands-evidence extraction patch
   passes the same consumer, with a fallback needed for index-only shapes.
   Assess against the current optimized candidate, preserve evidence contracts,
   and use unchanged compiler fixtures. The report explicitly does not claim
   that 50 Blocks is a general limit or that its patch is a universal fix.

## Preview-specific contributions

All three PRs below target `codex/layers-and-submodels`; none of their submitted
changes is integrated into this local candidate. Their claimed test results
remain contributor evidence until reproduced during review.

- [#1834](https://github.com/foldkit/foldkit/pull/1834) fixes
  `makeUpdate.withContext` inference for records mixing direct Binding operations
  with callback handlers. The current candidate still uses the earlier mapped
  output inference. Review the per-handler validation and reported compiler
  costs before adopting it. It addresses a different reported failure from
  the new plain/OutMessage `any` escape; do not assume one fixes the other.
- [#1837](https://github.com/foldkit/foldkit/pull/1837) fixes duplicate Block
  declarations after an SSR development edit. The Definition module can retain
  old registrations when Vite reevaluates a separate Command, Mount,
  Subscription or ManagedResource module. Assess together with the overlapping
  [SSR disposal PR #1832](https://github.com/foldkit/foldkit/pull/1832), whose
  module-runner/HMR strategy differs. The local plugin still calls
  `server.ssrLoadModule`; neither proposal should be applied blindly over the
  other.
- [#1838](https://github.com/foldkit/foldkit/pull/1838) proposes entry-level
  Subscription `when` gates and Scene activity assertions. It explicitly keeps
  inactive Subscription delivery possible for queued events. The proposed diff
  raises two compiler fixture budgets, including a substantial type-count
  increase in a fixture with no Subscriptions. Assess the API, measured cost,
  budget changes and eligible consumer adoption before accepting the proposal.

## Related correctness and testing assessments

- [#1833](https://github.com/foldkit/foldkit/pull/1833) changes Scene Mount
  lifetime tracking to use renderer element identity. It targets main, but its
  author identifies the same gap on the preview branch. Review its shared
  renderer refactor and runtime/Scene parity before treating current Scene
  lifecycle coverage as sufficient.
- [#1835](https://github.com/foldkit/foldkit/issues/1835) reports a Runtime Mount
  leak after an element drops `OnMount` and is later removed. This is distinct
  from #1833, which does not fix the Runtime leak. It is reported against main;
  applicability and release significance need verification, not an assumption
  that the preview introduced it.
- [#1823](https://github.com/foldkit/foldkit/pull/1823) adds `Scene.unhover`.
  It is a testing convenience candidate, separate from the correctness reports.

General UI feature proposals, including keyed HoverIntent #1842 despite its
preview base, do not automatically enter the Blocks/Layers stabilization scope.
Canvas, pointer/caret APIs, DragAndDrop enhancements and general runtime
optimization proposals are not newly accepted release requirements in this
refresh. Their presence does not authorize a new deferral of existing work.

## Coverage

Read the 100 most recently updated issues/PRs and 100 most recently updated PRs,
covering activity back through October 25 and October 21 respectively. Read all
50 repository conversation comments updated since October 26 and all inline
review comments for that period, of which there were none. Read submitted
reviews for #1655 and the relevant contribution PRs; none were present. Read
the file inventories for #1834, #1838 and #1833, the focused #1834 authoring and
#1838 budget diffs, and the affected local authoring, Subscription, Scene and
SSR code. Full contribution reviews remain pending.

#1655 has two new replies today: the `any` report and the pointer to #1844.
The earlier five-consumer SSG report is already covered by the #1811/#1814
reconciliation. The original [performance help issue #1737](https://github.com/foldkit/foldkit/issues/1737)
remains closed with ten comments and no reply since October 23.

Raw API responses, exact contribution heads and the read summary are retained
under `/private/tmp/foldkit-preview-feedback-20261028`. This is an incremental
refresh of the earlier feedback inventory, not a new exhaustive historical
review or a release approval.

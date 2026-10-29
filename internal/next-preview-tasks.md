# Next preview tasks

## Release boundary

The verified published snapshot is
`f3be22cfeefed437164ad614d08b16d9000e0703`, with source tree
`17ef995528c447cd13604ffcd390a63d73ec6953`. Its nine-package manifest,
immutable Website and actual Coverchart upgrade pass the
[publication report's gates](preview-publication-20261026.md).

Preview integration remains on `codex/layers-and-submodels`; Foldkit `main`
was not changed by this release. The preparation sections below retain their
original status, source pins and publication holds as historical evidence.

## Current Blocks + Effect Layers release scope

- [x] Reassess Model-aware general `makeStep` Message inference against the
      current optimized implementation. Verify ordinary/contextual records,
      source and relocated declarations, exact channels and registration,
      compiler costs and paired editor workflows before adoption. Adopt the
      protected Context hint with shared tag extraction; seven current compiler
      ceilings, source/emitted checks and paired editor workflows pass.
      [Follow-up evidence](step-inference-unhover-20261029.md).
- [x] Integrate contributor PR #1823's `Scene.unhover`, adapt it to the preview
      and verify handler priority, fallback, scoped interaction and public usage.
      Update active testing guidance and release notes. The 786-test Scene suite
      and fallback mutation pass. [Follow-up evidence](step-inference-unhover-20261029.md).

The user explicitly deferred #1662 (typed OutMessage propagation) and #1663
(derived/default view slots and stronger collision validation) until after
Blocks + Effect Layers merges to main. Keep existing explicit forwarding and
slot identities with runtime collision checks for this preview.

These follow-ups change the previously frozen source. The broader Daybreak
review and full installed-app rehearsal below retain their exact `564adb49e9`
pin. The affected final verification now covers `d35d3ceb7a`:

- [x] Complete the explicitly approved Daybreak addendum for the exact follow-up.
      PASS; all 7,191 source hashes match before and after review.
- [x] Rebuild and pack all nine packages from the frozen follow-up, verify
      artifact hashes and representative consumer types, and match the final
      core's public files to the tarball used by the external type fixtures.
      This is local preparation, not public registry or deployment acceptance.
      [Final scope and receipts](preview-followup-final-20261029.md).

- [x] Assess the October 28 Blocks/Layers feedback and integrate verified fixes
      for #1844, #1834, #1837/#1832, #1833/#1835 and #1838. Keep the mixed-result
      inferred-`any` report explicitly unconfirmed: bounded published/current
      probes retain exact types; a complete failing consumer is still needed.
      Record compiler-cost decisions and paired editor/rendering evidence rather
      than inheriting contributor budgets or claiming every proposal shipped.
      [Integration and remaining limits](preview-feedback-integration-20261028.md).

- [x] Complete bounded triage of the mixed-result inferred-`any` report. No
      runnable consumer was supplied and reconstructed published/current TS6/TS7
      probes retain exact types. Add source/emitted coverage for the separate,
      verified canonical-local-Step boundary. The original `any` claim stays
      unconfirmed and visible for follow-up; do not announce it as fixed.
      [Disposition and limits](preview-final-prep-20261028.md#feedback-disposition).

- [x] Repair and verify the Website development SSR native-parser failure.
      The Playground declaration collector traversed dependency directories and
      symlink cycles; collect package-owned files and load editor types lazily.
      Normal development HTTP and browser hydration now pass, with the existing
      rich-snapshot preservation recovery warning disclosed.
      [Repair and checks](preview-final-prep-20261028.md#website-development-ssr).

- [x] Freeze reviewed source `564adb49e9` and refresh all nine local packages,
      installed Coverchart, SPA/SSG/SSR scaffolds, Website tests/builds and
      artifact/source provenance. The final rehearsal passes 54 consumer tests
      and eight browser flows; actual Coverchart is preserved.
      [Final preparation and limits](preview-final-prep-20261028.md#frozen-candidate-and-final-gates).

- [x] Assess the fresh dependency audit's 30 entries and actual Monaco vendor
      code without claiming dependencies are patched. No additional current
      owned-entry-point blocker is demonstrated; downstream Undici transport
      risk and maintenance recommendations remain visible.
      [Dependency disposition](preview-dependency-disposition-20261028.md).

- [x] Complete fresh Daybreak review after the user's explicit source-transfer
      approval. Exact frozen source `564adb49e9` receives PASS; 7,181 file hashes
      match and no source changed. Preserve the original report and provenance
      correction, unresolved dependency findings and shared-network limits.
      [Review and execution records](preview-daybreak-20261028.md).

- [ ] Obtain the user's separate release approval before publication. Registry
      and immutable-deployment acceptance, actual Coverchart upgrade and PR Ready
      promotion follow that approval. The verified published snapshot remains
      unchanged. [Prepared candidate](preview-final-prep-20261028.md).

- [x] Widen published Effect peers to `4.0.0 || 4.0.6` and verify both versions
      through strict packed installs, public types, SSR and hydration. Check
      platform peer floors and one resolved Effect runtime; preserve exact
      development/application pins. Record the platform-shared constraint and
      retain the publication hold.
      [Compatibility evidence](effect-peer-compatibility-20261028.md).

- [x] Apply adjacent same-named decoded Schema aliases throughout active source,
      examples, Website, Typing Game, scaffolds, ordinary tests and guidance.
      Prefer the aliases in explicit value annotations while preserving Schema
      arguments, inferred callbacks, generic/recursive contracts and historical
      material. Verify source, emitted declarations, lint and compiler costs.
      [Adoption and verification](schema-type-alias-adoption-20261028.md).

- [x] Resolve the Machine compiler fixture's broad experimental-barrel cost.
      The October 28 evidence/inference integration reduces the final fixture to
      71,432 instantiations and 13,728 types, within the unchanged 83,700/18,800
      ceilings. The earlier alias-migration failure and its Query-barrel controls
      remain in the [historical diagnosis](schema-type-alias-adoption-20261028.md#open-compiler-performance-release-check);
      the [later integration](preview-feedback-integration-20261028.md) owns the
      passing result and its separate compiler-cost assessment.

- [x] Standardize generic UI Block factories as `makeBlock`: replace `create`
      on selection components and VirtualList, and replace `Toast.make`.
      Migrate public barrels, consumers, lint recognition, active guidance and
      preview upgrade notes. Preserve exact generic contracts, passive assembly,
      runtime behavior and historical material. Verify source/emitted consumers,
      focused runtime/lint suites and unchanged compiler ceilings.
      [Migration and verification](ui-block-factory-names-20261028.md).

- [x] #1821: Add explicit Scene URL-change delivery through optional Program-style
      routing configuration. Preserve pending-work and lifecycle bookkeeping;
      verify search through navigation, exact routing types and relocated
      declarations. Source, strict relocated/packed TS6/TS7 declarations, 936
      focused tests, unchanged compiler ceilings and mutation controls pass.
      Active guidance is updated; publication stays held.
      [API, contracts and verification](scene-navigation-1821-20261027.md).

- [x] Redesign Machine around one Schema-bound Definition, extracted guard/
      handler/table helpers, and checked completion. Prove the domains search
      and nested quote-request lifecycle, exact narrowing, Context and Command
      requirements in source and relocated declarations; migrate active
      consumers/guidance and retain pure execution and graph behavior.
      Source, strict relocated/packed declarations on TS6/TS7, 182 focused
      tests, unchanged six compiler fixtures, new Machine fixture, and
      independent source review pass. Publication stays held.
      [Design, consumer code and verification](machine-authoring-20261027.md).

- [x] Include Machine, Query/KeyedQuery and VirtualList in preview update
      documentation. Machine tests API consistency with Block authoring;
      Query and VirtualList are additional capabilities requested for
      `foldkit-domains`. The earlier VirtualList announcement exclusion is
      superseded. Preserve the published Ready snapshot and approval hold.
      [Release documentation scope](next-preview-release-handoff.md#current-release-documentation-scope-october-28).

- [x] Retain the October 27 inline Model-aware `makeStep` assessment and its
      failed eight-group compiler control as historical evidence. The user
      subsequently approved reassessment against the newer implementation;
      the current follow-up at the top of this board owns that work.
      [Earlier assessment](step-message-context-assessment-20261027.md).
- [x] Standardize reusable owner-local Steps shared by update, composition or
      init under `steps.ts` or `steps/<responsibility>.ts` with an explicit barrel.
      Preserve policy/registration ownership, deferred Binding access, contracts,
      historical content and existing compiler ceilings; update active guidance
      and verify the migrated applications before completion.
      [Adoption, exceptions and verification](shared-step-organization-20261027.md).

The next preview is a stabilization release. Expect one or two further previews
depending on feedback before considering the merge to main. Keep this cycle
focused on existing Block and Layer contracts, adoption, diagnostics and
regressions. General feature proposals do not automatically join its scope.

- [x] Verify the integrated, approved Block and Layer changes, including the
      Definition-owned map Binding API and mapped-child initialization helpers.
      Reconcile active migration guidance with the actual public surface.
      [Current stabilization evidence](preview-stabilization-final-20261027.md).
- [x] Close out feedback specifically about Blocks + Effect Layers using the
      existing implementation and assessment evidence. An open issue or PR is
      not evidence that its fix is missing. General UI, Query and broader plugin
      proposals are outside this release scope unless explicitly adopted below.
      The [October 27 reconciliation](stabilization-feedback-20261027.md)
      covers all preview reports, related contribution discussions and the latest
      plugin question. Diagnostic/performance limitations and unimplemented
      proposals remain explicit; this is not a claim that every request shipped.
- [x] Run integrated source and emitted-declaration checks, registration and
      lifecycle coverage, unchanged compiler fixtures and representative editor
      workflows. Check runtime performance for regressions in the release work.
      All 17 final integrated gates, 12 native sessions and 36 Lustre samples
      pass at93c. The earlier checker-order control retains its ae2 pin;
      final native/Lustre evidence is recorded separately. No material new
      regression versus published is established; the main runtime gap remains.
      The reviewed compiler-ceiling revision and remaining cold-root/runtime
      limits stay explicit in the report.
- [x] Prepare packed-package and Coverchart acceptance, matching Website and
      PR #1655 guidance, and final independent/Daybreak review. Keep publication
      held for the user's approval.
      All nine local artifacts, three scaffold modes, Coverchart and 33 Workspace
      browser cases pass. Independent source review and the exact Daybreak
      addendum pass; both Low input-boundary findings are closed. Registry and
      immutable deployment verification remain post-approval gates.
- [x] Assess new preview report #1810, found at the final 16:03 UTC refresh:
      diagnostic priority, paired local/connected and deferred-Step guidance,
      and the actual DevTools snapshot-preservation failure path. Paired examples
      and runtime-local invalidation/recovery are implemented. Missing-handler
      diagnostic priority remains a disclosed limitation. All affected final
      gates, nine-package acceptance and exact-source review pass at93c.
      Existing ae2 evidence remains a separate checkpoint.
- [x] Fix #1811: SSG preview must serve the generated About document at its
      declared `/about` path before hydration. Preserve directory-index output
      and Vite-owned serving, use its resolved client output, and cover raw HTML,
      JavaScript-disabled navigation and the generated link. Plugin350 tests,
      strengthened3-case browser suite, packed delta and independent/Daybreak
      reviews pass atf15. [Affected evidence](preview-stabilization-1811-20261027.md).

- [x] Reconcile contributor PR #1814 with #1811's preview fix. Adopt prerender-only
      activation and the stronger proxy/path/file protections, retain custom-host
      ownership and replace the overlapping SSR hook. All 366 plugin tests,
      33 preview cases, CLI checks, three SSG browser cases and packed-plugin
      generated-app checks pass. Mutation controls prove decoder and realpath
      regressions are caught. [Contribution and bounded evidence](ssg-preview-1814-reconciliation-20261027.md).

- [x] Add the optional general Step adapter `makeStep.fromMessage`, preserving
      inline Message inference and the existing interpreter. Both general Step
      forms reject invalid union branches. The two eligible consumers, lint,
      docs, scaffold and skills are updated. Source, strict relocated
      declarations, runtime/lint suites, all six unchanged compiler ceilings
      and three paired editor runs pass.
      [Adapter evidence](message-step-adapter-20261027.md).

## Before merging to main

- [ ] Review temporary preview documentation for the stable release. Retire or
      archive canary installation and preview-to-preview history, adapt the
      stable migration guide, and retain the permanent API/architecture guides.
      Preserve historical published material. This follows the remaining
      feedback previews and does not hold the current stabilization preview.

## Explicitly deferred until after merging to main

- [ ] [#1662](https://github.com/foldkit/foldkit/issues/1662): typed OutMessage
      propagation across Block boundaries. The user explicitly deferred this
      work until after Blocks + Effect Layers merges to main. Existing explicit
      fold/forward policies remain the preview contract.
- [ ] [#1663](https://github.com/foldkit/foldkit/issues/1663): derived/default view
      slots and stronger collision validation. The user explicitly deferred this
      work until after that merge. Keep explicit stable slots and mandatory
      runtime collision rejection.

## Followups after the published preview

- [x] Simplify Workspace's generic Listbox option type and replace its `satisfies`
      return check with an explicit `Listbox.ViewInputs` return type. Existing
      accepted/rejected type fixtures, affected Scenes, source checking and lint
      pass. The separate selection-contract investigation is tracked in the
      general backlog below.

- [x] Audit naming throughout Workspace production code and tests. Align Step
      suffixes, Listbox Binding names, Option selectors, booleans, revision values,
      projected versus confirmed data, repository results and test fixtures.
      Preserve established Foldkit contracts and interaction behavior. All 154 app
      tests, source checking, application lint, formatting and production build
      pass.

- [x] Narrow Workspace save, comment and move responses to their changed data.
      Keep confirmed Workspace data separate from a small, application-local
      pending-move projection; failure drops the projection instead of restoring
      an old snapshot. Initialize editable children from confirmed data. Preserve
      revision conflicts, comments, notifications, retained drafts and retry.
      All 154 app tests, source checking, application lint and production build
      pass. Projection and editor-baseline mutations fail their regression Stories;
      independent review has no remaining findings. Browser smoke verifies pending
      and acknowledged placement, commenting with a dirty draft, and saving.
      The helper supports one pending board move and remains replaceable by the
      proposed `foldkit/optimistic`; no public framework API is added.

- [x] Align Workspace feature folders with their completed Block names. Use full
      responsibility-based layouts for split Blocks, including separate init and
      assembly, and remove hybrid feature-named modules. Document the compact or
      fully split convention in scaffold `FOLDKIT.md` and repository guidance.
      Workspace typecheck, lint, all 152 tests, and production build pass.

- [x] Reassess `Definition.makeMapBinding` beyond the rejected shared-receiver
      encodings. Adopt a parent-specialized callable that also supports detached,
      imported feature helpers. Preserve the earlier failed experiments and
      compare practical editor latency and memory before deciding compiler-cost
      tradeoffs. [Final adoption and verification](map-binding-method-adoption-20261027.md).

- [x] Audit Workspace guards against their interaction sources. Simplify repeated
      membership, lookup, initialization, reconciliation and notification checks;
      preserve URL, loading, revision and rollback checks. Record the generic
      Listbox Schema limitation and retained boundary validation in the
      [guard audit](workspace-guard-audit.md).

- [x] Keep Workspace page Routes while issue panels are open. Store the selected
      issue in `?issue=...`, retain standalone `/issues/:id` links, remove nested
      return Routes and page-unwrapping selectors, and initialize children directly
      from the selected page and issue. Rename Model-aware URL helpers to
      `issueLinks.ts`. Preserve filters, history, reloads and retained editor state.

- [x] Simplify Workspace retained state: keep issue editors, Boards and project
      settings in ID-keyed records using map Bindings. Derive draft summaries
      from retained editors, remove the root draft mirror and reporting operations,
      and keep shared selectors in `selection.ts`. Preserve navigation retention,
      hidden saves, draft indicators, exit protection and optimistic moves.

- [x] Decode Workspace's issue return location through its URL query Schema.
      Store an optional typed page Route, select it through `routeForPageContent`,
      and preserve panel closing, list filters, reloads and existing URL forms.
      Add `Route.parsePathWithFallback` for relative-path parsing and document
      the boundary in the routing guide, scaffold and consumer skill.
      This followup targets the next preview; the published `f3be22cfeefe`
      snapshot and its immutable deployment are unchanged. The representation using
      nested return Routes introduced here is superseded by the page/panel factoring
      above.

## Additional preview features for foldkit-domains

- [x] Include the [VirtualList integration](#virtuallist-preview-integration)
      in preview update documentation: continuous history loading, external
      scroll ownership, semantic tables and positioned ordinary rows. Keep
      its purpose separate from Block and Layer migration requirements.

- [x] Document and verify experimental Query freshness, bounded KeyedQuery
      retention, per-key cancellation, pending-args inspection and opt-in
      accepted-completion OutMessages. The [quote-window migration sketch](keyed-query-capabilities-migration-20261028.md)
      replaces the app-owned quote cache and fetch state with one Query Model,
      while retaining parent-owned search planning, display and cooldown policy.
      Its one-minute deadline intentionally uses stale-while-revalidate. The
      [Query guide](../packages/website/src/page/core/query.md), public
      declaration fixtures and website typecheck/build cover the new surface.
      [Contracts, review checklist and verification](keyed-query-capabilities-20261028.md)
      include source/relocated/packed TS6/TS7 consumers, 76 Query tests and all
      seven unchanged compiler ceilings. The domains app remains a separate migration.

## General backlog outside the Blocks + Effect Layers release

- [x] Investigate selection-contract mismatches and open
      [#1809](https://github.com/foldkit/foldkit/issues/1809) with executed,
      strictly typechecked reproducers for Listbox, RadioGroup, Tabs and Menu,
      plus the Combobox Schema-based precedent. Assess native Select separately;
      it exposes plain strings without generic refinement. The issue separates
      string Value contract repair from non-string selection design. No framework
      API change or removal of boundary adapters is claimed. Implementing this
      general UI proposal is not a requirement for the Blocks + Layers preview.

## Publication completion, October 26

- [x] Publish and verify all nine registry packages from `f3be22cfeefe`.
- [x] Verify the matching immutable Website, guides, manifest and live SSR/SSG
      playgrounds.
- [x] Upgrade, verify, independently review, commit and push actual Coverchart.
- [x] Generate and review PR #1655's three consumer paths and exact prompts from
      the verified manifest. External posting/readback follows this evidence
      commit and is recorded separately.
- [x] Record security, performance, topology and feedback qualifications in the
      [publication report](preview-publication-20261026.md).

## Historical final approval preparation, October 26

- [x] Apply the two approved small wins from the new foldkit-plus report:
      reject duplicate `OnMount` attributes before handler acquisition and
      group existing Block customization options with a checked alternate-view
      snippet. Preserve the other integration requests as open design proposals.
- [x] Freeze this hardening followup, refresh its exact package/browser evidence
      and obtain a scoped security addendum before restoring final readiness.
      [Exact source, verification, artifacts and limits](preview-final-hardening-20261026.md).

- [x] Use one local Subscription registry per owning Block. Consolidate Website,
      audit examples, Typing Game, UI, DevTools and active snippets, and document
      aggregate Layer composition in active guides, scaffolds and skills.
      [Audit and verification scope](subscription-registry-organization.md).
- [x] Profile the repeatable Lustre gap against main, identify the dominant added
      update/view/patch/framework work and verify a reduction before release
      sign-off. Preserve earlier paired measurements and source pins. The new
      optimized workload improves 12.7%; naive performance is similar and main
      remains faster. [Investigation, remaining costs and proofs](preview-runtime-investigation-20261026.md).
- [x] Freeze the runtime followup and refresh all nine local packages, installed
      Coverchart/scaffold acceptance and browser checks. Candidate `fa96bf7d90`
      passes the fresh local rehearsal, including all 32 Workspace browser tests.
      [Artifacts, source scope and retained qualifications](preview-runtime-investigation-20261026.md#fresh-packed-package-rehearsal).
      The preceding package rehearsal retains its original implementation pin.
- [x] Name assigned Step values with a descriptive `Step` suffix across current
      consumers, framework examples/tests, active snippets and guidance. Preserve
      operation registry names, ordinary direct-result handler names, factory APIs, applied
      results, historical published content and unchanged compiler-performance fixtures.
- [x] Refresh affected source/runtime/lint/declaration checks and inspect realistic
      split-file consumers. Record intentional naming exceptions by value contract.
- [x] Freeze a coherent candidate and refresh packed-package, Coverchart and
      scaffold acceptance for the accumulated post-preparation changes. Keep the
      actual Coverchart checkout and the user's running servers intact.
- [x] Check new feedback only within the Blocks + Effect Layers preview scope.
      The October 26 foldkit-plus report on #1655 is assessed, its two concrete
      behavior claims reproduce on published/current code, and envelope
      portability guidance is clarified. Broader proposed APIs are explicitly
      open, not counted as implemented. #1737 has no newer replies.
      [Current dispositions and reproduction limits](preview-feedback-20261026.md).
- [x] Complete the exact-candidate Daybreak review and refresh dependency
      reachability dispositions. Record source identity, review limits and any
      required repairs before release approval; publication stays held.
      [Final verdict and inherited limitations](next-preview-security-review.md#october-26-final-review).
- [x] After source and verification jobs settle, compare the final preview with
      pinned main in the Lustre harness, including naive and optimized views,
      correctness checks, balanced repeated runs and bundle provenance.
- [x] Prepare a concise final approval summary with public API changes, measured
      results, retained limitations and publication steps. Do not publish or push
      the integration branch before approval.

The [final approval summary](preview-approval-20261026.md) pins the coherent
implementation and package evidence. [Naming adoption](named-step-convention.md)
and [main/published-preview rendering comparisons](preview-lustre-20261026.md)
are complete. Base/application/Effect lint and release metadata checks are clean;
intentional erasure proofs and compiler budgets remain intact. User release
approval is still pending. The measured main cost is part of that review; no
performance win or published acceptance is inferred from local preparation.

## Initialization helpers authorized after preparation

Publication remains held. The previously verified preparation checkpoint is
`732258ae40`; the following approved exploration reopens affected verification.

- [x] Audit actual dynamic child initialization across direct fields, optional
      direct/keyed slots, Record/HashMap fields and whole tagged variants. Distinguish
      shared storage wiring from purposeful parent transitions.
- [x] Prototype the smallest coherent helper family alongside `initAndAppend`.
      Preserve parent-owned metadata, explicit replacement/insertion intent, passive
      recipes, exact args/Commands/Services/registration and native lifecycle behavior.
      Require source/emitted/relocated rejection and unchanged compiler ceilings.
- [x] Independently review realistic consumer code and inference/performance
      tradeoffs before migrating eligible consumers. Keep explicit writers where
      mixed parent work or custom relationships make them clearer.
- [x] Migrate adopted helpers, update active guidance and refresh affected
      installed-consumer/browser/editor evidence before restoring release readiness.

The set/append/insert family, five singular consumer migrations and Auth recipe
correction pass combined source/emitted/runtime and installed-package checks.
All six ceilings remain unchanged. Paired editor measurements retain the moderate
Workspace error-appearance cost; publication remains held.
[Scope, consumer choices, evidence and limits](child-initialization-family.md).

## Feature-local Step authoring

- [x] Export used Step helpers from split Definition modules, destructure them
      privately in colocated features, and retain owner qualification when several
      Definitions share a module. Migrate all eligible example, Website and Typing
      Game consumers, active snippets, scaffold guidance and skills; preserve the
      completed-Block barrel boundary.
- [x] Preserve lint ownership through local/imported helper aliases and
      `.fromMessage`, including wrong-owner and shadowing controls. Verify consumer
      source/tests/lint, strict relocated Workspace declarations, all six unchanged
      compiler fixtures and three alternating native editor pairs per workload.
      [Adoption, measurements, scope and remaining limits](step-helper-authoring.md).

Publication remains held. This authoring followup is distinct from the previously
packed release candidate and does not promote the published Ready snapshot.

## Followups authorized after the review summary

The reviewed candidate `679d2d5e7fae638f7aa0dbce65440da0ce767331` is pushed only to `codex/workspace-example`. The user authorized the following work after that checkpoint. Its existing verification does not automatically cover this subsequent delta; refresh affected release evidence before presenting another candidate.

- [x] Implement a test-only headless child Message wrapper for #1760 using exact Binding metadata, decoded values and the existing tracked mapper. Preserve generated delivery, keyed identity, pure replay generations, live admission, contextual delivery, lifecycle and passive construction. Verify source/emitted/relocated acceptance and rejection and migrate eligible parent tests.
- [x] Allow ordinary `Story.message` delivery while Commands remain pending. Retain exact pending identity, explicit resolution, ambiguity rejection and end-of-story completeness. Verify realistic concurrent Workspace Stories and document the difference from Scene's interaction checks.
- [x] Complete the bounded extracted-handler inference comparison. Retain the existing purposeful derived-input annotation if simpler encodings fail inference or require a broader API; preserve exact channels and wrong-graph rejection and document the consumer contract.
- [x] Prototype tagged-union child storage against Auth's two actual whole-variant children. Compare the native accessor form with an opt-in Schema-derived helper, preserving variant presence, identity, initialization, Commands and lifecycle. The opt-in `makeVariantBinding` passed source/emitted/runtime and unchanged compiler-budget proofs and independent review; Auth's two eligible Bindings are migrated. [Scope, cost and limits](variant-binding-assessment.md).

All four followups have focused runtime, source/emitted and consumer proofs with independent review. The extracted-input assessment retains its precise annotation. Combined source/declaration/runtime checks, all five unchanged compiler ceilings, nine-package installed rehearsals and fresh native benchmarks pass. The exact committed review remains required before a development-branch push. [Final evidence and limits](preview-final-followups-20261025.md).

## Queued user feedback

- [x] Simplify expanded Workspace root assembly after bounded framework experiments. Ordinary Website-style `prepare` and the checked Block export now emit and relocate because the existing exact Binding tuple type is exported from `composition.ts`. No framework API or implementation change is needed. The duplicate tuple inventory remains a measured limitation; broader descriptor prototypes failed emission or increased checker work and are rejected. Source/emitted registration and channel checks pass, all five compiler counts are unchanged, and three alternating native pairs show completed-Block post-edit completion improving from 840 to 57 ms. Standalone applications normally do not publish declarations; the actual full-root verification target is retained. [Proof, larger output and limits](workspace-clean-assembly-20261025.md).
- [x] Standardize focused Step producers before the next preview: `makeFieldsStep`, `makeCommandsStep`, and `makeOutMessageStep` all take callbacks. Ordinary callbacks receive the Model and, for Message-dependent handlers, the exact Message. Add `.fromMessage` to all three for payload-only producers returning Model-first handlers. Keep fixed zero-argument callbacks and `makeNoopStep()`; remove the OutMessage value-taking form without an alias. Prove inline contextual inference, extracted contracts, direct function references, contexts/refined generics, exact channels/errors/registration, deferred evaluation, Model identity, source/relocated emission, and unchanged compiler ceilings in isolation before migration. If inference fails, report the precise limitation and smallest coherent adjustment. Audit every example, Website, and Typing Game for meaningful adoption, including compatible Step references and payload-only `.fromMessage` cases; retain cohesive mixed results and report intentional exceptions. Coordinate UI, scaffolds, active guidance, changesets and migration instructions. Compilation alone does not complete this adoption gate.
- [x] Align ManagedResource aggregation with Subscriptions: prototype `Definition.makeManagedResources` registries exposing `.layer` only for all-attached entries, with `Layer.empty` for an empty registry. Reserve `layer` at source/emitted/runtime boundaries. Verify non-enumerable aggregate metadata never becomes a resource entry during lifting, composition, or execution; retain exact requirements, errors, identities, lifecycle, and passivity. If proofs and unchanged compiler ceilings pass, replace `ManagedResource.handlersLayer` without an alias and migrate the four eligible full registries, active guidance, and changesets. Mixed/host-owned registries retain explicit providers. Coordinate with record-only and declaration work; publication remains held.
- [x] Make `Composition.makeUpdate` record-only, retaining `.withContext` and direct/curried dispatch. Remove the callback overload and obsolete machinery without aliases; migrate consumers, fixtures, scaffolds, active guidance and lint recognition. Preserve per-Message contracts, context tuples, handler completeness, registration and channel-loss rejection. Workspace's existing conversion is concurrent user work and must be retained.
- [x] Audit adoption of every API added in this preview round across all examples, Typing Game, and Website. Migrate applicable sites, including optional conveniences that remove real repeated wiring; document concrete intentional exceptions. Include UI/framework consumers where the record-only change requires them. Do not force Step helpers around ordinary handlers that can return results directly.
- [x] Repair Workspace root declaration emission (TS7056). The earlier exact Binding tuple and implementation interface restored full emission and strict relocation. The subsequent cleanup above removes the implementation inventory by exporting the tuple type; actual ordinary root emission and relocation still pass. Declarations grow from approximately 11.45 to 12.42 MB. [Current proof and costs](workspace-clean-assembly-20261025.md).

### Final preparation verification

The final implementation checkpoint is `1b89a2325553`. Core 3,753 tests and
coverage, UI 1,301, Website 1,490, Workspace 153 and Job Application 69 pass.
All 53 source configurations, the repeated checker-count matrix, core/UI strict
emitted-declaration gates, actual Workspace root relocation and all six fixed
compiler fixtures pass. The narrow alias followup passes the existing subpath
guard and affected consumers; its missing-alias control fails before the fix.

All nine packages are locally packed and installed. Coverchart's 40 tests and
all source/lint/build gates pass; SPA/SSG/SSR pass their source/lint/test/build
and browser gates. Installed new API contracts pass. Workspace 32/32 browser
cases use the original packed source snapshot plus the explicitly recorded
example source-alias correction. All 2,446 package/scaffold inputs remain
identical to the packed freeze. Current native editor and four-round runtime
results disclose remaining latency and size costs. No publication or actual
Coverchart change occurred. [Final report and evidence](preview-ready-20261025.md).

The last scoped read-only inventory found no new feedback after October 25,
18:00 UTC. Exact commits have independent review; final documentation review
and authorized development-branch push complete the preparation. Integration,
published-package/deployment acceptance, actual Coverchart upgrade and Ready
promotion remain held for approval.

### Current integration gates

The counts and artifact results below describe the preceding verified checkpoint.
The subsequent initialization, Program, Command and testing work required a fresh
freeze and rehearsal. The final preparation section above records their completion
and the exact source-alias qualification. Use the package-local TypeScript 7 compiler for both
declaration builds and measurements. A control built with the workspace's
TypeScript 6 shim exceeded a compiler ceiling; the same source rebuilt with the
correct compiler passes. The mismatched-compiler run is excluded.

The final source sweep passes all 53 repository configurations with stable framework source/artifact hashes. Core and UI external emitted-declaration/relocation harnesses pass. Independent review verifies actual Typing Game Room, all 28 adversarial return-channel controls, and the exact Workspace root boundary. The five compiler ceilings pass twice without changes. Faster encodings with unsafe union channels were rejected before integration.

Runtime evidence passes 3,700 core tests (one intentional skip) with coverage gates, 1,298 UI tests, 1,480 Website tests, 622 lint tests, and 331 Vite tests (three intentional skips). The semantic application audit retains 270 focused tests, including Workspace’s 160. Website uses the pinned cached pnpm; the stalled default-Corepack run is excluded. Vite’s sandbox-blocked loopback run is excluded in favor of its successful network-enabled run. Final local packed-consumer/browser checks pass; final paired editor/runtime measurements and artifact equivalence pass, with their measured costs disclosed in the handoff. Publication remains held.

Earlier October 25 public feedback check: #1737 remains closed with 10 comments and no
updates after October 23. The new preview-PR reports remain the already tracked
DateTime/combined-OutMessage cases and reciprocal-policy #1772. No additional
related contribution PR appeared in the October 24 onward issue/PR inventory.
#1771 reports the stable runtime paint queue, while #1773, #1769/#1770, and #1768
are separately scoped features; this pass does not expand into those. Preserve
these boundaries rather than treating unrelated repository activity as release
work. Read-only inventory: `/private/tmp/foldkit-preview-feedback-check-20261025.jsonl`.

### Latest preview feedback, October 25

The later [migration report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6398999418)
adds the following assessments. These are not covered by the earlier checkpoint.

- [x] [#1779](https://github.com/foldkit/foldkit/issues/1779): bound invalid Program-root requirement inference before it reaches broad Block contracts. The original one-checker source-order failure and native counts one, four, five, six and eight pass after the repair. Mutation controls retain rejection and reproduce the failure without the guard. [Cause and verification](program-checker-order.md). Repeat the matrix after the remaining framework changes.
- [x] [#1777](https://github.com/foldkit/foldkit/issues/1777): retain construction validation and use caller-owned `toLayer` wiring when a reusable factory accepts a generic Service key. The supported boundary preserves exact external Services while rejecting placement-bound capabilities and unresolved Block requirements. [Assessment and declaration proof](generic-construction-requirements.md).
- [x] Assess [#1776](https://github.com/foldkit/foldkit/issues/1776). Reordering improves common source/emitted diagnostics but exceeds unchanged compiler ceilings; alternative bounded encodings do not repair that cost. Retain the safe signatures and add active troubleshooting guidance. The misleading final-overload diagnostic remains a documented limitation, not a claimed fix. [Measured assessment](command-diagnostic-assessment.md).
- [x] Reconcile [#1780](https://github.com/foldkit/foldkit/pull/1780): Story already permits concurrent delivery; add `Scene.Command.keepPending` for one exact ordinary invocation without changing assertion, resolution or final-completeness behavior. Workspace exercises activity delivery during a pending save. [Contracts and proof](testing-event-delivery.md).
- [x] Adopt the focused conveniences from [#1783](https://github.com/foldkit/foldkit/pull/1783): `Story.messageWith` reads the current Model when its step runs; `Story.Subscription.from` validates decoded input and applies a registered Subscription's parent mapping. Preserve ambiguity rejection and document that simulation does not execute Streams or Runtime occurrence admission. Source/emitted/relocated checks, runtime regressions and a distinct 100-entry compiler fixture pass. [Scope and costs](testing-event-delivery.md).
- [x] Complete `initAndAppend(binding, model, { key, args })` as an optional leaf for existing initialized keyed arrays. Source/emitted/relocated, runtime and mutation proofs pass; all six compiler budgets pass, six consumers are migrated, installed contracts and Workspace 32/32 pass. Three paired native runs show no material overall regression. Keep explicit writers for mixed parent transitions and other storage. [Scope and adoption](dynamic-child-append.md).
- [x] Repair keyed Command cancellation: infer `toKey` only from the selected `keyFields`, and project those fields on both invocation and interruption. The confirmed failure starts with one key and returns `NotFound` on cancellation. Preserve exact Interrupt arguments, Services, metadata and original invocation identity; source/emitted/relocated, real cancellation and mutation regressions pass. The combined matrix passes twice at all five checker counts, and all six compiler ceilings pass. [Repair and breaking annotation guidance](command-interruption-keys.md).
- [x] Resolve the apparent clean-build Workspace Types-ceiling regression. The control used TypeScript 6 to emit declarations for TypeScript 7 measurements. Rebuilding with the package-local TypeScript 7 compiler restores 205,758 types and 2,509,168 instantiations, within unchanged ceilings. Independent commit comparisons confirm the optional initialization leaf adds zero default-fixture cost; the Program guard adds 21 types and 66 instantiations in this fixture. Repeat all fixtures after the final combined changes.

The isolated ManagedResource registry prototype passes source/emitted contracts and real Runtime acquisition/release tests, including non-enumerable source entries, metadata separation, and rejection of foreign Model/Message registries. Moving registry contracts to a dedicated internal module removes the first prototype's unconditional cost. The combined record-only/registry/focused-producer encoding now passes all five unchanged ceilings in repeated runs. A dedicated internal operation-contract module and registry module prevent repeated expansion; no alias or filler export is retained. The mechanism, all four eligible full registries, and active guidance are migrated. Final source and declaration checks pass; current performance and artifact provenance are recorded in the release handoff.

The focused callback prototype passes full framework source checking, source and relocated emitted accepted/rejected cases, and 25 focused runtime tests. The inline handler forms infer exact Message payloads. Validation retains owning Model/Message contracts and rejects direct OutMessage constructor references that could forward the wrong `_tag`. The final relocated proof also passes after restricting `NoInfer` to the return arity discriminator. Direct zero-argument and Model-only helpers compose inline; required-Message handlers remain rejected by `combineSteps`. The isolated inline proof needs no extraction workaround. The realistic wide context-bearing Typing Game record now passes against the reviewed shared declarations. Full declaration-fixture migration and all 53 coherent source configurations pass; independent raw/recipe union controls preserve the rejection boundary. Explicit `any` generic arguments or contextual targets remain a documented TypeScript erasure boundary; normal inference and precise handler contexts reject the demonstrated narrowed callbacks.

Record-only completeness now has an isolated source/emitted proof rejecting untagged, mixed tagged/untagged, and open-ended Message tag contracts. Empty records remain valid for message-free and routed-only Compositions. A private Program return-type normalization preserves the existing Service checks. These changes pass the combined source/build/performance proof and independent source/emitted/relocated operation checks; final repository verification is in progress.

Lint verification found that focused helper calls used directly as handler-record entries need explicit recognition. The new `.fromMessage` callback parameter is a Message, not a Model. The integrated fix rejects child-state updates and avoids reporting child-owned Message constructors as parent-authored dispatch. The original plugin fails 11 of 19 new controls; the fix passes all 19 and all 599 plugin tests. Static local provenance limits remain documented.

- [x] Sweep Workspace conditional class construction and use `clsx` where appropriate. All 28 inventoried dynamic/composed view sites and shared style composition use `clsx`; static strings remain direct. Class membership is preserved. The Workspace manifest and its existing lockfile importer declare the cached `2.1.1` version. Source checking, application lint, formatting, and all 150 tests across 19 files pass. No workspace-wide install was performed.
- [x] Address the three Workspace `codex:` comments: retain the concurrent `toView` callback rename; let Board's raw-only creation handler return `{ model, outMessage }`; name announcements `informIssueMoved` / `InformedOfIssueMove` and `informIssueMoveFailed` / `InformedOfIssueMoveFailure`. Board owns drag interaction, while the root owns canonical issues, optimistic placement, and persistence. The move announcement follows the optimistic change, not persistence success. The latest Workspace runtime checkpoint passes 153 tests; final source checking follows the core type experiment freeze.

## Complete: reopened composition feedback

The October 24 scope correction was correct: the earlier agent recommendations to defer these items were not user-approved release decisions. All four now have retained implementations and source/emitted/runtime checks. [Consumer APIs, measurements, evidence, and remaining release gates](composition-feedback-closeout.md).

- [x] Add Record/HashMap child storage through the owning Definition's `makeMapBinding` method (the earlier standalone entry point is superseded). Parent Schemas establish exact primitive keys and child storage; writes preserve membership and wrappers. Same-child multiple maps and multiple child fields in one wrapper are verified. Composite domain keys use a general adapter with separate primitive occurrence identity; no structural-key identity is claimed.
- [x] Adopt `managedResources.layer` for closed attached registries. Exact Layer channels, legal keys, non-enumerable entries, runtime source identity, host-provider policy, and conflicting-union rejection are verified. Explicit Command `.layer` composition remains the assessed contract; no owner-wide Command registry is introduced merely for symmetry.
- [x] Add identity-based `Story.Command.argsOf` and `Scene.Command.argsOf`, including exact captured args, argless matches, split-file helpers, and occurrence-selection boundaries. The retained inline public signature meets the unchanged compiler ceilings.
- [x] Improve connected-Step, OutMessage-combination, and assembly diagnostics while retaining compile-time rejection. Source and relocated emitted diagnostics name the registered/deferred repair, incompatible OutMessage, primary-view ownership, or missing handler provider. Native init errors and deliberate type-erasure limits are documented.
- [x] Independently review the retained mechanisms, fix aggregate union-channel and map-placement findings, and run current Website/Workspace editor workflows. All five compiler budgets pass unchanged. The related #1772 reciprocal-policy graph fix has source/emitted/runtime proofs and fresh Astra Max review.

These completions do not mark the release Ready. The earlier private boundary restored expanded Workspace emission; subsequent ordinary assembly now emits and relocates by exporting the existing exact Binding tuple type. The earlier unannotated control and its TS7056 result retain their historical scope. Final record-inference/safety, source/declaration, installed-consumer and independent review gates pass. Final performance and artifact-equivalence gates pass with their measured costs recorded in the release handoff. No approved deferral is inferred.

## Complete: October 24 declaration feedback

[The new migration report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6384975056) reports two type-level regressions against published `1f6776fa7ece`. Both are verified in the prepared candidate. [Fixes, regression proofs, paired editor measurements, fresh artifact identity, and limits](preview-type-feedback-20261024.md). Publication remains on hold for approval.

- [x] Accept Effect `DateTime.Utc`, `DateTime.Zoned`, and `TimeZone` data in ViewInputs, including nested records and collections. Preserve rejection and useful diagnostic paths for nested application callbacks, including callback-bearing extensions of protocol values.
- [x] Verify `Update.withOutMessage` after homogeneous and nested connected `combineSteps` results in both call forms. Retain exact OutMessage tags, Model, Commands/Services, registration evidence, parent policy completeness, and Story expectations. Distinguish the original raw/local callback form from its required Definition-owned Step repair.
- [x] Observe source and emitted-declaration regression checks fail before the relevant repair, then pass; retain wrong-graph, missing-handler, and invalid-channel rejections.
- [x] Recheck affected consumers, unchanged compiler budgets, and paired native editor workflows. All 53 source projects, full core/UI declaration harnesses, 132 focused runtime tests, all five unchanged count budgets, and three paired editor runs pass. Nine packages are freshly packed from digest `f89c6afa2fb1`; four installed consumer checks pass. Prior runtime/browser evidence is explicitly transferred through byte identity.

## Complete: approved framework adoption and integrated benchmark

The October 23 approved handler-record/context surface, canonical mixed-result checks, and named public UI headers are integrated. Real Counter, Website, Job Application, Typing Game Room, UI, and scaffold consumers are migrated. Definition-owned Steps preserve local channels where raw and connected results meet. Raw-only callbacks remain supported.

- [x] Adopt the exact per-Message operation contract and sound connected-`combineSteps` guard. Core/UI source, source/emitted acceptance/rejection, full external declaration harnesses, runtime tests, native API completion/docs, lint recognition, and all five unchanged compiler ceilings pass.
- [x] Adopt declaration-site rejection for raw local results mixed with connected recipes and migrate affected consumers. Accurate visible helper contracts remain necessary; arbitrary upstream channel erasure is not prevented.
- [x] Adopt named completed-Block interfaces for public UI declarations. The pre-polish full Workspace snapshot emits and relocates. Two subsequent internal callable interfaces also let the expanded property-control root emit and relocate without consumer API changes. The 32-group synthetic root retains its documented TS7056 limit; intentional TypeScript module augmentation remains an escape.
- [x] Complete the integrated runtime/compiler/declaration/Website/Workspace editor benchmark before queued Workspace changes. [Results, source fingerprints, and limits](preview-framework-performance.md).
- [x] Review the Website editor cost explicitly. The final comparison against published `1f6776fa7ece` records hover 249→270 ms, error clearing 554→654 ms, and cold completed-root Message access 2.53→3.00 seconds. Independent review accepts this disclosed tradeoff for the approved safety surface; two earlier bounded consumer controls did not recover a clear gain. Preserve the measured costs and the remaining serialization limit without claiming performance is solved. [Final results](preview-framework-performance.md#final-post-change-benchmark).

The earlier isolated measurements remain historical experiment records. The final post-change benchmark compares the actual published source, passes typed editor workflows and all five unchanged count budgets, and shows no demonstrated material runtime regression in four balanced rounds. It retains the measured editor costs. The [final report](preview-framework-performance.md#final-post-change-benchmark) does not change the published Ready snapshot.

## In progress: workspace application

[#1767](https://github.com/foldkit/foldkit/issues/1767) supplies a substantial consumer for evaluating Block architecture and performance. Begin with a working vertical slice and use its patterns to guide further framework work.

- [x] Complete issue list, routed details, editable drafts, and one authoritative shared issue collection.
- [x] Add an in-memory Effect Service with asynchronous loading/saving, deterministic failure/retry, and revision conflicts. Eighteen focused repository tests pass.
- [x] Verify route changes, shared-data consistency, retained drafts, retry, and stale child results with application and browser tests.
- [x] Register the runnable example and document its file structure and ownership.
- [x] Measure official compiler checking/declaration emission and post-edit hover, completion, error appearance/clearing, and memory. The pre-polish named-header snapshot emits the full application and relocates. After the internal naming repair, the expanded root also emits and relocates. [Results and limits](preview-framework-performance.md).
- [x] Build out the remaining issue scope after validating the vertical slice: creation, project views, members/settings, saved filters, comments/activity, command palette, keyboard navigation, and accessible board interactions.
- [x] Style all application views with Tailwind utilities and the existing Tailwind Vite integration, without a parallel custom stylesheet.
- [x] Derive larger distinct static-composition workloads through existing framework benchmark infrastructure. Four/eight-group source and emitted-declaration checks pass with separate new budgets; existing budgets are unchanged. The named-header control also emits sixteen groups; the thirty-two-group root retains an explicit TS7056 limit.
- [x] Coordinate the architectural explanation with [#1441](https://github.com/foldkit/foldkit/issues/1441). Project Organization links the example; its README explains ownership and dependency direction.
- [x] Assess Query for retained workspace reads and mutation-driven refresh. [Assessment](workspace-query-assessment.md): retain root-owned AsyncData because mutation reconciliation and load-completion child initialization require parent policy. Do not duplicate the canonical snapshot or redesign behavior solely to adopt Query.

- [x] Complete visual/UI polish and optimistic board placement with rollback and pending keyboard-focus coverage. Tailwind and Foldkit UI cover eligible controls. The audit includes all canonical blind spots and records remaining framework emission limits: [audit report](workspace-program-audit.md).
- [x] Review the application as a product: remove redundant chrome and inert selection, retain complete saved views, repair active-view deletion, clarify creation's pending/failure behavior, and gate project saves on valid changes. See the [product review and verification](workspace-product-review.md).
- [x] Implement coherent unsaved-work retention across application links, issue changes, Close, and browser history. Retain per-issue fields and comment drafts through child operations/OutMessages, initialize fresh keyed editors, and scope a native page-exit warning to retained work. See the [policy and limits](workspace-product-review.md#retained-work-policy).
- [x] Assess native issue links and existing Combobox/Toast composition against actual workflows. Keep the typed Dialog/Input action palette, persistent actionable failures, and quiet optimistic successes. Native issue anchors remain a concrete nonblocking product followup for modified-click and copy-link behavior; child views need a parent-supplied href contract. [Assessment](workspace-product-review.md#control-and-navigation-followups).
- [x] Align Workspace control presentation through one application-owned style module: Listbox triggers, popup surfaces, options, focus, disabled states, inputs, and actions. Listboxes and command-palette options share active colors, radii, and pointer cursors; compact/default density is deliberate. All single-selection controls use Foldkit UI Listbox, including Active member, filters, creation, and properties. Board cards use pointer and keyboard drag handles rather than duplicate status/arrow controls. Domain values remain parent-owned. [Consolidation and verification](workspace-listbox-consolidation.md).
- [x] Verify the full Listbox graph: 118 application tests, 20 fresh production browser cases, source/lint/build, 82 emitted declaration files and a strict relocated consumer. Exact named application contracts avoid the larger root's serialization limit without widening; missing-Binding/handler mutations fail. Three native editor runs retain bounded responsiveness. [Results and authoring tradeoff](workspace-listbox-consolidation.md).
- [x] Remove duplicate Board card status and arrow controls, their keyed Listbox state, and root membership synchronization. Preserve pointer/keyboard dragging, optimistic placement, pending focus, persistence, rollback, and retry. Updated checks pass: 113 app tests, 20 browser cases, source/lint/build, and strict consumption of 81 emitted declaration files. [Card simplification](workspace-listbox-consolidation.md#board-card-simplification).
- [x] Reassess Workspace Query adoption against the current public API; retain direct AsyncData for mutation reconciliation and child initialization after loading. Rename the field to `workspaceAsyncData` and teach the suffix convention in FOLDKIT.md and authoring guidance. [Assessment](workspace-query-assessment.md).
- [x] Apply queued issue-editor and board polish after the framework benchmark: four styled Foldkit UI Listboxes with pointer cursors, equal-height Save/Discard actions, and offscreen moving-issue status without layout shift. Draft retention, disabled saving, keyboard interactions, optimistic placement and failure/retry behavior pass. Source/build, 111 app tests, 20 browser cases, lint/format, feature declarations and final native editor smoke pass.
- [x] Verify the expanded property-control graph separately from the pre-polish benchmark. Source/runtime and reusable feature emission/relocation pass. The initial root-emission failure is repaired by preserving existing completed-update and owned Document-view contracts through named internal interfaces. Retain clear direct relationships. [Checkpoint results](preview-framework-performance.md#expanded-workspace-verification) and [repair](preview-framework-performance.md#named-contract-serialization-repair).
- [x] Resolve the expanded Workspace full-root TS7056 gate with no consumer API change, runtime code change, widened channels, or increased count budgets. The root emits 80 files and strict relocated accepted/rejected checks pass. Baseline and both single-interface-removal controls reproduce the failure. Preserve the separate 32-group limit.
- [x] Audit repeated route guards. `ChangedUrl` captures the effective background route before writing the next route; `applySavedView` then preserves edited filters during issue open/close and applies a newly entered saved view. These synchronous parent policies do not need another Message payload. Retain asynchronous issue/key/version/generation admission checks.
- [x] Resolve or disposition the demonstrated declaration-serialization limit. Named public UI headers and the two internal callable interfaces let the full application emit and relocate successfully, including four property-control Bindings. Source/emitted rejection checks pass. Retain the thirty-two-group synthetic root limit without claiming a universal Block-count ceiling. [Integrated disposition](preview-framework-performance.md#named-contract-serialization-repair).
- [x] Complete the latest [Workspace feedback followup](workspace-feedback-followup.md). URL routes now own controlled issue filters; live search replaces the current URL while discrete filter changes create browser-history entries. Parent-supplied native issue links preserve validated return context across reloads, including saved-view filters without session metadata. Internal and external navigation use separate Commands, and repository-backed Command constructors capture their Service once. The application still uses root-owned AsyncData rather than Query, and this pass changes no framework API. Final checks pass: 144 tests across 23 files, 26 production browser cases, source checking, application and Effect lint, formatting, production build, and strict relocated consumption of 82 emitted declaration files. Publication remains held.
- [x] Trim [redundant Workspace tests](workspace-feedback-followup.md#test-suite-maintenance). Remove four duplicate or framework-only cases and shared implementation assertions. Preserve application regressions and the unique explicit-activity opt-in check. The resulting 140 tests across 23 files, source typecheck, application and Effect lint, and formatting pass. Application implementation and browser cases are unchanged.
- [x] Improve [Workspace text readability](workspace-feedback-followup.md#typography-followup). Use 14px medium primary text and controls, 13px field labels, and at least 12px metadata, with larger semibold headings. Preserve readable title wrapping and control alignment at 320 and 390 pixels. Browser inspection, source checking, application lint, formatting, and production build pass.
- [x] Add [Board column creation](workspace-feedback-followup.md#board-column-creation). Each column's plus button opens the existing Dialog with that column's status and parent-owned project selected. Keep default and pending creation behavior. The 141 application tests, 27 browser cases, source/emitted checks, lint, formatting, and build pass.
- [x] Align [issue list rows and compact its toolbar](workspace-feedback-followup.md#issue-list-alignment-and-toolbar). Use fixed ID/status columns with content-width chips, bounded search/filter controls, and container-aware split/phone layouts. Browser inspection, four existing Scenes, source checking, lint, formatting, and build pass.

- [x] Add [member-specific notifications and always-on teammate activity](workspace-feedback-followup.md#notifications-and-application-assembly), with comments/assignments, read/unread controls, issue navigation, and quiet Foldkit UI Popover delivery. All 149 application tests and 29 browser cases pass, with source/lint/build and reusable feature source/emitted checks. Use ordinary Website-style application assembly; retain full-root TS7056 as a framework serialization limit rather than private application staging. Three native editor runs verify post-edit hover/completion at 316/292 ms medians, error appearance/clearing at 232/219 ms, and bounded sampled memory for this source snapshot.

- [x] Consolidate [application behavior into owning Story/Scene suites](workspace-feedback-followup.md#application-test-organization). Root interaction, draft-retention, and rollback cases live in `story.test.ts`; Create Issue and Comment Composer use feature update Stories. Remove direct handler tests and manual Command Effect execution. Keep pure policy and repository tests. The 144 application tests, 30 production browser cases, source checking, application/Effect lint, formatting, and build pass. Browser tests own real Subscription timing and concurrent occurrence admission; isolated timing and rollback mutations fail their regression checks.

- [x] Colocate [Board drop handling with its Binding](workspace-feedback-followup.md#board-composition-factoring). Share drag identities through `board/dragAndDrop.ts`, remove the catch-all `policy.ts`, and test unique drop behavior through the owning `board/story.test.ts`. All 145 application tests across 19 files, source checking, lint, and formatting pass.

- [x] Simplify [repository and command palette organization](workspace-feedback-followup.md#repository-and-command-palette-organization). Keep atomic repository transitions separate from effect orchestration, use the existing DOM shortcut and Scene Subscription helpers, and import Website page Blocks through the existing barrel. All 146 Workspace tests, both source typechecks, scoped lint, and formatting pass; the focused production shortcut test passes and rejects an isolated typing-policy mutation.

- [x] Split [the repository implementation into responsibility files](workspace-feedback-followup.md#repository-modules), with `repository/repository.ts` composing the Service and an explicit public barrel. Preserve the effectful constructor, public imports, and transition bodies. All 149 current application tests, source checking, lint, and formatting pass.

## Complete: Model-aware Command-only Steps

Replace `Definition.makeCommandsStep(commands)` with `Definition.makeCommandsStep(model => commands)`. A producer that ignores the Model uses a zero-argument callback. The callback runs when the Step is applied; constructing the Step runs no producer and executes no effects. The applied Step retains the incoming Model object and returns the produced Commands for Runtime execution.

- [x] Implement the callback-only public signature without a collection overload or compatibility alias.
- [x] Preserve contextual Model typing, exact inferred Command/Service requirements, Message validation, and child-registration evidence.
- [x] Add runtime coverage for deferred evaluation, repeat application, returned Commands, and unchanged Model identity.
- [x] Pair source and emitted-declaration acceptance/rejection for Model typing, invalid result Messages, inferred requirements, and registration checks.
- [x] Migrate consumers, active snippets/docs, skills, TSDoc, and migration guidance. Use this helper for Commands-only Steps, the focused field/OutMessage helpers for their single-purpose transitions, and `makeStep` for reusable mixed transitions.
- [x] Verify affected consumers and unchanged compiler-performance budgets; preserve historical published material.

Verified on TypeScript 7.1.0-beta: both core source checks, 3,645 core tests and coverage gates, full core and UI external emitted-declaration harnesses, affected UI suites, Website/Typing Game/Workspace/Query Sync/Route Transitions source checks and tests, and all five compiler fixtures. The existing compiler budgets remain unchanged. Independent review found no correctness issues; its three additional eligible UI wrappers were migrated and rechecked. The copyable Command-step snippet passes an isolated strict source check. A reproduced child-owned callback lint false positive is fixed with 12 focused rule/integration tests, typechecks, and a plugin build. Workspace browser coverage now includes 16 passing cases: the 14-case post-migration suite plus focused cross-column keyboard and actual pointer-drop checks while saving is paused. Final source/build/editor checks pass; the server and polished issue editor remain available for review.

## Bookmarked consumer friction

The [MyRemotely report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6325362294) has been assessed against current public packages. [Exact reproductions and dispositions](workspace-consumer-friction.md) separate working APIs from confirmed gaps; the remaining implementation items below are not claimed fixed.

- [x] Support Story authoring for concurrent Messages while ordinary non-keyed Commands remain pending. `Story.message` retains every pending Command, explicit resolution and final completeness; real Workspace concurrent Stories and source/emitted checks pass. Scene retains its separate checks. [Semantics and adoption](story-concurrency.md).

- [x] Complete the extracted own-field transition inference assessment. Three simpler composition/Definition encodings lose contextual typing or graph capability. Retain one precise operation-derived input annotation, with split-file source/emitted registration and channel checks and an active guide example. No new API or inference improvement is claimed. [Comparison and decision](extracted-step-inference-assessment.md).

- [x] Add public identity-based pending Command inspection with precise args through `Story.Command.argsOf` and `Scene.Command.argsOf`. The earlier failed compiler encodings remain historical evidence; the retained inline signature passes all five unchanged ceilings. [Current contract and verification](pending-command-inspection.md).
- [x] Add cross-owner Mount-bearing helper declaration fixtures and guidance. Two real Dialog parents share content through caller-owned renderer callbacks. Source, external emission, and relocated accepted/rejected checks pass, including missing Binding/Mount capabilities and foreign parent Messages. Same-owner ViewBuilderFor remains supported; a new raw Mount-requirement extractor alone is not a fix.
- [x] Add concrete reset/init guidance preserving parent-owned fields and child init Commands. The copyable Counter and parent examples pass strict source checks; Website typechecking passes. The required-child recipe also passes the earlier pure execution probe. The guidance distinguishes Message-backed domain resets from baseline initialization and makes no fresh-generation or cancellation guarantee.
- [x] Recheck reported test-file ownership lint exemptions: current recommended/all presets already allow the legitimate Scene/test constructors. Custom rule lists need equivalent overrides.
- [x] Add the combineSteps/OutMessage remedy to the migration Compiler Error Guide.
- [x] Improve the indirect `combineSteps` OutMessage diagnostic without weakening rejection. Anchoring the data-first fallback to the input Model exposes the incompatible OutMessage channel. Source and relocated-declaration assertions verify both call forms and the registered/deferred-Step repair. [Current compiler diagnostics](composition-compiler-diagnostics.md).
- [x] Close the connected-Step release blocker with exact per-Message operation contracts, conservative compiler-derived emission evidence, and a sound combined-policy guard. The integrated candidate passes real UI consumers, source/emitted rejection, runtime tests, and unchanged compiler budgets. [Current disposition](preview-framework-performance.md).
- [x] Reject mixed raw-local/connected result loss at declaration time and migrate consumers to canonical local Steps. Ordinary upstream width erasure remains an explicit enforcement limit; raw-only callbacks stay supported. [Consumer contracts and historical experiments](workspace-consumer-friction.md).

## Storage and handler Layer assessments

- [x] [#1706](https://github.com/foldkit/foldkit/issues/1706): adopt `makeMapBinding` for Schema-backed Record/HashMap child storage, including wrapped children and exact primitive occurrence keys. Parent-owned membership/order, dynamic initialization, keyed lifecycle, declaration contracts, and lint provenance are verified. Composite-key boundaries are explicit. [Assessment](record-hashmap-binding-assessment.md).
- [x] Tagged-union child storage: adopt optional `makeVariantBinding` for an exact complete child Schema directly included in the parent Union. Auth's two eligible Bindings are migrated; nested/wrapped storage retains general accessors. Preserve the disclosed compiler cost and structural Schema-identity limitation. [Assessment](variant-binding-assessment.md).
- [x] [#1759](https://github.com/foldkit/foldkit/issues/1759): adopt the owned registry’s `managedResources.layer` for closed attached registries, matching Subscriptions. The earlier standalone prototype is superseded without an alias. Reject host-owned/mixed/open registries and ambiguous Layer contracts. Keep explicit Command `.layer` composition; no owner-wide Command inventory is justified. [Assessment and exact-channel checks](aggregate-handler-layer-assessment.md).

Prototype proposed APIs and verify source/emitted acceptance/rejection, runtime behavior, inference, and realistic split-file consumers before broad conversion.

## Release review checklist

- [x] Verify shared-Step ownership across eligible examples and Typing Game,
      active Website/scaffold/skill guidance, passive cyclic Binding access,
      source/Story/build checks and strict relocated Workspace declarations.
      Keep the rejected general Step inference prototype separate from the
      adopted organization change. [Evidence and limits](shared-step-organization-20261027.md).

- [x] Reconcile #1814's exact contribution with the existing SSG repair, retain
      original commit/author references and verify custom-host, output, proxy
      and path behavior. [Evidence and review gate](ssg-preview-1814-reconciliation-20261027.md).
      No fresh full-cohort or performance result is inferred from this patch.

- [x] Verify Definition-owned map Binding adoption with exact detached/imported
      helper contracts, generic consumers, full source/emitted/runtime/lint checks,
      TSDoc hovers and paired actual/larger editor workflows. Explicitly review the
      four-group compiler ceiling increase; leave all fixture sources and other
      ceilings unchanged. [Evidence and limits](map-binding-method-adoption-20261027.md).

- [x] Refresh the combined source/emitted/runtime, installed-package, compiler and editor gates after the four subsequent followups. Keep the `679d2d5e7f` checkpoint distinct from this new delta. Nine freshly packed packages pass Coverchart, all three scaffolds and four installed contracts. Quiet native workflows and a bounded matched cold-root control pass, with limitations disclosed. [Final evidence](preview-final-followups-20261025.md).
- [x] Review testing semantics and consumer adoption independently; mutation-check the pending-Command and erased decoded-input regressions and restore exact source.
- [x] Record the inherited explicit-erasure limit for a name-preserving `LayeredMountDefinition` union alias. It widens args to `any`; generic Composition construction may accept it despite the direct internal guard. Keep precise/inferred registries and public broad-name rejection, without claiming universal static recovery after erasure.
- [x] Complete independent safety/performance review of the isolated tagged-union prototype before integrating its optional API. The reviewed helper and emitted declaration hashes match the shared integration.

- [x] Focused Step producer callbacks and `.fromMessage` pass contextual source/emitted/runtime/performance proofs; consumer adoption is inspected across every example, Website, and Typing Game, with intentional exceptions recorded.

- [x] Verify the ManagedResource registry `.layer` prototype and, if retained, removal of `ManagedResource.handlersLayer`, reserved-key rejection, metadata isolation, exact source/emitted channels, runtime behavior, consumer migration, and unchanged compiler ceilings.
- [x] Verify record-only `makeUpdate` through accepted/rejected source and emitted cases, realistic split-file consumers, context/runtime checks, lint recognition, and unchanged compiler budgets. Explicitly reject removed callbacks and keep connected OutMessage/channel-loss rejections.
- [x] Complete and record repository-wide adoption of the current round's APIs before final release verification.
- [x] Close the four reopened feedback items and #1772 with current source/emitted/runtime checks, independent review, and unchanged compiler ceilings. [Integrated evidence and editor measurements](composition-feedback-closeout.md).
- [x] Resolve the expanded Workspace root TS7056 failure with the measured private two-file boundary. Final shared-core full-root emission, exact graph/implementation drift rejection, and strict relocation pass; the unannotated control still fails.
- [x] Freeze and repack the inclusive candidate after this production-code delta; refresh installed Coverchart/scaffold/browser checks and independent static review. Final artifact equivalence covers subsequent nonsemantic formatting/proof changes; stale shared-only generated helper files are removed. Current performance costs and dependency limits are disclosed in the handoff.

- [x] Complete the isolated combined release-blocker proof: source/external declaration rejection checks, 57 focused core tests, 189 focused UI tests, lint/plugin checks, unchanged compiler budgets, and paired native editor workflows. Record its memory cost and remaining language/lint limits.
- [x] Review and obtain approval for the record/context update authoring and named declaration header. [Concrete code and tradeoffs](workspace-consumer-friction.md#consumer-surface-for-review).
- [x] Complete the integrated preview-branch benchmark before queued Workspace fixes. [Runtime/DOM update work, compiler/declarations, native editor measurements, fingerprints, and regression disposition](preview-framework-performance.md).
- [x] Review integrated consumer surface, contracts, naming, organization, and repeated wiring. Independent Astra Max review found no correctness or declaration-portability issue; its child-routing coverage suggestion is implemented and mutation-checked.
- [x] Verify precise channels, handler completeness, registration, identities, and lifecycle guarantees for the adopted framework changes.
- [x] Run affected framework/consumer checks and repeated paired editor measurements. Preserve the measured Website cold-access cost in release review; repeat relevant app checks after Workspace changes.
- [x] Rehearse the latest published Coverchart source against the final locally packed candidate. Source/lint, 40 tests, production build, persistence and browser workflows pass. Nine public artifacts are coherent; packed SPA/SSG/SSR scaffolds also pass. [Evidence and scope](next-preview-release-handoff.md#local-verification-evidence).
- [x] Complete final broad source/runtime verification: 53 source configs; core 3,659 passing tests plus one intentional skip and passing coverage gates; UI 1,295; DevTools 6; Workspace 111; Website 1,471; canonical lint-plugin 577 plus fixture typechecks. Release workflow 18 tests, changeset-ignore, and API generation pass. API generation retains 266 external Effect/TypeDoc link warnings. [Counts, logs and scope](next-preview-release-handoff.md#final-local-verification). The final performance comparison is complete with the residual editor costs and bounded runtime scope recorded in the report.
- [ ] After approval and publication, upgrade the actual Coverchart repository to the verified exact package set and repeat published-package acceptance. Its current source and concurrent work remain preserved during local preparation.
- [x] Prepare the stable-migration, previous-preview-upgrade, and new-project content and the manifest-driven handoff generator locally.
- [ ] After approval/publication, bind all three paths to the same verified immutable manifest/deployment; no future URL or package map is guessed locally.
- [x] Complete the independent final static security review over the candidate delta, including the two-interface repair. No new release-blocking code vulnerability was established. The unresolved audit remains 1 Critical, 8 High, 11 Moderate and 4 Low; retain the reviewed reachability limits and maintenance followups. This is not a new Daybreak run or a clean audit. [Report](next-preview-security-review.md).
- [ ] Follow the authorized commit/push and integration gates; do not merge preview work into main.

## Workspace transition and initialization clarity

- [x] Retain Issue Detail and Board Models by entity identity across navigation. Select rendered children from the Route, and verify hidden pending results, retained edits, conflict handling, and child lifecycle behavior separately.
- [x] Replace vague `sync*` and `observe*` transformation names with precise application behavior. Use `init...IfMissingStep` for conditional creation and `handle<MessageTag>` for dedicated handlers.
- [x] Apply parsed URL changes and initialize missing children while retaining existing state. The subsequent simplification removes Board drag-exit orchestration; use Route Transitions when actual entry/exit behavior requires them.
- [x] Simplify saved-view deletion, preserve active filters, and keep an open issue visible while repairing its deleted return destination.
- [x] Assess declaration-derived dynamic Binding initialization before adoption. The exact keyed-array append prototype passes source/emitted/runtime safety but exceeds unchanged compiler ceilings. Reject this encoding and retain explicit `toParentModel` placement. [Assessment and retained implementation](workspace-transition-cleanup-20261025.md).
- [x] Compose meaningful application Steps and apply focused producer helpers where they improve clarity. Review the real split-file consumer for dependency direction and unnecessary bookkeeping.
- [x] After the transition work, assess shared control styling against Tailwind custom utilities and migrate appropriate repeated control recipes.
- [x] Verify source and emitted declarations, focused Story/Scene/browser flows, affected consumers, unchanged compiler counts, and three alternating native editor pairs. No material editor regression is established. [Final measurements and limits](workspace-transition-cleanup-20261025.md#final-verification). Keep publication held for approval.

## Workspace simplification

- [x] Complete the remaining interactive feedback: print optional query fields directly, use direct undefined comparisons, convert the five remaining update Option chains to `pipe`, and retain the user's initializer names. Application source/lint and all 153 tests pass.

- [x] Simplify return-page routing to an ordinary optional query field and the existing Foldkit page parsers. Remove the native URL wrapper, duplicate parsing, and return-query canonicalization. Preserve typed internal navigation and valid filtered return links; source and 153 application tests pass. Refresh release-wide artifact/editor evidence after the remaining interactive review edits.

Example apps should meet realistic product requirements and handle reasonable failure and retry behavior. Ordinary feature composition can expose missing abstractions; unusual event interleavings do not by themselves justify framework APIs or application orchestration.

- [x] Consolidate `src/ownership.story.test.ts` into concrete describe groups in the root `src/story.test.ts` update suite and remove the separate file.
- [x] Remove navigation-during-drag orchestration, its Board Message/operation and delivery gates, and the speculative public UI cancellation API. Retain the independent keyboard interaction generation guard.
- [x] Collapse the background/Close Route helper chain into route-only `pageRoute`, move application selectors beside the Model, and keep Model-aware URL builders in `navigation.ts`. Preserve copied URLs, return context, drafts, save/retry, and optimistic moves.
- [x] Verify the simplified app, UI contracts, ordinary full-root declarations, unchanged compiler counts, 32 browser scenarios across broad/focused runs, and three paired native editor runs. [Scope and results](workspace-simplification-20261025.md).

## Migration support

Breaking beta changes may require a complete application migration. Provide accurate guides, agent prompts, and verified migrations. Codemods and an incremental compatibility bridge are outside this plan. Large diagnostic counts alone do not justify retaining the previous architecture; unclear contracts, incorrect diagnostics, and unnecessary wiring are actionable findings.

## VirtualList preview integration

- [x] Port #1633 from `9499d5264c51c842c3cb11a9d62eb16eb48d7a34` to the current completed generic Block and Composition APIs. Preserve continuous history scrolling, parent-owned fetching, final-page state, dynamic row anchors and accessibility.
- [x] Implement #1722 after the history port: semantic table rows, ancestor/page scroll ownership and positioned rows. Verify coordinate conversion, offsets, programmatic targets and Mount cleanup together.
- [x] Verify source and relocated emitted contracts, focused runtime/Scene tests, browser geometry and existing compiler ceilings. [Evidence and compatibility boundaries](virtual-list-preview-integration-20261027.md).

Review the exact final commit independently before pushing or integrating it.

- [x] Include this work in the preview PR update and announcement handoff, following the user's October 28 clarification. It supports `foldkit-domains` and is separate from the Block/Layer migration requirements. Publication remains held for approval.

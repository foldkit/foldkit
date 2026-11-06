# Preview serialization and input contracts

This report records the November 5 integration state for synchronous Foldkit
serialization, canonical InMessage declarations and keyed lifecycle inspection.
It is an integration checkpoint, not a release receipt. Publication and private
source transfer remain held.

## Final contracts

### Foldkit serialization

- Block Model, local Message and complete generated Message Codecs must require
  no decoding or encoding Services. The complete check includes every generated
  child delivery envelope without erasing its Service requirements.
- The Block `codec.decoding` and `codec.encoding` configuration is removed with
  no aliases. Commands and other explicitly effectful APIs retain their complete
  Effect Schema requirements.
- Service freedom does not prove synchrony. `Serialization.run` checks the real
  parser at Model preservation, Model restoration, DevTools dispatch and
  hydratable Flags handoff boundaries. Schema failures remain typed Schema
  errors; suspension and defects produce a boundary-specific diagnostic.
- Construction stays passive. `Effect.succeed` transformations and JSON Codecs
  for values such as `Option` and `Date` remain supported. A suspended parser's
  fiber receives an interruption request, but uninterruptible work, asynchronous
  finalizers and non-cooperative external Promises are not claimed to be hard
  cancelled.
- Model preservation failure invalidates the stored snapshot without changing
  the live Model. A restored snapshot that fails Schema validation falls back
  to init; a suspended or defective decoder also reports a diagnostic. Replay
  stays in memory. SSR transfers Flags rather than Model or Message, and static
  non-hydrating rendering skips the handoff Codec.

### InMessage declarations

- `defineInMessageUnion` is canonical for ordinary Block InMessage unions. It
  preserves the existing Schema, constructors and matcher while accepting only
  nonempty `Requested...` and `InformedOf...` literal tags. Generated methods
  use `request...` and `informOf...` with the original suffix.
- The bulk adoption manifest records 65 files and 73 declarations. This audit
  also migrated the live `childInstances/pairedFields.ts` test app, bringing the
  tracked current-source total to 66 files and 74 declarations. Its four runtime
  tests pass.
- Local Message and OutMessage unions keep `defineMessageUnion`. Three raw
  InMessage-shaped declaration fixtures are deliberate alternatives:
  `helper-inputs.definition.ts` tests overlapping local/input tags and helper
  inference, `inmessage-union.accepted.ts` proves an ordinary MessageUnion is
  still accepted, and `query-block.accepted.ts` preserves the generic-family
  alternate-Schema contract. They are not migration omissions.
- The erased `ClickedClear` and `ClickedSet` cases remain raw validation probes:
  they prove Block fallback validation rather than authoring canonical inputs.

### Keyed Scene lifecycle inspection (#1895)

- Keyed Bindings now contribute passive Subscription and ManagedResource
  templates to inspection, `Scene.subscriptions` and completed Blocks.
- Scene selects one occurrence with `Subscription.at(Binding, key, entry)` or
  `ManagedResource.at(Binding, key, entry)`. Source fixtures check exact keys and
  payloads; the combined emitted and relocated gate is pending. Raw child
  Subscriptions are rejected by Scene's source types; a Block-aware Scene gives
  raw ManagedResources a diagnostic directing the caller to `.at`.
- An absent key is inactive. Emission or a resource lifecycle result for an
  absent key fails rather than falling through to another occurrence.
- The templates are inspection metadata only. Runtime still starts local
  channels from graph occurrences, so it does not create a second Stream or
  resource acquisition.

## Evidence retained

The proof directory is
`/private/tmp/foldkit-serialization-proof-20261105/`. It records TypeScript
7.1.0-beta and 6.0.3 source, declaration emission and strict relocated-consumer
checks for codec contracts, exact FromAssembly completion and InMessage. The
FromAssembly covariance mutation admits broadened replacement Messages and
therefore makes the intended negative assertions unused; restoring the exact
proof restores rejection.

- Serialization boundary suites: six files, 209 tests passed
  (`/private/tmp/foldkit-serialization-boundary-tests-20261105.log`).
- Graph/lifecycle suites: four files, 58 tests passed
  (`/private/tmp/foldkit-serialization-graph-tests-20261105.log`).
- The Promise-backed SSR Flags mutation fails the synchronous assertion; the
  restored source passes one selected test with 97 skipped
  (`foldkit-serialization-async-{mutation,restored}-20261105.log`).
- The keyed inspection focus passes eight Runtime/Scene tests. Its accepted,
  consumer and rejected declaration projects pass, including wrong key,
  payload, acquired value and foreign-source controls.
- The contract changesets are
  `synchronous-block-serialization.md`, `canonical-inmessage-unions.md` and
  `keyed-scene-lifecycles.md`.

The rebuilt integration passes all eight unchanged compiler ceilings, recursive
workspace typechecking and the complete Core suite: 4,251 passing tests with one
existing skip. The ordinary Subscription identity diagnostic caught by that
suite was repaired and verified in the green run. The logs are
`/private/tmp/foldkit-contracts-final-ceilings-20261105.log`,
`/private/tmp/foldkit-contracts-final-repo-types-20261105.log` and
`/private/tmp/foldkit-contracts-core-tests-green-20261105.log`.

The complete emitted-declaration gate is pending migration of older positive
fixtures that assert Service-dependent Block serialization. The targeted
Source, emitted and relocated contract proofs above do not replace that gate.

## Preserved records

The five raw InMessage sources below belong to explicitly isolated prototypes,
not active consumers. Their READMEs describe their historical verification
scope, so this integration leaves their bytes unchanged.

| Source                                                                              | SHA-256                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `internal/inmessage-update-prototype/src/context.ts`                                | `00366e3e277ed02950db91017e054cc515051df0ac6887f452d185ec676adab4` |
| `internal/inmessage-update-prototype/src/definition.ts`                             | `5e32a1da13fe7b76cf85cca16ceb19b3d90764632a091534e5a33e615dc1b36c` |
| `internal/inmessage-update-prototype/src/editor.ts`                                 | `98c8177a538db4a5f5b9ccb439857e6426bda4ae6e688ec03323f6c0559a002f` |
| `internal/layered-constructor/inmessages/consumer/src/chatRoom/inMessage.ts`        | `6d4d5373926934782cc5145d38d48f6a2b7129ff4945bb06a37450fffa076cfe` |
| `internal/layered-constructor/inmessages/consumer/src/messageComposer/inMessage.ts` | `69c89d761555786c6db61ac795842e26cf2ce405a34c56106e05af8b86e5f499` |

`probe/current-child-instances/counter.ts` is likewise frozen probe evidence at
`38da180aa5dc59826f07a52abc6799a8e385622b0c01c1ba1d797f228596da5c`.

Before the Workspace discussion, these eight user review files matched the
preserved manifest:

| Source                                          | SHA-256                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `examples/workspace/src/composition.ts`         | `e351adaabacaa34a368e587f63f58ef29b6d46cba656f231ba60f3e02aa01805` |
| `examples/workspace/src/draftProtection.ts`     | `1003904bafb367ee00deaa98a2d06da2249125eee82737fac27e52ae70c50674` |
| `examples/workspace/src/listbox.ts`             | `04ef327ca4a968df3e34567fdb6b10d7af0c8f2971645077c17ed28e37899613` |
| `examples/workspace/src/route.test.ts`          | `3bc5c94a0764608ed2f71a8e62bacb31ff811cda2700ea2bcb41e97cdd133602` |
| `examples/workspace/src/scene.test.ts`          | `a835263fbba0ba053e8afc404f3f410e45670d87bd10cb83b104e0dc8f69c5d2` |
| `examples/workspace/src/selection.ts`           | `55ee1ce84ea4569a88ed32cb0cc130d336195ed3416bbd075073f8041842bd23` |
| `examples/workspace/src/update/update.ts`       | `cc3b506b01d89f7cc223b9dcffaec2612ab57441f2b020e476d089e7a99dc539` |
| `examples/workspace/src/update/initChildren.ts` | `bff5aa2aa465074e93e2a39f100787346b96c31b30c88898cae75101aca70d43` |

The user subsequently approved the workflow organization and naming changes
from item 1. The root update now lives in `src/update.ts`, its resolved review
comment is removed, and issue, move, and navigation transitions live under
`src/steps/`. The composition's curried-fold comment is retained. Child
initialization moved unchanged to `src/steps/initChildren.ts`, including its
unresolved comment. At that checkpoint, the other five review files retained
their recorded bytes.

The user then approved simplifying Workspace state ownership. Current Issues
remain in the parent workspace. Issue Detail receives the confirmed Issue as
view input and dispatch Context; it retains only its editing snapshot and save
feedback. Its incoming-revision field and `InformedOfIssueChange` input are
removed, together with the parent's editor-reconciliation Steps and broadcast
loops. Clean views derive directly from current data. Before handling editor
input, a composed `makeUpdate.each` stage refreshes a clean snapshot, including
before nested Listbox routing. Dirty drafts keep their historical baseline;
compatible saves use the current canonical revision, actual conflicts require
reload, and pending saves retain exact completion admission.

The Board now changes its own announcement when an accepted drop emits
`RequestedMove`. Only asynchronous move failure needs an inward notification.
The four new move-workflow comments are resolved and removed. No framework API
was added for this cleanup. Binding OutMessage folds do not directly receive
the parent's dispatch Context; the existing ordered-update composition supplies
the required clean-draft invariant before routing.

The Workspace checks pass: all 150 tests in 20 files, typecheck, application
lint, Effect lint, and formatting. The tests use normal built package exports.
The obsolete child reconciliation-protocol tests were removed; current-parent
Stories cover changing canonical data, first text and Listbox edits, compatible
save versions, retained drafts and conflicts. A root Scene also checks that a
clean editor immediately renders refreshed fields without changing its retained
Model. At that checkpoint, draft protection, Listbox, routing-test and
child-initialization review files retained their previous bytes.

The user then approved item 2's child-initialization cleanup. `initChildren`
now composes two named parent Steps: initialize the selected issue and initialize
the selected project page. Issue selection reuses the confirmed-workspace
selector; Board/settings initialization looks up the project once. The
application owns route/entity selection and retaining visited Models.
`makeInitIfMissingStep` already owns the missing-entry check, child initialization,
Model insertion and lifted init Commands, so no new framework API is required.
URL changes and successful loads retain their existing call sites and ordering.
The resolved initialization comment is removed, and the README records the
responsibilities. All 150 tests, typecheck, application/Effect lint and formatting
pass after the refactor. At that checkpoint, draft protection, Listbox and
routing-test review files remained unchanged.

The user then approved a domain-query pass throughout the example, with domain
concept namespaces imported through the domain barrel. `domain/index.ts`
exports `Issue`, `Project`, `Member`, `Workspace`, `SavedView` and `Notification`.
Each module owns its Schemas and pure operations, including entity lookup,
project/status membership, assignment, editing revisions and comment handling.
Callers use `Workspace.findProject`, `Workspace.findIssue`,
`Workspace.issuesForProject`, `Issue.forStatus`, `Issue.assignedTo` and
`Member.findById` instead of repeating their scans. Model-aware selectors unwrap
`AsyncData` and delegate. Repository validation uses the same queries while
preserving boundary errors. Pure entity-replacement operations now live with
Workspace; notification policy and optimistic state remain with their owners.

Consumer imports, types, fixtures and read-only queries were migrated together.
Schema literals and encoded shapes remain unchanged. Domain siblings use direct
namespace imports internally so their barrel does not create dependency cycles;
all consumers import through the barrel. Search algorithms, drag calculations,
identity-allocation predicates and tests constructing deliberate absence retain
their purpose-specific collection operations. The README records the domain
namespace convention. The 150 tests, typecheck, application and Effect lint,
formatting and production build pass. Independent review found no actionable
regression in Schema shapes, query ordering, comment identity/order, repository
boundary validation or draft/save behavior.
All unresolved review comments remain in place alongside their authorized edits.

The user subsequently approved a focused framework extension for this remaining
initialization plumbing. `makeInitIfMissingStep` now accepts either its existing
concrete configuration or a Model-first producer returning
`Option<{ key, args }>`. The parent Model, exact key and initializer tuple are
contextual, including nested `pipe` / `Option.map` callbacks. Configuration
remains passive. Interpretation resolves the original registered Binding,
evaluates the producer once against the current Step Model, and either preserves
that Model for `None` or delegates the selected request to existing map
initialization. Even `None` requires the original registration and supported
storage; missing children retain all init Commands. No effectful construction or
extra lifecycle phase is introduced.

Workspace uses three independently authored produced Steps for Issue Detail,
Board and Project Settings. Model-aware entity selectors delegate to the domain
queries. Composition imports the shared issue/navigation workflows from their
responsibility modules instead of the Steps barrel, keeping initialization out
of that dependency path so the portable Binding-based initializer expressions
can be declared directly. The README, active init/Block/upgrade docs, runnable
snippet, scaffold, skills and changeset describe both forms.

Verification for this working-tree extension:

- TypeScript 7.1 and 6.0 source contracts pass, including exact Model, branded
  and numeric keys, required/optional/rest arguments, extracted producers,
  Commands, Services, no OutMessage channel and registration evidence.
- External accepted emission and rejected cases pass under both compilers.
  Both emitted outputs pass both compilers' source-free relocated consumers;
  no original fixture source or checkout paths are loaded.
- All 99 focused initialization, Binding and Layer runtime tests pass across
  eight files, including current Model after preceding Steps, identity on
  skipped/existing children, preserved Commands, erased invalid output/storage,
  wrong graphs and alternative selected child implementations.
- Core/UI builds, Core and Website typechecks, all 150 Workspace tests,
  scoped lint/format checks and Workspace production build pass.
- Independent read-only review finds no actionable issue in passive/current-Model
  execution, skipped-path registration, constructor-owned Layer connection
  selection, static snapshot behavior, type channels or Workspace dependency
  ordering. Unresolved user review comments remain intact.
- Seven unchanged compiler fixtures pass after the fresh build. The fourth
  Workspace fixture reports 241,889 Types against its unchanged 229,173 ceiling.
  Controlled copies reproduce the original and current counts and isolate the
  entire increase to the previously paused keyed Scene selector declarations.
  The initializer declaration is not loaded by that fixture; applying only its
  new declaration to the old package preserves the exact original counts.
  Fixtures and budgets remain unchanged. The keyed Scene compiler issue remains
  open for that workstream; this is not a claim that the combined release gate
  is green.

Local focused receipts are under `/private/tmp/foldkit-init-producer-*`, with
external declaration evidence in
`/private/tmp/foldkit-insert-producer-emitted-proof-20261105/proof.log` and the
compiler attribution in `/private/tmp/foldkit-perf-attribution.LWLYNs/results.md`.

The next approved domain cleanup moves the Board-specific pending-move union
to `Issue.MoveState` and its pure display projection to
`Workspace.withPendingMove`. The root Model still owns `issueMoveState`; its
variants, fields and projection behavior are unchanged. Consumers use the
domain barrel, the former `optimistic/` directory is removed, and the README
reflects the new ownership. All 150 Workspace tests, typecheck and scoped lint
pass.
The remaining comments await discussion; release checks and the benchmark stay
paused at the user's request.

The approved link-helper cleanup moves `issueHref`, `issueFiltersHref` and
`issueHrefs` into `route.ts` and removes `issueLinks.ts`. Callers supply the
Route and applied filters explicitly, so the Route module has no Model or
selector dependency. Existing URL behavior is unchanged. All 150 Workspace
tests, typecheck and application/Effect lint pass.

## Workspace review item 3: keyed OutMessage folds

Parent-owned keyed Bindings accept an authored `makeOutMessageFold` directly
or a key-dependent callback returning that helper. Compatible extracted
factories can be passed directly. Explicit `(key, outMessage, context) => step`
adapters remain supported. Runtime uses the existing helper registry to
distinguish a returned fold from an ordinary Step, validates a produced helper
against its child and role, and supplies the real OutMessage and FoldContext.
No producer runs during policy selection or for an absent occurrence. Parent
Steps receive the Model after the child write, with original previous-Model
context, scoped child Commands, parent Commands and OutMessage precedence.

Exact helper and Binding-policy evidence share their internal module so the
checker does not encounter a new type-dependency cycle. The original helper
type module re-exports the same evidence; there is no second brand or public
authoring stage. Native low-level callback contracts are unchanged. The
existing uncurried fixtures remain compatibility coverage.

Workspace uses direct Issue Detail/Project Settings folds and a key-dependent
Board fold. Job Application passes its three extracted entry factories
directly. Toast keeps a callback because its self-referential factory is
declared later; Dialog and the relevant UI fixtures use the matching shorthand.
The new runnable documentation snippet shows both forms. The resolved Workspace
comment is removed; the other review notes remain for discussion.

Verification covers all 64 focused Core tests in seven files, 167 UI tests in
eight files, 150 Workspace tests, 68 Job Application tests, and 986 documentation
checks. Core/UI and both application typechecks/builds pass, as do Website's
direct typecheck, the new snippet's typecheck, scoped lint and formatting.
TypeScript 6 and 7 source, emitted and cross-consumed relocated contracts check
branded/numeric keys, exact payloads and Models, FoldContext, extracted helpers,
Command/Service requirements, wrong child payloads, wrong parent Models,
unregistered sibling operations, unsupported raw matchers and missing handlers.
The relocated consumers contain emitted declarations without original accepted
or framework source. Existing fold, policy-selection, descriptor-fold and
channel-loss source fixtures are also checked.

Seven unchanged compiler fixtures pass. The four-group Workspace fixture
reports 242,081 Types against its 229,173 ceiling, compared with the pre-task
241,889; Instantiations are 2,735,624 versus 2,735,560 before. The eight-group
fixture remains within its ceilings, and Machine exactly preserves its original
69,558 Instantiations / 13,180 Types. Budgets and fixture sources are unchanged.
This feature does not resolve the paused keyed Scene inspection blocker.

Receipts use `/private/tmp/foldkit-keyed-fold-*`; the external proof is in
`/private/tmp/foldkit-keyed-fold-emitted-proof-final-20261105/proof.log`.
Release checks, rendering benchmarking, publication and private review transfer
remain held.

## External and release state

- `origin/main` remains `a471adb24d750ab9e8d8312edad53ff6f26d961b`.
- #1895's native keyed inspection is implemented. Canonical Block/Layer-aware
  selection needs deferred resolution and is unfinished; that work is paused
  during the Workspace discussion. No published package contains the remedy.
- #1890 refreshed to head `2223f2aa9166bf69c28aa149705de49a5e5ec75f`.
  The refresh contains only the merge-base update, an empty current diff and no
  fresh review discussion. The older contributor work is already included in
  the preview integration.
- Rendering-cache performance remains a separate investigation. The adopted
  context-allocation reduction is small measured progress, not the reported
  41% fix, and awaits a final quiet benchmark.
- Final combined build, source/emitted/relocated declarations, all eight
  unchanged compiler ceilings, full Core and downstream suites, independent
  exact-candidate review and publication authorization remain pending.

## Workspace naming and child notification spelling

The user approved the framework-wide `InformedOfX` → `informOfX` rename. `RequestedX` still generates `requestX`; no old-name alias remains. Runtime and type-level derivation share the same naming helper. Exact operation keys and payloads are checked in source and source-free relocated consumers. UI's explicit notification adapters use the same spelling, including Calendar/DatePicker constraints, Tooltip delay and VirtualList item/history notifications. Active applications, snippets, guides, scaffold instructions, skills and lint fixtures follow it. Historical release material and explicitly labelled migration-before names remain intact.

The Workspace audit reviews each name at its call sites and distinguishes a request, an operation, an accepted result and a derived value:

- A Board's `RequestedMove` invokes `moveIssue`, which records pending placement and returns `MoveIssue`. The redundant intermediate transition is removed. Success uses one fields-only handler; failure matches RepositoryError explicitly and preserves conflict merging, announcements and retry. MoveState has parallel Idle/Moving/Failed variants.
- `Issue.SaveResult` and `Issue.MoveResult` are partial mutation responses. Revision merging and confirmed comment recording have separate names and contracts. Accepting the newer revision and detecting a new assignee are separate domain rules.
- The Notification Center receives concrete issue-comment or issue-assignment facts. Notification derivation, recipient filtering and existing read-state preservation stay there. A stale conflict carrying a new comment uses the current confirmed assignee after revision merging. Focused Stories cover that overlap and duplicate/stale assignment results.
- Child outputs report the fact established at that boundary: `RequestedClose`, `DetectedSaveConflict` and `SubmittedSavedView`. The unused IssueList clear-filter input that only echoed a request back to the parent is removed. The clear button directly asks the parent, which owns filters.
- `baselineRevision` and `savedProject` distinguish editor baselines by their actual data. Project-to-draft conversion is shared by initialization, discard and success. Comment draft detection is `hasCommentDraft`; summaries cover unsaved fields or comments.
- Selectors live in `selectors.ts`; conditional Route-owned initialization lives in `steps/initRouteChildren.ts`. Names distinguish confirmed Issue data, display projection and effective filters. Link maps are `issueHrefsById`, the activity counter counts emitted requests, repository latency and notification time carry millisecond units, and Command Palette context labels are not called descriptions.

Ordinary operation names such as `saveIssue`, `createIssue` and `saveProject` remain: an imperative transition can compute pending state and Commands without claiming the effect already completed. Dedicated `handle<MessageTag>` names remain for single-Message handlers. Existing domain collection merging, scoped state names, and concise view helpers remain where their context makes their meaning clear. This is not a mechanical synonym or prefix migration.

Publication, Daybreak transfer, release verification and the rendering benchmark remain held during the user's interactive review. The existing keyed Scene compiler-ceiling issue remains a separate open item; this rename exactly preserves the prior compiler counts and unchanged budgets.

Verification for this pass:

- Workspace: 152 tests in 20 files, typecheck and production build pass, including duplicate/stale assignment and older-conflict comment-recipient regressions. The shared repository consistently names its workspace-wide comment operation `addIssueComment`; the nested Comment Composer keeps its contextually clear `AddComment` Command.
- Focused Core runtime: 97 tests in nine files; affected UI: 262 tests in five files. Routing, Job Application, Typing Game and UI Showcase retain all 142 tests across their 27 files. Their typechecks, Website, UI and DevTools typechecks, and Core/UI/DevTools builds pass.
- Full Core and UI source/emitted/rejected/relocated declaration gates pass. One rejected keyed-Subscription call is laid out on a single line so both compiler generations attach the expected diagnostic to the same expression; the foreign-source rejection is unchanged. The InMessage-union fixture independently emits under TypeScript 6.0.3 and 7.1 beta, and both outputs pass both source-free relocated compilers. Exact generated keys exclude the former inform spelling, and runtime no-alias coverage passes.
- The lint-plugin suite retains all 812 tests and real-fixture typechecks. The 986 documentation checks, affected application/general/Effect lint, scoped formatting, script typecheck, skill-version gate and diff checks pass.
- Seven of eight unchanged compiler fixtures pass. Workspace composition four remains at 2,735,624 Instantiations and 242,081 Types against its 229,173 Types ceiling, exactly as before this rename. Workspace eight remains 4,409,399 / 292,113, and Machine remains 69,558 / 13,180. No ceiling or fixture source was changed.

Receipts are retained under `/private/tmp/foldkit-inform-of-*` and `/private/tmp/foldkit-workspace-names-*`; the crossed declaration proof is `/private/tmp/foldkit-inform-of-emitted-proof-20261105/proof.log`. Independent read-only review of the pre-audit/current Workspace pair found the final protocols consistent end to end, preserved accepted/stale mutation semantics and no unintended user-visible string change. Unresolved review comments remain for the next discussion. No commit, push, private source transfer or publication was performed.

## Latest Workspace comments and Listbox review

The user's next inline comments are addressed without a public framework rename:

- `view/view.ts` selects loading/failure/not-found states and composes the root. `view/workspace.ts` owns loaded workspace rendering, with named header, page pane and issue-editor helpers. Route and Option branches use their matchers. Existing layout classes, entity keys, missing-entity behavior and independent scroll containers are preserved.
- `Binding.embedView` is retained: it constructs the placement-aware `h.block` configuration, including Message mapping, graph identity and Mount evidence. It does not render the child directly. The shorter `view` name would obscure that distinction from actual renderer functions.
- Parent `RequestedSave` is separate from the local submit fact and shares `saveIssue`. Its current Issue stays in update context, supplied by the Binding when applying the transition, rather than carrying a captured Issue snapshot in the request.
- The saved-view Scene is one routed interaction from a filter-bearing URL without session metadata through closing the issue and showing the fallback list. Project/workspace navigation is also one Scene with a URL change. One redundant Route Schema round-trip/type-rejection test is removed; application URL encoding, defaults, explicit saved-view reset marker, malformed query fallback and selected-issue preservation are retained.
- Story/Scene namespace imports are the default across active applications, snippets, scaffold tests and guidance. The migration resolves imported symbols, preserving shadowed callback names and shorthand property keys. Published history, migration-before snippets, declaration fixtures and low-level framework examples are preserved.
- Item 4 is confirmed as Listbox typing. `StringListboxOption` has its adjacent decoded alias, `Issue.SortBy` names the literal domain, shared view settings are separated from generic option/value types, and the adapter's callbacks infer their inputs from its return contract. The old `Omit` reconstruction is removed.
- Normal Create Issue selections use their corresponding specialized child contract. The later Schema-backed Listbox rollout moves invalid status/priority rejection to the framework Codec boundary and removes the redundant parent guards and their Story. `Story.messageIn(binding, message)` handles a local Message in the bound child and observes the composed parent result; it does not turn that Message into an InMessage.

The seven enum checks remain actual boundaries. Listbox's generic arguments refine view inputs, operations and advertised OutMessages but do not specialize the runtime String Message Schema. The coherent framework follow-up is the existing #1809 Schema-backed selection-factory investigation: receive the Value Schema and derive local selection Messages, operation inputs and Selected OutMessages from it. A type-only constructor refinement would leave decoding broad. This comment cleanup does not silently ship that broader UI API redesign; its concrete authoring shape is the next review decision.

Verification for the comment cleanup: all 152 Workspace tests, its native TypeScript 7 and TypeScript 6.0.3 checks, production build, application/Effect lint, formatting and diff checks pass. The root Scene suite additionally verifies the unified navigation flow. The new decoded-input Story protects both status and priority without casts. Namespace migration checks pass for all 35 examples, Website, Typing Game, create-foldkit-app source and the base/SSG template harnesses; 77 representative migrated tests and 986 documentation checks pass. The standalone SSR template harness lacks its template-only installed dependencies, so its direct typecheck is not counted as passed; the package's own typecheck passes, and generated-project installation verification remains part of the held release gates. Published/historical test snippets and low-level declaration fixtures are intentionally not migrated.

The pre-edit Workspace source and comments are preserved under `/private/tmp/foldkit-workspace-review-comments-before-20261105-33fme2ch/src`. Focused receipts use `/private/tmp/foldkit-workspace-review-comments-*` and `/private/tmp/foldkit-workspace-listbox-boundary-tests-20261105.log`. No commit, push, release, benchmark, or private review transfer was performed.

## Schema-backed Listbox values

The Single and Multi Listbox factories accept `makeBlock()` for unrestricted strings, `makeBlock(Value)` for string values, and `makeBlock(Item, Value)` for object rendering items. Generic-only narrow contracts are removed. Value is a service-free Codec with its exact encoded representation; it supplies the actual `RequestedSelectItem.item`, `SelectedItem.item` and `Selected.value` fields. A generated parent Message envelope retains that same Codec. Item supplies view typing only, so an Item Schema's encoding and Services do not become Block requirements.

A view either supplies `itemToValue` or supplies items already assignable to Value. The input union narrows the latter branch to `ReadonlyArray<Item & Value>` and installs `Function.identity`; mapped inputs pass their original extractor directly. This needs no cast, per-item wrapper array, or Schema execution during render. An equivalent conditional required/optional extractor caused unresolved generic constructor validation. The union expresses the actual supplied-array guarantee while preserving the original validators and contextual inference.

Both variants use the existing Combobox family construction pattern: passive per-Schema declarations, a shared construction Layer, exact specialization identities, and the original Animation child and handler recipes. Selection stays parent-owned. Configuration, acquisition and init do not evaluate Value transformations or view-only Item Schemas. The TypeScript and runtime selection channels agree, allowing Workspace's seven repeated enum checks to be removed. URL decoding, missing entities, stale asynchronous results, conflict handling and optimistic rollback keep their application boundaries.

Active Workspace, Website, UI Showcase and DevTools consumers use the new factory forms. Plain dynamic string controls in Job Application, Pixel Art and Query Sync use `makeBlock()`. Query Sync's route-value decoding is deliberate: its options include an empty string alongside route literals. Active snippets, selection documentation, scaffold guidance and skills describe the real Value boundary and the view-only Item witness. The frozen family-port experiment and published history retain their original API and measured limitations. `.changeset/schema-backed-listbox-values.md` contains the breaking migration.

Verification:

- All 1,408 UI tests pass across 70 files, including six focused runtime/Scene cases for literal and transformed Codecs, complete parent dispatch, specialization isolation, actual object-item clicks and construction passivity. Restoring broad String selection Codecs temporarily makes three new tests fail on invalid acceptance, encoded round trips and the generated parent envelope; restoring the implementation makes the suite green.
- UI production build and complete Source checks pass. Source acceptance/rejection covers 0/1/2 forms, branded/literal values, numeric encodings, generated Binding arguments, exact OutMessages, Service rejection in both directions, view-only serviceful Items, required mapping and separate Single/Multi providers. TypeScript 6.0.3 and 7.1.0-beta pass these cases.
- The standard UI emitted-declaration gate passes. External package emission and all four emitter/consumer combinations across TypeScript 6 and 7 pass with relocated declarations and no original Source imports. Actual split-file Workspace production emits 178 declarations and relocates successfully under both compilers; root Block/Layer and the Status Listbox contract are exercised without additional application annotations or TS7056.
- Workspace's 151 tests and production build pass. Seven affected projects typecheck: Workspace, Website, UI Showcase, DevTools, Query Sync, Job Application and Pixel Art. Focused Website/UI Showcase/DevTools tests and 987 Website documentation/snippet checks pass. Scoped lint, formatting and diff checks pass.
- All eight unchanged compiler fixtures produce the exact pre-fix counts. Seven meet their ceilings. The separately tracked keyed Scene work keeps `workspace-composition-4` at 242,081 Types against 229,173; no workload or budget was changed, and this is not counted as a passing compiler gate.
- Independent targeted review of the Listbox implementation, contracts, tests and seven Workspace guard removals finds no actionable issue. It excludes the unrelated dirty-tree work.

Receipts are `/private/tmp/foldkit-listbox-schema-*20261105.log`, `/private/tmp/foldkit-listbox-emitted-cross-20261105-tysLHt/`, and `/private/tmp/foldkit-workspace-listbox-emission-20261105/`. The unchanged compiler report is `/private/tmp/foldkit-listbox-schema-compiler-ceilings-20261105.log`. No commit, push, release, rendering benchmark or private source transfer was performed for this review item.

## Completed inline-comment audit

The preserved pre-edit Workspace review copies were compared with the active implementation after the Listbox work. Every comment in this review round has an implemented change or an explicit answer: names and state ownership; domain queries; child initialization; keyed OutMessage folds; view decomposition and Route/Option matching; test organization and Story/Scene namespace imports; application URL-test scope; option types, specialized child selection and runtime Value validation. Website organization, UI imports, decorative headers and mutable test captures are covered by the earlier cleanup record.

Two answers preserve the existing design. `Binding.embedView` constructs the placement-aware configuration consumed by `h.block`, so its name remains distinct from rendering. The current confirmed Issue is supplied through dispatch context to `RequestedSave`, so the request uses current canonical data rather than carrying a captured Issue snapshot. The corresponding questions are resolved rather than silently left pending.

No user review questions remain in the active Workspace application files. The remaining source comments there are three intentional browser, layout and keyboard-focus notes. The active Website/Typing Game sources also contain no pending Codex review markers or free-form review questions. Stale unchecked task-board entries for this round are corrected; earlier dated checkpoint paragraphs retain their original scope. The separately open compiler ceiling, final rendering comparison, feedback refresh, combined release verification and exact-candidate review are release work, not unresolved inline comments. Publication and private source transfer remain held.

This status audit changes tracking documentation only. Formatting and diff checks pass; no application code, tests, commits or external services were changed.

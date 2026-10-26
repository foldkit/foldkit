# Workspace program audit

Scope: `examples/workspace/src`, registration, effects, ownership, routing, canonical data, lifetimes, accessibility, and desktop/mobile rendering. Verification below distinguishes the initial measured freeze from the later Command-Step, product, and draft-retention passes.

The initial blockers and verdict below describe their recorded audit freeze. Their later framework dispositions are in [the integrated performance and safety report](preview-framework-performance.md). The [October 24 Listbox checkpoint](workspace-listbox-consolidation.md) verifies the larger control graph, 118 application tests, 20 production browser cases, and complete declaration emission/strict consumption. These records retain separate source identities; they do not certify concurrent followup edits.

The review used `skills/audit-program/SKILL.md`, the architecture and conventions references, the composition guide, the verification checklist, and every canonical blind spot. Live comparison targets were Typing Game's root/room composition and Kanban's DragAndDrop integration. The separate Query assessment retains direct AsyncData ownership for this application's mutation reconciliation and child initialization policy.

## Latest Workspace checkpoint

The [October 24 ownership pass](#october-24-editor-ownership-audit) supersedes the application-ownership findings below. Earlier freeze and framework-release evidence retains its original scope.

The [notification and assembly checkpoint](workspace-feedback-followup.md#notifications-and-application-assembly) verifies always-on activity, recipient-specific notifications, 149 application tests, 29 production browser cases, and ordinary Website-style application assembly. Source, lint, build, and reusable feature emission/relocation pass. Full-root declaration emission with ordinary application authoring reaches TS7056; it is recorded as a framework serialization limit, with no application-only staging workaround. The earlier root-emission successes below describe their original named-contract source snapshots.

The [Workspace feedback followup](workspace-feedback-followup.md) is verified after the historical audit freeze below. Issue List is controlled by URL-owned filters and reports changes through OutMessages. Live search uses `ReplaceFilters`; status, sort, grouping, and clear use `NavigateInternal`, so committed changes remain available to browser Back/Forward. Issue List, Board, and member assignments render parent-supplied native links. Their validated return context preserves the complete originating route, including effective saved-view filters when session metadata is absent after reload. Unknown bare saved views remain unavailable, while explicit filtered URLs render as Filtered issues.

Internal and external navigation now have separate Commands. Repository-backed Command handlers capture `WorkspaceRepository` in their constructors and perform work in the returned invocation functions. Canonical workspace data remains root-owned AsyncData for revision reconciliation, optimistic rollback, and load-time child initialization. This pass adds no framework API and does not adopt Query.

The earlier URL-policy checkpoint passed 144 application tests across 23 files and 26 isolated production browser cases. Its named-contract source also passed source checking, lint, formatting, build, 82-file declaration emission, and strict relocated consumption. The notification checkpoint above has a different source scope and uses ordinary application assembly. These results do not change the frozen published/package snapshot. Publication remains held.

## BLOCKERS

Application source/runtime: None at the audited freeze.

- `examples/workspace/src/block.ts:12`: Full-application declaration emission still fails with TS7056 at the inferred preparation/export boundary. The generated 16/32 scale cases also fail declaration serialization. Fix: continue framework inference/serialization work and rerun strict emitted-declaration checks. Source typechecking and the passing 4/8 fixtures do not establish that the full application emits. No cast, broad annotation, weakened Service channel, or alternate consumer API was introduced to hide the failure.
- Connected `combineSteps` discard prevention remains a framework release blocker. The complete static candidate rejects policy-local and cyclic cases but fails budget/integration gates: its faster cached-output encoding permits channel erasure, and accurate update-wide operation contracts reject silent Animation/Calendar combinations. The candidate was removed from shared source; runtime rejection is retained and does not satisfy the static requirement. The isolated per-Message handler-record alternative also lacks mandatory validation and is not adopted. See [the exact proof and disposition](workspace-consumer-friction.md#connected-combinations-and-outmessages).
- Raw inferred Message-match results can lose local Command/OutMessage channels when mixed with opaque connected recipes. The generic correction failed compiler-budget and UI declaration gates and was removed. Definition-owned Steps preserve the supported Workspace consumer contract; this is not universal enforcement for raw results. See [the scoped repair and remaining gap](workspace-consumer-friction.md#mixed-matcher-return-channels).

## QUALITY

None remaining in the audited application source.

## NICE-TO-HAVE

None recorded.

## VERDICT

**NEEDS-WORK for the combined application and framework-scale closeout.**

The application source/runtime audit passes at this freeze. Its source typecheck, application lint, Effect lint, and 87 tests across 20 files pass. The full application's emitted declarations and the 16/32 generated serialization cases do not pass. The final 14-case browser rerun passes, including optimistic board placement and keyboard focus while saving. The callback migration has since passed the full core/UI source and emitted harnesses, affected consumer checks and tests, independent review, and unchanged compiler budgets. It does not fix the declaration-serialization finding.

## Resolved findings and evidence

| Finding                                                           | Resolution and evidence                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved-view navigation reset current list configuration            | `update.ts` compares the previous effective route. Opening/closing details within the same saved view preserves list state. An isolated regression failed before the fix and passed afterward.                                                                                         |
| Handwritten remote load state                                     | `model.ts` uses `AsyncData.Schema(WorkspaceSnapshot, Schema.String)`. A real failed LoadWorkspace execution preserves the routed editor and its unsaved draft during refresh failure.                                                                                                  |
| Successful refresh left an existing editor stale                  | SucceededLoadWorkspace updates canonical data and calls `informOpenIssue`. The new Scene loads a newer repository revision, preserves a dirty draft, displays the latest list row, and allows Reload issue. Removing only the notification makes that Scene fail.                      |
| Canonical updates bypassed field transformations                  | Canonical snapshots use `modifyFields` and `AsyncData.map`. `applySnapshot` transforms its current workspace field directly. Its merge retains newer issue revisions and issues absent from an older snapshot.                                                                         |
| Board results needed immediate feedback and safe failure recovery | Root-owned optimistic moves update canonical order/status immediately. Rollback retains newer issue content and restores placement. Busy controls share the root MovingIssue/SavingProject gate. Board/rollback tests and the actual keyboard drop/focus check pass.                   |
| Native form/control integration                                   | Eligible controls use Input, Textarea, Select, Button, Fieldset, Checkbox, and the bound Dialog/DragAndDrop components. Native elements are rendered through actual component attribute groups. The palette keeps its explicitly requested application-owned search/keyboard behavior. |
| Whitespace project names silently did nothing                     | Project name now has Required and a non-whitespace Pattern. Actual Chromium validation rejects spaces with a native validation message and accepts an ordinary name. The update guard remains.                                                                                         |
| Saved-view route string duplicated routing policy                 | ClickedSavedView uses `savedViewRouter({ viewId })`. Other authored navigation uses the bidirectional route printers.                                                                                                                                                                  |
| Command checks used display names                                 | Tests use original Definitions/instances for pending Command matching. The redundant boot-load name comparison was removed; real handler executions retain the canonical handler graph and replace the repository Service.                                                             |
| Palette keyboard selection scrolled out of view                   | The owned ScrollActiveResult Command uses `Dom.scrollIntoView` after commit. Scene/Story resolve exact original Command instances. Forcing the wrong index makes the test fail. Desktop and mobile browser checks keep the last active option inside the scroller.                     |
| Activity recovery retained an old error                           | SucceededAppendActivity updates canonical data, informs the open editor, and replaces the old notice. The recovery Scene failed on the stale notice before the fix and passes now.                                                                                                     |
| Root view responsibilities were concentrated in one file          | `view/` separates sidebar, project, settings, navigation, styles, and root assembly. IssueList separates contracts, update, filtering, rows, and toolbars. Domain fixtures live in `domain/seed.ts`.                                                                                   |
| Missing-page headings and control polish                          | Settled routes have one h1. The live-activity cursor, checkbox alignment, select chevrons/right padding, disabled controls, text contrast, and focus treatment were corrected. Styling remains Tailwind utilities; `styles.css` contains only the Tailwind import.                     |
| Assembly boundary spacing                                         | Every checked Block export follows its private `prepare` immediately. The root retains the ordinary explicit preparation shape.                                                                                                                                                        |

## Verification evidence

- Final source gates reported by the lead: 87 tests in 20 files, source `tsc`, application lint, and Effect lint pass. Formatting and the final 14-case browser rerun pass.
- This audit's fresh Chromium route sweep found one h1 and no unlabeled visible input, select, or textarea on All issues, My issues, Board, Project settings, People, Settings, issue detail, unknown project, and unknown route.
- Responsive checks found no horizontal document overflow on All issues, issue detail, Board, and Settings at widths 320, 360, 390, 768, and 1440 pixels.
- Fresh desktop/mobile palette and navigation checks reported no page errors. At 390 pixels the document width was 390. Keyboard selection scrolled the desktop result list to 212 pixels with a 420-pixel visible list and kept the active option in view.
- The board owner verified actual Space → ArrowDown → Space behavior: optimistic movement appears immediately, the pending handle retains focus and its marker, repeat activation is inert while pending, controls re-enable after completion, and focus remains on the handle.
- New recovery tests were checked against deliberate isolated regressions: missing load failure, cleared project draft, discarded refresh data, and omitted successful-refresh editor notification each fail for the expected reason. Production source was not mutated for these checks. Activity recovery failed against the actual stale-notice defect before its fix.
- Shared Vite aliasing, the Foldkit Vite plugin, workspace dependencies, successful private-identity runtime checks, and real composed handlers support a single Foldkit module graph.

### Measured source freeze

Source hash: `8cb762888e252cc59674bcfcb9d2e4a86c7aa313b35336735574cc79dce68273`.

The lead measured three runs with official native TypeScript `7.1.0-beta` before the callback migration:

| Request                    | Median milliseconds |  Observed range |
| -------------------------- | ------------------: | --------------: |
| Binding hover after edit   |             151.917 | 148.854–152.119 |
| Binding completion         |             134.930 | 123.522–138.231 |
| Completed Block completion |              12.909 |   12.465–18.152 |
| Error appearance           |             109.912 |  99.263–112.219 |
| Error clearing             |              87.037 |   86.853–96.878 |

Maximum sampled RSS was 400,272 KiB (390.89 MiB). These are observations for this application and host, not budgets. The completed application is larger than the initial vertical slice, so the measurements do not establish a speedup. Passing source/LSP checks do not clear TS7056.

Generated 4/8 fixtures pass strict declaration emission and consumer checking. Generated 16/32 cases and the full application's emitted declarations retain the serialization limitation documented in `packages/foldkit/type-performance/README.md`.

## Canonical blind-spot dispositions

| Blind spot                          | Disposition           | Evidence                                                                                                                                                                                |
| ----------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `off-by-one`                        | Clean                 | Palette wrap/empty handling, insertion indices, and activity selection were traced. Stream.tick emits immediately; drop(1) deliberately delays the first opt-in activity.               |
| `skip-reset-semantics`              | Clean after fixes     | Same saved-view navigation preserves filters and grouping. Dialog close resets palette search; editor Reload explicitly replaces the draft.                                             |
| `state-machine-edges`               | Clean                 | Save, create, comment, load, project mutation, optimistic move, failure, retry, and conflict/reload paths have reachable exits and corresponding UI.                                    |
| `derived-data-in-model`             | Clean                 | Lists, boards, and member counts derive canonical inputs. Drafts, baseline revisions, incoming conflicts, and returnRoute retain interaction/history state.                             |
| `dead-variants-and-noop-commands`   | Clean                 | Navigation, DOM scrolling, and primitive completion Messages acknowledge real effects. No startup Command exists only to trigger a no-op.                                               |
| `repeated-scaffolding`              | Clean after fixes     | Cohesive view modules, named transitions, and field Steps retain the actual ownership boundaries. No repeated requirement/type workaround remains.                                      |
| `manual-update-return-unpacking`    | Clean                 | Binding initialization recipes and connected operations are returned/composed intact. Completed operation results retain operation names.                                               |
| `duplicate-foldkit-module-instance` | Clean                 | Shared aliases and actual browser composition/identity behavior show no duplicate runtime instance.                                                                                     |
| `functions-doing-two-things`        | Clean after factoring | Root orchestration, domain placement, feature transitions, and view responsibilities have named owners. Effect work stays in handlers.                                                  |
| `manual-cache-orchestration`        | Clean                 | Ordered Steps update canonical data and notify children. Snapshot membership/version merging is explicit domain policy.                                                                 |
| `naming-drift`                      | Clean after fixes     | Input changes use Updated; ChangedUrl remains the routing fact. Option and boolean naming follow the repository conventions.                                                            |
| `messages-naming-the-effect`        | Clean                 | Commands are imperative, results name their Commands, and UI/Subscription Messages describe facts. Child OutMessages describe owned outcomes.                                           |
| `view-named-after-namespace`        | Clean                 | Primary views are named view; parents embed completed Blocks through registered Bindings.                                                                                               |
| `unearned-type-aliases`             | Clean in app source   | Schema-backed boundaries use typeof queries; ViewBuilder aliases are purposeful. No alias/cast was retained to hide serialization failure.                                              |
| `effect-module-inconsistency`       | Clean                 | Effect collections/matchers compose transformations; direct native string calls operate on named values.                                                                                |
| `stuttery-modifyFields-setters`     | Clean after fixes     | Canonical field operations use field transformers, including the final applySnapshot correction. Parent code does not mutate child fields.                                              |
| `empty-object-constructors`         | Clean                 | Empty tagged variants use no-argument constructors. Plain configuration records are not mistaken for variants.                                                                          |
| `hand-rolled-async-state`           | Clean after fix       | Workspace loading uses AsyncData. Feature save/create/post states describe workflows rather than remote-data caches.                                                                    |
| `array-type-syntax`                 | Clean                 | Application contracts use Array/ReadonlyArray.                                                                                                                                          |
| `hard-coded-route-paths`            | Clean after fix       | Authored links/navigation use route printers, including saved views. Literal paths in tests exercise the URL boundary.                                                                  |
| `unkeyed-list-rows`                 | Clean                 | Issues, members, comments, projects, saved views, options, results, and board columns use stable entity keys.                                                                           |
| `data-derived-keys`                 | Clean                 | Keys represent entity identities. Palette index data is a scroll target, not a DOM key.                                                                                                 |
| `authored-child-delivery-message`   | Clean                 | Composition generates child envelopes; optional keyed occurrences use Binding initialization and delivery policy.                                                                       |
| `hand-rolled-widgets`               | Follow-up             | Eligible form controls use UI helpers. The palette still authors combobox/listbox interaction; prototype UI Combobox for its transient command workflow before closing that assessment. |
| `a11y-gaps`                         | Clean after fixes     | Settled route headings, control names, alerts/status announcements, select spacing, focus, contrast, and responsive widths were rechecked.                                              |
| `aria-role-confusion`               | Clean                 | Checkbox helpers provide checkbox semantics; member buttons expose pressed selection state; palette combobox/listbox semantics and active descendant are connected.                     |
| `missing-scene-test`                | Clean                 | Root and feature Scene/Story coverage includes interactions, original Definition resolution, failures, retries, canonical updates, and conflict reload.                                 |

## Post-freeze integration

The approved callback-only `makeCommandsStep` migration is complete. Independent review found no correctness defects; three additional eligible UI Steps were migrated and rechecked. Core verification passes 3,645 tests and coverage gates; both core source configurations and external emitted declarations pass. UI source and external emitted declarations pass. Affected Dialog/Popover/Menu/Toast/Combobox suites pass 476 tests; the final Dialog/Combobox/Listbox recheck passes 362 tests. Workspace's 87 tests, Website's 12 focused tests, Typing Game's 28 tests, Query Sync's 12 tests, and Route Transitions' 10 tests pass. The documentation snippet passes an isolated strict source check. The final browser rerun passes all 14 cases after the migration. Repeated editor checks and compiler counts are recorded in the separate performance record.

The independent serialization investigation retained no API change or consumer workaround. Named consumer interfaces demonstrate an avoidable expansion in the current encoding, but require additional declarations and lack editor/rejection proofs for adoption. See [the exact controls and remaining limits](workspace-performance.md#independent-serialization-controls). The combined verdict remains NEEDS-WORK for that scoped framework-library emission case, while the SPA source/runtime checks pass.

After migration, browser coverage contained 15 passing cases: the 14-case suite plus an additional paused-save cross-column keyboard drop. That case uses the component's documented Tab navigation, verifies immediate InProgress placement, retained focus and pending state, then verifies the saved result and restored interaction. An initial test using ArrowRight was corrected because arrows reorder within a column; no production behavior or framework key mapping changed.

A sixteenth focused browser case now verifies an actual pointer gesture across columns with saving paused. The dropped card is immediately present in InProgress, its controls show the pending save, and it remains there after the timer advances and saving completes. It passes in 896 ms; the E2E package typecheck also passes. This covers the originally reported pointer path in addition to the existing pure pointer-delivery and keyboard tests.

The final Settings checkbox also uses a centered SVG check and explicit keyboard-focus treatment. Source checking and the final production build pass; the checked and keyboard-focused states were verified in the browser. The final editor confirmation records 138 ms Binding hover, 142 ms Binding completion, 19 ms completed-Block completion, and 97/90 ms error appearance/clearing medians. All five compiler budgets pass unchanged. At that checkpoint, public Command-argument inspection had failed its count-budget gate. The later inline signature is now retained as `Story.Command.argsOf` and `Scene.Command.argsOf`, with source/emitted/runtime proofs and unchanged budgets; [current contract](pending-command-inspection.md).

The subsequent Issue List toolbar refinement keeps search and New issue together, aligns Status/Sort/Group fields, and keeps the saved-view input and submit button in one wrapping unit. Container queries follow the list pane width when the detail panel is open. Browser inspection covered the detail-panel layout and 390/320-pixel viewports, with no horizontal overflow at 320 pixels. Both Issue List Scene tests and three focused browser cases (creation, search/status filters, saved-view restoration) pass, along with the Workspace typecheck, production build, and formatting check. This view-only refinement does not update the earlier editor measurements.

## Product review

The [product review](workspace-product-review.md) records the subsequent design principles, implemented changes, and remaining consumer investigations. The pass removes redundant header copy and inert selection controls, completes saved-view grouping and deletion behavior, improves narrow-screen issue navigation and creation focus, and gates project saves on valid changes. Independent review found and verified the repair for a pending create that failed after dismissal: the Dialog reopens with its full draft and retry data intact.

Final verification passes 89 application tests across 20 files and all 17 browser cases, including the actual pointer-drop and stale-occurrence regressions. Workspace and E2E source typechecks, application/root lint, formatting, and the production build pass. The new mobile and direct-project-submit gates were observed failing with their respective fixes removed; the saved-view regression failed before its fix, and the pending-create recovery test fails without its reopen Step. Desktop, 390-pixel issue editing, and the simplified project overview were inspected in the live browser. No framework API or compiler budget changed in this product pass. Earlier editor measurements remain scoped to their recorded source snapshot.

## Retained issue work

Issue fields and unfinished comments now survive Close, issue switches, application links, and browser history. The root retains domain draft snapshots reported by child OutMessages, not child Models. Reopening initializes a fresh keyed editor. Separate field/comment discard actions preserve ownership, and field saves retain an unsent comment. A ManagedResource installs the native page-exit warning only while retained drafts exist. Accepted page exits still lose the in-memory session; browser warning availability is not universal.

Independent review found and fixed two reconciliation gaps. The child now shares one monotonic, field-aware policy across initialization, observed changes, comment completion, and save completion. Remote comment/activity revisions rebase local edits; conflicting editable fields require Reload. Delivering a newer comment response before an older save response cannot regress the editor. A safe revision conflict reports a usable retry rather than instructing the user to use an unavailable Reload action.

The expanded application suite passes 109 tests across 22 files. The isolated production browser suite passes all 20 cases, including retained fields/comments, A → B → A, Back/Forward, native exit prompting and cleanup, and stale save admission. Tests against the shared development server were contaminated by Vite's Model-preservation state during concurrent hot reloads; the production rerun has no preservation channel. No entity-key or field-key workaround was retained.

The resource unit test invokes the real generic entry acquire/release boundary, whose error type is deliberately `unknown`. Its narrow Effect-lint exception matches the framework's managed-resource tests; production callbacks keep their precise inferred Effects. Application lint, Effect lint, formatting, and the production build pass. Earlier editor measurements remain scoped to their recorded snapshot.

The expanded Story/Scene coverage exposed a matcher typing defect: mixing opaque connected results with raw ordinary local results could erase the local Command requirements and OutMessages from the inferred return union. The generic correction passed core source/runtime and external declaration safety checks but failed the compiler-budget and UI declaration gates, so it was removed. The consumer repair uses existing Definition-owned Steps for the local transitions and adds no Story/Scene API or consumer type arguments. The framework-wide raw-result and combined-Step findings remain open above. Full application declaration emission was rechecked and reproduces TS7056 at `src/block.ts:13`.

The final consumer repair passes all 109 application tests, the source check, and exact update requirement/OutMessage assertions. Independent review accepted its save/reconciliation guards and direct connected reporting. The final production build and all 20 browser cases pass again. Core/UI external declaration harnesses and all five unchanged compiler ceilings pass on the settled implementation. Final native editor medians are 161 ms Binding hover, 148 ms Binding completion, 13 ms completed-Block completion, and 121/101 ms error appearance/clearing; [the measured snapshot and limitations](workspace-performance.md#retained-draft-verification) keep these results separate from earlier source freezes. The product retention task is complete; the three framework findings at the top remain open.

## October 24 editor ownership audit

Scope: the Workspace application after separating project editors, Board move state, and demo activity policy. This is an application audit using `skills/audit-program/SKILL.md`, its architecture/conventions/composition/checklist references, and every canonical blind spot. The references were compared with Typing Game's Home update, Kanban's child integration, Job Application's simple completed Blocks, and UI Showcase's Composition. This pass does not certify the main thread's concurrent framework changes or change the published preview status.

### BLOCKERS

None remaining in the audited application changes.

### QUALITY

None remaining in the audited changes.

### NICE-TO-HAVE

- `examples/workspace/src/commandPalette/view.ts`: the palette retains custom inline result navigation within UI Dialog/Input. The current public Combobox always anchors an overlay (`packages/ui/src/combobox/shared.ts`, `anchorAttributes`) and has no inline-results mode. A dedicated inline command-search capability could replace that remaining application interaction code. The actual layout constraint is recorded beside the implementation; the existing keyboard, empty-result, selection, and shortcut coverage remains. This pass does not add another framework API.

### VERDICT

**PASS for this application ownership and guidance pass.** The retained inline-palette exception above is explicit. The earlier full-root declaration and framework release findings retain their separate dispositions; a passing application audit does not close them.

### Findings resolved

| Finding                                                           | Resolution                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project saves and Board moves shared one pending/retry union      | Project Settings owns its save state and Command. The root retains only IssueMoveState for Board placement and rollback.                                                                                                                                                       |
| URL delivery and load settlement replaced project drafts          | Root retains keyed ProjectSettings instances for visited projects. Each child owns its baseline and draft. Repeated URL delivery, refresh, and project switching preserve that child.                                                                                          |
| A save could lose its owner after navigation                      | Retained project occurrences accept their pending result while hidden. Their own silent Subscription protects dirty drafts before unload and deactivates after save/discard.                                                                                                   |
| Newly independent operations exposed unrelated snapshot overwrite | A completed move reconciles issue data only. An isolated regression fails when restored to full workspace replacement, which overwrites a newer project save. This concurrency became possible during this pass.                                                               |
| Background activity cleared foreground feedback                   | maybeActivityError and maybeNotice have separate owners and settlement. The original activity success no longer clears a saved-view or foreground announcement.                                                                                                                |
| Demo selection obscured root Message handling                     | Deterministic simulateActivity policy lives in demoActivity.ts; repository effects remain Commands and timing remains a Subscription.                                                                                                                                          |
| Notification date handling repeated native arithmetic/parsing     | notifications/time.ts uses Effect DateTime/Duration, preserving local absolute formatting and existing elapsed-time labels.                                                                                                                                                    |
| Unnecessary local Step wrappers and declaration-only Definitions  | Ordinary local results return directly; Member Directory chains its graphless Definition into its Composition. Connected/deferred Steps and channel-preserving no-ops remain.                                                                                                  |
| Required fields and selected-option tests had avoidable a11y gaps | Project name and saved-view name expose aria-required; palette Scenes select by accessible option state. All eligible controls retain UI attribute scaffolding.                                                                                                                |
| Scaffold guidance repeated and contradicted settled authoring     | FOLDKIT.md groups ownership, update, Steps, Blocks/Bindings, OutMessages, initialization, lifecycle, and organization. Duplicate factory explanations and raw-matcher fold guidance are removed; explicit child helpers, readonly arrays, union guards, and dates are current. |

### Application map and ownership

- Root `model.ts`, `definition.ts`, `init.ts`, `update.ts`, and `block.ts` own canonical workspace state, routing, mutation reconciliation, and passive root completion. Root `composition.ts` owns sibling policy and graph registration. It does not import root implementations.
- `route.ts` owns parsing/printing and URL-boundary validation; `navigation.ts` owns read-only route-derived selectors. Routed initialization creates missing occurrences and leaves existing editors intact.
- Issue List owns transient selection and saved-view naming; URL filters and canonical domain data are parent inputs.
- Issue Detail owns its historical editable baseline, draft, and save/conflict state. Comment Composer owns posting and comment input. The parent retains reported unfinished work and supplies current comments for rendering.
- Project Settings owns its editing baseline, draft, save feedback, Command, and draft protection. Its per-project instances remain present for the session; only the current one renders.
- Board owns drag interaction and announcements; the root owns canonical optimistic placement, rollback, and move persistence. Board moves remain serialized because they update shared ordering. Project saves remain independent.
- Notifications owns event/read state; the parent supplies current issue/member presentation. Command Palette owns search interaction; Member Directory owns search and member selection.
- Repository modules model the separate in-memory backing service. Workflow submission state stays in Models. `demoActivity.ts` selects simulated requests; `draftProtection.ts` supplies a shared scoped browser Stream with no workflow state.

### Canonical blind spots

| Slug                              | Disposition                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| off-by-one                        | Clean: activity assignment starts on the third request; keyboard wrap and Board insertion tests remain.                                                |
| skip-reset-semantics              | Clean: discard restores the appropriate baseline, retains unrelated work, and disables native protection when clean.                                   |
| state-machine-edges               | Clean: editor pending/failed/saved paths are explicit; no additional Machine abstraction is needed for these small flows.                              |
| derived-data-in-model             | Clean: historical editing baselines and notification history are intentional. Current comments and filters are inputs.                                 |
| dead-variants-and-noop-commands   | Clean: save states render feedback; no-op result handlers acknowledge real navigation/focus work.                                                      |
| repeated-scaffolding              | Clean after fixes: local result wrappers and duplicated scaffold instructions removed; shared draft protection has one implementation.                 |
| manual-update-return-unpacking    | Clean: connected recipes and Binding init results remain intact; Update.combineSteps preserves Commands.                                               |
| duplicate-foldkit-module-instance | Clean: workspace links, common Vite aliases, and the Foldkit plugin resolve one module graph.                                                          |
| functions-doing-two-things        | Clean after fixes: Project Settings and demo policy have dedicated owners; parent orchestration retains sibling coordination.                          |
| manual-cache-orchestration        | Clean: one root AsyncData snapshot intentionally reconciles optimistic and versioned mutations. Existing Query assessment remains applicable.          |
| naming-drift                      | Clean: record handlers use Model-first signatures, extracted dedicated handlers use handle<MessageTag>, and operations use request/inform conventions. |
| messages-naming-the-effect        | Clean: Commands describe work and their result Messages name that work; child OutMessages describe owned outcomes.                                     |
| view-named-after-namespace        | Clean: canonical implementations use view and render through registered Bindings.                                                                      |
| unearned-type-aliases             | Clean: direct Schema type queries, purposeful ViewBuilder aliases, and checked completed export headers remain.                                        |
| effect-module-inconsistency       | Clean after timestamp migration. Native browser URL validation and tight local ID-search loops remain deliberate boundary/algorithm choices.           |
| stuttery-modifyFields-setters     | Clean: own-field transforms remain point-free; child transitions use Binding operations.                                                               |
| empty-object-constructors         | Clean: no-payload union constructors are argumentless; router calls with query configuration remain distinct.                                          |
| hand-rolled-async-state           | Clean: root loading uses AsyncData; editor mutation states represent workflow, not a remote-data cache.                                                |
| array-type-syntax                 | Clean: Schema.Array, Array, and ReadonlyArray contracts are used.                                                                                      |
| hard-coded-route-paths            | Clean: authored navigation uses route printers; tests exercise literal URL inputs deliberately.                                                        |
| unkeyed-list-rows                 | Clean: issues, columns, members, comments, notifications, and results use stable domain identities.                                                    |
| data-derived-keys                 | Clean: mutable names and display status do not determine identity.                                                                                     |
| authored-child-delivery-message   | Clean: local Message unions contain local facts; Composition generates envelopes and preserves keyed admission.                                        |
| hand-rolled-widgets               | Clean for supported component layouts; the inline palette exception and missing public inline mode are recorded above.                                 |
| a11y-gaps                         | Clean after fixes: component labels/attributes, required fields, alerts, native draft protection, focus, and responsive form layout checked.           |
| aria-role-confusion               | Clean: UI Checkbox/DragAndDrop attributes and the intentional inline palette semantics retain their proper roles.                                      |
| missing-scene-test                | Clean: root and feature Story/Scene tests cover transitions, Commands, OutMessages, retry, form controls, and cross-feature wiring.                    |

### Verification

- 160 Workspace tests across 22 files pass, including source failures/retries, exact original Command identity, selected OutMessages, duplicate submission, mismatch rejection, retained project drafts, hidden save settlement, and independent move/project state.
- Workspace and examples-E2E source checks pass with the pinned workspace compiler. Application and Effect lint pass with the recommended Foldkit rules active. Scoped formatting and diff checks pass.
- The new Project Settings Block emits declarations. A separate consumer compiles them with skipLibCheck disabled and paired accepted/rejected init, Message, and OutMessage payload cases. Its emitted handler contract retains WorkspaceRepository. This is feature verification, not a claim of full-root declaration serialization.
- A fresh production build and four focused production browser cases pass: project draft retention plus save-after-navigation, hidden draft warning and cleanup, existing issue failure/retry, and optimistic cross-column placement/focus. Desktop and 390-pixel form screenshots were inspected for spacing, alignment, and overflow.
- The three original regressions failed on the pre-change app. In isolated copies, full-snapshot move settlement fails the newer-project-save assertion; removing the edit lock fails the pending-state assertion; removing Project Settings' Subscription makes the browser warning test time out waiting for beforeunload. The shared checkout was not mutated for these negative controls.
- FOLDKIT.md is about 26% smaller by bytes than the start of this pass. The skill package is already advanced from HEAD 0.18.50 to pending 0.18.53. The automated skill-version script cannot run here because origin/main is absent; the version change was checked against local HEAD. No Git refs were changed for that check.

Evidence: `/private/tmp/foldkit-workspace-structure-20261024/`. These are local working-tree results with concurrent edits preserved, not an immutable release certification. No commits or pushes were made by this side conversation.

# Workspace Listbox consolidation

## Scope and ownership

Every native Select in Workspace is replaced with Foldkit UI Listbox. No framework API or dependency changed.

| Area         | Controls                            |
| ------------ | ----------------------------------- |
| Header       | Active member                       |
| Issue list   | Status filter, sort, grouping       |
| New issue    | Project, Status, Priority           |
| Issue detail | Status, Priority, Project, Assignee |

The shared [Listbox specialization and rendering](../examples/workspace/src/listbox.ts) supplies consistent trigger content, chevrons, options, selected marks, popup surfaces, pointer cursors, focus, and disabled styles. Compact filters use the same system at a smaller height. View content is inert; child event handling, keyboard behavior, focus Commands, and Mounts come from Foldkit UI.

Selected values remain in their owning parent Models. Listbox Models contain interaction state. Creation fields retain their pending guard, and their popups portal inside the native Dialog. Existing issue-property Listboxes now use the same rendering helper as the other controls.

Board cards use pointer and keyboard drag handles to change status and order. The subsequent card cleanup removes duplicate status selectors and arrow buttons, their per-card Listbox state, and root membership synchronization. The Board reports placement through its existing DragAndDrop policy; canonical data, persistence, rollback, and retry remain parent-owned.

## Declaration boundary

The additional child graph passes source checking but initially exceeds TypeScript's declaration serialization limit at the inferred root Composition and preparation producer. Annotating only the shared Listbox factory does not repair it.

Workspace now names one exact `ApplicationBindings` tuple and derives its Composition through the existing `makeComposition` return type. The implementation object uses `satisfies Block.Implementation`; a named `PreparedApplication` return derives from that exact Composition and implementation. The [Composition](../examples/workspace/src/composition.ts) and [assembly](../examples/workspace/src/block.ts) retain all Binding positions, implementations, Messages, requirements, and checks. No cast, widened graph, or new framework surface is involved.

This is additional application authoring ceremony for serializing this larger exported graph. An inferred tuple with `satisfies` was tested first and also reaches TS7056. The explicit tuple avoids repeating Model, Message, owner, and OutMessage generic arguments, but still names the seven Bindings in its contract. Keep this tradeoff visible when evaluating large-app authoring; it is not required boilerplate for every small Block.

The initial consolidation checkpoint emits **82 declaration files, 9,441,689 bytes**. A physically relocated strict consumer passes with `skipLibCheck: false` and `exactOptionalPropertyTypes: true`. It checks exact Model, dispatch Message, init/update arguments, curried update, requirements, and absence of a root OutMessage, paired with rejected calls. Separate isolated mutations confirm that omitting a Binding or its handler Layers still fails compilation.

The earlier 80-file checkpoint and the separate synthetic 32-group TS7056 limit retain their original scope. This application boundary does not establish an unlimited graph size or remove the framework's remaining serialization limitation.

## Initial consolidation verification

This checkpoint preceded the subsequent removal of Board card status selectors and arrow buttons. Its measurements and counts describe that earlier source snapshot.

| Check                       | Result                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Workspace application       | 118 tests in 22 files pass                                                           |
| Source checks               | Workspace and examples E2E pass with pinned TypeScript 7.1.0-beta                    |
| Declarations                | Full root emission and strict relocated accepted/rejected consumer pass              |
| Application and Effect lint | Pass with warnings denied                                                            |
| Formatting                  | Changed source and documentation formatted                                           |
| Production build            | Pass; existing large-chunk advisory remains                                          |
| Production browser suite    | All 20 cases pass with retries disabled on a fresh strict-port server                |
| Independent review          | Shared control/ownership/lifecycle review and exact declaration-boundary review pass |

The browser suite selects creation fields inside the Dialog, restores saved filters through Listbox buttons, changes a Board status, and verifies pointer/keyboard optimistic placement, focus retention, pending controls, and stale editor results. The final browser rerun uses the final application assembly. Its temporary server is stopped after verification; the user's preview server remains running.

The new Active member Scene checks both the displayed selection and the resulting activity Command's author. In an isolated copy, suppressing the parent selection update makes it fail with expected Jordan Lee versus actual Maya Chen; restoring the policy passes. New Board cases cover retained UI state, reconciliation, and unchanged Model identity. Existing Board lifetime coverage also caught an unnecessary route-only wrapper rewrite, which was removed. No screenshot or exact-pixel test was added for styling.

Browser inspection confirms the popup appearance and `cursor: pointer`. [Toolbar screenshot](/private/tmp/foldkit-workspace-listboxes-20261024/toolbar-listbox.jpg). A fresh tab was used so the user's original in-memory drafts were preserved.

### Editor check

Three official native TypeScript 7.1.0-beta sessions exercise the initial consolidation graph. They validate completion contents and error appearance/clearing, with the original 60-second request limit unchanged. No agent builds or tests ran concurrently.

| Operation                            | Median ms |        Range ms |
| ------------------------------------ | --------: | --------------: |
| Post-edit Binding hover              |   301.492 | 290.027–309.460 |
| Post-edit Binding completion         |   299.140 | 283.421–302.417 |
| Post-edit completed Block completion |    44.260 |   43.389–45.055 |
| Error appearance                     |   231.529 | 224.869–232.974 |
| Error clearing                       |   210.304 | 207.358–210.838 |

Maximum sampled server RSS is **468,528 KiB**, about 458 MiB. These are bounded native-server measurements, excluding editor UI/plugins and tsrs. Sampling can miss peaks, and short sessions do not establish long-session stability. This is a current-workload smoke check rather than a paired causal speedup comparison. A subsequent local Boolean-variable naming correction does not change the measured behavior.

The workload SHA-256 is `ddb7f42b81d0f074e73d85f57d93b86920af4916495ee585e578d11d87b9c9dc`; the driver SHA-256 is `2f040354fa1d95582e1b8d8496acdb907dca5935fd8725aa9dc1d8e565347098`. Raw samples and all server/compiler identities are in `/private/tmp/foldkit-workspace-listboxes-20261024/native-workspace.json`.

## Board card simplification

The user removed duplicate movement controls after reviewing the cards. Cards now retain only their drag handle, issue title, priority, and assignee. Pointer dragging, Space/arrow/Tab keyboard dragging, pending focus, optimistic placement, rollback, and retry use the same existing DragAndDrop and parent policies.

The cleanup removes the Board's keyed Listbox Models, Binding, initialization arguments and reconciliation operation, plus the root's membership notifications and separate status-change policy. Board state contains drag interaction and announcement only. The deleted controls no longer have public operations or local Message cases. Tests now enter the move policy through authentic child drag Messages instead of the deleted card-button Message.

The full root emits 81 declaration files, 8,482,968 bytes. Strict relocated accepted/rejected consumption passes with `skipLibCheck: false` and `exactOptionalPropertyTypes: true`. The existing named root contracts are retained. No new framework API, compiler-budget change, or performance claim follows from removing these controls.

Verification for this cleanup passes: 113 application tests in 22 files, all 20 fresh production browser cases without retries, Workspace and E2E source checks, application/Effect lint, production build, full root declaration emission, and strict relocated consumption. Two adapted browser tests initially failed because their paused animation clock was not advanced after navigation; advancing it lets the routed view and remounted drag lifecycle settle. No application workaround was added. Independent review found no root policy or lifecycle regression.

Evidence: `/private/tmp/foldkit-workspace-card-cleanup-20261024/`, including `source.log`, `tests.log`, `build.log`, `declarations.log`, `emitted-consumer.log`, `lint-app.log`, `lint-effect.log`, `e2e-source.log`, `browser-final.log`, `browser-results.json`, and `board.jpg`. The original user tab and its drafts were not reloaded. The fresh Board preview is available separately.

## Evidence and release scope

Evidence lives under `/private/tmp/foldkit-workspace-listboxes-20261024/`: `final-source.log`, `e2e-typecheck.log`, `final-tests.log`, `final-lint-app.log`, `final-lint-effect.log`, `final-build.log`, `final-browser.log`, `browser-results.json`, `final-declarations.log`, `final-relocated.log`, and `declaration-summary.json`. Mutation evidence is `active-member-mutation.log`, `active-member-restored.log`, and `simplified-boundary-mutations.log`.

Concurrent update-function edits and the separate ManagedResource-to-Subscription cleanup by the user's other agents are preserved. Their later changes have their own verification scope. This change affects the private Workspace consumer and its E2E tests; the nine packed public packages from the October 24 framework checkpoint are unchanged. That checkpoint is not a hash of this later complete repository state. Freeze the inclusive candidate again before release.

No commit, push, integration merge, publication, or public Ready promotion was performed. Publication remains on hold for the user's approval.

# Workspace feedback followup

## Scope

The verification counts below describe the named earlier checkpoints. The
[application simplification](workspace-simplification-20261025.md) records current
per-ID editor retention, URL-derived return context, hidden-result delivery,
and shared control styling. Navigation now reuses retained editors; the earlier
remove-and-recreate scenarios are not the current navigation contract.

This pass applies the user's Workspace feedback after the initial Listbox consolidation. It changes the private example and its tests, without a framework API change. Concurrent update-function and Subscription work is retained. No commit, push, release publication, or Ready promotion is part of this pass.

## Consumer changes

| Feedback                                        | Disposition                                                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use search params for list state                | The Route owns search, status, sort, and grouping. Issue List renders controlled filters and reports changes through OutMessages.                                                                                                       |
| Keep useful browser history                     | Live search uses `ReplaceInternalUrl`; status, sort, grouping, and clear use `NavigateInternal`. Back/Forward restore the applied URL state.                                                                                            |
| Preserve the originating view                   | Issue links carry validated internal `returnTo` context. Reloading an issue and closing it restores the complete filtered URL.                                                                                                          |
| Separate internal and external navigation       | `NavigateInternal({ url })` and `LoadExternal({ href })` replace the Boolean-dispatched Command. Each has its corresponding completion Message.                                                                                         |
| Capture stable Services in handler constructors | All eight repository-backed Commands capture `WorkspaceRepository` once. Invocation functions perform repository work later, with the existing error Messages and handler requirements.                                                 |
| Make AsyncData fields identifiable              | The root field is `workspaceAsyncData`. FOLDKIT.md, repository conventions, and authoring skills teach the suffix for AsyncData values. Query Models remain child Block Models.                                                         |
| Assess Query adoption                           | Retain direct AsyncData for revision-aware mutation reconciliation, optimistic rollback, and load-completion child initialization. The separate Query assessment records the missing public reconciliation and settlement capabilities. |
| Remove duplicate Board movement controls        | Status selectors, arrow buttons, their Models, and synchronization are removed. Pointer and keyboard drag handles remain.                                                                                                               |
| Use native issue links                          | List rows, Board titles, and member assignments use parent-supplied href data. Program handles ordinary clicks; the browser owns modified/new-tab navigation. Busy Board titles are non-links.                                          |
| Keep controls visually consistent               | Single-selection controls share Foldkit UI Listbox rendering. Regular action buttons share height and horizontal padding. Board gutters align with project pages.                                                                       |
| Avoid layout movement and decorative copy       | Move feedback stays offscreen for assistive technology. Page headings remain compact; generic eyebrows and descriptions remain removed.                                                                                                 |
| Preserve drafts and asynchronous behavior       | Canonical root data, retained drafts, optimistic placement, rollback, revisions, keyed occurrence admission, and stale-result isolation keep their existing policies.                                                                   |

## URL behavior

Ordinary default list URLs omit filter params. Nondefault filters use `search`, `status`, `sort`, and `group`. A named preset with an explicit all-default override uses `filters=1` to distinguish clearing from using the preset's defaults.

Saved view names and definitions are session metadata. An explicit filtered Saved View URL remains usable after reload as **Filtered issues**, even if its name no longer exists. A bare unknown preset remains unavailable. This does not persist issues, comments, or drafts across Runtime restarts.

Return targets accept recognized internal background routes. External hosts, recursive issue targets, unsupported routes, normalization escapes, and malformed native URL inputs are rejected. This is an application navigation policy using the existing Route and Schema APIs.

## Verification

Before the test-only cleanup below, the application suite passed **144 tests across 23 files**. The isolated production-browser suite passed **26 cases**, including pointer and keyboard optimistic moves, failure recovery, stale occurrence admission, native new-tab links, filter Back/Forward, and filtered detail reload/close.

The pinned source compiler, application lint, Effect lint, formatting, and production build pass. All **82 declaration files** emit and pass a relocated consumer with `strict: true` and `skipLibCheck: false`. That consumer checks the exact root Model, Message, init/update contracts, requirements, and rejected invalid calls. The production build retains its existing large-chunk advisory.

The saved-view return regression was mutation-checked in an isolated copy: restoring the old `issueHref` behavior loses the saved filter query and fails the Scene assertion; restoring the fix passes. The route tests also exposed malformed native URL and normalization cases before their fixes. The browser run uses a fresh strict-port server with reuse disabled.

The final browser review confirms the shared Listbox treatment, pointer cursors on its triggers and options, aligned actions, and no horizontal overflow at the inspected desktop viewport. The existing responsive browser cases also pass. No native `select` remains in Workspace.

### Test suite maintenance

A subsequent test-only pass removes two Issue List Story cases already exercised through its rendered Scene, the repeated root navigation walkthrough, and the generic multiple-scope Subscription case. Shared UI handler details, exact control IDs, framework inference assertions, duplicate activity selection, and fixture counts implied by full equality are also trimmed.

Application-specific disabled states, explicit activity leaving live updates disabled, validation, repository execution, drafts, conflicts, rollback, and stale-result regressions remain covered. The resulting **140 tests across 23 files**, pinned source typecheck, application lint, Effect lint, and formatting pass. No application implementation or browser test changed, so the preceding production-browser evidence retains its scope. Cleanup originals and check logs are in `/private/tmp/foldkit-workspace-test-cleanup-20261024/`.

### Native editor smoke check

Three runs before the subsequent test and typography passes use the pinned native TypeScript **7.1.0-beta** server, Node **24.22.1**, and the existing **60-second** request budget. The measured dirty workload hash is `3d28631fe3fb6c7b9b05cd212afa700bcbe85931cbc8327452bf3eb1d7f988a7`, based on checkout HEAD `31d8aad9fe4555112b3cf8e2d948badeee9ced0d`.

| Operation                             | Median |      Range |
| ------------------------------------- | -----: | ---------: |
| Binding hover after edit              | 271 ms | 266–277 ms |
| Binding completion after edit         | 265 ms | 263–268 ms |
| Completed Block completion after edit |  51 ms |   41–54 ms |
| Invalid title diagnostic              | 197 ms | 194–214 ms |
| Diagnostic clearing                   | 188 ms | 185–214 ms |

The driver validates the expected Binding header, completion members, title error, and restored clean diagnostics. Maximum sampled server RSS is **474,480 KiB**, approximately **463 MiB**, across these short-lived scenarios. This is a bounded application smoke check, not a paired causal comparison or a guarantee about long-running editor sessions. The earlier Listbox and framework benchmark reports retain their original source scopes and compiler budgets.

Logs, relocated declarations, mutation evidence, browser results, and the full native report are in `/private/tmp/foldkit-workspace-feedback-20261024/`.

## Typography followup

Primary text, navigation, and controls use 14px text with medium weight. Field labels use 13px medium text; secondary metadata and initials use at least 12px. Section headings use 16px semibold and page headings use 18px semibold. Long description and comment text retain a normal weight at 14px. Shared Listbox menus and portaled Dialogs establish their own typography.

On narrow screens, issue titles take a separate line, and the sidebar search control uses a shorter visible label while retaining its accessible name. The browser review covers the issue list at 1280, 390, and 320 pixels, the dirty issue editor actions at 320 pixels, the creation Dialog at 320 pixels, and the desktop Board. No horizontal document overflow appears in the inspected phone list, editor, or Dialog.

Pinned source typechecking, application lint, formatting, and the production build pass. This pass changes Tailwind presentation and responsive labels, with no Model or Message policy changes. No new visual assertion tests were added. Backups, check logs, and screenshots are in `/private/tmp/foldkit-workspace-typography-20261024/`.

## Board column creation

Each column has a Foldkit UI plus button that opens the existing creation Dialog with its status selected. The Board emits `RequestedCreation({ status })`; the parent Binding policy supplies its project key and invokes Create Issue's `requestOpen` operation. Existing callers that omit a status retain the Todo default. Reopening a pending creation preserves its original draft and presets. Column creation buttons are disabled during dragging and saving.

The focused Scene checks the selected status, while one production browser flow verifies project and status defaults, actual creation, detail navigation, and the new card after returning to the Board. The browser case failed against the pre-feature production build because the button was absent. An isolated wrong-status mutation made the Scene fail with the expected OutMessage mismatch; restoration passed. Existing child tests were extended to check default, explicit, and pending presets.

The resulting **141 application tests** and **27 production browser cases** pass, along with pinned source checking, application and Effect lint, formatting, and production build. Root declaration emission and strict relocated consumption pass, including accepted omitted/explicit status arguments and rejected invalid statuses or missing project identity. Independent integration review found no issues. Evidence and backups are in `/private/tmp/foldkit-workspace-column-create-20261024/`.

## Issue list alignment and toolbar

Rows share one grid with fixed-width identity and status columns. Status chips retain their content width and align left; titles share a starting position, with consistent trailing priority and assignee columns. Narrow containers retain a metadata row above the full-width title.

Search is capped at 20rem in the desktop toolbar. Filters have bounded widths, and New issue stays on the right. The toolbar switches to two rows in the split pane and full-width search on phones. Container breakpoints keep the layout tied to the list's available width.

Browser inspection confirms aligned title positions across different statuses, varying chip widths, compact controls at 1280 and 1024 pixels, the single-row transition at 896 pixels, the 610px list beside the editor, and phone layouts at 390 and 320 pixels without horizontal document overflow. The four existing Issue List Scenes, source typecheck, application lint, formatting, and production build pass. No Model or Message policy changed, and no visual assertion tests were added. Backups, check logs, and screenshots are in `/private/tmp/foldkit-workspace-list-layout-20261024/`.

## Notifications and application assembly

Workspace activity is active after data loads. Every 20 seconds it produces a teammate comment on a relevant issue or an assignment; Settings can request the next event directly. Comments notify assignees and participants except their author. Assignments notify their recipient except the actor. The Notification Center owns recipient-specific read state, deduplicates records, and presents them through a Foldkit UI Popover with an unread count, relative timestamps, read/unread actions, and Mark all as read. Selecting an entry marks it read and asks parent policy to navigate. Incoming activity neither opens the panel nor navigates. Ordinary issue changes do not generate notifications.

Root policy detects new comments before updating canonical data, ignores stale revisions, and informs retained editors through their Binding operations. A hidden editor can settle its own pending save while the current editor stays isolated. The relative-time clock runs while the Popover is open. The Popover shares Listbox layering levels so its trigger remains operable over its backdrop. At 320 CSS pixels, the member label stays accessible while its visual footprint is removed; the header and panel do not overflow. Current retention behavior is recorded in the [application simplification](workspace-simplification-20261025.md); the counts below describe the original notification checkpoint.

Root update Stories, including notification policy, are in `src/story.test.ts`. The child’s update tests are in `notifications/story.test.ts`. Isolated mutations prove that the Stories reject own-comment leakage, unrelated-issue activity selection, and obsolete error retention after assignment success. Browser tests first fail against the prefeature build; a failing open-trigger case also caught the incorrect backdrop layering. The final production suite passes all **29 cases**; application tests pass **149 cases across 24 files**. Source checking, application/Effect lint, and production build pass.

The root and feature Blocks now use Website’s ordinary `prepareBlock` and checked `Block.assemble` export pattern. The root registers its Bindings directly and composes handler recipes in `layer.ts`. Application-only implementation objects, preparation aliases, duplicate interfaces, and explicit Binding tuple/return aliases are removed.

The ordinary full-root pattern reaches TS7056 during declaration emission. Source checking remains precise, and this private application does not publish declarations. Reusable Notification Center, Board, and Create Issue Blocks emit and pass strict relocated accepted/rejected checks, including exact operation arguments and missing-Binding rejection. Full-root emission is recorded as a framework serialization limit rather than encoded as extra application plumbing. Earlier successful root-emission checkpoints retain their distinct source scopes. No framework API or compiler budget changes in this pass.

Evidence is in `/private/tmp/foldkit-workspace-notifications-20261024/`. Publication remains held.

### Notification graph editor check

Three native-server runs use official TypeScript 7.1.0-beta, Node 24.22.1, and the unchanged 60-second request budget. The dirty source workload hash is `d39dda63da85a9874387f1ece306976831fa2c62874bc3f9340e2a485fbf8b5c` on checkout HEAD `31d8aad9fe4555112b3cf8e2d948badeee9ced0d`. This snapshot includes notifications and the ordinary application assembly pattern.

| Workflow                              | Median |      Range |
| ------------------------------------- | -----: | ---------: |
| Binding hover after edit              | 316 ms | 313–319 ms |
| Binding completion after edit         | 292 ms | 282–314 ms |
| Completed Block completion after edit |  46 ms |   45–63 ms |
| Error appearance                      | 232 ms | 209–241 ms |
| Error clearing                        | 219 ms | 211–227 ms |

The driver verifies completion contents, the expected title error, and clean restored diagnostics. Maximum sampled server RSS is 477,392 KiB, approximately 466 MiB. The source fingerprint stays constant for the run. These short scenarios establish bounded responsiveness for this source snapshot; they are not paired measurements of the assembly cleanup alone or a long-session memory guarantee. The full report is `native-workspace.json` in the evidence directory.

## Application test organization

The separate `interactions.test.ts`, `draftRetention.test.ts`, and `rollback.test.ts` files are consolidated into the root `story.test.ts`. Named behavior groups keep navigation, child policies, notification policy, draft retention, rollback, and refresh settlement together. Create Issue and Comment Composer also use owning `story.test.ts` suites. Application tests resolve Commands through their original Definitions rather than manually executing their Effects or assembling repository Layers.

Scenes retain form validation, disabled/pending controls, retry actions, draft conflicts, and canonical rendering. Root refresh Stories assert the exact load Command and its success/failure settlement. Pure route tests, typed Listbox helper checks, and repository Service tests remain focused tests.

The two direct Subscription-handler test files are removed. Existing browser coverage owns Ctrl/Meta+K and activation/deactivation of the native exit warning. A production browser case now advances the real Runtime's clock across the 20-second activity boundary and observes its notification. Changing the interval to 19 seconds in an isolated copy makes its pre-boundary assertion fail.

Story currently requires an ordinary non-keyed Command to settle before another Message is sent. Tests isolating concurrent rollback or out-of-order settlement therefore start from explicit pending-state fixtures and assert the completion policy. They do not claim to execute the entire concurrent interaction through Story. Pointer/keyboard admission, optimistic placement, pending navigation, stale results, and A → B → A remain browser-owned. No application-only testing DSL, new framework API, or altered production Command was introduced to bypass this limit.

The application suite passes **144 tests across 20 files**. A fresh production build and all **30 browser cases** pass on an unused strict port with server reuse disabled. Pinned source checking, application lint, Effect lint, and formatting pass. Independent reviews confirm retained draft and rollback invariants. Removing rollback settlement in an isolated copy makes all three Board rollback Stories fail on placement order; restoring it passes. Evidence and originals are in `/private/tmp/foldkit-workspace-test-organization-20261024/`. Earlier test counts and editor measurements above retain their original source scopes.

### Board composition factoring

Board drop handling lives beside its DragAndDrop Binding in `composition.ts`, including keyboard announcements. Shared drag identity helpers live in `dragAndDrop.ts`; the shared issue-status label lives with the domain Schema. OutMessage-only handling uses `makeOutMessageStep`, and ignored drops use `makeNoopStep`.

The former `policy.test.ts` is removed. Its unique same-column, unchanged-position, and foreign-container cases now use real child Messages through the registered Binding in `board/story.test.ts`. The existing pointer Story covers its cross-column case. This tests the owning Block's update rather than exporting a conversion helper for tests. The Board's 12 Story/Scene cases, all 145 application tests across 19 files, source check, application lint, Effect lint, and formatting pass. Evidence and original files are in `/private/tmp/foldkit-workspace-board-factoring-20261024/`.

Independent review finds no blocking issues. Isolated mutations confirm that changing the same-column insertion index fails the exact OutMessage assertion and accepting an unchanged position fails the no-OutMessage assertion. The original guards and keyboard announcements are preserved.

## Repository and command palette organization

The repository separates pure state transitions from Service construction and effect orchestration. Named handlers retain latency, one-shot failures, clock reads, and atomic Ref updates. Independent review confirms validation order, revisions, collision-safe identifiers, per-Layer state, timestamps, and error payloads. Its public Service and Layer factory contracts are unchanged; all 18 existing repository tests pass.

The command palette uses `Dom.streamFromKeyBindings` with `Mod+K` and `whileTyping: 'Allow'`. Its Scene calls the existing `Scene.subscriptions` helper directly and names the keyboard interaction. A fresh production browser run verifies opening from a focused search input and selecting an issue. Changing the typing policy to `Suppress` in an isolated fixture prevents the dialog from opening and fails the test; restoring `Allow` and rebuilding passes.

Website's root Model imports its completed page Blocks by name through the existing `page/index.ts` barrel. Its fields retain the same public Model Schemas. A runtime import-graph check finds no cycles.

All 146 Workspace tests, Workspace and Website source typechecks, scoped application/Effect lint, and formatting pass. Shortcut evidence is in `/private/tmp/foldkit-workspace-codex-comments-20261024/shortcut/`. No framework API or publication change is part of this cleanup.

### Repository modules

The repository implementation lives in `repository/`. Its `repository.ts` composes the Service, effectful constructor, and Layer; `schema.ts` declares its inputs and errors; `state.ts` owns the state Schema and shared helpers; `issue.ts` and `project.ts` contain the pure transitions. The explicit `index.ts` barrel exposes the same four public values. Existing application imports resolve through that barrel. The repository tests live beside the implementation and use the public barrel.

All 25 original declarations match after accounting for export visibility and formatting, and the moved tests differ only in their relative imports. All 149 current application tests, pinned source checking, application/Effect lint, and formatting pass. Originals are retained in `/private/tmp/foldkit-workspace-repository-split-20261024/`.

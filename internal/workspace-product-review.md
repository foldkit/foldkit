# Workspace product review

## URL filters and native navigation

The latest [consumer followup](workspace-feedback-followup.md) makes the Route own search, status, sort, and grouping. Issue List retains only interaction Models and the unsaved preset name. Native issue links preserve a validated filtered return target through reload and close. Preset metadata remains session-only; explicit URL filters still render after that metadata resets. Stable repository Services enter Command constructors, and internal navigation and external loading have separate Commands.

## Property controls and pending feedback

All single-selection controls use styled Foldkit UI Listboxes: Active member, list filters, creation fields, and issue properties. Shared rendering and Tailwind classes cover triggers, popup surfaces, option states, focus, disabled behavior, and pointer cursors. Save and Discard share an explicit height. Assignee uses a local tagged choice encoded as a collision-free control identity; the domain Model retains `Option`, and malformed selections leave it unchanged.

Moving an issue announces status without adding a visible row above the board. Existing card pending treatment, immediate optimistic placement, rollback and failure/retry feedback remain. The initial Listbox checkpoint passed 118 application tests and 20 browser cases. Its source, build, lint, formatting, and 82-file declaration evidence remains scoped to that snapshot. The subsequent drag-only card cleanup passes 113 application tests, 20 browser cases, source/lint/build, and strict consumption of 81 emitted declaration files. [Current verification and declaration tradeoff](workspace-listbox-consolidation.md).

The URL followup removes `applySavedView` and its repeated filter synchronization. `pageRoute` selects the page beside an issue from its validated return URL, and `appliedIssueFilters` resolves URL overrides or preset defaults. Issue identity and expected versions protect asynchronous results. Retained editors accept their own pending results while hidden; removing an occurrence still changes its lifecycle identity. The [application simplification](workspace-simplification-20261025.md) records the current helper organization and navigation verification.

This application evaluates Foldkit through daily issue-tracking work. Adding visible controls or more Blocks is not a substitute for a complete workflow.

## Design principles

- Lead with issues, projects, and the current task. Keep branding in the sidebar.
- Give labels and descriptions a specific job. Explain a restriction, consequence, or recovery action; remove generic promotional copy.
- Use compact hierarchy, aligned controls, and consistent spacing. Reserve emphasis for actions, selection, and meaningful state.
- Give control families one shared visual system: matching trigger chrome, popup surfaces, option states, focus, disabled behavior, and deliberate density variants. Keep those styles application-owned rather than prescribing them in headless Foldkit UI.
- Finish an interaction before adding its affordance. Selection needs a useful action; a saved view needs to restore the configuration it names.
- Keep loading, failure, retry, and dismissal behavior truthful. Dismissing a pending operation does not cancel its Command.
- Review small screens, keyboard behavior, and asynchronous outcomes alongside the default screenshot.
- Distinguish application policy from framework capability. Reproduce an awkward contract with the existing API before proposing a new one.

## Implemented in this pass

| Finding                                                       | Change                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repeated branding and generic descriptions displaced the work | Removed the page eyebrow and description system; kept a compact page title. Project descriptions appear in Overview and describe concrete scope.                                                                         |
| Test controls competed with ordinary work                     | Failure injection lives in Settings. Settings identifies simulation and reload behavior as demo controls. Routine success announcements remain available to assistive technology without a persistent banner.            |
| An opened issue followed the entire list on narrow screens    | The editor becomes the primary pane below the desktop split-view breakpoint. Closing returns to the routed list. The browser regression opens the last issue, so scrolling the list is included.                         |
| Selection had no action beyond clearing itself                | Removed selection checkboxes, state, Messages, and inactive toolbar controls. Keep the issue count and saved-view form.                                                                                                  |
| Saved views omitted grouping                                  | Grouping is part of the shared filter contract and is saved/restored with search, status, and sort.                                                                                                                      |
| Deleting the active saved view stranded its route             | Navigate to All issues and retain the applied list configuration. Repair the return route when an issue panel overlays the deleted view.                                                                                 |
| Create issue lacked deliberate focus and pending feedback     | Focus Title through Dialog's existing initial-focus contract, shorten labels, and distinguish Cancel from Close while creation continues. Reopening while pending preserves the draft and prevents duplicate submission. |
| A closed pending create could hide a failed draft             | A failed request returns to its preserved form with the error and retry data. Dismissal does not silently throw away the failed request.                                                                                 |
| Project settings offered saves without changes                | Both view and update reject unchanged or invalid submissions; save feedback follows the actual pending state.                                                                                                            |
| Project overview used decorative metric cards                 | Show the project description, a compact neutral summary, and a Board link.                                                                                                                                               |
| Internal navigation discarded unfinished issue work           | Retain editor Models by issue identity for the session, show their unfinished work in the sidebar, and provide separate discard actions.                                                                                 |
| Reload or page exit discarded retained work without warning   | Install a native beforeunload listener only while retained drafts exist, using a Subscription with scoped cleanup. Browser warning availability remains platform-dependent.                                              |

No framework API was added for these fixes. Existing Bindings, Steps, OutMessages, Dialog, and native navigation support them.

## Next investigations

### Native issue links

Issue rows, Board titles, and assigned issues now use parent-supplied native hrefs. The child receives data rather than a root routing callback. Program handles primary-click routing and leaves modified/native new-tab behavior to the browser. Board titles become non-links while dragging or saving; the drag handle remains separate.

### Command palette composition

The palette currently authors its combobox/listbox interaction directly. Prototype the existing UI Combobox for transient command actions, preserving keyboard navigation, active-option scrolling, Dialog focus, and parent-owned navigation. Identify a concrete contract mismatch before adding a new UI primitive. Existing native project links remain explicit because wrapping four links in Nav would add mapping machinery without new behavior.

### Listbox consolidation

The native Select assessment is complete. Every single-selection control now uses the shared Foldkit UI Listbox specialization. The parent owns selected domain values. Board cards use their drag handles for movement, including keyboard dragging. Redundant status selectors and arrow buttons, their per-card interaction Models, and the associated parent synchronization have been removed. The root retains optimistic placement, persistence, rollback, and retry policy. [Implementation and verification](workspace-listbox-consolidation.md).

### Shared feedback

Local saves and failures already show feedback where they occur. Assess the existing Toast Block when an operation completes away from its originating view; do not invent a parallel notification system. The pending-create recovery policy here is deliberately explicit.

The separate [consumer-friction record](workspace-consumer-friction.md) retains the Command-inspection and compiler-diagnostic follow-ups. The [performance record](workspace-performance.md) retains declaration-emission limits. Earlier measurements do not describe this later source snapshot.

## Verification

Focused Scene, Story, and browser cases cover the affected workflows. The mobile visibility regression was observed failing with the pane-hiding fix removed. The saved-view regression failed before grouping was retained. The direct project-submission test was observed failing when the unchanged-project guard was removed. Final check results are recorded in the program audit.

## Retained-work policy

Close, issue changes, application links, and browser history keep unfinished issue fields and comments. The sidebar identifies retained drafts. Discard changes resets issue fields while preserving an unsent comment; Discard comment affects only that comment. Saving issue fields also preserves the comment. Drafts remain session-only.

The child reports its draft through a Message-backed operation and an OutMessage. Its nested Comment Composer supplies its own body through the same mechanism; parent policy does not inspect private child fields. The root retains that projection for the sidebar and page-exit guard. Newer comments or activity can advance an editor's baseline while preserving local fields; conflicting changes to editable fields require an explicit reload. Successful responses never move the baseline backward. Navigation from A to B and back reuses both keyed editor Models. A save can complete in hidden editor A without changing editor B or navigating away from it. Removing and recreating an occurrence remains a separate lifecycle decision; stale-result isolation does not cancel an external write already performed by a Command.

Page exit uses the native browser warning, scoped by a Subscription to retained work. The Subscription emits no Messages and exposes no resource handle. It does not save data or require an application confirmation Dialog for internal navigation. The browser controls warning text and availability, and accepting an exit loses the in-memory session.

The shared Dom convenience is tracked in [#1773](https://github.com/foldkit/foldkit/issues/1773). The current implementation uses the existing scoped event Stream and retains the documented legacy fallback required by Vite's Chrome/Edge 111 baseline.

## Control and navigation followups

The final consumer review retains the current command palette for this preview. It composes Foldkit UI Dialog and Input around heterogeneous typed actions, with no lasting selected value. The current Combobox owns a selected string value and an anchored popup lifecycle. Replacing the palette would add selection encoding and coordination with Dialog focus/close without fixing a demonstrated primary workflow failure. Home/End and consistent pointer-active navigation are useful future refinements.

Background failures remain visible globally with an actionable Retry, including after navigation. Optimistic success stays quiet, with an aria-live notice where needed. Toast would duplicate success notices or make durable recovery transient; no current workflow requires it. Single-selection controls use the shared Foldkit UI Listbox rendering, including their popup menus.

Native issue links are implemented in the URL followup. Their local Scenes verify href contracts, and production browser cases exercise Program routing, modified-click behavior, filtered return context, and existing draft/lifecycle admission. This uses the existing HTML and routing APIs.

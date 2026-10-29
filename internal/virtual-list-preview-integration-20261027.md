# VirtualList preview integration

## Scope and publication

Port PR #1633 from `9499d5264c51c842c3cb11a9d62eb16eb48d7a34` to the current Composition API, then implement issue #1722. The original contribution targets main at `49dc36ef672d1caee23f153f88c09d98c8241670`; its six commits and full diff were reviewed. It has no review comments or issue comments to reconcile, and all recorded original checks passed. Those original checks do not verify this port.

This work is prepared on the preview follow-up checkout. It has not been published. The user's October 28 clarification includes it in preview update documentation, PR release notes and the announcement handoff, superseding the earlier exclusion. These additions support `foldkit-domains`; they are separate from Block/Layer migration requirements. The published Ready snapshot and release approval hold remain unchanged.

## Consumer behavior

- History loading now emits `ApproachedLoadedStart`; the parent owns fetching, loading state, rows and final-page knowledge. The Binding's `informHistoryPrepended` operation accepts exact Item inputs and sends Schema-backed key/count/page metadata to the child. It does not transport application callbacks or arbitrary Items in Messages.
- `HistoryPage.Complete()` removes the loading buffer. Stable row keys, bottom-origin scrolling and measurement corrections preserve continuous upward history within the available range. `AccessibleSet` supports loaded, unknown and known total sizes.
- `ScrollContainer.Self()`, `Ancestor({ selector })` and `Window()` share logical list-relative targets. External owners retain their authored overflow and layout. Negative visible offsets are preserved when preceding content fills part of the viewport; End targets the list's end rather than following content.
- Native tables use parent-owned table/header/columns and child-owned `tbody > tr` rows. Spacer cells span the configured columns. `itemToView` can return multiple cells, and `itemToAttributes` supplies logical row indices or other parent-owned row attributes.
- Absolute ordinary rows use a full-height content surface and logical translations. Self mode adds an inner surface while keeping the configured id and attributes on the outer viewport.
- Exhaustive parent policies handle the new `ApproachedLoadedStart` and `EndedContainerScroll` OutMessages. Ordinary consumers use their Definition's `makeNoopStep` for these notifications.

The Website history demo, complete checked-assembly snippets and showcase consumers use the current completed generic Blocks, registered Bindings, record updates and attached handler Layers.

## Compatibility boundaries

History requires Self scrolling with ordinary spacer rows. Native table rows require external scrolling and spacer layout. Ordinary non-history lists support Self, Ancestor and Window with either spacers or absolute rows. Invalid cross-boundary combinations reject through view-input typing where possible and through explicit runtime configuration validation where init and view are separate boundaries.

The parent owns membership, external container sizing, table columns and table accessibility counts. VirtualList owns row sizing and positioning. Additional attributes must preserve its inline geometry and internal data attributes.

External position observation covers preceding content resizing, insertion, removal and style changes. It does not continuously sample CSS-only positional animations. Browser automation does not establish physical iOS momentum behavior or every assistive-technology combination.

## Regression findings addressed during integration

These were candidate integration defects, not defects reported in a published preview:

- Forward the external owner selection to the Mount, so observation and Commands use the same viewport.
- Combine each element's owned styles into one Style attribute. Foldkit replaces Style records; multiple attributes had discarded table spacer heights and absolute row dimensions.
- Clamp pixel offsets to the list range without clamping legitimate signed row alignments or End targets for underfilled external lists.
- Preserve the pre-resize anchor before width changes invalidate cached measurements.
- Determine absolute anchor visibility from committed virtual row bounds while actual row measurements and transforms temporarily disagree.
- Retain logical targets through measurement waves, distinguish owned scroll acknowledgments from native movement, and prevent an older scroll write from cancelling a newer target. Ordinary item changes release the settled target rather than enabling followEnd.
- Preserve ordinary Self `overflow-anchor: none` from the current preview. History opt-out installs no history gesture listeners, timers or reverse layout.
- Keep Playwright fixtures out of Vitest discovery. Control the finite fetch clock in the pending-history browser case instead of racing a 150 ms transient state.

## Verification

Raw logs, original patch/commits/checks, mutation controls, browser traces and rendered documentation screenshots are retained at `/private/tmp/foldkit-virtual-list-preview-20261027`.

- All 1,336 UI tests pass, including 96 focused VirtualList cases. Accepted/rejected source, isolated package emission and strict relocated UI consumer checks pass. New cases cover exact history Items, external owners, table cells/attributes, invalid table/history combinations, measurement targets and idle layout anchors.
- All six unchanged compiler ceilings pass with the same counts as the previous optimized candidate. This does not establish unlimited inference or declaration scaling.
- The complete 54-case browser matrix passed 40 cases, with 14 deliberate traversal skips across narrow Chromium and WebKit. After the final idle Layout correction, all nine affected cases passed across the three projects, including the new preceding-content-then-append regression. The suite now discovers 75 cases. Final review added an underfilled external End regression across all six external layout combinations; all 18 cases pass in desktop/narrow Chromium and WebKit, including row measurement correction and separate pixel-offset clamping. The ancestor spacer case failed before the correction with a 286 px alignment error. All seven 300-row traversals were verified with bounded mounted slices. Firefox was unavailable.
- Three browser mutations deliberately fail the signed-offset, table-spacer-height and idle-layout-anchor gates. A separate unit mutation rejects clamping signed offsets, and the idle-layout unit regression failed before its fix. All controls were restored.
- The Website passes eight history browser cases with retries disabled, including sustained upward scrolling without programmatic writes or blank windows. The finite pending-state case separately passes five runs across three workers with a controlled clock. Website source and 961 focused application/documentation tests pass; all three new or revised complete snippets compile independently.
- Desktop and narrow visual review covers the Website guide/history controls and both UI showcase lists. The showcase jumps to row 5,000 with 10–17 rows mounted and no page errors or horizontal overflow. Owned test servers and browser contexts are closed; the user's Workspace server is preserved.
- Three quiet paired native TypeScript 7.1 beta Website runs validate 108 observations. Post-edit Binding completion changes 232.5 to 247.0 ms; changed-URL hover 240.7 to 254.4 ms; completed ApplicationBlock completion 112.5 to 113.4 ms. Error appearance changes 594.8 to 603.3 ms and clearing 609.9 to 585.6 ms. First completed-Block member completion increases 21.2 ms. Peak native RSS remains below 970 MiB under the unchanged 4 GiB cap. This bounded check establishes no broad speedup or long-session memory claim. Exact source inputs and all pairs are retained under `editor/`.
- UI/e2e/showcase/Website typechecks, scoped lint, UI dead-code checking and formatting pass. The private browser fixture refuses occupied ports, kills its server process group and verifies port release. CI runs its source check and browser cases when Website/UI work is selected.

The final committed-diff review and candidate-stamped Website production build are recorded beside these logs after the source commit. They are separate from the original PR's checks and from the previously published Ready snapshot.

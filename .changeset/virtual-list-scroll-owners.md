---
'@foldkit/ui': minor
---

Add continuous VirtualList history loading with prefetch OutMessages, an explicit final-page signal, and accessible partial-set positions. The parent owns fetching and the loaded rows: it handles `ApproachedLoadedStart` with `list.on`, prepends the page to its items, and sends `informHistoryPrepended({ ... })` to the instance with a `HistoryPage` of `More` or `Complete`. The `accessibleSet` view input, an `AccessibleSet`, describes the set size and positions announced to screen readers. Dynamic measurements preserve keyed viewport anchors without redundant scroll writes.

Add ancestor and window scroll containers through the `scrollContainer` arg (`ScrollContainer.Ancestor({ selector })` or `ScrollContainer.Window()`), native table rows (`containerElement: 'tbody'`, `rowElement: 'tr'`, and `tableColumns`), and absolute list rows (`rowLayout: 'Absolute'`). External scroll targets account for content preceding the list and resolve `End` relative to the list rather than the page. The list's Mount cleanup removes external listeners and layout observers. History mode requires the list's own scroller and spacer rows, and table rows require an external scroller.

VirtualList emits `ObservedContainerScroll`, `ApproachedLoadedStart`, and `EndedContainerScroll` OutMessages. A parent handles only the ones it needs.

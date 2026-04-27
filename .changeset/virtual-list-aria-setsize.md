---
'foldkit': patch
---

Inject `aria-setsize` (total item count) and `aria-posinset` (1-based logical position) on every rendered `Ui.VirtualList` row, so screen readers announce "row N of total" for the full logical list size, not the smaller count of currently mounted rows.

Closes the screen-reader gap inherent to virtualization: with only ~10-30 rows in the DOM at any time, the implicit set size from `<li>` children of `<ul>` would otherwise tell assistive tech the list has 12 items even when the real list has 10,000. No consumer wiring required.

Each row also carries `role="listitem"` explicitly so the list-item semantics survive a `rowElement` override (e.g. consumer passing `rowElement: 'div'`).

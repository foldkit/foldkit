---
'foldkit': minor
---

`Ui.VirtualList` now supports variable row heights. Pass an optional `itemToRowHeightPx: (item, index) => number` callback on `ViewConfig` and the component sizes each row from the callback and walks cumulative heights to compute the visible slice and spacers. The uniform path is unchanged: omit `itemToRowHeightPx` to keep using `model.rowHeightPx` everywhere.

Two new exports support programmatic scrolling and slice queries on a variable-height list: `scrollToIndexVariable(model, items, itemToRowHeightPx, index)` mirrors `scrollToIndex` for the variable case, and `visibleWindowVariable(model, items, itemToRowHeightPx, overscan)` mirrors `visibleWindow`. Use the variable functions when rendering with `itemToRowHeightPx`; the uniform functions still apply when rows share a height.

Variable-height math is O(N) per render, walking `items` once to build a prefix sum. Lists in the 10k-row range fit comfortably inside a 60Hz scroll budget. Prefer the uniform path when row heights are stable.

Note: restoring `initialScrollTop` on the first measurement of a variable-height list falls back to uniform-height math (using `model.rowHeightPx`) because items aren't reachable from `update`. Call `scrollToIndexVariable` after the first `MeasuredContainer` arrives for an accurate initial scroll on a variable-height list.

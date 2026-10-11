---
'@foldkit/ui': minor
---

Support momentum-preserving history loading in VirtualList through the opt-in `history` configuration. VirtualList emits `ApproachedLoadedStart` as the viewport approaches the loaded boundary. The parent owns fetching and calls `informHistoryPrepended` with the new page and `HistoryPage.More()` or `HistoryPage.Complete()`. A bottom-origin layout lets prepended pages extend the upward scroll range without a position write during an active gesture. The loading buffer is removed when the final page arrives. `AccessibleSet` reports loaded, unknown, or known partial collection positions to assistive technology.

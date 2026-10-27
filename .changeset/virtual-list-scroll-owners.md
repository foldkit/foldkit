---
'@foldkit/ui': minor
---

Add continuous VirtualList history loading with semantic prefetch OutMessages, an explicit final-page operation, and accessible partial-set positions. Parent Blocks continue to own fetching and loaded rows. Dynamic measurements preserve keyed viewport anchors without redundant scroll writes.

Add ancestor and page scroll containers, native table rows, and absolute list rows. External scroll targets account for content preceding the list and resolve End relative to the list rather than the page. Mount cleanup removes the external listeners and layout observers. History mode retains the owned spacer-list scroller; table rows require an external scroller and spacer layout.

Exhaustive VirtualList OutMessage policies must also handle ApproachedLoadedStart and EndedContainerScroll. Non-history consumers can handle both with makeNoopStep.

---
'foldkit': patch
---

Fix a runtime race that could corrupt the DOM when a synchronous event fired during a patch caused a nested `dispatchSync` to run against a stale VNode reference. Most visible in Chrome when a focused element was removed from the DOM during a render (Chrome fires `blur` synchronously), and specifically reproduced with `Ui.Listbox`: selecting an item closed the list, removing the items container, firing `blur`, which dispatched another message while the outer render was still mid-patch. Symptom was duplicate DOM elements that the outer render did not clean up.

The render path now sets an internal `isRendering` flag before patching and clears it after. Any `dispatchSync` that lands while the flag is set offers the message to a pending queue (`Queue.unbounded`) instead of kicking off a nested render. The queue is drained at the end of each render, so the nested messages still process in order, just serially rather than re-entrantly.

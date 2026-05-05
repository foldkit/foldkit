---
'foldkit': patch
---

Fix `Task.focus`, `Task.scrollIntoView`, `Task.clickElement`, `Task.advanceFocus`, and `Task.showModal` running against a stale DOM. The runtime now defers renders to `requestAnimationFrame`, but Commands still ran on the microtask queue, so a Task dispatched alongside a model change would query the tree before the matching VDOM patch had committed and silently no-op. Each of these Tasks now waits one frame so its query observes the committed DOM. Existing call sites that focus an element brought into existence by the same Message will start working again without changes; for that pattern, prefer `OnMount` with a `Mount.define`'d action so focus is bound to the element's lifecycle rather than the dispatch order.

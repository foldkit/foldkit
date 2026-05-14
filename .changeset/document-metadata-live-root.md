---
'foldkit': patch
---

Fix `document.title`, `<link rel="canonical">`, and `<meta property="og:url">` not updating across renders.

The runtime cached the container element passed to it at startup and used `document.body.contains(container)` to guard document metadata updates. Snabbdom replaces the container element on the first patch whenever the root VNode's selector doesn't match the container's. A common case: mounting on `<div id="root">` with a top-level view of `<div class="...">`. That detached the cached reference, the guard short-circuited every subsequent render, and document metadata stayed pinned to whatever the static HTML provided.

The runtime now checks the patched VNode's live element instead, so metadata updates work regardless of selector mismatches between the container and the root view.

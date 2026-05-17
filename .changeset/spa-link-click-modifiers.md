---
'foldkit': patch
---

SPA link interception now lets the browser handle clicks that aren't a plain primary-button navigation: Cmd/Ctrl/Shift/Alt-click, middle/right-click, links with `target="_blank"` (or any non-`_self` target), `download` links, and clicks whose default has already been prevented by an app-level handler all fall through instead of being captured by the router. Previously the handler called `preventDefault` on every click of an `<a>` with a non-empty href, so opening a link in a new tab silently did nothing.

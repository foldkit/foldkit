---
'foldkit': minor
---

Add `openUrl(href)` to `foldkit/navigation` — opens a URL in a new browsing context (tab or window, at the browser's discretion) without leaving the current page. Parallels `load(href)` for cases where you want to dispatch an external URL as a Command without navigating away.

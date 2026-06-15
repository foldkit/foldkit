---
'foldkit': patch
---

Fix a page-owning app coming back blank from the browser's back/forward cache.
`BrowserRuntime.runMain` interrupts the runtime on `beforeunload`, which is also
when the page is frozen into the cache, and that interrupt used to remove the
bfcache-restore listener along with the rest of the runtime. On restore there
was nothing left to reload the page, so it came back blank. The listener now
lives for the page's lifetime, so leaving a page with a full document
navigation and returning to it reloads cleanly instead of showing a blank page.

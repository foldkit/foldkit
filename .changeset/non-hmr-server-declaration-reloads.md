---
'@foldkit/vite-plugin': patch
---

Keep server-rendered development requests consistent when HMR is disabled and a file changes during an asynchronous Vite watcher hook. Refresh Block Definitions and their declarations together after Vite invalidates the entry, preventing duplicate Command registration errors. Unchanged requests continue sharing the evaluated entry.

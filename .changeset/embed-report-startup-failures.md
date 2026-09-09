---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/vite-plugin': patch
---

`Runtime.embed` now reports unhandled startup failures in the console, matching `Runtime.run` and `Runtime.hydrate`, while host disposal and other interrupt-only exits stay quiet. A failing Flags or resource Effect no longer leaves an embedded program blank without explaining why.

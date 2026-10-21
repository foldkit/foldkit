---
'@foldkit/vite-plugin': patch
---

Hydrate the page after a dev server restart. Before, the browser cached Foldkit's build-token module from the earlier dev server, so `Runtime.hydrate` refused every page after a restart until a hard reload. A configured `buildId` or `FOLDKIT_BUILD_ID` that changed between restarts caused the same refusal.

In development, Foldkit's build-token module now imports the build id from a virtual module, which the browser revalidates on each load. Without a configured id, each dev server generates its own. Build output does not change.

Thanks @drobson03 for reporting this issue!

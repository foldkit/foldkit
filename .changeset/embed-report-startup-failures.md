---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/vite-plugin': patch
---

`Runtime.embed` now reports startup failures the same way `Runtime.run` does.

`run` goes through `BrowserRuntime.runMain`, which logs unreported non-interrupt causes when the root fiber fails. `embed` previously used a bare `Effect.runFork`, so the same failure (for example a `flags` Effect that dies before the first render) left a blank container and nothing in the console.

`embed` now mirrors that reporting: a failed startup logs the Cause, interrupt-only exits from `dispose` stay quiet, and the public handle API is unchanged. `@foldkit/vite-plugin` force-includes `effect/Runtime` and `effect/Logger` so the new reporting path stays in the prebundled Effect blob in dev.

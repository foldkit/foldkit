---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/vite-plugin': patch
---

`Runtime.run` and `Runtime.embed` now share one unhandled-Cause reporting path.

Previously only `run` logged startup failures (via Effect's `makeRunMain`). `embed` used a bare `Effect.runFork`, so a failing `flags` Effect left a blank container and nothing in the console. Both entrypoints now go through the same Foldkit reporter: unreported non-interrupt Causes are logged, interrupt-only exits stay quiet, and `run` disables Effect's built-in reporter to avoid a second copy of the policy. `run` still uses `makeRunMain` with no page-lifecycle interrupt. The public `embed` handle API is unchanged. `@foldkit/vite-plugin` force-includes `effect/Logger` so the reporter test's `Logger` import stays in the prebundled Effect blob.

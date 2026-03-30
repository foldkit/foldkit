---
'create-foldkit-app': patch
---

Scaffold vitest configuration in new projects. Adds `vitest.config.ts` with `server.deps.inline: ['foldkit']` so tests resolve foldkit through Vite's bundler pipeline, a `test` script in `package.json`, and vitest and happy-dom as dev dependencies.

---
'foldkit': patch
---

Mark the `foldkit` package as side-effect-free (`"sideEffects": false`) so bundlers can tree-shake unused modules from production builds.

Foldkit has no module-level side effects (no CSS imports, no top-level `customElements.define`, no global mutations), but without this field bundlers conservatively retain every module they touch. In practice that meant the dev-only DevTools overlay, HMR model-preservation, and WebSocket bridge code, all gated behind `import.meta.hot` and dead-code-eliminated in production, could not be dropped from the module graph and shipped in every app.

Impact: a minimal counter app drops from 314.9 KB to 268.4 KB raw (102.8 KB to 87.9 KB gzip), roughly a 15% reduction, with no source changes required by consumers.

---
'@foldkit/vite-plugin': patch
---

Force `foldkit` and any installed `@foldkit/ui` / `@foldkit/devtools` into a
single Vite dep-optimization pass via `optimizeDeps.include`. Without this,
Vite's optimizer can pre-bundle `foldkit` and `@foldkit/ui` in separate passes
and load `foldkit` twice. A duplicate instance gives foldkit's Schema and
tagged-message constructors separate identities, so decode and tag matching
fail across the boundary, and it bundles foldkit's module graph twice. The
optional packages are included only when the consumer has installed them.

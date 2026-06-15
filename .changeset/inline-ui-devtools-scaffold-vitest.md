---
'create-foldkit-app': patch
---

Inline `@foldkit/ui` and `@foldkit/devtools` in the scaffolded app's Vitest config. A scaffolded app installs these as published packages, which Vitest externalizes by default. That loads a second copy of `foldkit` alongside the inlined one, breaking Schema and tag identity in any test that imports from either package. Inlining them keeps a single shared `foldkit` instance, the same reason `foldkit` itself is already inlined.

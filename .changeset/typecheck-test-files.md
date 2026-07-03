---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'create-foldkit-app': patch
---

Typecheck test files. Each package's `typecheck` script now checks the
project that includes tests instead of the build project that excludes
them. No runtime changes.

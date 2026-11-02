---
'@foldkit/vite-plugin': patch
---

Prebundle `effect/Effectable` and `effect/Tuple`, which Foldkit imports, including in applications that never import those modules directly.

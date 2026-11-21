---
'@foldkit/vite-plugin': patch
---

The Vite plugin prebundles `effect/SchemaParser`, which Form imports, with the rest of Effect, so the dev server loads one copy of it.

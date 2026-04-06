---
'foldkit': minor
---

Add per-pair message mapper support to `Story.resolveAll` and `Scene.resolveAll`. Each pair in the array can now include an optional third element — a mapper function — matching the same signature as `resolve`'s third argument. This lets tests resolve multiple child Commands in a batch without expanding into individual `resolve` calls.

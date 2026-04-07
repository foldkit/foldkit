---
'foldkit': minor
---

Change `Story.resolveAll` and `Scene.resolveAll` from a single array argument to variadic rest params.

Before: `resolveAll([[Definition, Message], [Definition, Message]])`
After: `resolveAll([Definition, Message], [Definition, Message])`

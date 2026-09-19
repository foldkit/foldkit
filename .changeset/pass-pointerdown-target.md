---
'foldkit': minor
---

Pass the originating event target as the final argument of `h.OnPointerDown` callbacks. Existing callbacks remain compatible; the target lets parent gesture handlers ignore nested controls or selectable content without bypassing Message dispatch. `Scene.pointerDown` now supplies a detached DOM representation of the target and its ancestors so tests exercise the same selector checks.

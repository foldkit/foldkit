---
'foldkit': minor
---

`h.OnPointerDown` now hands its callback the event's `pointerId`, so a handler can tell which pointer started a gesture and ignore unrelated touches. It is the eighth callback argument, after `clientY`. `Scene.pointerDown` takes a matching `pointerId` option, defaulting to `0`.

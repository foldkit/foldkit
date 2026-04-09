---
'foldkit': minor
---

Add click/doubleClick event bubbling, Scene.pointerDown/pointerUp steps, and RegExp support for role name matching in Scene tests.

- `Scene.click` and `Scene.doubleClick` now bubble to the nearest ancestor with a handler when the target element has none, mirroring browser event propagation.
- `Scene.pointerDown(target, options?)` and `Scene.pointerUp(target, options?)` simulate pointer events with configurable `pointerType`, `button`, `screenX`, and `screenY`.
- `Scene.role('option', { name: /PM/ })` now accepts `RegExp` for flexible accessible name matching.

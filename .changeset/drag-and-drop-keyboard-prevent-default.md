---
'@foldkit/ui': minor
---

Fixes DragAndDrop's keyboard-drag key handling. `preventDefault()` for Tab, Space, Enter, and the arrow keys ran inside a `Stream.mapEffect` stage, a turn after the browser's event dispatch, so during a keyboard drag Tab still moved focus and Space and the arrow keys still scrolled the page. The listener now uses `Subscription.fromEventPreventDefault`, which cancels handled events inside the dispatch, and the Foldkit peer dependency now requires the release that provides the helper.

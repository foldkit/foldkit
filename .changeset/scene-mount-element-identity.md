---
'foldkit': minor
---

Scene now tracks each Mount by the element that carries it, using the renderer's own child matching, so a Scene test sees a Mount end and start again when the renderer replaces its element. A patched element keeps the Mount it was inserted with, even if its `OnMount` changes or is removed, and an `OnMount` added to a patched element does not start. Mount cleanup also runs if the element is later removed after its `OnMount` attribute was dropped.

Update Scene tests to resolve only Mounts started by inserted elements. Closing or changing attributes on a retained element does not end its Mount.

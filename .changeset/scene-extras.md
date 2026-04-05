---
'foldkit': minor
---

Add more Scene interactions and assertions for RTL/Playwright parity. New interactions: `Scene.doubleClick`, `Scene.hover`, `Scene.focus`, `Scene.blur`, and `Scene.change` (dispatches `OnChange`, useful for `<select>`). `Scene.toHaveText` and `Scene.toContainText` now accept a `RegExp` in addition to a string. New assertions: `.toBeVisible()` (element is not hidden via `hidden`, `aria-hidden`, or `display: none`), `.toHaveAccessibleName(name)`, and `.toHaveAccessibleDescription(description)` — both resolve `aria-labelledby`/`aria-describedby` references against the full render tree.

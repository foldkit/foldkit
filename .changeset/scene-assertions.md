---
'foldkit': minor
---

Add three new assertions to `Scene.expect(...)`: `toBeEmpty()` (element has no text or child nodes) and `toHaveId(id)`. Also introduce `Scene.expectAll(locatorAll)` for multi-match assertions, with `toHaveCount(n)` and `toBeEmpty()` (count is 0). `expectAll` respects `Scene.inside` scopes — matches are resolved relative to the active scope.

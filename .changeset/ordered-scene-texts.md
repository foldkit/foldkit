---
'foldkit': minor
---

Add `Scene.expectAll(locatorAll).toHaveTexts(expected)` to compare each matched element's full text in traversal order. It checks the exact text, count, and order, supports readonly string arrays and `.not`, and reports the locator with the expected and actual text arrays on failure.

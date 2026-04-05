---
'foldkit': minor
---

Add multi-match Locators and filter combinators to the Scene testing API. `Scene.all` exposes `role`, `text`, `placeholder`, `altText`, `title`, `testId`, `displayValue`, and `selector` factories — each returns a `LocatorAll` that resolves to every matching VNode. Convert to a single `Locator` via `Scene.first`, `Scene.last`, or `Scene.nth(n)`. Narrow a `LocatorAll` via `Scene.filter({ has, hasNot, hasText, hasNotText })`, which keeps entries that do (or don't) contain a matching descendant or substring. Matches Playwright's filter/nth semantics — use it for list rows, repeated buttons, or anywhere you need to pick the Nth of many.

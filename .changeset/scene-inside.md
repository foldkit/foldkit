---
'foldkit': minor
---

Add `Scene.inside(parent, ...steps)` — a step-scoping primitive for Scene tests. Every Locator referenced by the nested steps resolves within the parent's subtree, so a block of assertions or interactions can share a scope without repeating `Scene.within(parent, …)` on every line. Composes with nested `Scene.inside` via `Scene.within`. Existing `Scene.within` is unchanged — use it for one-off scoped locators; use `Scene.inside` when two or more steps share a scope.

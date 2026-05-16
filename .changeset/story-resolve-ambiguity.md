---
'foldkit': minor
---

`Story.Command.resolve` and `Scene.Command.resolve` now throw when more than one pending Command matches the matcher, surfacing what was previously a silent first-match-wins behavior. Ambiguous resolves are almost always a test bug: the test author intended one specific Command but happened to hit the first of several identical pending matches, often coincidentally.

**Breaking:** Tests that relied on issuing N successive `resolve` calls for N same-named pending Commands now throw. Switch those call sites to `Story.Command.resolveAll` (or `Scene.Command.resolveAll`), which consumes ordered resolver pairings in declaration order. Where the colliding Commands have distinguishing args, pass a Command instance (e.g. `FetchById({ id: 5 })`) for type-checked disambiguation.

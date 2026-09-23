---
'foldkit': minor
---

`Scene.role` could filter on `checked`, `selected`, `pressed`, `expanded` and `disabled`, but not on `aria-current`, the state every navigation, breadcrumb, pagination and stepper marks. Asserting the current page's link meant finding it by name and checking the raw attribute with `toHaveAttr`, which can only inspect one already-found element.

`role('link', { current: 'page' })` now selects by that state, with the same rule Testing Library's `getByRole` uses for its `current` option. A token (`page`, `step`, `location`, `date`, `time`) matches itself exactly, `current: true` matches `aria-current="true"` only, and `current: false` matches an element with no `aria-current` or an explicit `"false"`. The option also appears in the locator's description, so a failed match names it.

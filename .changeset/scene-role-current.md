---
'foldkit': minor
---

Add a `current` option to the Scene `role` locator

`Scene.role` could filter on `checked`, `selected`, `pressed`, `expanded` and `disabled`, but not on `aria-current`, the state every navigation, breadcrumb, pagination and stepper marks. Asserting the current page's link meant finding it by name and checking the raw attribute with `toHaveAttr`, which can only inspect one already-found element.

`role('link', { current: 'page' })` now selects by that state. A token (`page`, `step`, `location`, `date`, `time`) matches itself exactly; `current: true` accepts any token but `false`; `current: false` treats an absent attribute and an explicit `false` alike, as the ARIA specification does.

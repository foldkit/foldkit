---
'foldkit': patch
---

Fix `label(For(id), ...)` so the `for` attribute actually reaches the DOM.

The `For` attribute handler was routing through snabbdom's `props` module with the key `for`, which told snabbdom to run `element.for = value`. `HTMLLabelElement` has no `for` property — the reflected DOM property is `htmlFor` — so the assignment silently created a JS expando and no `for=""` attribute was ever emitted on the rendered label. Every Foldkit form using `label([For(id)], ...)` was missing its label↔control association, so assistive tech and axe-core could not resolve accessible names from the label.

The handler now routes through `htmlFor`, which snabbdom assigns as a real DOM property and which reflects to the `for` HTML attribute.

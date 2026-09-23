---
'foldkit': minor
---

Scene CSS selectors now parse quoted attribute values that contain spaces, accept single-quoted values, and support `:not()`. Before, `Scene.selector('a[aria-label="Open menu"]')` threw because the parser split the selector on every space, including spaces inside quotes, and `path[d]:not([d=""])` threw because `:not()` was unsupported.

`:not()` takes one compound selector, such as `:not([d=""])`, `:not(.hidden)`, or `:not(button.primary)`, and may be nested or repeated. A selector list or combinator inside `:not()` still throws.

Every selector that parsed before matches exactly the same elements. The supported syntax is now listed in the `selector` and `all.selector` TSDoc, on the Scene testing page, and in the parse error.

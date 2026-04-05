---
'foldkit': patch
---

Replace snabbdom's built-in propsModule with a custom one that resets removed DOM properties. Snabbdom's propsModule only sets new properties and never cleans up old ones, so properties like `disabled` persist on the DOM element even after being removed from the attribute array. This caused event listeners (e.g. `OnClick`) that replaced a property (e.g. `Disabled`) at the same index to silently fail.

---
'foldkit': patch
---

Restore the custom propsModule that resets removed DOM properties. Snabbdom's built-in propsModule only sets new properties — it never cleans up old ones that disappeared between renders, so `disabled` persists on the DOM element even after `Disabled(true)` is removed from the attribute array. This was incorrectly reverted in 0.47.0.

---
'foldkit': minor
---

Add explicit cache lifecycle operations to experimental Query. KeyedQuery's `forget` removes one entry and `retainOnly` removes entries outside a supplied set without fetching or changing retained entries. Both preserve request generations. `replace` starts a new Fetch even when one is pending, keeps available data visible, and ignores superseded completions. Parent update handlers can compose retention with loading operations to manage the cache as selection or routing changes.

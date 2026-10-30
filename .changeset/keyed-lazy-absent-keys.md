---
'foldkit': minor
---

Add `createKeyedLazy({ evict: 'AbsentFromRender' })` to release unused row entries after each completed render. This bounds the keyed cache to rows used by the latest completed render. Cached parents preserve their children's entries, and cache writes roll back if view construction fails. The default retains every key.

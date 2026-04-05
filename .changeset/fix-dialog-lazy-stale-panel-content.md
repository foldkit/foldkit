---
'foldkit': minor
---

`Dialog.lazy` now takes `panelContent` as a dynamic third argument instead of capturing it in the static closure. This fixes a bug where `panelContent` was frozen at creation time, causing stale VNode data (e.g. `Disabled(true)` persisting after model changes).

Also reverts the custom `propsModule` introduced in 0.46.0 — the root cause was `Dialog.lazy` caching stale content, not snabbdom's property cleanup.

**Migration:** Move `panelContent` from the config object to the call site:

```ts
// Before
const dialogView = Dialog.lazy({ panelContent: myContent, panelClassName: '...' })
dialogView(model.dialog, toParentMessage)

// After
const dialogView = Dialog.lazy({ panelClassName: '...' })
dialogView(model.dialog, toParentMessage, myContent)
```

---
'foldkit': patch
---

Reject multiple `OnMount` attributes on one element during VNode construction, naming both Mounts before either handler starts. Duplicate attributes previously replaced the first Mount silently. The guard also covers spread attributes and published child attribute groups.

Use one Mount per element and combine its element-owned work in one scoped handler, registering each cleanup there. `OnUnmount` can share the element with that Mount.

---
'foldkit': patch
---

Fix a Submodel whose root vnode changes identity across renders (most
commonly a keyed element used as the Submodel's root, whose key changes)
crashing on a later interaction with `dispatchAcrossBoundary missing wrap
for ancestor`. The root's destroy hook ran after the next render had
already re-registered the boundary, evicting the live wrap. The destroy
hook now skips deregistration when the boundary was re-registered in the
same render cycle, so a keyed Submodel root works without wrapping it in a
stable element. The `missing wrap` error no longer asserts a single
most-likely cause.

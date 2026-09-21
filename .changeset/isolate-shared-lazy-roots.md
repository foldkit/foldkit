---
'foldkit': patch
---

Preserve independent DOM ownership when lazy views share a constant root VNode. Removing and restoring one view no longer overwrites another view's DOM reference. Cache hits retain their existing identity shortcut.

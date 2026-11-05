---
'foldkit': patch
---

Deliver retained Scene Mount results through the current Block boundary while preserving their original acquisition and arguments. Removing the acquiring child occurrence now ends its Mount even when the element remains rendered. Scene tests must acknowledge that removal with `Scene.Mount.expectEnded`.

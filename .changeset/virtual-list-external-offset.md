---
'@foldkit/ui': patch
---

Preserve page position when sorting or filtering a VirtualList whose external viewport starts above the list. Window and ancestor viewports retain their signed offset until scrolling into the list, where visible-row anchoring applies. Self-scrolling history retains its negative-offset and follow-end behavior.

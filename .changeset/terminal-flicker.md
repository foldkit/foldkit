---
'foldkit': patch
---

Fix flicker in the terminal runtime by overwriting frames in place instead of erasing the screen between renders. The frame body and window title are also flushed in a single write so the terminal updates them atomically.

---
'foldkit': minor
---

DevTools no longer auto-scrolls the message list back to the top when the user has manually scrolled away. A "Jump to top" pill appears at the top of the list when scrolled, and clicking it (or scrolling back to within 8px of the top) re-engages auto-scroll. Selection-follow ("Follow Latest") and scroll-follow are now independent: clicking a row stops selection-follow without affecting scroll, and the new pill controls scroll without affecting selection. Clicking Resume or Clear re-engages both follows and jumps the list to the top.

**Breaking:** `h.OnScroll` now takes `(scrollTop: number) => Message` instead of a fixed `Message`, matching the `h.OnInput` / `h.OnChange` extractor pattern. Migration: `h.OnScroll(MyMessage())` becomes `h.OnScroll(() => MyMessage())`, or use the `scrollTop` argument to build a richer Message.

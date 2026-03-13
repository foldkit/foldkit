---
'foldkit': patch
---

Fix devtools Inspect mode header showing blank status on open and after clearing history. Replace `maybeSelectedIndex` Option with `selectedIndex` + `isFollowingLatest` so the header always reflects the inspected message. Remove `overscroll-behavior: contain` from devtools scrollable areas.

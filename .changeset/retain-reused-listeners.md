---
'foldkit': patch
---

Retain DOM event listener ownership when an unchanged handler map is reused across distinct VNodes, so later handler changes and removals dispatch correctly.

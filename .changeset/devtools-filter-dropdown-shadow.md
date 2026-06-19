---
'@foldkit/devtools': patch
---

Fix the submodel message filter dropdown, which rendered incorrectly inside the
overlay's shadow root: it was invisible, then full-width and mispositioned, then
layered behind the message list. The panel now anchors below its button at the
button's width and sits above the overlay.

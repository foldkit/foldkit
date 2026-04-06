---
'foldkit': patch
---

Fix Dialog visibility during devtools time travel. The view now sets the native `.open` property and positioning styles directly, so the dialog renders correctly from the model alone without depending on Commands having run.

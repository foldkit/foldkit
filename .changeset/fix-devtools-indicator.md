---
'foldkit': patch
---

Fix devtools model-changed indicator inconsistency. The blue circle next to messages was based on referential inequality, while field-level diff dots used structural comparison. Now both indicators are derived from the same diff result, so a message only shows the blue circle when there are actual value changes to display in the model tree.

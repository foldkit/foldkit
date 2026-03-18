---
'foldkit': patch
---

Add `focusSelector` option to `Task.showModal` and thread it through `Ui.Dialog` so dialogs can focus an element in the same animation frame as `show()`, fixing focus on mobile browsers that ignore `focus()` outside the user-gesture call stack.

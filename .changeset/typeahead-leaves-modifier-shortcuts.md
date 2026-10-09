---
'@foldkit/ui': patch
---

Menu and Listbox typeahead ignores a character pressed with Ctrl, Meta, or Alt. Before, Cmd+F on an open Menu added "f" to the typeahead query and called `preventDefault`, so the browser's find shortcut never ran. The same held for Ctrl+C, Cmd+R, and every other shortcut built on a character key. Now those keydowns reach the browser. `Space` pressed with Ctrl, Meta, or Alt also reaches the browser and no longer selects the active item. A character pressed with Shift still searches.

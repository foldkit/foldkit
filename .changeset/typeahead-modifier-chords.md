---
'@foldkit/ui': patch
---

Menu and Listbox typeahead no longer take a printable key pressed with Control, Meta, or Alt. Before, a chord such as Meta+B with the items focused was read as typing "b": the component searched for it and cancelled the event, so a global key binding for that chord never fired while a menu or listbox was open. The chord now passes through uncancelled. Shift still types, so capitals search as before.

---
'@foldkit/ui': patch
---

Move the remaining direct parent-operation aliases in Animation, Calendar, Combobox, DatePicker, Listbox, Menu, Toast, and VirtualList to their separate InMessage contracts and receive handlers. Generated Binding methods keep their existing call signatures. Local UI facts and Command completions remain Messages, and scalar, positional, defaulting, and generic argument adapters retain their existing APIs.

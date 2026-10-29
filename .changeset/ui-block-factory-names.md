---
'@foldkit/ui': minor
'@foldkit/oxlint-plugin': patch
'@foldkit/devtools': patch
'create-foldkit-app': patch
---

Name generic UI Block factories `makeBlock`, making their checked completed Block result explicit.

Replace `Listbox.create`, `Combobox.create`, `Menu.create`, `RadioGroup.create`, `Tabs.create`, and `VirtualList.create` with the corresponding `makeBlock` method. The Listbox and Combobox Multi variants follow the same rename. Replace `Toast.make` with `Toast.makeBlock`. Keep existing type parameters and Schema arguments. The previous factory names have no compatibility aliases.

Construction remains passive, and initialization, exact types, handler requirements, identities, and lifecycle behavior are unchanged. Declare each factory result once at module scope and use the same completed Block when binding it into a parent.

Update the selection-factory lint rule, DevTools consumers, scaffold conventions, and active documentation to use the new names.
